// Paste this file into Wix Velo as: Backend & Public > Backend > http-functions.js
// Then create two Wix CMS collections named exactly: Users and Scores
// Also create a Wix Secrets Manager secret named COIN_GAME_SECRET.

import wixData from 'wix-data';
import { ok, badRequest, forbidden, serverError } from 'wix-http-functions';
import { getSecret } from 'wix-secrets-backend';

const USERS_COLLECTION = 'Users';
const SCORES_COLLECTION = 'Scores';
const SECRET_NAME = 'COIN_GAME_SECRET';

function response(body, statusHelper = ok) {
  return statusHelper({
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-coin-game-secret',
    },
    body,
  });
}

function makeNumericId() {
  return Date.now() + Math.floor(Math.random() * 1000000);
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: Number(user.id),
    username: user.username,
    password: user.password,
    coinBank: Number(user.coinBank || 0),
    createdAt: user.createdAt || user._createdDate || new Date(),
  };
}

function publicScore(score) {
  if (!score) return null;
  return {
    id: Number(score.id),
    userId: Number(score.userId),
    score: Number(score.score || 0),
    coins: Number(score.coins || 0),
    level: Number(score.level || 1),
    createdAt: score.createdAt || score._createdDate || new Date(),
  };
}

async function findUserById(id) {
  const result = await wixData.query(USERS_COLLECTION)
    .eq('id', Number(id))
    .limit(1)
    .find({ suppressAuth: true });
  return result.items[0];
}

async function findUserByUsername(username) {
  const result = await wixData.query(USERS_COLLECTION)
    .eq('username', String(username))
    .limit(1)
    .find({ suppressAuth: true });
  return result.items[0];
}

async function findScoreByUserId(userId) {
  const result = await wixData.query(SCORES_COLLECTION)
    .eq('userId', Number(userId))
    .limit(1)
    .find({ suppressAuth: true });
  return result.items[0];
}

async function handleAction(body) {
  const action = body.action;

  if (action === 'getUser') {
    const user = await findUserById(body.id);
    return { ok: true, user: publicUser(user) };
  }

  if (action === 'getUserByUsername') {
    const user = await findUserByUsername(body.username);
    return { ok: true, user: publicUser(user) };
  }

  if (action === 'insertUser') {
    const user = body.user || {};
    const existing = await findUserByUsername(user.username);
    if (existing) {
      return { ok: false, error: 'Username already exists' };
    }

    const inserted = await wixData.insert(USERS_COLLECTION, {
      id: makeNumericId(),
      username: String(user.username),
      password: String(user.password),
      coinBank: 0,
      createdAt: new Date(),
    }, { suppressAuth: true });

    return { ok: true, user: publicUser(inserted) };
  }

  if (action === 'insertScore') {
    const score = body.score || {};
    const userId = Number(score.userId);
    const existing = await findScoreByUserId(userId);

    if (existing) {
      const nextLevel = Math.max(Number(existing.level || 1), Number(score.level || 1));
      const shouldUpdateScore = Number(score.score || 0) > Number(existing.score || 0);
      const shouldUpdateLevel = nextLevel > Number(existing.level || 1);

      if (shouldUpdateScore || shouldUpdateLevel) {
        const updated = await wixData.update(SCORES_COLLECTION, {
          ...existing,
          score: shouldUpdateScore ? Number(score.score || 0) : Number(existing.score || 0),
          coins: shouldUpdateScore ? Number(score.coins || 0) : Number(existing.coins || 0),
          level: nextLevel,
          createdAt: shouldUpdateScore ? new Date() : existing.createdAt,
        }, { suppressAuth: true });
        return { ok: true, score: publicScore(updated) };
      }

      return { ok: true, score: publicScore(existing) };
    }

    const inserted = await wixData.insert(SCORES_COLLECTION, {
      id: makeNumericId(),
      userId,
      score: Number(score.score || 0),
      coins: Number(score.coins || 0),
      level: Number(score.level || 1),
      createdAt: new Date(),
    }, { suppressAuth: true });

    return { ok: true, score: publicScore(inserted) };
  }

  if (action === 'getTopScores') {
    const limit = Math.min(Number(body.limit || 10), 100);
    const scoresResult = await wixData.query(SCORES_COLLECTION)
      .descending('score')
      .limit(limit)
      .find({ suppressAuth: true });

    const usersResult = await wixData.query(USERS_COLLECTION)
      .limit(1000)
      .find({ suppressAuth: true });

    const usersById = new Map(usersResult.items.map((user) => [Number(user.id), user]));
    const leaderboard = scoresResult.items.map((score) => {
      const user = usersById.get(Number(score.userId));
      return {
        ...publicScore(score),
        username: user?.username || 'Player',
        coins: Number(user?.coinBank ?? score.coins ?? 0),
      };
    });

    return { ok: true, leaderboard };
  }

  if (action === 'getUserScores') {
    const result = await wixData.query(SCORES_COLLECTION)
      .eq('userId', Number(body.userId))
      .descending('score')
      .find({ suppressAuth: true });
    return { ok: true, scores: result.items.map(publicScore) };
  }

  if (action === 'updateUserCoinBank') {
    const user = await findUserById(body.userId);
    if (!user) return { ok: false, error: 'User not found' };

    const updated = await wixData.update(USERS_COLLECTION, {
      ...user,
      coinBank: Number(body.coinBank || 0),
    }, { suppressAuth: true });

    return { ok: true, user: publicUser(updated) };
  }

  if (action === 'addCoinsToBank') {
    const user = await findUserById(body.userId);
    if (!user) return { ok: false, error: 'User not found' };

    const coinBank = Number(user.coinBank || 0) + Number(body.coins || 0);
    await wixData.update(USERS_COLLECTION, {
      ...user,
      coinBank,
    }, { suppressAuth: true });

    return { ok: true, coinBank };
  }

  if (action === 'getMaxCoinBank') {
    const result = await wixData.query(USERS_COLLECTION)
      .descending('coinBank')
      .limit(1)
      .find({ suppressAuth: true });
    const maxCoinBank = Number(result.items[0]?.coinBank || 0);
    return { ok: true, maxCoinBank };
  }

  if (action === 'applyScorePenalty') {
    const score = await findScoreByUserId(body.userId);
    const previousScore = Number(score?.score || 0);
    const newScore = Math.max(0, previousScore - Number(body.penalty || 0));

    if (score) {
      await wixData.update(SCORES_COLLECTION, {
        ...score,
        score: newScore,
        createdAt: new Date(),
      }, { suppressAuth: true });
    } else {
      await wixData.insert(SCORES_COLLECTION, {
        id: makeNumericId(),
        userId: Number(body.userId),
        score: newScore,
        coins: 0,
        level: 0,
        createdAt: new Date(),
      }, { suppressAuth: true });
    }

    return { ok: true, previousScore, newScore };
  }

  return { ok: false, error: `Unknown action: ${action}` };
}

export function options_coinGame(request) {
  return response({ ok: true });
}

export async function post_coinGame(request) {
  try {
    const expectedSecret = await getSecret(SECRET_NAME);
    const providedSecret = request.headers['x-coin-game-secret'];

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return response({ ok: false, error: 'Forbidden' }, forbidden);
    }

    const body = await request.body.json();
    if (!body || !body.action) {
      return response({ ok: false, error: 'Missing action' }, badRequest);
    }

    const result = await handleAction(body);
    return response(result, result.ok ? ok : badRequest);
  } catch (error) {
    console.error('coinGame API error:', error);
    return response({ ok: false, error: error.message || 'Server error' }, serverError);
  }
}
