import { ideas, type Idea, type InsertIdea } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getIdeas(): Promise<Idea[]>;
  createIdea(idea: InsertIdea): Promise<Idea>;
  deleteIdea(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getIdeas(): Promise<Idea[]> {
    return await db.select().from(ideas).orderBy(desc(ideas.createdAt));
  }

  async createIdea(insertIdea: InsertIdea): Promise<Idea> {
    const [idea] = await db
      .insert(ideas)
      .values(insertIdea)
      .returning();
    return idea;
  }

  async deleteIdea(id: number): Promise<void> {
    await db.delete(ideas).where(eq(ideas.id, id));
  }
}

export const storage = new DatabaseStorage();
