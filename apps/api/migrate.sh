#!/bin/sh
set -eu

exists="$(psql "$DATABASE_URL" -tAc "SELECT to_regclass('public.\"User\"') IS NOT NULL")"

if [ "$exists" = "f" ]; then
  psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f /migrations/20260726161333_init/migration.sql
  psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f /migrations/20260803172740_initial_asistenakademik/migration.sql
fi