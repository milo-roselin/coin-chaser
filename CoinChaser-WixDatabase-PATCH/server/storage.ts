import type { User, InsertUser, Score, InsertScore } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  insertUser(user: InsertUser): Promise<User>;
  insertScore(score: InsertScore): Promise<Score>;
  getTopScores(limit: number): Promise<Array<Score & { username: string }>>;
  getUserScores(userId: number): Promise<Score[]>;
  updateUserCoinBank(userId: number, coinBank: number): Promise<void>;
  addCoinsToBank(userId: number, coins: number): Promise<number>;
  getMaxCoinBank(): Promise<number>;
  applyScorePenalty(userId: number, penalty: number): Promise<{ previousScore: number; newScore: number }>;
}

const WIX_API_BASE_URL = process.env.WIX_API_BASE_URL;
const WIX_SHARED_SECRET = process.env.WIX_SHARED_SECRET;

function requireWixConfig() {
  if (!WIX_API_BASE_URL || !WIX_SHARED_SECRET) {
    throw new Error(
      "Missing Wix database config. Set WIX_API_BASE_URL to https://YOURDOMAIN.com/_functions/coinGame and WIX_SHARED_SECRET to the same secret you saved in Wix Secrets Manager."
    );
  }
}

function normalizeDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return new Date();
}

function normalizeUser(user: any): User {
  return {
    id: Number(user.id),
    username: String(user.username),
    password: String(user.password),
    coinBank: Number(user.coinBank ?? 0),
    createdAt: normalizeDate(user.createdAt),
  };
}

function normalizeScore(score: any): Score {
  return {
    id: Number(score.id),
    userId: Number(score.userId),
    score: Number(score.score ?? 0),
    coins: Number(score.coins ?? 0),
    level: Number(score.level ?? 1),
    createdAt: normalizeDate(score.createdAt),
  };
}

export class WixStorage implements IStorage {
  private async callWix<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    requireWixConfig();

    const response = await fetch(WIX_API_BASE_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-coin-game-secret": WIX_SHARED_SECRET!,
      },
      body: JSON.stringify({ action, ...payload }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data?.ok === false) {
      throw new Error(data?.error || `Wix request failed for ${action}`);
    }

    return data as T;
  }

  async getUser(id: number): Promise<User | undefined> {
    const data = await this.callWix<{ user?: any }>("getUser", { id });
    return data.user ? normalizeUser(data.user) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const data = await this.callWix<{ user?: any }>("getUserByUsername", { username });
    return data.user ? normalizeUser(data.user) : undefined;
  }

  async insertUser(user: InsertUser): Promise<User> {
    const data = await this.callWix<{ user: any }>("insertUser", { user });
    return normalizeUser(data.user);
  }

  async insertScore(score: InsertScore): Promise<Score> {
    const data = await this.callWix<{ score: any }>("insertScore", { score });
    return normalizeScore(data.score);
  }

  async getTopScores(limit: number): Promise<Array<Score & { username: string }>> {
    const data = await this.callWix<{ leaderboard: any[] }>("getTopScores", { limit });
    return (data.leaderboard || []).map((entry) => ({
      ...normalizeScore(entry),
      username: String(entry.username || "Player"),
    }));
  }

  async getUserScores(userId: number): Promise<Score[]> {
    const data = await this.callWix<{ scores: any[] }>("getUserScores", { userId });
    return (data.scores || []).map(normalizeScore);
  }

  async updateUserCoinBank(userId: number, coinBank: number): Promise<void> {
    await this.callWix("updateUserCoinBank", { userId, coinBank });
  }

  async addCoinsToBank(userId: number, coins: number): Promise<number> {
    const data = await this.callWix<{ coinBank: number }>("addCoinsToBank", { userId, coins });
    return Number(data.coinBank ?? 0);
  }

  async getMaxCoinBank(): Promise<number> {
    const data = await this.callWix<{ maxCoinBank: number }>("getMaxCoinBank");
    return Number(data.maxCoinBank ?? 0);
  }

  async applyScorePenalty(userId: number, penalty: number): Promise<{ previousScore: number; newScore: number }> {
    const data = await this.callWix<{ previousScore: number; newScore: number }>("applyScorePenalty", { userId, penalty });
    return {
      previousScore: Number(data.previousScore ?? 0),
      newScore: Number(data.newScore ?? 0),
    };
  }
}

export const storage = new WixStorage();
