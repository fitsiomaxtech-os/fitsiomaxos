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

## Validation Notes
- Backend role login tested for all 6 credentials (pass).
- Frontend screenshot tests passed for login + role grid.
- Testing agent iteration 7:
  - Backend: 14/14 pass
  - Frontend: all requested Screen 1 checks pass
  - No blocking issues in Screen 1 scope

## Prioritized Backlog (Next Screens)
### P0
- Screen 2: Business Development Google Sheets connector UI (connection + mapping + sync simulation)
- Screen 3: Lead Master board with stage movement

### P1
- Pre-sales qualification and branch assignment screen
- Branch admin board and confirmation screen

### P2
- Doctor availability booking screen
- Head physio today/new appointment board

## Next Tasks List
1. Build **Screen 2**: Google Sheets connection manager (UI + mapping + sync simulation).
2. Add dynamic field mapping UI (create new lead fields from headers).
3. Add tab/source preview and imported lead counters.

