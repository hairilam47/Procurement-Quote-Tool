-- Multi-tenancy migration: isolate all data per user
-- WARNING: purges all existing dev/test data before adding NOT NULL user_id columns

-- 1. Purge all dev/test data (dependent tables first due to FKs)
DELETE FROM line_items;
DELETE FROM invoice_line_items;
DELETE FROM quotations;
DELETE FROM invoices;
DELETE FROM clients;
DELETE FROM company_settings;

-- 2. company_settings: drop singleton id, add user_id as PK with FK to users
ALTER TABLE company_settings DROP COLUMN id;
ALTER TABLE company_settings ADD COLUMN user_id text PRIMARY KEY;
ALTER TABLE company_settings ADD CONSTRAINT company_settings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 3. clients: add user_id
ALTER TABLE clients ADD COLUMN user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX clients_user_id_idx ON clients USING btree (user_id);

-- 4. quotations: add user_id
ALTER TABLE quotations ADD COLUMN user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX quotations_user_id_idx ON quotations USING btree (user_id);

-- 5. invoices: add user_id
ALTER TABLE invoices ADD COLUMN user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX invoices_user_id_idx ON invoices USING btree (user_id);
