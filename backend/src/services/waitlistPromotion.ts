import prisma from './db';
import { sendStatusEmail } from './notifier';

export async function promoteWaitlist(branch: string, category: string) {
    const nextCandidate = await prisma.candidate.findFirst({
        where: { branch, category, status: 'WAITLISTED' },
        orderBy: [
            { finalTotalScore: 'desc' },
            { btechPercentage: 'desc' },
            { age: 'desc' }
        ]
    });

    if (nextCandidate) {
        await prisma.candidate.update({
            where: { id: nextCandidate.id },
            data: {
                status: 'OFFER_EXTENDED',
                offerExtendedAt: new Date()
            }
        });

        const user = await prisma.user.findUnique({ where: { id: nextCandidate.userId } });
        if (user) {
            await sendStatusEmail(user.email, 'OFFER_EXTENDED_FROM_WAITLIST');
        }
    }
}