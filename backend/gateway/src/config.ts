// Environment variables are loaded by env.ts (imported first in server.ts)

const required = (value: string | undefined, key: string) => {
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

console.error('[CONFIG] Building config object...');
console.error('[CONFIG] process.env.SUPABASE_URL:', process.env.SUPABASE_URL?.substring(0, 30) + '...');
console.error('[CONFIG] process.env.SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'MISSING');

export const config = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "0.0.0.0",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  databaseUrl: process.env.DATABASE_URL || "postgres://loom:loom_dev_password@localhost:5432/loom_db",
  analyzerUrl: process.env.ANALYZER_URL || "http://127.0.0.1:8000",
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-123',
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,

  // Supabase Configuration
  // Note: These are validated at runtime by the auth middleware
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

  githubApiKey: process.env.GITHUB_API_KEY,
  githubClientId: process.env.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
  // polarAccessToken: process.env.POLAR_ACCESS_TOKEN, // Removed
  // polarOrganizationId: process.env.POLAR_ORGANIZATION_ID, // Removed
  // polarWebhookSecret: process.env.POLAR_WEBHOOK_SECRET, // Removed
  isProduction: process.env.NODE_ENV === "production",
};
