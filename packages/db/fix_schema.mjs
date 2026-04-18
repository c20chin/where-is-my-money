import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../apps/web/.env.local") });

const sql = neon(process.env.DATABASE_URL);

async function fixSchema() {
  try {
    console.log("Dropping old investments table...");
    await sql`DROP TABLE IF EXISTS investments CASCADE`;
    
    console.log("Creating new investments table...");
    await sql`
      CREATE TABLE investments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        target_name VARCHAR(255) NOT NULL,
        percentage NUMERIC(5, 2) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    
    console.log("Verifying new schema...");
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'investments'
      ORDER BY ordinal_position
    `;
    console.log("New schema:");
    console.log(result);
  } catch (error) {
    console.error("Error:", error);
  }
}

fixSchema();
