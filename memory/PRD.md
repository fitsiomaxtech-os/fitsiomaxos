# FITSIOMAX OS PRD

## Original Problem Statement
Build FITSIOMAX OS - multi-role SaaS for physiotherapy/fitness business with:
- 6 Roles: Super Admin, Business Dev, Pre-sales, Branch Admin, Head Physio, Physio
- Lead pipeline: Google Sheets -> Pre-sales -> Branch -> Appointment
- Branch management, doctor scheduling, appointment booking

## What's Implemented

### Login & Auth
- JWT-based auth with 6 roles, demo user dropdown for quick login

### Business Development Dashboard (5 Tabs)
- Dashboard: Metrics, pipeline, source/branch breakdown, recent leads
- Branches: Branch list + create form with admin user
- Lead Master: Full leads table with qualify/assign
- Google Sheet Connection: Create + mapping + JSON sync
- Lead Source: Aggregation with stage breakdown

### Pre-sales Board (Full Redesign)
- Stage metric cards (Total, New Lead, Qualified, Assigned)
- Search bar, date filter, Kanban/List toggle, stage tabs
- Add New Lead popup modal
- **Lead Detail Modal** with 4 tabs (Overview, Remarks, Follow-up, Activity)
- **Branch Picker Popup**: Click "Assigned to Branch" → radio-select from available branches
- **Appointment Booking Flow**: Click "Appointment Booked" → date picker → Calendly-style time slots (08:00-20:30, 30-min) → doctor list with Available/Unavailable (low opacity) → Book

### Header
- Full-width, white background, sticky
- FitsiomaxOS brand + role-specific title + "Hi {Name}" greeting

### Backend Endpoints (v3)
- Auth, Leads CRUD, Branches, Doctors, Appointments
- Lead remarks, follow-ups, activity log, move-stage
- BD summary, lead sources aggregation
- Sheet connections, mapping, sync

## Prioritized Backlog

### P0
- Live Google Sheets OAuth flow
- Branch Admin board refinement

### P1
- Head Physio / Physio board refinement
- Secure password hashing (currently plain text)
- User-to-branch assignment UI

### P2
- Backend refactoring (server.py 2400+ lines)
- Frontend refactoring (CRMPage.jsx cleanup)
- Visual weekly calendar for appointments
- Auto-sync scheduler, notifications
