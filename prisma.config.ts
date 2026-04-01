// Load .env from project root when dotenv is available (npm run db:migrate).
// When using npx prisma, ensure .env exists and contains DATABASE_URL.
try {
  require("dotenv/config");
} catch {
  // ignore
}
import { defineConfig } from "prisma/config";

const databaseUrl = process.env["DATABASE_URL"];
// Migrate uses direct URL to avoid advisory lock timeout with Neon pooler (Prisma P1002).
const migrateUrl = process.env["DIRECT_URL"]?.trim() || databaseUrl;
if (!databaseUrl?.trim()) {
  throw new Error(
    "DATABASE_URL is required for Prisma. Add it to a .env file in the project root, e.g.:\n  DATABASE_URL=\"postgresql://USER:PASSWORD@localhost:5432/DATABASE\"\n\nIf using Docker: docker compose up -d then use the URL from docker-compose (e.g. postgresql://acenta:acenta@localhost:5432/acenta)."
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrateUrl,
  },
});
