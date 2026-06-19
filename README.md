# HealthRank Pro

SQLite/PostgreSQL-compatible deployable web app for nutrition club members, attendance, membership cards, payments, rankings, and weekly measurements.

## Run Locally

```powershell
python server.py
```

Open:

```text
http://127.0.0.1:4173/
```

If your system Python is not available, use the bundled runtime in this Codex workspace:

```powershell
& "C:\Users\Dell\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" server.py
```

## Demo Credentials

- Admin: `admin` / `admin`
- Supervisor: `supervisor` / `supervisor`
- Viewer: `viewer` / `viewer`
- Member: `member` / `member`

Demo shortcuts:

- `/?demo=admin`
- `/?demo=supervisor`
- `/?demo=member`

## Database

The server creates the database schema automatically on first run.

Local development can use SQLite without any external database:

By default, local runs use:

```text
%TEMP%\healthrank-pro\app.db
```

For deployment or a persistent local database, set:

```powershell
$env:HEALTHRANK_DB="C:\path\to\persistent\app.db"
python server.py
```

For PostgreSQL, set `DATABASE_URL` instead:

```powershell
$env:DATABASE_URL="postgresql://user:password@host:5432/healthrank"
python server.py
```

`DATABASE_URL` takes priority over `HEALTHRANK_DB`. Render, Railway, Supabase, Neon, and AWS RDS-style PostgreSQL URLs are supported. `postgres://...` URLs are normalized automatically to `postgresql://...`.

### Database Models And Migration Path

The live app uses a small compatibility layer in `server.py` so the same code runs on SQLite and PostgreSQL. SQLAlchemy model definitions are also available in `models.py` for future Alembic migrations.

Migration-friendly behavior:

- PostgreSQL uses `SERIAL` primary keys for auto-increment tables.
- SQLite keeps `INTEGER PRIMARY KEY AUTOINCREMENT`.
- Existing SQLite databases are upgraded in place with missing columns.
- Common indexes are created for member lookup, attendance dates, measurement dates, and payment dates.
- Every member gets a generated visible Member ID such as `HRP-000001`.
- Existing members are backfilled with generated Member IDs during startup.

### Demo Data

The app keeps default login users available, but demo members/cards are not inserted by default. To intentionally seed demo members for a temporary test environment, set:

```text
SEED_DEMO_DATA=true
```

Leave `SEED_DEMO_DATA` unset in production or when you want to manually add members yourself.

Main tables:

- `users`
- `members`
- `sessions`
- `measurements`
- `membership_cards`
- `attendance`
- `payments`
- `audit`
- `notifications`

## Goal-Based Progress Logic

The frontend ranks members by goal achievement score instead of raw scale-weight change.

- Weight Loss prioritizes fat mass lost, muscle gain or preservation, body fat percentage reduction, and only lightly considers scale weight reduction.
- Weight Gain prioritizes muscle gain, healthy weight gain, and body composition improvement.
- Health & Fitness uses a balanced body-composition score.

Member dashboards, weekly insights, member rows, history, and leaderboards adapt to the member's selected goal.

## Cloud Deployment

This app has no external Python package dependencies. It can deploy on any cloud that can run Python 3.12+ or a Docker container.

Required environment variables:

```text
HOST=0.0.0.0
PORT=<provided by cloud platform>
HEALTHRANK_DB=/data/app.db
```

For PostgreSQL deployments, use:

```text
DATABASE_URL=postgresql://user:password@host:5432/healthrank
```

`HEALTHRANK_DB` must point to persistent disk storage when using SQLite. Without a persistent disk, SQLite data will reset when the container is rebuilt or restarted on many platforms. PostgreSQL deployments do not need a mounted SQLite disk.

### Deploy With Docker

Build and run locally:

```powershell
docker build -t healthrank-pro .
docker run --rm -p 4173:4173 -v healthrank-data:/data healthrank-pro
```

Open:

```text
http://127.0.0.1:4173/
```

### Deploy To Render

This repository includes `render.yaml`.

1. Push this folder to GitHub.
2. In Render, create a new Blueprint from the repository.
3. Render will use the Dockerfile.
4. The blueprint creates a persistent disk mounted at `/data`.
5. The app health check is `/health`.

### Deploy To Railway / Fly.io / Other Docker Hosts

Use the included `Dockerfile`.

Set:

```text
HEALTHRANK_DB=/data/app.db
HOST=0.0.0.0
```

Mount a persistent volume at:

```text
/data
```

The platform should provide `PORT`; if not, expose/use `4173`.

### Deploy To Simple Python Hosts

Use:

```text
python server.py
```

The included `Procfile` is:

```text
web: python server.py
```

Make sure the host provides persistent storage for `HEALTHRANK_DB`.
