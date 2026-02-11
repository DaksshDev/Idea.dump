import { z } from 'zod';
import { insertIdeaSchema, ideas } from './schema';

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
};

export const api = {
  ideas: {
    list: {
      method: 'GET' as const,
      path: '/api/ideas' as const,
      responses: {
        200: z.array(z.custom<typeof ideas.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/ideas' as const,
      input: insertIdeaSchema,
      responses: {
        201: z.custom<typeof ideas.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/ideas/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    }
  },
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

export type IdeaInput = z.infer<typeof api.ideas.create.input>;
export type IdeaResponse = z.infer<typeof api.ideas.create.responses[201]>;
