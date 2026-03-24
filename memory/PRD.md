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

## What’s Implemented (2026-03-24)
### Screen 1 Complete
- Rebuilt Login screen to white/blue minimal SaaS style.
- Added role-access selection screen after login with exactly 6 role cards:
  - Super Admin
  - Business Dev
  - Pre-sales
  - Branch Admin
  - Head Physio
  - Physio
- Role-lock behavior:
  - Logged-in role card marked active
  - Other roles shown locked for current login
- Added mock JSON block to preview next-phase Google Sheet lead structure.
- Added complete `data-testid` coverage for Screen 1 UI interactions.

### Role-Wise Admin Boards Complete
- Built separate role-based boards for all 6 users using real backend data:
  - Super Admin board
  - Business Development board
  - Pre-sales board
  - Branch Admin board
  - Head Physio board
  - Physio board
- Implemented flow actions by role:
  - Pre-sales: qualify + assign branch
  - Branch Admin: confirm + check available doctors + book appointment
  - Head Physio/Physio: today/new appointments + complete
- Added Business Dev sheet connection + field mapping + sync controls in board.
- Added Super Admin modules for vertical and branch setup in board.
- Replaced mocked lead preview with live lead-source preview from backend leads.

### Post-QA Fixes Applied
- Fixed default seeded `branchadmin@fitsiomax.com` branch linkage (non-null branch_id).
- Fixed `/api/v3/leads/{lead_id}/confirm` to enforce scoped update result and return 403/404 correctly.
- Replaced hardcoded sheet callback URL with env-driven callback value.
- Added slot normalization and verified branch-admin confirm→book path.

## Validation Notes
- Screen 1 testing (iteration 7): pass for login + role access.
- Role board testing (iteration 8): issues found and fixed.
- Retest (iteration 9): all targeted backend/frontend checks passed; no blocking issues.
- Backend regression files created by testing agent:
  - `/app/backend/tests/test_fitsiomax_v3_seeded_role_integrity.py`
  - `/app/backend/tests/test_fitsiomax_v3_iteration9_retest.py`

## Prioritized Backlog (Next Screens)
### P0
- Connect real Google OAuth credentials for live Sheets token flow (currently env-ready connector).
- Add scheduler for automatic periodic multi-sheet sync.

### P1
- Strengthen branch scoping for all non-admin roles (strict backend guards).
- Add branch-level filters and summary widgets for daily team tracking.

### P2
- Add calendar month/week view with slot drag-reschedule.
- Add notification hooks for appointment reminders.

## Next Tasks List
1. Build next screen: **Live Google OAuth connect + token status** for Business Dev.
2. Add auto-sync job settings (every N minutes) for connected sheets.
3. Add branch analytics cards (new, confirmed, booked, completed per branch).

