import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load env from the web app's .env.local or root .env
config({ path: "../../apps/web/.env.local" });
config({ path: "../../.env" });

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
