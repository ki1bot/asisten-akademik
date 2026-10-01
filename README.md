# KampusHub

KampusHub adalah platform produktivitas akademik untuk mengelola semester, mata kuliah, jadwal, tugas, ujian, presensi, nilai, IP, IPK, dan notifikasi.

## Struktur

- `apps/api`: Go, Gin, GORM, PostgreSQL, JWT, Argon2id
- `apps/web`: Next.js, React, TypeScript, Tailwind CSS, TanStack Query
- `apps/mobile`: Expo, React Native, Expo Router, Secure Store
- `packages/contracts`: kontrak tipe bersama
- `packages/validation`: schema validasi bersama
- `packages/api-client`: konfigurasi Axios bersama

## Persyaratan

Untuk menjalankan seluruh project secara lokal hanya diperlukan:

- Git
- Docker Desktop

Go, Node.js, pnpm, PostgreSQL, dan Redis tidak diperlukan pada host jika seluruh workflow dijalankan melalui Docker.

## Menjalankan Project

Dari root project jalankan:

```bash
docker compose up -d --build
```

Docker akan menjalankan:

```text
PostgreSQL
Redis
Database migration
Go API
Next.js web
Expo mobile development server
```

Periksa status:

```bash
docker compose ps
```

Service utama yang diharapkan aktif:

```text
api        healthy
mobile     healthy
postgres   healthy
redis      healthy
web        healthy
```

Service `migrate` akan berstatus `Exited` setelah migration selesai.

Status tersebut normal karena `migrate` merupakan one-shot container.

## URL Development

Web:

```text
http://localhost:3000
```

API:

```text
http://localhost:3001/api
```

Expo development server:

```text
http://localhost:8081
```

PostgreSQL dari host:

```text
localhost:5433
```

Redis dari host:

```text
localhost:6380
```

## Health Check API

Jalankan:

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

## Melihat Log

Seluruh service:

```bash
docker compose logs -f
```

API:

```bash
docker compose logs -f api
```

Web:

```bash
docker compose logs -f web
```

Mobile:

```bash
docker compose logs -f mobile
```

PostgreSQL:

```bash
docker compose logs -f postgres
```

Redis:

```bash
docker compose logs -f redis
```

Keluar dari tampilan log dengan `Ctrl+C`.

Container tetap berjalan.

## Menghentikan Project

```bash
docker compose down
```

Perintah tersebut tidak menghapus data PostgreSQL maupun Redis.

## Menjalankan Kembali Project

```bash
docker compose up -d
```

Jika source code berubah dan image perlu dibangun ulang:

```bash
docker compose up -d --build
```

## Verifikasi Backend Go di Docker

Backend tidak perlu diverifikasi menggunakan Go yang terpasang di Windows.

Build image verifier:

```bash
docker compose --profile verify build api-verify
```

Jalankan:

```bash
docker compose --profile verify run --rm api-verify
```

Container akan menjalankan:

```text
gofmt check
go vet ./...
go test ./...
go build
```

Jika perintah selesai dengan exit code `0`, backend Go lolos verifikasi.

## Verifikasi Frontend di Docker

Tidak perlu menjalankan `pnpm verify` di Windows.

Build verifier:

```bash
docker compose --profile verify build frontend-verify
```

Jalankan:

```bash
docker compose --profile verify run --rm frontend-verify
```

Container akan menjalankan:

```text
pnpm verify
Expo web export
```

Verifikasi tersebut meliputi shared packages, TypeScript, ESLint, Next.js production build, mobile typecheck, mobile lint, dan Expo bundle.

## Verifikasi Seluruh Project

Build kedua verifier:

```bash
docker compose --profile verify build api-verify frontend-verify
```

Verifikasi backend:

```bash
docker compose --profile verify run --rm api-verify
```

Verifikasi frontend:

```bash
docker compose --profile verify run --rm frontend-verify
```

Kemudian build dan jalankan project:

```bash
docker compose up -d --build
```

Periksa:

```bash
docker compose ps
```

Health check:

```bash
curl http://localhost:3001/api/health
```

## Database

Di dalam jaringan Docker, API terhubung ke PostgreSQL menggunakan:

```text
postgres:5432
```

Default database:

```text
Database : kampushub
Username : kampushub
Password : kampushub
```

Dari host Windows, PostgreSQL tersedia melalui:

```text
localhost:5433
```

Migration SQL berada di:

```text
apps/api/prisma/migrations
```

Folder tersebut hanya digunakan sebagai lokasi migration SQL.

Backend tidak lagi menggunakan Prisma ORM.

## Menjalankan Migration Secara Manual

Migration otomatis dijalankan sebelum API.

Jika ingin menjalankannya secara manual:

```bash
docker compose run --rm migrate
```

## Masuk ke PostgreSQL

Tidak perlu memasang `psql` di Windows.

Gunakan:

```bash
docker compose exec postgres psql -U kampushub -d kampushub
```

Keluar dari PostgreSQL:

```text
\q
```

## Masuk ke Redis

Tidak perlu memasang Redis CLI di Windows.

Gunakan:

```bash
docker compose exec redis redis-cli
```

Uji Redis:

```text
PING
```

Response:

```text
PONG
```

Keluar:

```text
exit
```

## Membersihkan Container

Hentikan dan hapus container:

```bash
docker compose down
```

Hapus container dan image project:

```bash
docker compose down --rmi local
```

Jangan gunakan:

```bash
docker compose down -v
```

jika ingin mempertahankan database.

Opsi `-v` akan menghapus volume PostgreSQL dan Redis.

## Dependency Host

Karena seluruh runtime dan verification dapat dijalankan melalui Docker, dependency berikut tidak wajib dipasang pada Windows:

```text
Go
Node.js
pnpm
PostgreSQL
Redis
```

Dependency tersebut tetap boleh dipasang untuk kebutuhan editor atau tooling pribadi, tetapi project tidak bergantung padanya untuk dapat berjalan.
