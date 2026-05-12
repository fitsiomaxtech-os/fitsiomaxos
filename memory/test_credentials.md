# Fitsiomax OS — Test Credentials

All passwords are now bcrypt-hashed in the DB. The seed inserts the following demo users:

| Role               | Email                          | Password    |
|--------------------|--------------------------------|-------------|
| Super Admin        | admin@fitsiomax.com            | admin123    |
| Business Dev       | businessdev@fitsiomax.com      | bd123       |
| Pre-sales          | presales@fitsiomax.com         | presales123 |
| Branch Admin       | branchadmin@fitsiomax.com      | branch123   |
| Head Physio        | headphysio@fitsiomax.com       | head123     |
| Physio (Jr.)       | physio@fitsiomax.com           | physio123   |

Login page has a "Select demo user (auto login)" dropdown that pre-fills these for fast role switching.

## Notes
- Backend uses JWT issued from `/api/v3/auth/login`.
- Seed runs on backend startup via `seed.v3_seed()`.
- DB name from `backend/.env` → `DB_NAME`.
