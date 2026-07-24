import prisma from './db';

export async function calculateFinalScores(branch: string) {
    const candidates = await prisma.candidate.findMany({
        where: { branch, status: 'INTERVIEW_COMPLETED' }
    });

    for (const candidate of candidates) {
        const written = candidate.writtenScore || 0;
        const gd = candidate.gdScore || 0;
        const pi = candidate.piScore || 0;

        const finalTotalScore = ((written / 100) * 75) + ((gd / 10) * 10) + ((pi / 15) * 15);

        await prisma.candidate.update({
            where: { id: candidate.id },
            data: { finalTotalScore, status: 'FINAL_EVALUATION' }
        });
    }
}