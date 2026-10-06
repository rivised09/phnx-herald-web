import { PrismaClient } from '@prisma/client';

/**
 * The roster the site renders lives in the bot's Supabase database: the bot
 * scrapes the source and writes, this app reads. One client is kept on the
 * global object because Next reloads modules in development and a fresh client
 * per reload would leak a connection pool.
 */
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}
