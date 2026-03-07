import postgres from "postgres";
import { config } from "../config.js";

export const db = postgres(config.databaseUrl, {
  ssl: 'require',
  prepare: false, // Disable prepared statements for Supabase PgBouncer (fixes XX000)
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => { }, // Suppress notices
  transform: {
    undefined: null,
  },
});

export type DbClient = typeof db;

