# MSU Pakawit — Developer & Engineering Guide
**Offline-First Peer-to-Peer Micro-Storefront & Errand Network for Mindanao State University**

---

## 1. Executive Summary & Vision

**MSU Pakawit** (derived from the local concept meaning *"to carry over"* or *"pass along"*) is an offline-first Progressive Web Application (PWA) designed to foster hyper-local micro-entrepreneurship and peer-to-peer delivery within Mindanao State University (MSU Marawi campus).

The platform addresses core campus challenges:
- **Financial Hardship & Student Employment:** Enables students to host zero-inventory digital storefronts and earn via peer courier errands without startup capital.
- **Unreliable Network Connectivity:** Utilizes Dexie.js (IndexedDB) and Service Workers for full offline-first browsing, order placement, and background synchronization upon signal recovery.
- **Academic Priority:** Enforces automated **Academic Time-Lock Guardrails** preventing student couriers from accepting tasks or shifts during their registered class and exam hours.
- **Campus Drop-Zone Safety:** Enforces secure **4-digit OTP Handoff Verification** at pre-mapped campus hubs.

---

## 2. Architecture & Repository Structure

The project is structured as a unified npm workspace monorepo divided into two primary workspaces:
- `/client`: Frontend React PWA + Dexie.js (IndexedDB) + Tailwind CSS + Jest Testing Library
- `/api`: Backend NestJS + TypeORM + PostgreSQL + Jest Testing Suite

```
msu-pakawit/
├── package.json               # Root monorepo configuration (npm workspaces)
├── docker-compose.yml         # Container orchestration (Postgres, API, Client)
├── DEVELOPER_GUIDE.md         # Master developer handbook
├── .env.example               # Root environment variable template
├── .gitignore                 # Monorepo gitignore rules
│
├── client/                    # FRONTEND WORKSPACE (React 18 + PWA + Dexie.js)
│   ├── package.json           # Client dependencies & Jest scripts
│   ├── vite.config.ts         # Vite bundler configuration & API proxy
│   ├── tsconfig.json          # TypeScript frontend configuration
│   ├── tailwind.config.js     # MSU Theme colors (Maroon #7B1113, Gold #F5A623)
│   ├── jest.config.ts         # Jest + ts-jest + jsdom + fake-indexeddb
│   ├── jest.setup.ts          # Test environment setup
│   ├── Dockerfile             # Multi-stage production build (Nginx)
│   ├── public/
│   │   └── manifest.json      # PWA Web App Manifest
│   └── src/
│       ├── main.tsx           # React entrypoint
│       ├── App.tsx            # Main shell & multi-domain switcher
│       ├── index.css          # Tailwind directives & global styling
│       ├── modules/
│       │   ├── storefront/    # [Team 1] Store catalog, ProductCard, pricingCalculator
│       │   ├── dispatch/      # [Team 2] ErrandFeed, RunnerStatusBadge
│       │   ├── offline/       # [Team 3] db.ts (Dexie DB), syncEngine.ts
│       │   ├── guardrails/    # [Team 4] AcademicScheduleGuard, OTPVerificationModal
│       │   └── shared/        # [Team 5] Button, Card, Badge, Navbar, apiClient
│       └── __tests__/         # Client Jest test suite
│
└── api/                       # BACKEND WORKSPACE (NestJS + TypeORM + PostgreSQL)
    ├── package.json           # API dependencies & NestJS Jest scripts
    ├── tsconfig.json          # TypeScript backend configuration
    ├── nest-cli.json          # Nest CLI settings
    ├── jest.config.ts         # Jest backend test configuration
    ├── Dockerfile             # Multi-stage container build
    └── src/
        ├── main.ts            # NestJS bootstrap, Swagger OpenAPI & validation pipes
        ├── app.module.ts      # Root module importing domain modules
        ├── modules/
        │   ├── storefront/    # [Team 1] Store & Product entities, service, controller
        │   ├── dispatch/      # [Team 2] ErrandOrder entity, runner assignment
        │   ├── sync/          # [Team 3] SyncJournal entity, batch outbox reconciliation
        │   ├── users/         # [Team 4] User entity, account and role management
        │   ├── auth/          # [Team 4] Username/password login and JWT issuance
        │   ├── guardrails/    # [Team 4] Academic schedules, OTP entities and services
        │   └── shared/        # [Team 5] TypeORM configuration, health check and JWT verification
        └── __tests__/         # Backend unit and integration test suite
```

