# KeyRush

KeyRush is a MERN typing-practice app with 25 guided lessons, timed/word-count/quote modes, difficulty levels, optional punctuation and numbers, live typing metrics, account authentication, and per-task practice history.

## Requirements

- Node.js 20 or newer
- MongoDB running locally or a MongoDB Atlas connection string

## Setup

1. Install dependencies from the project root:

   ```sh
   npm install
   ```

2. Create the backend environment file from the example:

   ```sh
   cp .env.example backend/.env
   ```

3. Set `MONGODB_URI` to your MongoDB connection string and set `JWT_SECRET` to a private random value. For example, run `openssl rand -hex 32` and put its output in `backend/.env`. Keep that secret private. The backend exits at startup if the secret is missing.

4. To enable Google sign-in, create a **Web application** OAuth client in the [Google Cloud Console](https://console.cloud.google.com/auth/clients). Configure the OAuth consent screen and add the exact frontend origins (for local development, `http://localhost:5173`; add your deployed frontend origin too). Copy the client ID into `GOOGLE_CLIENT_ID` in `backend/.env`, and create `frontend/.env.local` containing:

   ```sh
   VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
   ```

   Use the same client ID in both places. It is a public identifier, not a client secret. Do not put a Google client secret in the frontend. Restart the dev servers after changing environment values. For deployment, configure `GOOGLE_CLIENT_ID` in the backend environment and `VITE_GOOGLE_CLIENT_ID` plus `VITE_API_URL` in the frontend build environment; `VITE_API_URL` should point to the backend API base URL (including `/api`).

5. Start the API and Vite app together:

   ```sh
   npm run dev
   ```

6. Open [http://localhost:5173](http://localhost:5173). The API runs at [http://localhost:4000](http://localhost:4000).

Guest practice works without signing in. The studio keeps Beginner Learning, Typing Modes, and Total Stats in the primary navigation. Beginner Learning uses its own fixed curriculum. Typing Modes uses an independent random sentence bank; choose 15/30/60/120-second sessions, 10/25/50/100/custom word counts, or short/medium/long quotes. Change the sentence at any time, and optionally include punctuation or numbers. Create an account to save the exact sentence, complete mode configuration, duration, WPM, accuracy, and mistakes. Total Stats displays the saved sentence alongside its run results. The theme toggle is available in the studio and on both authentication pages.

## Scripts

- `npm run dev` starts the frontend and backend in parallel.
- `npm run build` type-checks and production-builds both workspaces.
- `npm test` runs the frontend typing-metric tests.

## API

- `POST /api/auth/signup` creates an account and returns a JWT.
- `POST /api/auth/login` authenticates an account and returns a JWT.
- `POST /api/auth/google` verifies a Google ID token, links a verified matching email or creates an account, and returns a KeyRush JWT.
- `GET /api/auth/me` returns the signed-in account.
- `POST /api/sessions` saves an authenticated practice result.
- `GET /api/sessions` returns recent practice results for the practice page.
- `GET /api/sessions/stats` returns all-time totals, compact time/word challenge records, lesson progress, activity, and key stats.
- `POST /api/races/join` joins the typing queue; `GET /api/races/:raceId` polls a shared race and `POST /api/races/:raceId/progress` submits typing progress.
- `GET /api/health` checks API availability.

Game Zone pairs users waiting in the same API process. If no opponent arrives within seven seconds, the race starts with guest bots. Race rooms are held in memory for this MVP, so run one backend process for local play; a multi-instance deployment should move matchmaking state to Redis or another shared store.
