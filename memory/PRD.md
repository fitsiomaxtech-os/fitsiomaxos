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

### Backend Architecture (Modular - Feb 2026)
- server.py (entry), database.py, security.py, deps.py, seed.py, constants.py, utils.py
- Schemas: schemas/v1.py, v2.py, v3.py
- Routers: v3_auth, v3_config, v3_leads, v3_branch_admin, v3_appointments, v3_sheets, v3_dashboard, v3_head_physio, v3_finance
- Legacy: v1.py, v2.py

## Prioritized Backlog

### P0
- Live Google Sheets OAuth flow for Business Dev role

### P1
- Head Physio dedicated board (login as Head Physio, see appointments, manage consultations)
- Physio dedicated board (login as Jr. Physio, see assigned patients)

### P2
- Visual weekly calendar for Branch Admin
- Drag-and-drop on Kanban boards
- Notification system
- Auto-sync scheduler for Google Sheets
