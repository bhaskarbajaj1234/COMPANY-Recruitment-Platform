// backend/src/services/shortlistEngine.ts
import prisma from './db';

const COMPANY_VACANCIES: any = {
    MECH: { GEN: 2, OBC: 1, SC: 1 },
    CS: { GEN: 2, OBC: 1, SC: 1 }
};

export async function processWrittenShortlist(branch: string) {
    const branchVacancies = COMPANY_VACANCIES[branch];
    if (!branchVacancies) throw new Error("Invalid Branch selection");

    const categories = Object.keys(branchVacancies);

    for (const category of categories) {
        const seats = branchVacancies[category];
        const allowedToCall = seats * 12; // 1:12 Multiplier Pool Rule

        const candidates = await prisma.candidate.findMany({
            where: { branch, category, status: 'APPLIED' },
            orderBy: { writtenScore: 'desc' },
        });

        if (candidates.length === 0) continue;

        // Dynamic Cutoff Matrix Definition
        let targetLimit = Math.min(allowedToCall, candidates.length);
        const cutoffCandidate = candidates[targetLimit - 1];
        const cutoffScore = cutoffCandidate.writtenScore; // 🔥 Cutoff Explicit Setup

        console.log(`📐 Cutoff calculated for ${branch}-${category}: ${cutoffScore}`);

        // Pass Matrix
        const shortlistedIds = candidates
            .filter(c => c.writtenScore >= cutoffScore)
            .map(c => c.id);

        await prisma.candidate.updateMany({
            where: { id: { in: shortlistedIds } },
            data: { status: 'WRITTEN_SHORTLISTED' },
        });

        // Eliminate Matrix
        const rejectedIds = candidates
            .filter(c => c.writtenScore < cutoffScore)
            .map(c => c.id);

        await prisma.candidate.updateMany({
            where: { id: { in: rejectedIds } },
            data: { status: 'REJECTED_ROUND_1' }
        });
    }
}