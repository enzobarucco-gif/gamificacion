#!/bin/bash
set -e

# Habilita extensiones requeridas en la base de datos de desarrollo
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  CREATE EXTENSION IF NOT EXISTS postgis;
EOSQL

echo "Extensiones pgcrypto y postgis habilitadas en $POSTGRES_DB"
