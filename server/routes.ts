import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get(api.ideas.list.path, async (_req, res) => {
    const ideas = await storage.getIdeas();
    res.json(ideas);
  });

  app.post(api.ideas.create.path, async (req, res) => {
    try {
      const input = api.ideas.create.input.parse(req.body);
      const idea = await storage.createIdea(input);
      res.status(201).json(idea);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.ideas.delete.path, async (req, res) => {
    await storage.deleteIdea(Number(req.params.id));
    res.status(204).send();
  });

  // Seed data
  const existing = await storage.getIdeas();
  if (existing.length === 0) {
    await storage.createIdea({ content: "Welcome to idea.dump. This is your first thought." });
    await storage.createIdea({ content: "Minimalism is not a lack of something. It's simply the perfect amount of something." });
    await storage.createIdea({ content: "Build something simple today." });
  }

  return httpServer;
}