---

## 3. 5-Team Domain Ownership Matrix

The development organization consists of **25 developers divided into 5 cross-functional Scrum teams** (5 developers per team). Each team has direct ownership over distinct client and backend modules:

| Team | Domain | Client Responsibility (`/client/src/modules/`) | Backend Responsibility (`/api/src/modules/`) |
|---|---|---|---|
| **Team 1** | **Virtual Storefront & Catalog** | `storefront/`: StoreBuilder, ProductCard, CatalogGrid, zero-capital pricing calculations | `storefront/`: `Store` & `Product` entities, catalog CRUD, markup pricing rules |
| **Team 2** | **Dispatch & Courier Logistics** | `dispatch/`: ErrandFeed, task status lifecycle, runner claim triggers | `dispatch/`: `ErrandOrder` entity, runner dispatch engine, task state transitions |
| **Team 3** | **Offline Sync & PWA Core** | `offline/`: Dexie.js `db.ts` schemas, outbox queue manager, offline event listeners | `sync/`: `SyncJournal` entity, `/api/sync/batch` reconciliation, idempotency |
| **Team 4** | **Identity, Security & Guardrails** | `guardrails/`: AcademicScheduleGuard, schedule conflict validator, 4-digit OTP modal | `users/`: `User` entity, account and role management; `auth/`: login and JWT; `guardrails/`: `AcademicSchedule`, `OTPLog`, time-lock guard and OTP engine |
| **Team 5** | **Shared Platform & Services** | `shared/`: Base UI system (`Button`, `Card`, `Badge`, `Navbar`), `apiClient` | `shared/`: TypeORM database configuration, health checks, Docker Compose, CI/CD |

---

## 4. Getting Started & Local Development

### 4.1 Prerequisites
- **Node.js**: v20.x or v22.x
- **npm**: v10.x
- **Docker & Docker Compose** (optional for local containerized Postgres)

### 4.2 Installation
Clone repository and install dependencies across all workspaces:

```bash
git clone https://github.com/MSU-Students/msu-pakawit.git
cd msu-pakawit

# Install dependencies for both client and api workspaces
npm install
```

### 4.3 Environment Variables
Copy the sample environment file:
```bash
cp .env.example .env
```

Key environment variables:
- `PORT=5000` — NestJS API Port
- `DATABASE_HOST=localhost` — PostgreSQL Host
- `DATABASE_PORT=5432` — PostgreSQL Port
- `DATABASE_USER=postgres` — PostgreSQL Username
- `DATABASE_PASSWORD=postgres` — PostgreSQL Password
- `DATABASE_NAME=msu_pakawit_db` — Database Name
- `JWT_SECRET` — development signing key (at least 32 characters; use a strong secret outside local development)
- `JWT_ACCESS_TOKEN_TTL_SECONDS=3600` — access-token lifetime
- `BOOTSTRAP_ADMIN_SECRET` — one-time local admin bootstrap secret; unset it after creating the first admin
- `REGISTRATION_VERIFICATION_TTL_MINUTES=30` — lifetime of a pending registration link (1–1440 minutes)
- `CLIENT_URL=http://localhost:3000` — frontend origin used to build email verification links
- `SMTP_HOST`, `SMTP_PORT=587`, `SMTP_SECURE=false`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` — SMTP delivery settings; credentials are optional only when the SMTP server allows unauthenticated sending
- `OTP_HASH_SECRET` — optional dedicated server-side key for delivery OTP hashes; defaults to `JWT_SECRET`
- `VITE_API_BASE_URL=http://localhost:5000/api` — Frontend API Endpoint
- `ACADEMIC_TIMEZONE=Asia/Manila` — timezone used to compare current time with registered academic schedules

Usernames are case-insensitive and normalized to lowercase. They must be 3-32 characters and contain only letters, digits, periods, underscores, or hyphens; this format does not depend on a user's role or account type. Passwords are stored as Argon2id hashes.

