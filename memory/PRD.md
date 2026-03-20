# FITSIOMAX Appointment Book System PRD

## Original Problem Statement (Latest)
Rebuild from scratch and build one-by-one:
- Appointment Book System for **FITSIOMAX**
- Brand-focused CRM View with blue/black aesthetic UI
- Business offerings:
  - Online: Fitness Programs, Physio Therapy
  - Offline: 4 locations (Anna Nagar, T Nagar, Parrys, ECR)
  - Offline Fitness GYM
- Login roles required:
  1. Online Fitness
  2. Physio Therapy Online
  3. Offline Physio Therapy
  + Super Admin (user confirmed)
- Lead source: Google Sheet (CSV/manual first) + manual new lead
- Flow: lead routing by source/category → doctor calendar visibility → slot booking
- Super Admin only can create services (+ New Service)

## User Choices Confirmed
1. **Reset Scope**: Full rebuild from scratch.
2. **Logins**: 3 role logins + Super Admin.
3. **Lead Source**: CSV/manual first + manual appointment and manual lead.
4. **Doctor Calendar**: Internal calendar with doctor slots and booking.
5. **Service Creation**: Super Admin only.

## User Personas
- **Super Admin**: controls services, doctors, slots, import, and global overview.
- **Online Fitness Coordinator**: handles online fitness leads + booking.
- **Online Physio Coordinator**: handles online physiotherapy leads + booking.
- **Offline Physio Coordinator**: handles offline physiotherapy leads + booking.

## Architecture Decisions
- **Frontend**: React + shadcn, dark blue/black aesthetic, role-based tabbed workspace.
- **Backend**: FastAPI + MongoDB (Motor).
- **Versioned App Isolation**:
  - New app implemented under `/api/v2` so clean rebuild can run independently.
  - Separate v2 collections (`fitsiomax_v2_*`) to avoid legacy data conflicts.
- **Core entities**:
  - `users`, `sessions`, `services`, `doctors`, `leads`, `appointments`
- **Lead routing**:
  - `online_fitness` + `offline_fitness_gym` → Online Fitness queue
  - `online_physio` → Online Physio queue
  - `offline_physio` → Offline Physio queue

## Core Requirements (Static)
1. Role-based login for 4 roles.
2. Manual lead creation and manual appointment booking.
3. Internal doctor calendar with slot creation and slot booking.
4. Super Admin-only service creation.
5. CSV/manual lead import from Google Sheet format.
6. Location support for Anna Nagar, T Nagar, Parrys, ECR.
7. Blue-black branded UI with FITSIOMAX logo and CRM View identity.

## What’s Implemented
### 2026-03-20 (Full Rebuild to FITSIOMAX Appointment System)
- Built complete **v2 backend** (`/api/v2`) for new appointment-first product flow.
- Added seeded role logins:
  - admin@fitsiomax.com / admin123
  - onlinefitness@fitsiomax.com / online123
  - onlinephysio@fitsiomax.com / physio123
  - offlinephysio@fitsiomax.com / offline123
- Implemented APIs for:
  - role login/logout
  - services (admin-only create)
  - doctors + slot creation
  - doctor availability calendar
  - leads CRUD-lite + role routing
  - manual/CSV lead import
  - appointment booking with double-book conflict prevention
  - dashboard summary metrics
- Built brand-new **blue/black aesthetic frontend**:
  - FITSIOMAX branded login + CRM header
  - role-based tabs and flow visibility
  - manual lead creation
  - manual appointment booking
  - doctor calendar slot selection UI
  - services page (admin)
  - import page for CSV/manual Google Sheet format
- Added and maintained `data-testid` attributes for interactive and critical UI elements.

### 2026-03-20 (Bug Fix Iteration)
- Fixed Import Tab issue where CSV-imported leads were not visible immediately in Leads table.
- Applied CSV category normalization + filter reset + post-import lead refresh + auto-tab switch.

## Validation Notes
- Backend curl smoke tests passed for full v2 flow (login, doctor/slot, lead create, appointment, dashboard).
- Frontend screenshot tests passed for login, overview, leads, appointments.
- Testing agent results:
  - Iteration 3 found CSV-import visibility bug
  - Iteration 4 confirmed fix PASS

## Prioritized Backlog
### P0
- Add password hashing for v2 auth (currently plain-text in seed flow).
- Add Super Admin user/team management screen for creating real role users.

### P1
- Real Google Sheets OAuth sync (currently CSV/manual-first mode active).
- Rich weekly/monthly calendar visualization with drag/drop rescheduling.
- Appointment reminders and notification workflows.

### P2
- Revenue and conversion analytics dashboard.
- Multi-doctor availability optimizer.

## Next Tasks List
1. Implement secure password hashing + migration path.
2. Add admin user management CRUD.
3. Add OAuth-based Google Sheets live sync.
4. Add appointment reschedule/cancel workflow and calendar month view.

