import type { Express } from "express";
import type { Server } from "http";
import { storage, setupAuthSession } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { User } from "@shared/schema";
import { sendDraftSubmissionEmail, sendDraftStatusChangeEmail, sendCommentNotificationEmail } from "./email";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = "uploads/";
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + "-" + file.originalname);
    },
  }),
});

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

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback",
        },
        async (accessToken: string, refreshToken: string, profile: any, done: any) => {
          try {
            // Check if user exists by email
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(null, false, { message: "No email found in Google profile" });
            }

            let user = await storage.getUserByEmail(email);

            // Create new user if doesn't exist
            if (!user) {
              user = await storage.createUser({
                email,
                name: profile.displayName || "User",
                password: "", // OAuth users don't have passwords
                role: "Employee", // Default role for new OAuth users
                department: "", // Will need to be filled on first login
              });
            }

            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }

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

  // Google OAuth Routes
  app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/auth" }),
    (req, res) => {
      // Successful authentication, redirect to dashboard
      res.redirect("/");
    }
  );

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

  // Get all users (only Head Authority can access)
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== "Head Authority") {
        return res.status(403).json({ message: "Unauthorized - Only Head Authority can view all users" });
      }

      // Get all users except password field
      const allUsers = await storage.getAllUsers();
      const safeUsers = allUsers.map(u => {
        const { password, ...safeUser } = u;
        return safeUser;
      });
      res.json(safeUsers);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app.put("/api/users/:id/role", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const targetUserId = Number(req.params.id);
      const { role } = req.body;

      // Only Head Authority can change roles
      if (user.role !== "Head Authority") {
        return res.status(403).json({ message: "Unauthorized - Only Head Authority can change user roles" });
      }

      // Validate role
      if (!["Employee", "Manager", "Head Authority"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Users cannot change their own role
      if (user.id === targetUserId) {
        return res.status(400).json({ message: "You cannot change your own role" });
      }

      const updatedUser = await storage.updateUserRole(targetUserId, role);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...safeUser } = updatedUser;

      await storage.createActivityLog({
        userId: user.id,
        action: `Changed role of user ${updatedUser.name} (ID: ${targetUserId}) to ${role}`,
      });

      res.status(200).json(safeUser);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // File Upload Route
  app.post("/api/upload", requireAuth, upload.array("files"), (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    res.json({ filenames: files.map((f) => f.filename) });
  });

  // File Download Route
  app.get("/api/download/:filename", requireAuth, (req, res) => {
    try {
      const filename = req.params.filename;
      // Prevent directory traversal attacks
      if (filename.includes("..") || filename.includes("/")) {
        return res.status(400).json({ message: "Invalid filename" });
      }
      const filepath = path.join(process.cwd(), "uploads", filename);
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ message: "File not found" });
      }
      res.download(filepath);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
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
      const draftId = Number(req.params.id);
      const user = req.user as User;
      const currentDraft = await storage.getDraft(draftId);

      if (!currentDraft) {
        return res.status(404).json({ message: "Draft not found" });
      }

      // Get version count to assign next version number
      const versions = await storage.getDraftVersions(draftId);
      const nextVersionNumber = versions.length + 1;

      // Create version before updating
      const changeDescription = (req.body?.changeDescription as string) || `Auto-saved version ${nextVersionNumber}`;
      await storage.createDraftVersion(draftId, {
        content: currentDraft.content,
        files: currentDraft.files,
        status: currentDraft.status,
        createdBy: user.id,
        versionNumber: nextVersionNumber,
        changeDescription,
      });

      const draft = await storage.updateDraft(draftId, input);
      if (!draft) return res.status(404).json({ message: "Draft not found" });

      // Send email notification when draft is submitted (status changes to Pending)
      if (input.status === 'Pending' && currentDraft.status === 'Draft') {
        const isHeadAuthority = user.role === 'Head Authority';

        if (isHeadAuthority) {
          // Head Authority bypasses approval
          await storage.updateDraft(draftId, {
            status: 'Approved',
            approverId: user.id,
            approvedAt: new Date()
          } as any);

          await storage.createActivityLog({
            userId: user.id,
            action: `Auto-approved draft by Head Authority: ${draft.title}`,
            draftId: draft.id
          });

          await storage.createNotification({
            userId: user.id,
            type: 'Draft Approved',
            message: `Your draft "${draft.title}" has been auto-approved.`
          });

          // Refetch draft to get updated status for the response
          const updatedDraft = await storage.getDraft(draftId);
          if (updatedDraft) {
            return res.status(200).json(updatedDraft);
          }
        } else {
          try {
            // Get all approvers (Managers and Head Authority)
            const managers = await storage.getUsersByRole('Manager');
            const headAuthority = await storage.getUsersByRole('Head Authority');
            const approvers = [...managers, ...headAuthority];

            if (approvers.length > 0) {
              // Map saved filenames to attachments with full paths
              const attachments = (draft.files || []).map(filename => ({
                filename,
                path: path.join(process.cwd(), 'uploads', filename)
              })).filter(att => fs.existsSync(att.path));

              await sendDraftSubmissionEmail(draft, user, approvers, attachments);
            }
          } catch (emailErr) {
            console.error('Failed to send draft submission emails:', emailErr);
            // Don't fail the request if email sending fails
          }
        }
      }

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
      const draftId = Number(req.params.id);

      if (user.role === 'Employee') {
        return res.status(403).json({ message: "Unauthorized to approve drafts" });
      }

      const currentDraft = await storage.getDraft(draftId);
      if (!currentDraft) return res.status(404).json({ message: "Draft not found" });

      // Create version before updating status
      const versions = await storage.getDraftVersions(draftId);
      const nextVersionNumber = versions.length + 1;
      await storage.createDraftVersion(draftId, {
        content: currentDraft.content,
        files: currentDraft.files,
        status: currentDraft.status,
        createdBy: user.id,
        versionNumber: nextVersionNumber,
        changeDescription: `Status changed to ${input.status} by ${user.name}`
      });

      const draft = await storage.updateDraft(draftId, {
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

      // Send email notification to draft submitter about status change
      try {
        const submitter = await storage.getUser(draft.submitterId);
        if (submitter) {
          const statusChangeDetails = input.comment || undefined;
          await sendDraftStatusChangeEmail(draft, user, submitter.email, statusChangeDetails);
        }
      } catch (emailErr) {
        console.error('Failed to send draft status change email:', emailErr);
        // Don't fail the request if email sending fails
      }

      res.status(200).json(draft);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Draft Versions
  app.get("/api/drafts/:id/versions", requireAuth, async (req, res) => {
    try {
      const versions = await storage.getDraftVersions(Number(req.params.id));
      res.json(versions);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/draft-versions/:versionId", requireAuth, async (req, res) => {
    try {
      const version = await storage.getDraftVersion(Number(req.params.versionId));
      if (!version) return res.status(404).json({ message: "Version not found" });
      res.json(version);
    } catch (err) {
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

      // Create in-app notification for interested parties and send optional email notifications
      try {
        const draft = await storage.getDraft(draftId);
        if (draft) {
          // If commenter is not the submitter, notify the submitter
          if (user.id !== draft.submitterId) {
            await storage.createNotification({
              userId: draft.submitterId,
              type: 'Comment',
              message: `New comment on your draft \"${draft.title}\"`
            });

            const submitter = await storage.getUser(draft.submitterId);
            if (submitter) {
              await sendCommentNotificationEmail(draft, user, input.content, submitter.email);
            }
          } else {
            // Commenter is the submitter — notify approvers
            const managers = await storage.getUsersByRole('Manager');
            const heads = await storage.getUsersByRole('Head Authority');
            const approvers = [...managers, ...heads];
            for (const approver of approvers) {
              await storage.createNotification({
                userId: approver.id,
                type: 'Comment',
                message: `New comment on draft \"${draft.title}\" by ${user.name}`
              });
              try {
                await sendCommentNotificationEmail(draft, user, input.content, approver.email);
              } catch (e) {
                console.error('Failed to send comment email to approver', approver.email, e);
              }
            }
          }
        }
      } catch (notifErr) {
        console.error('Error creating comment notifications:', notifErr);
      }

      res.status(201).json(comment);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete draft
  app.delete(api.drafts.delete.path, requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const user = req.user as User;
      const draft = await storage.getDraft(id);
      if (!draft) return res.status(404).json({ message: 'Draft not found' });

      await storage.deleteDraft(id);
      await storage.createActivityLog({
        userId: user.id,
        draftId: draft.id,
        action: `Deleted draft ${draft.id}: ${draft.title}`
      });

      res.status(200).json({ message: 'Deleted' });
    } catch (err) {
      res.status(500).json({ message: 'Internal server error' });
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
          content: { date: '2026-02-20', department: 'Operations', operationType: 'Maintenance', details: 'Finished quarterly updates' } as any,
          submitterId: employee.id,
          files: [] as string[],
        } as any);
        console.log('Database seeded successfully');
      }
    } catch (err) {
      console.error('Seed error:', err);
    }
  }

  // Run seed
  seedDatabase();

  return httpServer;
}
