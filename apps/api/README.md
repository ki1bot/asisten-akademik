# KampusHub API

Backend API Asisten Akademik menggunakan Go, Gin, GORM, PostgreSQL, Argon2id, dan JWT.

## Teknologi

- Go
- Gin
- GORM
- PostgreSQL
- Argon2id
- JWT

## Menjalankan dengan Docker Compose

Jalankan perintah dari root project:

```bash
docker compose up -d --build
```

Periksa seluruh service:

```bash
docker compose ps
```

API berjalan di:

```text
http://localhost:3001/api
```

Web berjalan di:

```text
http://localhost:3000
```

Expo development server berjalan di:

```text
http://localhost:8081
```

Health check API:

```bash
curl http://localhost:3001/api/health
```

Contoh response:

```json
{
  "service": "kampushub-api",
  "status": "ok",
  "timestamp": "2026-10-01T13:33:45.236990594Z"
}
```

## Menjalankan Backend Go Secara Lokal

Backend Go membutuhkan PostgreSQL.

Dari root project, nyalakan PostgreSQL terlebih dahulu:

```bash
docker compose up -d postgres redis
```

Periksa statusnya:

```bash
docker compose ps
```

PostgreSQL harus berstatus:

```text
healthy
```

Jalankan migration:

```bash
docker compose run --rm migrate
```

Kemudian masuk ke backend:

```bash
cd apps/api
```

Download dependency:

```bash
go mod download
```

Jalankan backend:

```bash
go run .
```

API akan berjalan di:

```text
http://localhost:3001
```

Health check:

```bash
curl http://localhost:3001/api/health
```

## Verifikasi Backend

Dari folder:

```text
apps/api
```

jalankan:

```bash
go mod tidy
go fmt ./...
go vet ./...
go test ./...
go build -o ./bin/api.exe .
```

Binary hasil build akan berada di:

```text
apps/api/bin/api.exe
```

Folder `bin` tidak disimpan ke Git.

Jika hanya ingin memeriksa apakah source dapat dikompilasi tanpa menyimpan binary permanen, hapus binary setelah build:

```bash
rm -f ./bin/api.exe
```

## Menjalankan Verifikasi dari Root Project

Jika terminal sedang berada di root project, jangan menjalankan:

```bash
go mod download
```

karena file `go.mod` berada di:

```text
apps/api
```

Gunakan:

```bash
go -C apps/api mod download
```

Untuk format:

```bash
go -C apps/api fmt ./...
```

Untuk vet:

```bash
go -C apps/api vet ./...
```

Untuk test:

```bash
go -C apps/api test ./...
```

Untuk build:

```bash
mkdir -p apps/api/bin
go -C apps/api build -o ./bin/api.exe .
```

## Database

Pada environment Docker Compose, API terhubung ke PostgreSQL menggunakan:

```text
postgresql://kampushub:kampushub@postgres:5432/kampushub?sslmode=disable
```

Ketika backend Go dijalankan langsung dari Windows, koneksi menggunakan:

```text
postgresql://kampushub:kampushub@localhost:5433/kampushub?sslmode=disable
```
