import prisma from './db';
import { loggerService } from './loggerService';
import { Application } from 'express';

const SEATS_MAP: any = {
    MECH: { GEN: 2, OBC: 1, SC: 1 },
    CS: { GEN: 2, OBC: 1, SC: 1 }
};

export const startBatchWorker = (app: Application) => {
    setInterval(async () => {
        const branches = ['CS', 'MECH'];
        const categories = ['GEN', 'OBC', 'SC'];

        // Feature #2: Dynamic Expiry Rules Matrix Allocation
        const isFastForward = app.get('isFastForwardEnabled') === true;
        // Switch ON hai to 30 seconds, varna standard 7 days lifecycle rules
        const EXPIRY_THRESHOLD_MS = isFastForward ? 30 * 1000 : 7 * 24 * 60 * 60 * 1000;

        // 1. First Pass: Sweeping Expired Active Offers
        try {
            const activeOffers = await prisma.candidate.findMany({
                where: { status: 'OFFER_EXTENDED', offerExtendedAt: { not: null } }
            });

            for (const candidate of activeOffers) {
                const extendedTime = new Date(candidate.offerExtendedAt!).getTime();
                const elapsed = Date.now() - extendedTime;

                if (elapsed >= EXPIRY_THRESHOLD_MS) {
                    await prisma.candidate.update({
                        where: { id: candidate.id },
                        data: { status: 'REJECTED', offerExtendedAt: null } // Transition parameters updated
                    });
                    loggerService.logActivity(
                        `⏱️ Timeline Expired: Offer for ${candidate.name} (${candidate.rollNumber}) auto-cancelled after window limit.`,
                        'ALERT'
                    );
                }
            }
        } catch (err: any) {
            console.error("Expiry sweep runtime engine fail:", err.message);
        }

        // 2. Second Pass: Dynamic Backfill Allocation Pool Processing
        for (const b of branches) {
            for (const cat of categories) {
                const maxSeats = SEATS_MAP[b][cat];

                const currentOffers = await prisma.candidate.findMany({
                    where: { branch: b, category: cat, status: { in: ['OFFER_EXTENDED', 'OFFER_ACCEPTED'] } }
                });

                if (currentOffers.length < maxSeats) {
                    const deficit = maxSeats - currentOffers.length;

                    const nextInLine = await prisma.candidate.findMany({
                        where: { branch: b, category: cat, status: 'WAITLISTED' },
                        orderBy: { finalTotalScore: 'desc' },
                        take: deficit
                    });

                    for (const candidate of nextInLine) {
                        await prisma.candidate.update({
                            where: { id: candidate.id },
                            data: {
                                status: 'OFFER_EXTENDED',
                                offerExtendedAt: new Date()
                            }
                        });
                        loggerService.logActivity(`⚡ Auto-Promotion Engine: Upgraded ${candidate.name} (${candidate.rollNumber}) from Waitlist to active Offer State [Deficit Filled].`, 'SUCCESS');
                    }
                }
            }
        }
    }, 3000);
};