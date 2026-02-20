import type { Express } from "express";
import type { Server } from "http";
import { storage, setupAuthSession } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { User } from "@shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Authentication
  app.use(setupAuthSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid email or password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: Express.User, done) => done(null, (user as User).id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    next();
  };

  // Auth Routes
  app.post(api.auth.register.path, async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      const input = api.auth.register.input.parse(req.body);
      const hashedPassword = await hashPassword(input.password);
      
      const user = await storage.createUser({
        ...input,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...safeUser } = user;
        return res.status(201).json(safeUser);
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      next(err);
    }
  });

  app.post(api.auth.login.path, passport.authenticate("local"), (req, res) => {
    const { password, ...safeUser } = req.user as User;
    res.status(200).json(safeUser);
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out" });
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const { password, ...safeUser } = req.user as User;
    res.status(200).json(safeUser);
  });

  // Draft Routes
  app.get(api.drafts.list.path, requireAuth, async (req, res) => {
    const status = req.query.status as string;
    const drafts = status ? await storage.getDraftsByStatus(status) : await storage.getDrafts();
    res.json(drafts);
  });

  app.get(api.drafts.get.path, requireAuth, async (req, res) => {
    const draft = await storage.getDraft(Number(req.params.id));
    if (!draft) return res.status(404).json({ message: "Draft not found" });
    res.json(draft);
  });

  app.post(api.drafts.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.drafts.create.input.parse(req.body);
      const user = req.user as User;
      const draft = await storage.createDraft({ ...input, submitterId: user.id });
      
      await storage.createActivityLog({
        userId: user.id,
        action: `Created draft: ${draft.title}`,
        draftId: draft.id
      });
      
      res.status(201).json(draft);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.drafts.update.path, requireAuth, async (req, res) => {
    try {
      const input = api.drafts.update.input.parse(req.body);
      const draft = await storage.updateDraft(Number(req.params.id), input);
      if (!draft) return res.status(404).json({ message: "Draft not found" });
      res.status(200).json(draft);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.drafts.approve.path, requireAuth, async (req, res) => {
    try {
      const input = api.drafts.approve.input.parse(req.body);
      const user = req.user as User;
      
      if (user.role === 'Employee') {
        return res.status(403).json({ message: "Unauthorized to approve drafts" });
      }

      const draft = await storage.updateDraft(Number(req.params.id), { 
        status: input.status,
        approverId: user.id,
      });

      if (!draft) return res.status(404).json({ message: "Draft not found" });

      if (input.comment) {
        await storage.createComment({
          draftId: draft.id,
          userId: user.id,
          content: input.comment,
        });
      }

      await storage.createActivityLog({
        userId: user.id,
        action: `Marked draft ${draft.id} as ${input.status}`,
        draftId: draft.id
      });

      await storage.createNotification({
        userId: draft.submitterId,
        type: 'Draft Update',
        message: `Your draft "${draft.title}" was ${input.status}.`
      });

      res.status(200).json(draft);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Comments
  app.get(api.comments.list.path, requireAuth, async (req, res) => {
    const comments = await storage.getComments(Number(req.params.draftId));
    res.json(comments);
  });

  app.post(api.comments.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.comments.create.input.parse(req.body);
      const draftId = Number(req.params.draftId);
      const user = req.user as User;
      
      const comment = await storage.createComment({ ...input, draftId, userId: user.id });
      res.status(201).json(comment);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Notifications
  app.get(api.notifications.list.path, requireAuth, async (req, res) => {
    const user = req.user as User;
    const notifications = await storage.getNotifications(user.id);
    res.json(notifications);
  });

  app.patch(api.notifications.markRead.path, requireAuth, async (req, res) => {
    const notification = await storage.markNotificationRead(Number(req.params.id));
    res.json(notification);
  });

  // Activity Logs
  app.get(api.activityLogs.list.path, requireAuth, async (req, res) => {
    if ((req.user as User).role !== 'Head Authority') {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const logs = await storage.getActivityLogs();
    res.json(logs);
  });

  // Seed data function
  async function seedDatabase() {
    try {
      const existingUser = await storage.getUserByEmail('admin@company.com');
      if (!existingUser) {
        const hashedPassword = await hashPassword('password123');
        const admin = await storage.createUser({
          email: 'admin@company.com',
          password: hashedPassword,
          name: 'Admin Boss',
          role: 'Head Authority',
          department: 'Executive',
        });
        const employee = await storage.createUser({
          email: 'employee@company.com',
          password: hashedPassword,
          name: 'John Doe',
          role: 'Employee',
          department: 'Operations',
        });
        
        await storage.createDraft({
          title: 'Q1 Ops Update',
          type: 'Operational Updates',
          status: 'Pending',
          content: { date: '2026-02-20', department: 'Operations', operationType: 'Maintenance', details: 'Finished quarterly updates' },
          submitterId: employee.id,
          files: [],
        });
        console.log('Database seeded successfully');
      }
    } catch(err) {
      console.error('Seed error:', err);
    }
  }

  // Run seed
  seedDatabase();

  return httpServer;
}
