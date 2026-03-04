# ECD Monitoring Dashboard

## Overview

This is an AI-enabled Early Childhood Development (ECD) monitoring system — a role-based web dashboard for tracking child developmental screenings, risk assessments, and interventions. The application supports four user roles: Field Worker, Supervisor, Program Owner, and Admin, each with tailored views and workflows.

Key workflows include:
- **Field Workers**: Register patients, conduct developmental screenings, view AI-generated risk results (mocked)
- **Supervisors**: Monitor high-risk cases, view aggregate stats
- **Program Owners**: Access KPI dashboards with charts and analytics
- **Admins**: Manage users and roles

AI/ML risk scoring is simulated (not real) — the backend generates mock risk scores during screening creation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (no SSR/RSC)
- **Routing**: `wouter` (lightweight client-side router)
- **State Management**: React Context for auth (`useAuth` hook), TanStack React Query for server state
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives, styled with Tailwind CSS
- **Charts**: Recharts for KPI visualizations
- **Forms**: React Hook Form with Zod resolvers for validation
- **Path aliases**: `@/` → `client/src/`, `@shared/` → `shared/`

### Backend
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript, compiled with `tsx` for dev and `esbuild` for production
- **API Pattern**: RESTful JSON API under `/api/*` prefix
- **Route Definitions**: Centralized in `shared/routes.ts` with Zod schemas for input validation and response types — shared between client and server

### Database
- **Database**: PostgreSQL (required via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema-to-validation bridging
- **Schema Location**: `shared/schema.ts` — defines `users`, `patients`, `screenings`, `interventions` tables with relations
- **Migrations**: Managed via `drizzle-kit push` (schema push approach, not migration files)

### Authentication
- Currently **mocked on the frontend** using React Context — no real JWT/session auth implemented yet
- The login page lets users select a role and simulates authentication
- Mock users are hardcoded in `client/src/hooks/use-auth.tsx`
- The attached requirements docs indicate plans for JWT-based auth with email/password, but this is **not yet built**

### Key Design Decisions

1. **Shared schema between client and server** (`shared/` directory): The Drizzle schema and Zod validation schemas are shared, ensuring type safety across the full stack. Route definitions with input/output schemas live in `shared/routes.ts`.

2. **Storage interface pattern**: `server/storage.ts` defines an `IStorage` interface with a `DatabaseStorage` implementation. This abstraction allows swapping storage backends if needed.

3. **Mock AI logic**: Risk scores and risk levels are generated server-side during screening creation (mock algorithm, not real ML). The frontend displays these as "AI-assisted insights."

4. **Vite dev server with Express**: In development, Vite runs as middleware inside Express (`server/vite.ts`). In production, the client is pre-built to `dist/public` and served as static files.

5. **Role-based routing**: The `ProtectedRoute` component checks auth state and role before rendering pages, redirecting unauthorized users to login.

### Database Schema (4 tables)
- **users**: id, username, role (field_worker/supervisor/program_owner/admin), name
- **patients**: id, name, ageMonths, caregiverName, contactNumber, address, registeredByUserId
- **screenings**: id, patientId, date, answers (JSONB), riskScore, riskLevel, conductedByUserId
- **interventions**: id, patientId, screeningId, recommendation, status, notes

### Build Process
- `npm run dev` — runs Express + Vite HMR via `tsx`
- `npm run build` — builds client with Vite, bundles server with esbuild into `dist/`
- `npm run start` — serves production build
- `npm run db:push` — pushes Drizzle schema to PostgreSQL

## External Dependencies

- **PostgreSQL**: Required. Connection via `DATABASE_URL` environment variable. Used for all persistent data storage.
- **No external AI/ML services**: Risk scoring is mocked server-side.
- **No external auth providers**: Auth is currently frontend-only simulation. Plans exist for JWT but not implemented.
- **Google Fonts**: Inter and JetBrains Mono loaded via CDN in `index.html` and `index.css`.
- **Replit plugins**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, and `@replit/vite-plugin-dev-banner` are conditionally loaded in development on Replit.