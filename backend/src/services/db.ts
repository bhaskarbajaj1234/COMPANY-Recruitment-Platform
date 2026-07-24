import { PrismaClient } from '@prisma/client';

// Standard Prisma Client initialized for local SQLite
const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

export default prisma;