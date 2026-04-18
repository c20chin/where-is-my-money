import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../apps/web/.env.local") });

const sql = neon(process.env.DATABASE_URL);

async function checkData() {
  try {
    console.log("=== Accounts ===");
    const accounts = await sql`SELECT id, account_name, bank_name, deleted_at FROM accounts WHERE deleted_at IS NULL`;
    console.log(accounts);
    
    console.log("\n=== Balance Snapshots ===");
    const snapshots = await sql`SELECT year, month, COUNT(*) as count FROM balance_snapshots GROUP BY year, month ORDER BY year DESC, month DESC`;
    console.log(snapshots);
    
    console.log("\n=== Current Year (2026) Snapshots ===");
    const current = await sql`SELECT * FROM balance_snapshots WHERE year = 2026 ORDER BY month DESC LIMIT 5`;
    console.log(current);
  } catch (error) {
    console.error("Error:", error);
  }
}

checkData();
