# Platform — Architecture Overview

Enterprise HR, Migration & Education Operating System.

## Stack

- **Backend**: NestJS, TypeScript, Prisma, PostgreSQL, Redis, RabbitMQ, Elasticsearch
- **Frontend**: Next.js 14, React, TypeScript, TailwindCSS, Zustand, React Query
- **Infrastructure**: Docker, Docker Compose, Kubernetes (production), Nginx, GitHub Actions

## Monorepo Structure

```
platform/
├── apps/
│   ├── api-gateway     # NestJS — Auth, CRM, Recruitment, Visa, Education, Finance, Analytics, Tasks
│   └── frontend        # Next.js — Dashboard, CRM Kanban, Candidates, Vacancies, Visa, etc.
├── packages/
│   ├── database        # Prisma schema (13 domains, 120+ tables)
│   ├── common          # Shared constants (roles, pipeline stages)
│   ├── config          # Config loader
│   └── messaging       # RabbitMQ queues/exchanges
├── infrastructure/
│   ├── docker          # docker-compose (postgres, redis, rabbitmq, elasticsearch, nginx)
│   └── kubernetes      # Deployments, Services, HPA for production
└── docs
```

## Database Domains (Prisma)

1. **Organization** — organizations, countries, branches, departments, teams, offices, regions, locations, legal_entities, company_settings
2. **Users & Access** — users, roles, permissions, role_permissions, user_roles, sessions, audit_logs, api_tokens, login_history, user_settings
3. **CRM (Leads)** — leads, lead_sources, lead_statuses, lead_notes, lead_activities, lead_tags, lead_history
4. **Candidates** — candidates, candidate_profiles, candidate_languages, candidate_documents, candidate_status_history, candidate_notes, candidate_tags, candidate_communications
5. **Documents** — documents, document_types, document_versions, document_templates, file_storage
6. **Recruitment (ATS)** — employers, vacancies, vacancy_candidates, interviews, interview_feedback, job_offers
7. **Visa** — visa_processes, visa_types, visa_documents, visa_appointments, visa_submissions, visa_decisions, embassies
8. **Education** — courses, course_modules, lessons, students, student_groups, exams, certificates, teachers
9. **Finance** — payments, payment_transactions, invoices, invoice_items, currency_rates
10. **Communication** — messages, message_channels, notifications, notification_settings
11. **Tasks** — tasks, task_assignments, task_comments
12. **Analytics** — analytics_events, analytics_reports, pipeline_reports
13. **Automation** — automation_rules, automation_triggers, automation_actions, workflow_states

## Running Locally

1. **Start infrastructure**: `npm run docker:up` (from repo root)
2. **Set env**: copy `packages/database/.env.example` to `.env` and set `DATABASE_URL`
3. **Generate Prisma**: `npm run db:generate`
4. **Push schema** (dev): `npm run db:push`
5. **Backend**: `npm run dev:gateway` (port 3000)
6. **Frontend**: `npm run dev:frontend` (port 3001)

## API Routes (API Gateway)

- `POST /auth/login`, `POST /auth/register`, `POST /auth/profile` (JWT)
- `GET /crm/leads`, `GET /crm/candidates`, `GET /crm/pipeline/stats`
- `GET /recruitment/vacancies`, `GET /recruitment/vacancies/:id`
- `GET /visa/processes`, `GET /visa/processes/:id`
- `GET /education/courses`, `GET /education/groups`
- `GET /finance/payments`
- `GET /analytics/dashboard`
- `GET /tasks`
- `GET /users/me` (protected)

## Production (Kubernetes)

- Apply `infrastructure/kubernetes/` (namespace, api-gateway deployment/service/HPA).
- Use Secrets for `DATABASE_URL`, `JWT_SECRET`, etc.
- Frontend and other services can be added as separate deployments; use Ingress for external traffic.
