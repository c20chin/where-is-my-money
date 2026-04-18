import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../apps/web/.env.local") });

const sql = neon(process.env.DATABASE_URL);

async function checkInvestments() {
  try {
    const result = await sql`
      SELECT target_name, percentage 
      FROM investments 
      ORDER BY target_name
    `;
    console.log("Current investment targets:");
    console.log(result);
  } catch (error) {
    console.error("Error:", error);
  }
}

checkInvestments();
