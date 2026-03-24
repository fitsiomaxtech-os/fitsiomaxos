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

## What's Implemented

### Screen 1 Complete
- Rebuilt Login screen to white/blue minimal SaaS style.
- Added role-access selection screen after login with exactly 6 role cards.
- Demo User dropdown for quick login.

### Role-Wise Admin Boards Complete
- Built separate role-based boards for all 6 users using real backend data.
- Implemented flow actions by role.

### Business Development Dashboard (5 Tabs)
- Self-contained `BusinessLeadsDashboard.jsx` with:
  - **Dashboard**: Metrics, pipeline, source/branch breakdown, recent leads
  - **Branches**: Branch list + create form
  - **Lead Master**: Full leads table with qualify/assign
  - **Google Sheet Connection**: Create + mapping + sync
  - **Lead Source**: Aggregation with stage breakdown
- Backend: `GET /api/v3/dashboard/bd-summary`, `GET /api/v3/lead-sources`

### Pre-sales Board Redesign (2026-02-XX)
- **NEW**: Self-contained `PreSalesBoard.jsx` replacing old cluttered inline UI:
  - **Stage metric cards**: Total Leads, New Lead, Pre-sales Qualified, Assigned to Branch
  - **Search bar**: Filter by name, email, phone
  - **Add New button**: Popup modal to create leads
  - **Date Filter**: Collapsible date range picker
  - **Kanban/List toggle**: Kanban shows 3 columns, List shows table
  - **Stage tabs**: Filter by stage with live counts
  - **Lead Detail Modal** (click any lead card/row):
    - Overview tab: Contact info, extra fields, lead summary (editable), Move to Stage buttons
    - Remarks tab: Add/view timestamped remarks
    - Follow-up tab: Schedule/complete follow-ups
    - Activity tab: Stage change activity log
- **NEW Backend endpoints**:
  - `POST/GET /api/v3/leads/{id}/remarks`
  - `POST/GET /api/v3/leads/{id}/follow-ups`
  - `POST /api/v3/leads/{id}/follow-ups/{fid}/complete`
  - `GET /api/v3/leads/{id}/activity`
  - `POST /api/v3/leads/{id}/move-stage`

## Validation Notes
- Iteration 15: Pre-sales Board — 100% backend (19/19), 100% frontend
- Iteration 14: BD Dashboard — All 5 tabs functional
- Previous iterations (1-13): Login, role boards, full-width UI, logo, custom fields, date filters

## Prioritized Backlog

### P0
- Connect real Google OAuth credentials for live Sheets token flow
- Strengthen branch scoping for non-admin roles

### P1
- Refine Branch Admin board
- Refine Head Physio and Physio boards
- UI for assigning users to branches
- Secure password hashing (plain text currently)

### P2
- Backend refactoring (server.py 2400+ lines)
- Frontend cleanup (unused state/variables from old pre-sales UI in CRMPage.jsx)
- Visual weekly calendar for appointment booking
- Auto-sync scheduler for sheets
- Branch analytics cards
- Notification hooks

## Next Tasks List
1. Build live Google OAuth connect + token status for Business Dev
2. Refine Branch Admin board UX
3. Add auto-sync job settings for connected sheets
4. Secure password hashing
5. Backend/frontend refactoring
