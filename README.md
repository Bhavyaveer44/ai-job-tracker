# AI-Powered Job Tracker

Track your job applications with an AI assistant that auto-fills job details and scores your resume fit.

## Live Demo
[job-tracker.vercel.app](https://job-tracker.vercel.app)

## Features
- Kanban board with drag and drop across Applied, Interview, Offer, Rejected
- AI auto-fill — paste a job description and extract company, role, salary, skills instantly
- Resume match score — compare your skills against job requirements (0–100%)
- JWT authentication — secure, session-persistent login
- Full CRUD — add, edit, delete jobs with live sync to database

## Tech Stack
- Frontend: React, Vite, @hello-pangea/dnd
- Backend: Node.js, Express
- Database: PostgreSQL via Supabase
- AI: Groq API (Llama 3.3 70B)
- Deploy: Vercel (frontend) + Render (backend)

## Run locally

### Backend
cd server
npm install
# create .env with SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET, GROQ_API_KEY
node index.js

### Frontend
cd client
npm install
# create .env with VITE_API_URL=http://localhost:5000
npm run dev