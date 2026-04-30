# Wix Database Setup for Coin Chaser

This version of the game saves users, scores, levels, and coin bank data into your Wix CMS database.

## 1) Turn on Velo in Wix

Open your Wix site editor and turn on **Dev Mode / Velo**.

## 2) Create two Wix CMS collections

Create these collections with these exact names:

### `Users`

Fields:

| Field key | Type |
|---|---|
| `id` | Number |
| `username` | Text |
| `password` | Text |
| `coinBank` | Number |
| `createdAt` | Date and Time |

### `Scores`

Fields:

| Field key | Type |
|---|---|
| `id` | Number |
| `userId` | Number |
| `score` | Number |
| `coins` | Number |
| `level` | Number |
| `createdAt` | Date and Time |

For permissions, the safest setup is to keep the collections private/admin-only. The backend code uses `suppressAuth: true` so the public website visitors do not need direct write access to the collections.

## 3) Add the Wix backend API file

In Wix Velo, create or open:

```text
Backend > http-functions.js
```

Paste the contents of:

```text
wix-backend/http-functions.js
```

Publish your Wix site after saving.

## 4) Add a Wix secret

In Wix Secrets Manager, create a secret named exactly:

```text
COIN_GAME_SECRET
```

Set it to a long random value, for example something like:

```text
coin-chaser-CHANGE-THIS-TO-A-LONG-RANDOM-SECRET
```

Do not use the example secret above in production.

## 5) Set your game server environment variables

Wherever the game server runs, add these environment variables:

```text
WIX_API_BASE_URL=https://www.milosmakerlab.com/_functions/coinGame
WIX_SHARED_SECRET=the exact same value you saved as COIN_GAME_SECRET in Wix
SESSION_SECRET=another long random secret for login sessions
```

If your Wix site uses the non-www version, use:

```text
WIX_API_BASE_URL=https://milosmakerlab.com/_functions/coinGame
```

## 6) Start the game

Run the game server normally:

```bash
npm install
npm run dev
```

Now these existing game API routes will save to Wix:

- `/api/auth/register`
- `/api/auth/login`
- `/api/scores`
- `/api/leaderboard`
- `/api/scores/me`
- `/api/user/stats`
- `/api/coinbank`
- `/api/coinbank/add`
- `/api/coinbank/max`
- `/api/scores/penalty`

## Important note

The React game should still call its own `/api/...` routes. Do not put Wix secrets in the React/browser code. The server talks to Wix securely.
