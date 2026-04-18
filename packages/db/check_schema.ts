import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../../apps/web/.env.local") });

const sql = neon(process.env.DATABASE_URL!);

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
  } catch (error) {
    console.error("Error:", error);
  }
}

checkSchema();
