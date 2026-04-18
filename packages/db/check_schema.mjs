import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../apps/web/.env.local") });

const sql = neon(process.env.DATABASE_URL);

async function checkSchema() {
  try {
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'investments'
      ORDER BY ordinal_position;
    `;
    console.log("Current investments table schema:");
    console.log(result);
    
    console.log("\nDirect table check:");
    try {
      const test = await sql`SELECT * FROM investments LIMIT 0`;
      console.log("Table exists and is accessible");
    } catch (e) {
      console.log("Error accessing table:", e.message);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

checkSchema();
