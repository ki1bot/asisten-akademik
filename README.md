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

- Go 1.27
- Node.js 22 atau lebih baru
- pnpm 11
- Docker Desktop
- PostgreSQL
- Expo Go untuk pengujian pada ponsel

## Menjalankan dengan Docker

Jalankan dari root project:

```bash
docker compose up -d --build