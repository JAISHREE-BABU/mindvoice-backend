# MindVoice Backend

Backend API for MindVoice — an AI-powered language learning app with text and voice conversation practice, structured lessons, and gamified progress tracking.

## Tech Stack
- Node.js + TypeScript + Express
- PostgreSQL + Prisma ORM
- Google Gemini AI (`@google/genai`) for conversational AI and voice transcription
- JWT-based authentication

## Features
- User registration/login with JWT auth
- Text-based AI conversation practice with grammar corrections
- Voice message support — audio sent directly to Gemini for transcription + reply
- Structured lessons with vocabulary items
- XP-based gamification and leaderboard
- Deployed on Render with a managed PostgreSQL database

## API Overview
- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/users/me`, `GET /api/users/leaderboard`
- `GET /api/languages`
- `POST /api/conversations`, `GET /api/conversations/:id`
- `POST /api/conversations/:id/messages`
- `POST /api/conversations/:id/voice-messages`
- `GET /api/lessons`, `GET /api/lessons/:id`, `POST /api/lessons/:id/complete`

## Running Locally
```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Requires a `.env` file with `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `GEMINI_API_KEY`, `AI_BASE_URL`, and `AI_CHAT_MODEL`.

## Live Deployment
Deployed on [Render](https://render.com) at `https://mindvoice-backend-k398.onrender.com`.

## Related
Android client: [mindvoice-android](https://github.com/JAISHREE-BABU/mindvoice-android)
