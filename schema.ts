import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  coinBank: integer("coin_bank").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const scores = pgTable("scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  score: integer("score").notNull(),
  coins: integer("coins").notNull(),
  level: integer("level").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertScoreSchema = createInsertSchema(scores).pick({
  userId: true,
  score: true,
  coins: true,
  level: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertScore = z.infer<typeof insertScoreSchema>;
export type Score = typeof scores.$inferSelect;
