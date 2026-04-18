import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../apps/web/.env.local") });

const sql = neon(process.env.DATABASE_URL);

async function checkSeedData() {
  try {
    console.log("=== Saving Types ===");
    const savingTypes = await sql`SELECT * FROM saving_types ORDER BY id`;
    console.log(savingTypes);
    
    console.log("\n=== Currencies ===");
    const currencies = await sql`SELECT * FROM currencies ORDER BY code`;
    console.log(currencies);
  } catch (error) {
    console.error("Error:", error);
  }
}

checkSeedData();
