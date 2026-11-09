#!/usr/bin/env bash
# Runs the end-to-end database tests against a throwaway local Postgres 15+.
# Usage: PGURL=postgres://postgres@localhost:5432 ./supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
PGURL="${PGURL:-postgres://postgres@localhost:5432}"
psql "$PGURL/postgres" -q -c "drop database if exists everbound_test" -c "create database everbound_test"
DB="$PGURL/everbound_test"
psql "$DB" -q -v ON_ERROR_STOP=1 -f supabase/tests/local_supabase_shim.sql
for f in supabase/migrations/*.sql supabase/seed.sql; do psql "$DB" -q -v ON_ERROR_STOP=1 -f "$f"; done
psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/flow_test.sql | grep -E '^(---|ALL TESTS)'
