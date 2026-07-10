# ProctorEd — Online Examination & Proctoring Platform

A full-stack exam platform with role-based dashboards (Admin / Examiner / Student), a question bank, scheduled exams with auto-save and a countdown timer, AI webcam proctoring (face detection + tab/fullscreen monitoring), auto-grading, and analytics — built with React, Express, and PostgreSQL.

This was generated as a working foundation, not a finished commercial product. It runs end-to-end for the core exam lifecycle; a few advanced features are intentionally stubbed with clear extension points (see "What's stubbed" below) rather than faked, since they're substantial sub-projects on their own (a sandboxed code-execution service, for instance, has real security implications and deserves to be built deliberately).

## What's fully implemented

- **Auth**: signup, login, JWT access + refresh tokens, email verification, forgot/reset password, role-based access control (admin / examiner / student) — all enforced server-side via middleware, not just hidden in the UI.
- **Question bank**: MCQ, true/false, short-answer and coding question types, difficulty levels, categories, search/filter, bulk import API endpoint.
- **Exam builder**: multi-section exams, scheduling, negative marking, randomization flag, fullscreen requirement, proctoring toggle, student enrollment.
- **Exam-taking**: countdown timer (server-anchored, not just a client-side decrement), question navigator, mark-for-review, debounced autosave, resume-after-disconnect, auto-submit on timeout enforced both client-side and by a server-side background job.
- **AI webcam proctoring**: live webcam feed, client-side face detection (face-api.js) flags zero or multiple faces, tab-switch / window-blur / fullscreen-exit / copy-paste detection, all violations streamed to a live admin/examiner dashboard over Socket.io.
- **Grading**: instant auto-grading for MCQ and true/false (with negative marking), an examiner review queue for short-answer questions, and an aggregator ready to accept results from an external code-execution service for coding questions.
- **Analytics**: role-specific dashboards (admin/examiner/student), pass/fail rate, top performers, question difficulty analysis, proctoring violation reports, student score trend.
- **Notifications**: in-app notification table + API; emails are sent via Nodemailer or logged to the console in dev mode if no SMTP is configured.

## What's stubbed / extension points

- **Coding question execution**: `utils/grading.js` aggregates pre-computed test results but deliberately does not execute untrusted student code — that needs a sandboxed runner (e.g. Docker-per-submission or a service like Judge0) which is out of scope here for safety/complexity reasons.
- **PDF / Excel report export**: the data endpoints for all reports exist (`/api/results`, `/api/analytics/*`); wiring them to a PDF (e.g. `pdfkit`) or Excel (`exceljs`) export button is a small follow-up.
- **Bulk question import UI**: the backend endpoint (`POST /api/questions/bulk-import`) is ready; it expects a parsed JSON array, so you'd add a CSV/XLSX file-picker in the frontend that parses client-side (e.g. with `papaparse`) and posts the result.
- **Face detection accuracy**: uses face-api.js's lightweight TinyFaceDetector for low-latency in-browser inference. For higher-stakes proctoring you'd want a server-side review step or a more accurate model.

## Project structure

```
exam-platform/
├── backend/
│   ├── src/
│   │   ├── config/db.js          # PostgreSQL pool
│   │   ├── db/schema.sql         # Full schema (12 tables)
│   │   ├── db/migrate.js         # Applies schema.sql
│   │   ├── db/seed.js            # Creates default admin + categories
│   │   ├── middleware/           # auth (JWT+RBAC), error handling, validation
│   │   ├── controllers/          # business logic, one file per resource
│   │   ├── routes/                # Express routers
│   │   ├── sockets/               # Socket.io live proctoring channel
│   │   ├── utils/                 # jwt, grading, mailer, asyncHandler
│   │   ├── app.js                 # Express app + middleware wiring
│   │   └── server.js              # HTTP + Socket.io entrypoint + auto-submit job
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/                   # axios client (with token refresh) + socket client
    │   ├── context/AuthContext.jsx
    │   ├── components/            # Sidebar, Topbar, Timer, ProctoringWebcam, charts, etc.
    │   └── pages/                 # one file per screen
    ├── tailwind.config.js         # glassmorphism design tokens
    └── package.json
```

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally or remotely

### 1. Database
Create an empty database, then apply the schema:
```bash
createdb exam_platform
```

### 2. Backend
```bash
cd backend
cp .env.example .env        # edit DB_* and JWT_* values
npm install
npm run migrate             # applies schema.sql
npm run seed                # creates an admin account + sample categories
npm run dev                 # starts the API on http://localhost:5000
```
The seed script prints the generated admin credentials (defaults to `admin@examplatform.com` / `Admin@123` unless overridden via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

### 3. Frontend
```bash
cd frontend
cp .env.example .env        # defaults already point at localhost:5000
npm install
npm run dev                 # starts the app on http://localhost:5173
```

### 4. Try it out
1. Log in as the seeded admin, create an examiner account and a few students under **Users**.
2. As admin or examiner, add some questions under **Question Bank**, then build an exam under **Exams → Create Exam**, enrolling the students you created.
3. Log in as a student to take the exam — you'll see the proctoring consent screen, then the live webcam + timer + question navigator.
4. Watch it live as admin/examiner from the exam's **Live Monitor** page.
5. After submission, check **Results** (student) or the per-exam leaderboard (admin/examiner).

## Notes on running the proctoring webcam

`face-api.js` and its detection models are loaded from a CDN at runtime (see `index.html` and `ProctoringWebcam.jsx`) rather than bundled, since the model weights are several MB. This means the browser running the exam needs internet access to reach `cdn.jsdelivr.net`; if that's not acceptable for your deployment, download the model weights and serve them from your own backend instead — `ProctoringWebcam.jsx` already degrades gracefully (tab/fullscreen monitoring keeps working) if the models fail to load.

## Security notes for production

- Rotate `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` to long random values before deploying.
- Put the API behind HTTPS; cookies/storage of tokens, CORS origin, and rate limits are already configured in `app.js` but assume a single trusted frontend origin — adjust `CORS_ORIGIN` accordingly.
- The webcam snapshot storage field (`proctoring_logs.snapshot_url`) is ready to receive a URL from your object storage of choice (S3, GCS, etc.) if you want to persist violation snapshots — that upload step isn't wired up yet.
