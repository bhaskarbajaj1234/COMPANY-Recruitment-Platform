# Enterprise Talent Stream (ETS) - Automated Recruitment Platform (MVP)

An event-driven, automated recruitment management system built for high-throughput candidate screening, dynamic multi-quota seat allocation, and real-time waitlist processing.

---

## 🌟 Key Features

* **⚡ Real-time Telemetry:** Streams backend activity updates and audit logs directly to the admin console shell using Node.js `EventEmitter` and **Server-Sent Events (SSE)**.
* **🔄 Autonomous Backfill Engine:** A background **Cron Worker** operating on a 3-second heartbeat automatically cancels expired offer windows and promotes waitlisted candidates using a multi-tier tie-breaker (`Total Score > B.Tech % > Age`).
* **📊 Multi-Quota Elimination Matrix:** Features a 1:12 call-factor ratio engine with Zod schema validation for transactional CSV ingestion and dynamic cutoff processing across engineering branches and quotas (GEN, OBC, SC).
* **🔒 DigiLocker Identity Sandbox:** Integrated $O(1)$ constant-time lookup structures to authenticate candidate identity records prior to phase-2 evaluation.
* **⏩ Time-Dilation Simulator:** Includes an admin-configurable runtime fast-forward toggle that compresses 7-day offer expiration lifecycles down to 30 seconds for live demos and testing.

---

## 🛠️ Tech Stack

* **Frontend:** React, TypeScript, Vite, CSS3
* **Backend:** Node.js, Express, TypeScript
* **Database & ORM:** SQLite / PostgreSQL, Prisma ORM
* **Validation & Utilities:** Zod, Node.js EventEmitter (SSE), Node-Cron

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18 or higher)
* npm or yarn

### 1. Clone the Repository
```bash
git clone [https://github.com/YOUR_USERNAME/recruitment-management-platform.git](https://github.com/YOUR_USERNAME/recruitment-management-platform.git)
cd recruitment-management-platform

2. Setup & Run Backend

cd backend
npm install
npx prisma db push
npm run dev

Backend server will start on http://localhost:5000

3. Setup & Run Frontend

cd ../frontend
npm install
npm run dev

Frontend app will start on http://localhost:5173

🔐 Credentials (Demo)
Admin Email: admin@company.in

Password: company2026
