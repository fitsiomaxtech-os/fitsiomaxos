# PhysioFit CRM / CCRM PRD

## Original Problem Statement
Build a CRM for a Physiotherapy and fitness company with Google Sheets integration where sheet rows/columns map to lead fields.

Requested flow:
- New Leads → Appointment Booking → New Appointments → Package Purchased

Required operational model:
- Master board
- 4 branches
- Sales and Pre-sales teams
- Role-based login requested by user:
  - Super Admin: manage team + Google Sheets integration
  - Pre-sales: lead to appointment booking with date/time, branch, consultation fee
  - Sales: new appointments to package sold
- Custom stage creation
- List view + Kanban view

## User Personas
- **Super Admin**: oversees all branches, manages users/stages, configures Sheets mapping, monitors conversion.
- **Pre-sales Executive**: captures and nurtures leads, books appointments, collects consultation fee.
- **Sales Executive**: handles appointments and converts to package purchased.

## Architecture Decisions
- **Frontend**: React + shadcn/ui, role-specific navigation and views.
- **Backend**: FastAPI + MongoDB (Motor), role-protected CRUD APIs.
- **Data design**:
  - `users`, `branches`, `stages`, `leads`, `sessions`, `sheets_configs`, `sheets_tokens`, `oauth_states`.
  - Custom stage model per pipeline (`pre_sales`, `sales`).
  - Lead lifecycle tracks appointment details + pipeline ownership.
- **Google Sheets integration strategy**:
  - Super Admin mapping UI + config persistence.
  - OAuth endpoints and import endpoint implemented; connection pending OAuth keys from user.

## Core Requirements (Static)
1. Role-based logins for Super Admin / Pre-sales / Sales.
2. Master board and branch-aware CRM operations.
3. Pre-sales workflow to appointment booking with fee + date/time.
4. Sales workflow from appointment to package purchased.
5. Custom stage creation for both pipelines.
6. Lead management in List and Kanban views.
7. Google Sheets column mapping and import workflow.

## What’s Implemented
### 2026-03-17 (Initial MVP)
- Built complete FastAPI CRM backend with role auth, branch/team management, custom stages, lead workflow endpoints.
- Implemented appointment booking endpoint that moves lead from pre-sales to sales pipeline.
- Implemented dashboard summary metrics and branch breakdown.
- Implemented Google Sheets integration module:
  - status/config endpoints,
  - OAuth login/callback scaffolding,
  - mapped import endpoint for leads.
- Built React frontend:
  - split login page,
  - Super Admin master board,
  - Team and stage management,
  - Google Sheets mapping UI,
  - lead board with list/kanban.
- Added `data-testid` coverage on key interactive and user-facing elements.
- Added default demo users:
  - admin@physiofit.com / admin123
  - presales@physiofit.com / presales123
  - sales@physiofit.com / sales123

### 2026-03-17 (Further Development)
- Added dedicated **Pre-sales View** and **Sales View** screens/navigation.
- Role-specific landing behavior:
  - Pre-sales users land directly on Pre-sales View.
  - Sales users land directly on Sales View.
  - Super Admin can open both views.
- Fixed login branding typo (`PhysioFit CRM`).

## Validation Notes
- Backend API smoke tests executed for login, branches, users, lead create, appointment booking, sales stage move, dashboard, sheets status.
- Frontend screenshot checks completed for login, dashboard, leads, sheets, pre-sales view, sales view.
- Testing agent runs completed and passed for requested feature sets.

## Prioritized Backlog
### P0 (Next)
- Plug in real Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`) and validate live sheet sync.
- Enforce secure password hashing (replace plain-text password storage).

### P1
- Branch-specific assignment rules and workload balancing.
- Lead activity timeline and audit log.
- Better stage drag-and-drop interactions in Kanban.

### P2
- Advanced analytics (conversion by source/campaign).
- Notifications/reminders for upcoming appointments.
- Export reports and printable summaries.

## Next Tasks List
1. Add Google OAuth keys and complete live connect test from Super Admin account.
2. Migrate password handling to hashed storage and update login verification.
3. Add branch filters to dashboard cards and lead board.
4. Add soft-delete/archive actions for leads and users.

