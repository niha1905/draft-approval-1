import { z } from 'zod';
import { insertDraftSchema, insertCommentSchema, drafts, comments, users, notifications, activityLogs } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const authSchemas = {
  login: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
  register: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string(),
    role: z.enum(['Employee', 'Manager', 'Head Authority']),
    department: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: authSchemas.login,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: authSchemas.register,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    }
  },
  drafts: {
    list: {
      method: 'GET' as const,
      path: '/api/drafts' as const,
      input: z.object({
        status: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof drafts.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/drafts/:id' as const,
      responses: {
        200: z.custom<typeof drafts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/drafts' as const,
      input: insertDraftSchema,
      responses: {
        201: z.custom<typeof drafts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/drafts/:id' as const,
      input: insertDraftSchema.partial(),
      responses: {
        200: z.custom<typeof drafts.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    approve: {
      method: 'PATCH' as const,
      path: '/api/drafts/:id/approve' as const,
      input: z.object({
        status: z.enum(['Approved', 'Rejected', 'Changes Required']),
        comment: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof drafts.$inferSelect>(),
        400: errorSchemas.validation,
        403: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    }
  },
  comments: {
    list: {
      method: 'GET' as const,
      path: '/api/drafts/:draftId/comments' as const,
      responses: {
        200: z.array(z.custom<typeof comments.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/drafts/:draftId/comments' as const,
      input: insertCommentSchema.omit({ draftId: true }),
      responses: {
        201: z.custom<typeof comments.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  notifications: {
    list: {
      method: 'GET' as const,
      path: '/api/notifications' as const,
      responses: {
        200: z.array(z.custom<typeof notifications.$inferSelect>()),
      },
    },
    markRead: {
      method: 'PATCH' as const,
      path: '/api/notifications/:id/read' as const,
      responses: {
        200: z.custom<typeof notifications.$inferSelect>(),
      },
    }
  },
  activityLogs: {
    list: {
      method: 'GET' as const,
      path: '/api/activity-logs' as const,
      responses: {
        200: z.array(z.custom<typeof activityLogs.$inferSelect>()),
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type AuthLoginInput = z.infer<typeof api.auth.login.input>;
export type AuthRegisterInput = z.infer<typeof api.auth.register.input>;
export type DraftInput = z.infer<typeof api.drafts.create.input>;
export type DraftUpdateInput = z.infer<typeof api.drafts.update.input>;
export type DraftApproveInput = z.infer<typeof api.drafts.approve.input>;
export type CommentInput = z.infer<typeof api.comments.create.input>;
