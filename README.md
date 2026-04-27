# AI-Powered Job Tracker

Track your job applications with an AI assistant that auto-fills job details, scores your skill matching, generates cover letter and interview questions.

## Live Demo
[job-tracker.vercel.app](https://ai-job-tracker-dun.vercel.app/)

## Features
- Kanban board with drag and drop across Applied, Interview, Offer, Rejected
- AI auto-fill — paste a job description and extract company, role, salary, skills instantly
- Resume match score — compare your skills against job requirements (0–100%)
- Generate multiple cover letters
- Practice multiple interview questions
- JWT authentication — secure, session-persistent login
- Full CRUD — add, edit, delete jobs with live sync to database

## Tech Stack
- Frontend: React, Vite, @hello-pangea/dnd
- Backend: Node.js, Express
- Database: PostgreSQL via Supabase
- AI: Groq API 
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