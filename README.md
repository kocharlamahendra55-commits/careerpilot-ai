# CareerPilot AI 🚀

**AI Resume Analyzer & Career Intelligence Platform**  
Final Year Engineering Project — Built with Next.js 15, FastAPI, Gemini AI

---

## 🎯 Overview

CareerPilot AI is a premium, production-quality SaaS platform that uses Google Gemini AI to analyze resumes, calculate ATS compatibility scores, generate career roadmaps, identify skill gaps, match job descriptions, and generate interview preparation Q&A.

## 🛠 Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | Next.js 15, TypeScript, Tailwind CSS |
| Animations  | Framer Motion                     |
| Charts      | Recharts                          |
| Forms       | React Hook Form + Zod             |
| Icons       | Lucide React                      |
| Database    | SQLite (dev) / PostgreSQL (prod)  |
| ORM         | Prisma 7                          |
| Backend     | Python FastAPI                    |
| AI Engine   | Google Gemini 2.5 Flash           |

## 📁 Project Structure

```
my project 2/
├── frontend/           # Next.js 15 App
│   ├── src/
│   │   ├── app/        # Pages (landing, dashboard, admin)
│   │   ├── components/ # UI components (Button, Card, ScoreRing...)
│   │   ├── lib/        # Prisma client, utilities
│   │   ├── services/   # Backend API client
│   │   └── types/      # TypeScript interfaces
│   ├── prisma/         # Schema + SQLite DB
│   └── prisma.config.ts
└── backend/            # FastAPI Python service
    ├── app/
    │   ├── api/        # REST endpoints
    │   ├── core/       # Configuration
    │   └── services/   # Parser + Gemini AI
    └── run.py
```

## 🚀 Getting Started

### 1. Start the Frontend (Next.js)

```powershell
cd frontend
npm run dev
# → http://localhost:3000
```

### 2. Start the Backend (FastAPI)

```powershell
cd backend
# Add your Gemini API key (optional — works with mockup data without it)
$env:GEMINI_API_KEY = "your-api-key-here"
python run.py
# → http://localhost:8000
# → API docs: http://localhost:8000/docs
```

## 🔑 Gemini API Key (Optional)

The platform works fully without a Gemini API key using rich mockup data.  
To enable real AI analysis:

1. Get a free API key at https://aistudio.google.com
2. Set `GEMINI_API_KEY` in your terminal before running `python run.py`

## 📄 Pages

| Route | Description |
|-------|-------------|
| `/` | Premium landing page |
| `/dashboard` | Main dashboard with charts |
| `/dashboard/upload` | Resume upload + AI analysis |
| `/dashboard/job-match` | Job description matcher |
| `/dashboard/roadmap` | Career roadmap generator |
| `/dashboard/interview` | Interview prep engine |
| `/admin` | Admin panel with analytics |
| `http://localhost:8000/docs` | FastAPI Swagger UI |

## ✨ Key Features

- 🎯 **ATS Score Analysis** — Real-time compatibility scoring
- 🧠 **AI-Powered Improvements** — Gemini AI suggestions
- 💼 **Job Description Matcher** — Match score + keyword gap
- 🗺️ **Career Roadmap Generator** — Milestone-based 6-month plan
- 📚 **Skill Gap Analysis** — Course & resource recommendations
- 🎤 **Interview Prep Engine** — STAR method Q&A
- 📊 **Analytics Dashboard** — Charts and statistics
- 🔐 **Admin Panel** — User management + logs