On an empty Sprint 0 database, create the first administrator once with `POST /api/users/bootstrap-admin`, supplying the configured `BOOTSTRAP_ADMIN_SECRET` in the `x-bootstrap-secret` header. The endpoint is unavailable after any user exists. Remove the bootstrap secret from the environment after use. Administrators can then provision users through `POST /api/users`; protected routes use bearer access tokens issued by `POST /api/auth/login`.

Public registration is available from the client’s **Register** link. It collects full name, MSU ID number, username, email, password, and a `STUDENT`, `EMPLOYEE`, or `COURIER` role. `POST /api/auth/register` stores a time-limited pending registration (password and verification token are hashed) and sends a link using SMTP. The account is created with the selected role only after the user confirms the link through `POST /api/auth/verify-email`; public registration cannot create administrators. The client displays the verified role and shows Dispatch navigation only for Couriers. That client-side role display is presentation only; Dispatch API routes require bearer authentication and enforce roles from the current database profile.

Academic time-lock checks use the `ACADEMIC_TIMEZONE` (default `Asia/Manila`) and apply to Students and Couriers, not Employees or Administrators. The API checks access to the errand feed, placing/claiming errands, and courier status changes; an active class/exam restriction returns HTTP 403 with an explanatory message and schedule details. The Dispatch UI shows a matching notice and disables affected actions. Administrators may grant a reason-required temporary override for 1–120 minutes with `POST /api/guardrails/schedule-lock/override`; all schedule checks, allow/deny decisions, and override grants are stored in `schedule_lock_decisions`. Admins can view the last 100 decisions for a user at `GET /api/guardrails/schedule-lock/:userId/audit`. Production startup runs migrations that create and extend the registration and schedule-audit tables; development uses the configured TypeORM synchronization behavior.

Students and Employees can create errands, while Couriers can view and act on the feed; courier status changes are limited to the assigned courier. Administrator role changes therefore affect API permissions immediately. Configure the SMTP variables above before using registration and delivery OTP email; a failed email send prevents the action from advancing.

### 4.4 Running Development Servers

**Option A: Running Both Simultaneously**
```bash
# Terminal 1: Start NestJS Backend API (Port 5000)
npm run dev:api

# Terminal 2: Start React Frontend PWA (Port 3000)
npm run dev:client
```

**Option B: Docker Compose**
```bash
docker compose up --build
```

