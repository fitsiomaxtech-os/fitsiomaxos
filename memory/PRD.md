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

### Pre-Sales CRM + Dynamic Pipeline Stages (NEW - Feb 2026) ✅
- New Super Admin top tabs: **Pre-Sales CRM** and **Pipeline Stages** (alongside Master / Marketing Board).
- Dynamic pipeline stages — backend `/app/backend/routers/v3_stages.py` with CRUD + reorder + safe rename (propagates rename to existing lead.stage / lead.branch_stage) + delete-protect (409 if leads still reference it). Seeds defaults from V3_STAGES (6 pre-sales) + V3_BRANCH_STAGES (8 sales) on first GET.
- Pre-Sales CRM page: KPI cards per stage, search, source filter, sort, stage chips, Create Lead dialog, leads table with masked phone/email, eye-icon opens Lead Detail Dialog.
- Lead Detail Dialog: Overview tab + Move-to-Stage buttons rendered dynamically from stages. Edit button opens Lead Edit Modal.
- Lead Edit Modal: name, email, phone, location, expected_consultation_date, months_of_pain, age, gender, occupation, **department** (Offline Physio / Online Physio / Fitness). When `department=offline_physio`, branch picker section appears showing each branch + Branch Admin name + address as radio cards.
- V3LeadUpdate + V3LeadOut extended with the new fields (location, expected_consultation_date, months_of_pain, age, gender, occupation, department, assigned_user_id, assigned_user_name).
- Pre-sales role users also see the same `PreSalesCRM` component (replaced the old `PreSalesBoard` for that role).
- Tested in iteration_23: 10/10 backend + frontend nav/KPI/chips/role-gating all green.

### Marketing Module (NEW - Feb 2026) ✅
- New Super Admin top-level tab ("Marketing Board") alongside the existing "Master View" — no router change.
- 5 sub-tabs: Overview · Lead Sources · All Leads · Team & Distribution · Performance.
- **Overview**: 4 KPI cards (pre-sales leads, sales leads, active sources, conversion %), Leads-by-Source bar list, Recent Leads table.
- **Lead Sources**: multi-source CSV/Sheet ingestion — paste headers, auto-map to standard Fitsiomax fields (name, phone, email, vertical, condition, age, preferred_branch, budget, notes). Sync via JSON rows; dedupe by phone last-10-digits (`phone_normalized`); auto-run round-robin assignment.
- **All Leads**: filter by stage_type / source / assignee / search; bulk delete; per-row reassign; pagination; MaskedContact reveals phone/email on hover.
- **Team & Distribution**: round-robin engine (Tier1=pre_sales, Tier2=branch_admin); Auto-Distribute toggle; "Refresh Team from Users" auto-detects role members; create new team member with bcrypt-hashed password.
- **Performance**: Conversion funnel using Fitsiomax stages, leads/agent (pre-sales), deals-closed/agent (sales).
- Backend: `/app/backend/routers/v3_marketing.py` — 16 endpoints. New Mongo collections: `marketing_sources`, `marketing_settings` (singleton).
- 11/11 backend tests + frontend smoke + role-gating + master-view regression (iteration_22).

### Backend Architecture (Modular - Feb 2026)
- server.py (entry), database.py, security.py, deps.py, seed.py, constants.py, utils.py
- Schemas: schemas/v1.py, v2.py, v3.py
- Routers: v3_auth, v3_config, v3_leads, v3_branch_admin, v3_appointments, v3_sheets, v3_dashboard, v3_head_physio, v3_finance, v3_head_physio_board, v3_physio_board, v3_session_assign, v3_patient_view, v3_marketing
- Legacy: v1.py, v2.py
- Tests: test_session_lifecycle_iteration21.py, test_marketing_iteration22.py (all green)

### Deployment
- `/app/memory/DEPLOYMENT_PLAYBOOK.md` saved — Hostinger VPS + GitHub + PM2 + Nginx + Let's Encrypt recipe.

## Prioritized Backlog

### P0
- Domain → VPS connection (user is starting deployment; awaiting domain name + VPS IP)
- Live Google Sheets OAuth flow for Business Dev role (currently CSV/JSON sync only)

### P1
- Patient-facing magic-link email (Resend / SendGrid) when Head Physio recommends a package
- Marketing module: round-robin index advance after successful insert (currently advances before)
- Hide super-admin-only API calls from non-super_admin roles (currently triggers 403 console warnings on Pre-sales view)

### P2
- Visual weekly calendar for Branch Admin
- Drag-and-drop on Kanban boards
- Notification system
- Auto-sync scheduler for Google Sheets
