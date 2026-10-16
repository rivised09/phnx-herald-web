import { PrismaClient } from '@prisma/client';

/**
 * The roster the site renders lives in the dedicated roster (scraping)
 * Supabase database - DATABASE_URL_ROSTER in .env.local - which the bot
 * writes and this app reads. One client is kept on the global object because
 * Next reloads modules in development and a fresh client per reload would
 * leak a connection pool.
 */
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}
