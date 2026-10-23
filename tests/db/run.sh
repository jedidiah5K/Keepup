#!/bin/sh
# Runs the KeepUp migrations and RLS checks on a throwaway Postgres (PGHOST/PGPORT/PGUSER from env).
set -e
cd "$(dirname "$0")/../.."
P="psql -v ON_ERROR_STOP=1 -q -At"
$P -c "drop database if exists keepup_test" -c "create database keepup_test" >/dev/null
$P -d keepup_test -f tests/db/supabase_stub.sql >/dev/null
for f in supabase/migrations/*.sql; do $P -d keepup_test -f "$f" 2>&1 | grep -v 'does not exist, skipping' || true; done
$P -d keepup_test -f tests/db/rls_test.sql 2>&1 | grep -E 'ok:|FAILED|ERROR' | sed 's/.*NOTICE:  //'
