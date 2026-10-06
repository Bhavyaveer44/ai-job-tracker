# AI-Powered Job Tracker

Track job applications and use AI tools to tailor resumes, prepare for interviews, and manage application materials.

## Live demo

[ai-job-tracker-dun.vercel.app](https://ai-job-tracker-dun.vercel.app/)

## Features

- Kanban board for tracking applications across Applied, Interview, Offer, and Rejected
- AI extraction of company, role, salary, and skills from a job description
- Resume-to-job skill matching and ATS scoring
- AI-generated cover letters and interview questions
- Resume Agent that analyzes a PDF resume against a job description and iteratively rewrites sections
- Resume Vault for saving resume versions and attaching them to jobs
- Analytics dashboard for application trends and status breakdowns
- JWT authentication and full job-application CRUD

## Tech stack

- Frontend: React, Vite, React Router
- Backend: Node.js, Express
- Database: PostgreSQL via Supabase
- AI: OpenRouter (`openai/gpt-oss-120b`)
- Deployment: Vercel (frontend) and Render (backend)

## Run locally

### Backend

```sh
cd server
npm install
```

Copy `server/.env.example` to `server/.env` and set:

| Variable | Description |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Server-only Supabase service-role key; never expose it in the frontend |
| `JWT_SECRET` | Secret used to sign application JWTs |
| `OPENROUTER_API_KEY` | API key for AI features |
| `PORT` | Optional; defaults to `5000` |

Start the API:

```sh
node index.js
```

### Frontend

In another terminal:

```sh
cd client
npm install
```

Copy `client/.env.example` to `client/.env` and set the backend URL:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```sh
npm run dev
```
