import 'dotenv/config';
import prisma from '../src/services/db'; // 🔥 Fix: Uses the globally adapted instance
import * as bcrypt from 'bcrypt';

async function main() {
    console.log('🌱 Seeding database with test cases...');

    await prisma.candidate.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('🌱 Generating mock candidate profiles...');

    const passwordHash = await bcrypt.hash('CompanySecurePass123!', 10);

    await prisma.user.create({
        data: {
            email: 'admin@company.co.in',
            passwordHash,
            role: 'ADMIN',
        },
    });

    const branches = ['MECH', 'ELEC', 'CS', 'IOT'];
    const categories = ['UR', 'OBC', 'SC', 'ST', 'EWS'];

    for (let i = 1; i <= 51; i++) {
        const branch = branches[i % branches.length];
        const category = categories[i % categories.length];
        const written = 50 + (i % 41);
        const btech = 65 + (i % 26);
        const age = 21 + (i % 8);
        const roll = `COMPANY-${branch}-${100 + i}`;

        const user = await prisma.user.create({
            data: {
                email: `${roll.toLowerCase()}@companytest.com`,
                passwordHash,
                role: 'CANDIDATE',
            },
        });

        await prisma.candidate.create({
            data: {
                userId: user.id,
                name: `Candidate-${i}`,
                rollNumber: roll,
                branch,
                category,
                btechPercentage: btech,
                age,
                status: 'APPLIED',
                writtenScore: written,
            },
        });
    }

    console.log('✅ Seeding complete. 51 users loaded.');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed with critical error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        console.log('🔌 Prisma disconnected safely.');
    });