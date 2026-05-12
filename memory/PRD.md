# FITSIOMAX OS PRD

## Original Problem Statement
Build FITSIOMAX OS - multi-role SaaS for physiotherapy/fitness business with:
- 6 Roles: Super Admin, Business Dev, Pre-sales, Branch Admin, Head Physio, Physio
- Lead pipeline: Google Sheets -> Pre-sales -> Branch -> Appointment
- Branch management, doctor scheduling, appointment booking

## What's Implemented

### Login & Auth
- JWT-based auth with 6 roles, demo user dropdown for quick login
- Password hashing with bcrypt (auto-upgrades plain-text passwords on login)

### Business Development Dashboard (5 Tabs)
- Dashboard: Metrics, pipeline, source/branch breakdown, recent leads
- Branches: Branch list + create form with admin user (Add/Edit/Delete)
- Lead Master: Full leads table with qualify/assign
- Google Sheet Connection: Create + mapping + JSON sync
- Lead Source: Aggregation with stage breakdown

### Pre-sales Board (Full Redesign)
- Stage metric cards, search, date filter, Kanban/List toggle, stage tabs
- Add New Lead popup, Lead Detail Modal (Overview, Remarks, Follow-up, Activity)
- Branch Picker Popup, Appointment Booking Flow (Calendly-style)

### Branch Admin Board (3 Tabs)
#### Tab 1: Patient Pipeline
- 8-stage Kanban: New Appointment -> Call & Confirm -> Head Physio Appointment -> Consultation Fee Collected -> Consultation Done -> Follow-up Package Upsell -> Package Paid -> Jr. Physio Assigned

#### Tab 2: Head Physio Calendar
- Left: Doctor list + Add Head Physio (creates user + doctor)
- Right: Calendly-style calendar — month nav, time slot grid (8AM-8PM), duration (15/30/45/60m), consultation type (Initial/Follow-up/Review), batch save/discard

#### Tab 3: Finance Board (NEW - Feb 2026)
- Summary cards: Total Revenue, Consultation Fees, Package Payments, Pending Collection
- Filters: Fee type toggle (All/Consultation/Package), patient search, date range
- Transactions table: Patient, Type badge, Amount, Details (weeks), Collected By, Date, Stage
- Footer with transaction count + total

### Multi-Role Session Lifecycle (NEW - Feb 2026) ✅
- Head Physio Board: My Patients + Weekly Reviews tabs. Recommend package (weeks + sessions/week + amount), file weekly assessment with internal notes hidden from patient.
- Branch Admin: package-recommendations panel + Assign Sessions to Jr. Physio + Create Jr. Physio account.
- Jr. Physio Board (PhysioBoard): Today / Calendar / Patients views. Complete a session with remarks. Submit weekly self-assessment.
- Patient View token endpoint (`/api/v3/patient/view/{token}`): patient-facing JSON only — strips `head_physio_notes`, `head_physio_suggestions`, `head_physio_id`, `consultation_fee`, `package_amount`. Validated by iteration_21 tests for no internal-data leak.

### Backend Architecture (Modular - Feb 2026)
- server.py (entry), database.py, security.py, deps.py, seed.py, constants.py, utils.py
- Schemas: schemas/v1.py, v2.py, v3.py
- Routers: v3_auth, v3_config, v3_leads, v3_branch_admin, v3_appointments, v3_sheets, v3_dashboard, v3_head_physio, v3_finance, v3_head_physio_board, v3_physio_board, v3_session_assign, v3_patient_view
- Legacy: v1.py, v2.py
- Tests: /app/backend/tests/test_session_lifecycle_iteration21.py (31/31 green)

### Deployment
- `/app/memory/DEPLOYMENT_PLAYBOOK.md` saved — Hostinger VPS + GitHub + PM2 + Nginx + Let's Encrypt recipe.

## Prioritized Backlog

### P0
- Live Google Sheets OAuth flow for Business Dev role

### P1
- Hostinger VPS deployment: domain DNS → VPS, then run `DEPLOYMENT_PLAYBOOK.md` steps; user prefers manual SSH not from Emergent pod
- Optional cleanup: dev hydration warning `<span>` inside `<option>` on CRMPage.jsx Super Admin booking dropdown

### P2
- Visual weekly calendar for Branch Admin
- Drag-and-drop on Kanban boards
- Notification system
- Auto-sync scheduler for Google Sheets
