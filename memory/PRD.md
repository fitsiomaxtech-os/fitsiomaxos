# FITSIOMAX OS PRD (Current)

## Original Problem Statement (Current Phase)
Build **Fitsiomax OS** with full operations flow:
- Business Development role can connect/manage multiple Google Sheets.
- Import all leads from sheets to CRM automatically.
- Map sheet headers to lead fields (or create new fields dynamically).
- Each sheet tab acts as lead source (Instagram, Meta, Walkins, etc.).
- Business verticals:
  - Offline Physiotherapy
  - Online Physiotherapy
  - Online Fitness
  - Offline Fitness with GYM
- Branch hierarchy (phase-first on Offline Physiotherapy):
  - Business Admin can create multiple branches.
  - Each branch has own board.
  - Branch has admin credentials/details.
- Physio hierarchy:
  - Head Physio profile + Physio profiles per branch.
  - Head physio calendar and appointments.
- Lead workflow:
  - Lead from sheets → Pre-sales → assigned to branch → branch confirms → appointment booking with available doctors only → head physio sees today/new appointments.

## Confirmed User Choices
1. Rebuild from scratch (again) — **YES**.
2. Roles: **Super Admin, Business Development, Pre-sales, Branch Admin, Head Physio, Physio**.
3. Google Sheets auth: **OAuth architecture now with placeholder creds**, and manual lead creation enabled.
4. Pipeline fixed:
   - New Lead → Pre-sales Qualified → Assigned to Branch → Branch Confirmed → Appointment Booked → Completed
5. Branch rollout: **Phase-wise** (Offline Physio first, others architecture-ready).

## User Personas
- **Super Admin**: overall governance, boards, vertical controls.
- **Business Development**: manages Google Sheets connectors, mappings, sync.
- **Pre-sales**: qualification and branch assignment.
- **Branch Admin**: confirms leads, books appointments.
- **Head Physio**: sees today/new appointments, completion flow.
- **Physio**: operational appointment execution and completion updates.

## Architecture Decisions
- **Frontend**: React + shadcn, blue/black aesthetic, role-aware tab navigation.
- **Backend**: FastAPI + MongoDB with isolated **v3 domain** under `/api/v3`.
- **Data isolation**: dedicated `fitsiomax_v3_*` collections.
- **Sheets model**:
  - Multiple sheet connections
  - Per-connection field mappings
  - Tab-wise sync payload where tab name becomes lead source
  - Dynamic extra field capture for unmapped columns
- **Availability model**:
  - Doctor slots stored per doctor
  - Slot conflict blocking at booking time
  - Slot normalization to avoid mixed datetime format mismatches

## Core Requirements (Static)
1. Multi-role RBAC for 6 roles.
2. Multi-sheet connector with tab-as-source ingestion.
3. Dynamic lead field mapping with new-field capture.
4. Manual lead creation support.
5. Pre-sales qualification and branch assignment.
6. Branch-admin confirmation and appointment booking.
7. Available-doctor-only booking behavior.
8. Head physio today/new appointment visibility.
9. Branch board + master board stage visibility.

## What’s Implemented
### 2026-03-24 (FITSIOMAX OS v3 Rebuild)
- Implemented new `/api/v3` backend with roles:
  - super_admin, business_dev, pre_sales, branch_admin, head_physio, physio
- Added v3 auth and role seed accounts.
- Implemented business vertical management APIs.
- Implemented branch creation with branch-admin credentials and branch board support.
- Implemented doctor profile + slot management (head physio/physio hierarchy support).
- Implemented lead lifecycle actions:
  - manual lead create
  - pre-sales qualify
  - assign to branch
  - branch confirm
  - appointment booking
- Implemented appointments module:
  - today/new filters
  - complete action updates appointment + lead stage
- Implemented Google Sheets connector module:
  - multiple sheet connections
  - mapping save
  - sync ingest with tab-as-source
  - dynamic extra field storage
- Added board APIs:
  - master stage counts
  - branch stage counts

### 2026-03-24 (UI Rebuild)
- Rebuilt frontend CRM into FITSIOMAX OS role-based workspace.
- Added dedicated modules/tabs for:
  - Master board
  - Lead master
  - Pre-sales board
  - Branch board
  - Appointments
  - Doctors
  - Sheets connector
  - Branches
  - Business verticals
- Added blue/black aesthetic with FITSIOMAX branding and logo.

### 2026-03-24 (Regression Fixes)
- Fixed head physio/physio appointment visibility blockers.
- Reduced role-based 403 noise by role-aware frontend loading.
- Hardened doctor select rendering and slot formatting behavior.
- Added slot-time normalization to prevent mixed-format availability mismatch.

## Validation Notes
- Backend smoke tests passed for v3 key flows via curl.
- Frontend screenshot tests passed for login, master board, sheets, branch board, head physio appointments.
- Testing agent outcomes:
  - Iteration 5 found head physio/physio visibility bug.
  - Iteration 6 passed after fixes (14/14 backend tests).

## Prioritized Backlog
### P0
- Real OAuth credential integration for live Google Sheets pull (currently placeholder-credential mode).
- Add user-to-branch assignment UI for operational roles (head physio, physio, branch staff).
- Password hashing migration (currently plain text in seed/auth).

### P1
- True automatic scheduler/cron for periodic sheet sync (currently manual trigger endpoint).
- Branch-wise doctor roster management with shift windows.
- Lead deduplication rules by phone + source + timestamp.

### P2
- Analytics: conversion per source tab and branch.
- Notification system for appointment reminders and no-shows.
- Deep audit logs and role action timeline.

## Next Tasks List
1. Plug real Google OAuth credentials and complete live sync flow (non-placeholder).
2. Build branch assignment UI for operational users and enforce strict branch scoping.
3. Add periodic background sync scheduler for all connected sheets.
4. Add password hashing and migration path before production hardening.

