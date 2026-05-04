# Internal Admin Analytics Portal

A production-style internal admin tool for managing users, tracking product events, viewing analytics, auditing admin actions, and controlling feature flags.

## Features

- Admin JWT authentication
- Role-based access control: `SUPER_ADMIN`, `SUPPORT`, `ANALYST`
- User management with search, sorting, pagination, status filters, and ban/deactivate actions
- User activity history
- Event ingestion API for product analytics
- Dashboard metrics: DAU, MAU, retention, event volume, revenue, top events
- Funnel analytics for signup to purchase conversion
- Audit logs for admin actions
- Feature flags with per-role permissions
- Docker Compose PostgreSQL setup

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Start Postgres:

```bash
docker compose up -d
```

3. Configure environment:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

4. Run migrations and seed data:

```bash
npm run db:migrate
npm run seed
```

5. Start the app:

```bash
npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:4000

## Demo Admins

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | super@admin.local | password123 |
| Support | support@admin.local | password123 |
| Analyst | analyst@admin.local | password123 |

## Role Permissions

- `SUPER_ADMIN`: full access
- `SUPPORT`: user management and audit log visibility
- `ANALYST`: analytics and event visibility

## Event Tracking Example

```bash
curl -X POST http://localhost:4000/api/events/track \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","eventName":"button_clicked","properties":{"button":"upgrade"}}'
```
