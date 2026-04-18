import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../apps/web/.env.local") });

const sql = neon(process.env.DATABASE_URL);

async function checkDuplicates() {
  try {
    const result = await sql`
      SELECT id, account_name, bank_name, deleted_at,
             length(account_name) as name_length
      FROM accounts 
      WHERE bank_name = 'Revolut' 
        AND (account_name = 'Stock' OR account_name = 'Stock ')
      ORDER BY account_name
    `;
    console.log("Revolut 'Stock' accounts:");
    console.log(result);
  } catch (error) {
    console.error("Error:", error);
  }
}

checkDuplicates();