- **Frontend Client UI**: [http://localhost:3000](http://localhost:3000)
- **Backend API Gateway**: [http://localhost:5000/api](http://localhost:5000/api)
- **Swagger OpenAPI Documentation**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **Health Check Endpoint**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 5. Offline-First Sync Protocol (Dexie.js & Outbox Pattern)

### 5.1 Client-Side Dexie.js Schema
Located at `client/src/modules/offline/db.ts`:
1. `stores`: Local cache of active campus storefronts.
2. `products`: Local cache of store products with base and marked-up prices.
3. `orders`: Local store of user orders and runner tasks.
4. `academicSchedules`: Cached class schedules for client-side instant guardrail checks.
5. `syncQueue`: Client-side transactional mutation journal (Outbox queue).

### 5.2 Outbox Sync Lifecycle
```
[User Action (Offline/Online)]
            │
            ▼
[Write to Local Dexie.js Tables] ───► [Write Mutation to syncQueue (PENDING)]
                                                     │
                                                     ▼
                                          [Network Online Event]
                                                     │
                                                     ▼
                                     [POST /api/sync/batch Payload]
                                                     │
                                 ┌───────────────────┴───────────────────┐
                                 ▼                                       ▼
                       [HTTP 200 Success]                       [Network/HTTP Error]
                                 │                                       │
                                 ▼                                       ▼
                     [Mark syncQueue: SYNCED]              [Increment retryCount & FAILED]
```

---

## 6. Academic Time-Lock Guardrail System

To protect academic performance, MSU Pakawit enforces strict guardrails:
1. **Schedule Registration**: Couriers register their enrolled course schedule blocks (`dayOfWeek`, `startTime`, `endTime`, `courseCode`, `room`).
2. **Shift Lockout**: The system calculates current minute offsets from midnight. If the courier is within class or exam hours:
   - Courier toggle for "Available for Shift" is disabled.
   - Errand task acceptance buttons are locked.
   - Warning banner displays the conflicting course code and room.

---

## 7. Campus Drop-Zone 4-Digit OTP Protocol

To guarantee physical handoff security without requiring payment gateways:
1. When the assigned Courier changes an errand to `DELIVERING`, the API generates a random 4-digit code and emails it to the buyer. The code expires after 30 minutes; `POST /api/errands/:id/handoff-otp` can resend it while delivery is in progress.
2. The Courier enters the buyer's code at the designated campus drop hub (e.g. *Science Complex Hub*, *Kasadpan Hall Runner Point*).
3. `POST /api/errands/:id/complete` checks the code, its expiry, the five-attempt limit, delivery status, and assigned Courier. Completion and the verified OTP proof are saved in one database transaction; direct status updates cannot mark an errand `COMPLETED`.
4. OTPs are HMAC-hashed at rest using `OTP_HASH_SECRET` (or `JWT_SECRET` when no dedicated key is set). Every verification attempt is stored in `otp_attempt_logs` with its timestamp, courier, attempt number, and result. The completed errand links to its verified `OTPLog` through `deliveryOtpLogId` and records `deliveryCompletedAt`.

Delivery-code email uses the configured SMTP settings documented above. The OTP modal submits to the authenticated completion API and requires a bearer token stored under `msu-pakawit-access-token`; the existing sample Dispatch feed and order creation remain prototype data. The Dispatch API is authoritative for email delivery, verification, and completion proof.

---

## 8. Automated Testing with Jest

Both workspaces are fully automated with Jest test suites.

### 8.1 Running All Tests from Monorepo Root
```bash
npm test
```

### 8.2 Running Frontend Client Tests
```bash
npm run test:client
# or
cd client && npm test
```
**Test Coverage Includes:**
- `pricingCalculator.test.ts`: Unit tests for zero-capital markup calculations.
- `scheduleValidator.test.ts`: Academic time-lock lockout algorithms.
- `db.test.ts`: Dexie.js IndexedDB schema, outbox queue insertion, and querying via `fake-indexeddb`.
- `Button.test.tsx` & `App.test.tsx`: React Testing Library UI component rendering.

### 8.3 Running Backend API Tests
```bash
npm run test:api
# or
cd api && npm test
```
**Test Coverage Includes:**
- `health.controller.spec.ts`: System status and sprint module registration.
- `schedule-guard.service.spec.ts`: Courier class schedule conflict checking.
- `otp.service.spec.ts`: 4-digit OTP generation, expiration, retry throttling, and validation.
- `sync.service.spec.ts`: Batch outbox reconciliation and journal logging.
- `storefront.service.spec.ts`: Automatic zero-capital catalog markup computation.

---

## 9. 4-Sprint Development Roadmap

- **Sprint 0 (Weeks 1–2 - Current): Architecture, Setup & Design Standards**
  - Git monorepo structure, Docker orchestration, and shared UI component library.
  - Dexie.js IndexedDB offline schemas, NestJS TypeORM entities, and API contracts.
  - Jest automation test runner configured on both workspaces.
- **Sprint 1 (Weeks 3–4): Core Web App & Foundational Services**
  - Virtual store builder and product catalog management interfaces.
  - Order generation and courier task assignment pipelines.
  - User onboarding and role definitions (Student, Employee, Courier).
- **Sprint 2 (Weeks 5–6): Offline Capabilities, Logistics & Safeguards**
  - Storefront browsing, shopping cart, and custom pricing calculations.
  - Service Worker background sync for offline order queuing and reconciliation.
  - Academic Time-Lock schedule parser and live OTP handoff verification.
- **Sprint 3 (Weeks 7–8): Integration, Testing & Pilot Deployment**
  - Full end-to-end testing across offline, degraded network, and online toggles.
  - Security audits and Docker deployment hardening.
  - Pilot release across MSU Marawi campus stores and student couriers.

---

## 10. Contribution & Code Standards

- **TypeScript Strict Mode**: Keep code strictly typed with no implicit `any`.
- **Domain Modularization**: Place features in their respective team module directories (`src/modules/<domain>`).
- **Offline Reliability**: Every write operation should check Dexie outbox queueing before assuming network availability.
- **Test-Driven**: Ensure new service logic and critical UI components are accompanied by unit tests in `__tests__/`.
