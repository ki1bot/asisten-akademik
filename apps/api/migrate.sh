#!/bin/sh
set -eu

user_exists="$(psql "$DATABASE_URL" -tAc "SELECT to_regclass('public.\"User\"') IS NOT NULL")"
semester_exists="$(psql "$DATABASE_URL" -tAc "SELECT to_regclass('public.\"Semester\"') IS NOT NULL")"

if [ "$user_exists" = "f" ]; then
  psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f /migrations/20260726161333_init/migration.sql
fi

if [ "$semester_exists" = "f" ]; then
  psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f /migrations/20260803172740_initial_asistenakademik/migration.sql
fi