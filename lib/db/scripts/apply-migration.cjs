const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    console.log("Applying multi-tenancy migration...");

    await client.query(`ALTER TABLE company_settings DROP COLUMN IF EXISTS id`);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'company_settings' AND column_name = 'user_id'
        ) THEN
          ALTER TABLE company_settings ADD COLUMN user_id text PRIMARY KEY;
          ALTER TABLE company_settings ADD CONSTRAINT company_settings_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    console.log("company_settings: user_id column added as PK.");

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'clients' AND column_name = 'user_id'
        ) THEN
          ALTER TABLE clients ADD COLUMN user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE;
          CREATE INDEX IF NOT EXISTS clients_user_id_idx ON clients USING btree (user_id);
        END IF;
      END $$;
    `);
    console.log("clients: user_id column added.");

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'quotations' AND column_name = 'user_id'
        ) THEN
          ALTER TABLE quotations ADD COLUMN user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE;
          CREATE INDEX IF NOT EXISTS quotations_user_id_idx ON quotations USING btree (user_id);
        END IF;
      END $$;
    `);
    console.log("quotations: user_id column added.");

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'invoices' AND column_name = 'user_id'
        ) THEN
          ALTER TABLE invoices ADD COLUMN user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE;
          CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON invoices USING btree (user_id);
        END IF;
      END $$;
    `);
    console.log("invoices: user_id column added.");

    console.log("Migration complete.");
  } finally {
    await client.end();
  }
}

main().catch((err) => { console.error("Migration failed:", err); process.exit(1); });
