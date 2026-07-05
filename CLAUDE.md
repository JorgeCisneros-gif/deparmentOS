# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DepartmOS (internally branded "Edify") is a Spanish-language SaaS platform for managing multi-family residential buildings — billing monthly fees (water, electricity, internet, cleaning), tracking payments, and notifying residents.

## Monorepo Structure

```
backend/      NestJS + Fastify API (TypeScript)
frontend/     React + Vite SPA (TypeScript)
scheduler/    Standalone Node.js cron service (TypeScript)
LectorImagen/ Python FastAPI OCR microservice (Tesseract + Groq fallback)
suite-os/     Static landing page
```

## Common Commands

### Backend
```bash
cd backend
npm run start:dev     # Dev with hot reload
npm run build         # Compile to dist/
npm run start:prod    # Production (requires build)
npm run lint          # ESLint
```

### Frontend
```bash
cd frontend
npm run dev           # Vite dev server (port 5173, proxies to :3000)
npm run build         # Production build
npm run lint          # ESLint
npm run preview       # Preview production build
```

### Scheduler
```bash
cd scheduler
npm run dev           # ts-node-dev with watch
npm run build && npm start   # Production
```

### OCR Service
```bash
cd LectorImagen
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

### Full Stack (Docker)
```bash
docker-compose up --build    # All services
docker-compose up backend frontend   # Subset
```

## Backend Architecture

**Framework:** NestJS 10 on Fastify (not Express).

**Entry point:** `backend/src/main.ts` — bootstraps Fastify, registers multipart (for image uploads), global validation pipes, Swagger at `/docs`, and CORS.

**Root module:** `backend/src/app.module.ts` — registers ~20 feature modules and TypeORM with PostgreSQL. No cron jobs live here; all scheduled work is in the `scheduler` service.

**Auth model:** JWT access tokens (7-day) + refresh tokens (30-day) via Passport. Four roles: `supervisor`, `administrador`, `gestion`, `propietario`. Guards: `JwtAuthGuard` for humans, `SchedulerTokenGuard` for internal scheduler HTTP calls.

**Key domain services:**
- `fees/fees.service.ts` — calculates monthly fees per department, supports multiple billing modes (m³ consumption, fixed per dept, adjusted factor), stores per-service cost breakdowns as JSONB
- `readings/readings.service.ts` — meter reading CRUD + OCR session cache (30-min temp), triggers Google Drive sync via `StorageGatewayService`, housekeeping for images >1 year old
- `notifications/` — push (web-push) + email routing with configurable templates

**Microservice communication:** The scheduler calls backend HTTP endpoints (not direct DB queries) using `SchedulerTokenGuard`. The OCR service is called by the backend via HTTP during image upload.

## Frontend Architecture

**Router:** React Router v6 with role-based route guards (`PrivateRoute`, `SupervisorRoute`, `ManageRoute`, `OperateRoute`). The `/dashboard` route renders different components based on role (`SmartDashboard`).

**State:** Zustand for auth (`store/auth.store.ts`) and app config (`store/config.store.ts`). React Hook Form for all forms.

**API client:** `frontend/src/services/api.ts` — single Axios instance that injects the JWT bearer token on every request. The Vite dev proxy forwards `/api` to `http://127.0.0.1:3000`.

**Styling:** CSS custom properties defined in `index.css` (`--bg-elevated`, `--text-primary`, `--border`, `--green`, `--red`, etc.) — no CSS-in-JS or Tailwind.

**Pages directory:** `frontend/src/pages/` contains the full-page components. The largest are `NewReadingPage.tsx` (OCR flow), `NotificacionesPage.tsx`, and `CobrosPage.tsx` (~40–66 KB each).

## Scheduler Microservice

Runs independently from the backend against the same PostgreSQL database. Queries pending/overdue fees directly, sends templated HTML emails (Gmail or Resend.com), and logs results to `logs_notificacion`. Anti-duplicate: will not notify the same fee twice in one day.

Default cron: `0 9 * * *` (9 AM daily). Configured via `.env`.

## OCR Service

Python FastAPI at port 8001. `POST /ocr` accepts a multipart image, preprocesses with OpenCV (black/red digit detection), runs Tesseract, and falls back to Groq Vision API when the `OCR_ENGINE=groq` build arg is set. Returns `{ digits_only, confidence }`.

## Database

Single PostgreSQL 16 instance. TypeORM with `autoLoadEntities: true` — no explicit entity lists in the module. Key patterns:
- `serviciosActivos` and `montosServicios` are JSONB columns for flexible per-service data
- Building → Departments → (Users, Services, Readings, Fees, Payments) is the primary hierarchy
- All services share one `.env` and one DB instance

## Environment Variables

All services read from a single `.env` at the repo root (mounted in Docker). Required variables include: `DB_*`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SCHEDULER_SECRET` (shared token for internal calls), `MAIL_*`, `GOOGLE_DRIVE_*`, `GROQ_API_KEY`.

## Key Constraints

- The backend uses **Fastify**, not Express — avoid Express-specific middleware patterns (e.g., use `@fastify/multipart`, not `multer`)
- Spanish is the UI and documentation language; keep user-facing strings and API response messages in Spanish
- No cron jobs belong in the backend — all scheduled work goes in `scheduler/`
- The `backend/dist/` directory is git-ignored; never commit build artifacts
