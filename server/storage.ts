import { db } from "./db";
import {
  users, drafts, comments, notifications, activityLogs, draftVersions,
  type User, type InsertUser, type Draft, type InsertDraft, type Comment, type InsertComment, type Notification, type ActivityLog, type UpdateDraftRequest, type DraftVersion, type InsertDraftVersion
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export function setupAuthSession() {
  return session({
    secret: process.env.SESSION_SECRET || process.env.REPLIT_ID || "draft-approval-secret",
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({ pool, createTableIfMissing: true }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  });
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;
  
  getDrafts(): Promise<Draft[]>;
  getDraftsByStatus(status: string): Promise<Draft[]>;
  getDraft(id: number): Promise<Draft | undefined>;
  createDraft(draft: InsertDraft): Promise<Draft>;
  updateDraft(id: number, updates: UpdateDraftRequest): Promise<Draft>;
  deleteDraft(id: number): Promise<void>;
  
  getComments(draftId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'readAt'>): Promise<Notification>;
  markNotificationRead(id: number): Promise<Notification>;
  
  getActivityLogs(): Promise<ActivityLog[]>;
  createActivityLog(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog>;
  
  getDraftVersions(draftId: number): Promise<DraftVersion[]>;
  createDraftVersion(draftId: number, version: Omit<InsertDraftVersion, 'draftId'>): Promise<DraftVersion>;
  getDraftVersion(versionId: number): Promise<DraftVersion | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ role }).where(eq(users.id, id)).returning();
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getDrafts(): Promise<Draft[]> {
    return await db.select().from(drafts).orderBy(desc(drafts.createdAt));
  }

  async getDraftsByStatus(status: string): Promise<Draft[]> {
    return await db.select().from(drafts).where(eq(drafts.status, status)).orderBy(desc(drafts.createdAt));
  }

  async getDraft(id: number): Promise<Draft | undefined> {
    const [draft] = await db.select().from(drafts).where(eq(drafts.id, id));
    return draft;
  }

  async createDraft(draft: InsertDraft): Promise<Draft> {
    const [newDraft] = await db.insert(drafts).values({ ...draft, updatedAt: new Date() } as any).returning();
    return newDraft;
  }

  async updateDraft(id: number, updates: UpdateDraftRequest): Promise<Draft> {
    const [updated] = await db.update(drafts)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(drafts.id, id))
      .returning();
    return updated;
  }

  async deleteDraft(id: number): Promise<void> {
    await db.delete(drafts).where(eq(drafts.id, id));
  }

  async getComments(draftId: number): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.draftId, draftId)).orderBy(desc(comments.createdAt));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();
    return newComment;
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'readAt'>): Promise<Notification> {
    const [newNotif] = await db.insert(notifications).values(notification).returning();
    return newNotif;
  }

  async markNotificationRead(id: number): Promise<Notification> {
    const [updated] = await db.update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return updated;
  }

  async getActivityLogs(): Promise<ActivityLog[]> {
    return await db.select().from(activityLogs).orderBy(desc(activityLogs.timestamp));
  }

  async createActivityLog(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log).returning();
    return newLog;
  }

  async getDraftVersions(draftId: number): Promise<DraftVersion[]> {
    return await db.select().from(draftVersions).where(eq(draftVersions.draftId, draftId)).orderBy(desc(draftVersions.versionNumber));
  }

  async createDraftVersion(draftId: number, version: Omit<InsertDraftVersion, 'draftId'>): Promise<DraftVersion> {
    const [newVersion] = await db.insert(draftVersions).values({ ...version, draftId } as any).returning();
    return newVersion;
  }

  async getDraftVersion(versionId: number): Promise<DraftVersion | undefined> {
    const [version] = await db.select().from(draftVersions).where(eq(draftVersions.id, versionId));
    return version;
  }
}

export const storage = new DatabaseStorage();
