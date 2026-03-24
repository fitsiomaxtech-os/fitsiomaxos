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
- Stage metric cards (Total, New Lead, Qualified, Assigned)
- Search bar, date filter, Kanban/List toggle, stage tabs
- Add New Lead popup modal
- Lead Detail Modal with 4 tabs (Overview, Remarks, Follow-up, Activity)
- Branch Picker Popup: Click "Assigned to Branch" -> radio-select from available branches
- Appointment Booking Flow: Date picker -> Calendly-style time slots -> doctor list -> Book

### Branch Admin Board (2 Tabs)
#### Tab 1: Patient Pipeline
- 8-stage Kanban pipeline: New Appointment -> Call & Confirm -> Head Physio Appointment -> Consultation Fee Collected -> Consultation Done -> Follow-up Package Upsell -> Package Paid -> Jr. Physio Assigned
- Collect consultation/package fees, assign physios, move branch stages

#### Tab 2: Head Physio Calendar (NEW - Feb 2026)
- **Left Panel**: List of Head Physio doctors in the branch with slot counts
  - Add New Head Physio: Creates user (with login) + doctor record in one step
- **Right Panel**: Calendly-style calendar for managing doctor availability
  - Month calendar with navigation
  - Date selection shows time slot grid (8:00 AM - 8:00 PM, 30-min intervals)
  - Slot configuration: Duration (15/30/45/60 min) + Consultation Type (Initial/Follow-up/Review)
  - Toggle slots on/off: visual states (Available/Adding/Removing/Booked)
  - Batch Save/Discard for pending changes
  - Booked slots shown with patient name, cannot be removed

### Header
- Full-width, white background, sticky
- FitsiomaxOS brand + role-specific title + "Hi {Name}" greeting

### Backend Architecture (Refactored Feb 2026)
- Modular structure: server.py (entry), database.py, security.py, deps.py, seed.py
- Schemas: schemas/v1.py, schemas/v2.py, schemas/v3.py
- Routers: v3_auth, v3_config, v3_leads, v3_branch_admin, v3_appointments, v3_sheets, v3_dashboard, v3_head_physio
- Legacy routers: v1.py, v2.py (preserved for backward compatibility)

### Security
- bcrypt password hashing via passlib
- Auto-upgrade: plain-text passwords migrate to hashed on login

## Prioritized Backlog

### P0
- Live Google Sheets OAuth flow for Business Dev role

### P1
- Head Physio board: dedicated dashboard & workflow for Head Physio role (login as Head Physio, see their appointments, manage consultations)
- Physio board: dedicated dashboard & workflow for Jr. Physio role

### P2
- Visual weekly calendar for Branch Admin appointments
- Drag-and-drop on Kanban boards
- Notification system for key events
- Auto-sync scheduler for Google Sheets
