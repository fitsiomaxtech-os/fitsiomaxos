# FITSIOMAX OS PRD (Restarted — Screen-by-Screen)

## Original Problem Statement
Build FITSIOMAX OS with:
- Business Development sheet connector permissions
- Lead Master Sheet to CRM sync
- Multi-sheet support
- Tab-as-source support (Instagram/Meta/Walkins)
- Business verticals and branch operations
- Physio and Head Physio workflows
- Pre-sales to branch to appointment pipeline

## User Choices (Current Restart)
1. Full rebuild: **Yes**
2. Start with Screen 1: **Login + Role Access**
3. Google Sheets for now: **manual/JSON simulation first**, OAuth in next step
4. UI style defaulted from user note: **SaaS minimal, mostly white + blue**

## Architecture Decision for This Iteration
- Keep backend role-auth endpoint available at `/api/v3/auth/login`.
- Restrict frontend scope to **Screen 1 only**.
- Provide mocked Google Sheet lead JSON preview (no live sync yet).

## What's Implemented (2026-03-24)
### Screen 1 Complete
- Rebuilt Login screen to white/blue minimal SaaS style.
- Added role-access selection screen after login with exactly 6 role cards.
- Demo User dropdown for quick login.

### Role-Wise Admin Boards Complete
- Built separate role-based boards for all 6 users using real backend data.
- Implemented flow actions by role.

### Pre-sales UX Focus Update
- Fixed sticky header with profile/settings/refresh/logout.
- Kanban/List toggle, stage-tab filtering, custom fields, date filters, lead editing.

### Full-Width + Multicolor UI Enhancement
- Full-width layout, pastel multicolor stage system.

### Logo + Pre-sales Lead Module Enhancement
- FITSIOMAX logo in header, custom field builder, date range filters.

### Business Development Dashboard (2026-02-XX)
- **NEW**: Created self-contained `BusinessLeadsDashboard.jsx` component with 5 tabs:
  - **Dashboard**: Top metrics (Total Leads, Branches, Appointments, Completed, Sheet Connections), Lead Pipeline stage counts, Leads by Source/Branch breakdown, Recent Leads table.
  - **Branches**: Branch list table, Add Branch form with admin creation, vertical selection.
  - **Lead Master**: Full leads table with search, stage/branch/date filters. Qualify and Assign actions for leads.
  - **Google Sheet Connection**: Create connections, existing connections list with selection, field mapping configuration, JSON sync execution.
  - **Lead Source**: Source aggregation table with stage breakdown per source.
- **NEW**: Backend endpoints:
  - `GET /api/v3/dashboard/bd-summary` - Aggregated metrics for BD dashboard.
  - `GET /api/v3/lead-sources` - Lead source aggregation with stage breakdown.
- Updated BD role permissions to allow qualify and assign-branch operations.
- Frontend API functions: `getBdSummary()`, `getLeadSources()`.

### Post-QA Fixes Applied
- Fixed default seeded branch linkage.
- Fixed confirm endpoint scoping.
- Replaced hardcoded sheet callback URL.
- Added slot normalization.

## Validation Notes
- Iteration 14 (BD Dashboard): All 5 tabs functional, backend APIs correct, 100% frontend pass, role permissions verified.
- Previous iterations (1-13): All pass for login, role boards, pre-sales, full-width UI, logo, custom fields, date filters.

## Prioritized Backlog (Next Screens)
### P0
- Connect real Google OAuth credentials for live Sheets token flow.
- Add "Add New" and "Connect Leads" buttons to Pre-sales view.

### P1
- Strengthen branch scoping for all non-admin roles.
- Fix recurring hydration warning (span inside option element).
- Secure password hashing (plain text currently).
- Backend refactoring (server.py 2300+ lines).
- Frontend refactoring (CRMPage.jsx 1000+ lines).

### P2
- Add calendar month/week view with slot drag-reschedule.
- Add notification hooks for appointment reminders.
- Auto-sync scheduler for connected sheets.
- Branch analytics cards.

## Next Tasks List
1. Add "Add New" and "Connect Leads" buttons to Pre-sales view.
2. Build live Google OAuth connect + token status for Business Dev.
3. Add auto-sync job settings for connected sheets.
4. Secure password hashing.
5. Backend/frontend refactoring.
