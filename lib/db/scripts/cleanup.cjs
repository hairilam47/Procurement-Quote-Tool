const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("DELETE FROM line_items");
    await client.query("DELETE FROM invoice_line_items");
    await client.query("DELETE FROM quotations");
    await client.query("DELETE FROM invoices");
    await client.query("DELETE FROM clients");
    await client.query("DELETE FROM company_settings");
    console.log("Pre-migration data cleanup complete.");
  } finally {
    await client.end();
  }
}

main().catch((err) => { console.error("Cleanup failed:", err); process.exit(1); });
