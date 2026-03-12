import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local for local dev (no-op on Vercel where env vars are injected)
config({ path: path.resolve(__dirname, ".env.local") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"]!,
  },
});
