#!/bin/bash
set -e
pnpm install --frozen-lockfile
node lib/db/scripts/apply-migration.cjs
