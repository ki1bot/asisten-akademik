# KampusHub API

Backend API KampusHub menggunakan Go, Gin, GORM, PostgreSQL, Argon2id, dan JWT.

## Runtime

Backend dijalankan melalui Docker.

Dari root project:

```bash
docker compose up -d --build
```

Periksa:

```bash
docker compose ps
```

API tersedia di:

```text
http://localhost:3001/api
```

Health check:

```bash
curl http://localhost:3001/api/health
```

Response normal:

```json
{
  "service": "kampushub-api",
  "status": "ok",
  "timestamp": "..."
}
```

## Database

Backend terhubung ke PostgreSQL melalui Docker network menggunakan:

```text
postgres:5432
```

Database default:

```text
Database : kampushub
Username : kampushub
Password : kampushub
```

PostgreSQL dari host tersedia pada:

```text
localhost:5433
```

## Migration

Migration otomatis dijalankan oleh service:

```text
migrate
```

sebelum service API dijalankan.

Menjalankan migration secara manual:

```bash
docker compose run --rm migrate
```

Migration SQL berada di:

```text
apps/api/prisma/migrations
```

Folder tersebut hanya menjadi lokasi migration SQL.

Prisma ORM tidak digunakan oleh backend Go.

## Verifikasi Backend

Tidak diperlukan instalasi Go pada Windows.

Build verifier dari root project:

```bash
docker compose --profile verify build api-verify
```

Jalankan:

```bash
docker compose --profile verify run --rm api-verify
```

Verifier menjalankan:

```text
gofmt check
go vet ./...
go test ./...
go build
```

Jika container selesai dengan exit code `0`, backend lolos verifikasi.

## Log API

```bash
docker compose logs -f api
```

Keluar menggunakan `Ctrl+C`.

API tetap berjalan di background.

## Restart API

```bash
docker compose restart api
```

Jika source backend berubah:

```bash
docker compose up -d --build api
```

Karena service API menggunakan binary Go yang dibangun di dalam image, perubahan source membutuhkan rebuild image.

## PostgreSQL Shell

```bash
docker compose exec postgres psql -U kampushub -d kampushub
```

Keluar:

```text
\q
```

## Endpoint

Health:

```text
GET /api/health
```

Authentication:

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/verify-email
POST   /api/auth/logout
POST   /api/auth/logout-all
GET    /api/auth/me
GET    /api/auth/sessions
DELETE /api/auth/sessions/:id
```

Semester:

```text
GET    /api/semesters
GET    /api/semesters/:id
POST   /api/semesters
PATCH  /api/semesters/:id
DELETE /api/semesters/:id
```

Mata kuliah:

```text
GET    /api/courses
GET    /api/courses/:id
POST   /api/courses
PATCH  /api/courses/:id
DELETE /api/courses/:id
```

Jadwal:

```text
GET    /api/schedules
GET    /api/schedules/:id
POST   /api/schedules
PATCH  /api/schedules/:id
DELETE /api/schedules/:id
```

Tugas:

```text
GET    /api/assignments
GET    /api/assignments/:id
POST   /api/assignments
PATCH  /api/assignments/:id
DELETE /api/assignments/:id
```

Ujian:

```text
GET    /api/exams
GET    /api/exams/:id
POST   /api/exams
PATCH  /api/exams/:id
DELETE /api/exams/:id
```

Presensi:

```text
GET    /api/attendances
GET    /api/attendances/summary
GET    /api/attendances/:id
POST   /api/attendances
PATCH  /api/attendances/:id
DELETE /api/attendances/:id
```

Nilai:

```text
GET    /api/grades
GET    /api/grades/scale
GET    /api/grades/gpa
GET    /api/grades/:id
POST   /api/grades
PATCH  /api/grades/:id
DELETE /api/grades/:id
```

Notifikasi:

```text
GET    /api/notifications
GET    /api/notifications/unread-count
PATCH  /api/notifications/read-all
PATCH  /api/notifications/:id/read
DELETE /api/notifications/:id
```

Dashboard:

```text
GET /api/dashboard
```
