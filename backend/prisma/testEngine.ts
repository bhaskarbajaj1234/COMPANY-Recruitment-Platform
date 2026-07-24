// prisma/testEngine.ts
import { processWrittenShortlist } from '../src/services/shortlistEngine';
import prisma from '../src/services/db'; // 🔥 Re-routed to prevent parallel connection conflicts

async function runTest() {
    console.log('🚀 Testing COMPANY Shortlisting Engine Pipeline...');

    try {
        console.log('\n--- Processing MECH Branch Selection ---');
        await processWrittenShortlist('MECH');

        const results = await prisma.candidate.findMany({
            where: { branch: 'MECH' },
            select: {
                name: true,
                category: true,
                writtenScore: true,
                status: true,
                age: true
            },
            orderBy: { writtenScore: 'desc' }
        });

        console.log('\n📊 Final DB Status Report for MECH Branch:');
        console.table(results);

    } catch (error) {
        console.error('❌ Test failed with error:', error);
    } finally {
        await prisma.$disconnect();
        console.log('🔌 Test connection pool closed.');
    }
}

runTest();