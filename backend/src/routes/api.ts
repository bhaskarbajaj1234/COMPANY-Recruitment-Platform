import { Router, Request, Response } from 'express';
import prisma from '../services/db';
import { verifyDigiLockerSandbox } from '../services/digilocker';
import { processWrittenShortlist } from '../services/shortlistEngine';
import { loggerService } from '../services/loggerService';

const router = Router();

// ==========================================
// LIVE EVENT STREAMING SYSTEM ROUTE
// ==========================================
router.get('/stream-logs', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendLog = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    loggerService.on('new-log', sendLog);

    req.on('close', () => {
        loggerService.off('new-log', sendLog);
        res.end();
    });
});

// ==========================================
// CANDIDATE ROUTES (Phase 2)
// ==========================================

router.get('/candidate/:identifier', async (req: Request, res: Response): Promise<any> => {
    const { identifier } = req.params;
    try {
        const candidate = await prisma.candidate.findUnique({
            where: { rollNumber: identifier }
        });

        if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
        res.json(candidate);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/candidate/verify', async (req: Request, res: Response): Promise<any> => {
    const { applicationId, documentId } = req.body;
    try {
        const isVerified = verifyDigiLockerSandbox(documentId);

        if (isVerified) {
            await prisma.candidate.update({
                where: { rollNumber: applicationId },
                data: { status: 'Document Verified (Phase 2 Ready)', isVerified: true }
            });
            loggerService.logActivity(`DigiLocker Verification Success for Application ID: ${applicationId}`, 'SUCCESS');
            res.json({ success: true, message: 'Verification successful' });
        } else {
            loggerService.logActivity(`DigiLocker Verification Refused/Failed for Application ID: ${applicationId}`, 'ALERT');
            res.status(400).json({ success: false, message: 'Verification failed' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Verification error' });
    }
});

// ==========================================
// ADMIN ROUTES (Phase 1 & Engine)
// ==========================================

router.get('/admin/candidates', async (req: Request, res: Response) => {
    try {
        const candidates = await prisma.candidate.findMany({
            orderBy: { writtenScore: 'desc' }
        });
        res.json(candidates);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch candidates' });
    }
});

router.post('/admin/shortlist', async (req: Request, res: Response): Promise<any> => {
    const { branch } = req.body;
    try {
        loggerService.logActivity(`Triggering Multi-Quota Round 1 shortlisting matrix for branch: ${branch}`, 'INFO');
        await processWrittenShortlist(branch);
        loggerService.logActivity(`Round 1 dynamic factor allocation finished for branch: ${branch}`, 'SUCCESS');
        res.json({ success: true, message: `${branch} branch shortlisting processed successfully.` });
    } catch (error: any) {
        loggerService.logActivity(`Round 1 shortlisting operational failure on ${branch}: ${error.message}`, 'ALERT');
        res.status(500).json({ error: error.message || 'Shortlisting failed' });
    }
});

router.post('/admin/upload-candidates', async (req: Request, res: Response): Promise<any> => {
    try {
        const { data } = req.body;
        if (!data || !Array.isArray(data)) {
            return res.status(400).json({ success: false, error: "Invalid data payload structure." });
        }

        loggerService.logActivity("Purging data grids. Wiping out historical database configurations...", 'ALERT');
        await prisma.candidate.deleteMany({});
        await prisma.user.deleteMany({ where: { role: 'CANDIDATE' } });

        let insertedCount = 0;

        for (const c of data) {
            if (!c.rollNumber) continue;

            const mockEmail = `${c.rollNumber.toLowerCase()}@company.in`;

            const user = await prisma.user.create({
                data: {
                    email: mockEmail,
                    passwordHash: "$2b$10$MOCKHASHMOCKHASHMOCKHA",
                    role: "CANDIDATE"
                }
            });

            await prisma.candidate.create({
                data: {
                    userId: user.id,
                    name: c.name || "Unknown",
                    rollNumber: c.rollNumber,
                    branch: c.branch,
                    category: c.category || "GEN",
                    writtenScore: parseFloat(c.writtenScore || "0"),
                    age: parseInt(c.age || '22'),
                    btechPercentage: parseFloat(c.btechPercentage || '75'),
                    status: 'APPLIED',
                    isVerified: false
                }
            });

            insertedCount++;
        }

        loggerService.logActivity(`Fresh registry batch processing finalized. Loaded ${insertedCount} structures into APPLIED state.`, 'SUCCESS');
        return res.json({ success: true, count: insertedCount, message: "Fresh registry batch created." });
    } catch (err: any) {
        loggerService.logActivity(`Batch initialization critical failure: ${err.message}`, 'ALERT');
        return res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/admin/update-marks', async (req: Request, res: Response): Promise<any> => {
    try {
        const { updates } = req.body;
        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ success: false, error: "Invalid updates layout." });
        }

        loggerService.logActivity("Injecting GD/PI performance metrics profiles...", 'INFO');

        for (const record of updates) {
            if (!record.rollNumber) continue;

            const target = await prisma.candidate.findUnique({ where: { rollNumber: record.rollNumber } });
            if (target && target.status === 'WRITTEN_SHORTLISTED') {
                await prisma.candidate.update({
                    where: { rollNumber: record.rollNumber },
                    data: {
                        gdScore: parseFloat(record.gdScore),
                        piScore: parseFloat(record.piScore),
                        status: 'MARKS_UPDATED'
                    }
                });
            }
        }

        const COMPANY_SEAT_LIMITS: any = {
            MECH: { GEN: 2, OBC: 1, SC: 1 },
            CS: { GEN: 2, OBC: 1, SC: 1 }
        };

        const activeGroups = ['CS-GEN', 'CS-OBC', 'CS-SC', 'MECH-GEN', 'MECH-OBC', 'MECH-SC'];

        for (const group of activeGroups) {
            const [branch, category] = group.split('-');
            const seatsAvailable = COMPANY_SEAT_LIMITS[branch][category];

            const pool = await prisma.candidate.findMany({
                where: { branch, category, NOT: { status: 'REJECTED_ROUND_1' } }
            });

            const evaluatedPool = pool.map(c => {
                const total = (c.writtenScore || 0) + (c.gdScore || 0) + (c.piScore || 0);
                return { ...c, computedTotal: total };
            }).sort((a, b) => b.computedTotal - a.computedTotal);

            for (let index = 0; index < evaluatedPool.length; index++) {
                const item = evaluatedPool[index];
                if (item.status === 'APPLIED') continue;

                let targetStatus = 'WAITLISTED';
                let extendedDate: Date | null = null;

                if (index < seatsAvailable) {
                    targetStatus = 'OFFER_EXTENDED';
                    extendedDate = new Date();
                    loggerService.logActivity(`SMTP Simulation Trigger: Allocation notification dispatched to ${item.name} (${item.rollNumber}).`, 'SUCCESS');
                } else {
                    loggerService.logActivity(`Rollover Action: Candidate ${item.rollNumber} allocated to Waitlisted dynamic tier.`, 'INFO');
                }

                await prisma.candidate.update({
                    where: { id: item.id },
                    data: {
                        status: targetStatus,
                        finalTotalScore: item.computedTotal,
                        offerExtendedAt: extendedDate
                    }
                });
            }
        }

        loggerService.logActivity("Selection pool limits synchronized and active offers locked.", 'SUCCESS');
        return res.json({ success: true, message: "Selection parameters locked successfully." });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/candidate/accept-offer', async (req: Request, res: Response): Promise<any> => {
    const { rollNumber } = req.body;
    try {
        const candidate = await prisma.candidate.update({
            where: { rollNumber },
            data: { status: 'OFFER_ACCEPTED' }
        });
        loggerService.logActivity(`Lifecycle Event: Allocation agreement confirmed by candidate ${candidate.name} (${rollNumber}).`, 'SUCCESS');
        return res.json({ success: true, message: "Offer secured." });
    } catch (err) {
        return res.status(500).json({ success: false });
    }
});

router.post('/candidate/decline-offer', async (req: Request, res: Response): Promise<any> => {
    const { rollNumber } = req.body;
    try {
        await prisma.candidate.update({
            where: { rollNumber },
            data: { status: 'OFFER_DECLINED' }
        });
        loggerService.logActivity(`Lifecycle Event: Candidate allocation contract explicitly DECLINED by ${rollNumber}. Waitlist recalculation pending.`, 'ALERT');
        return res.json({ success: true, message: "Offer declined successfully." });
    } catch (err) {
        return res.status(500).json({ success: false });
    }
});

router.post('/candidate/verify-digilocker', async (req: Request, res: Response): Promise<any> => {
    const { rollNumber } = req.body;
    try {
        const candidate = await prisma.candidate.update({
            where: { rollNumber },
            data: { isVerified: true }
        });
        loggerService.logActivity(`✉️ Mock Mail Dispatcher: Welcome & Verification notification sent to ${candidate.name}`, 'SUCCESS');
        return res.json({ success: true, message: "DigiLocker Identity Authenticated. System sync complete." });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/candidate/profile/:rollNumber', async (req: Request, res: Response): Promise<any> => {
    try {
        const candidate = await prisma.candidate.findUnique({
            where: { rollNumber: req.params.rollNumber }
        });
        if (!candidate) return res.status(404).json({ error: "Profile not found." });
        return res.json(candidate);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/admin/force-process', async (req, res) => {
    loggerService.logActivity("Manual override active: Instant batch promotion forced.", 'ALERT');
    res.json({ message: "Processed instantly!" });
});

router.get('/admin/simulation-mode', (req: Request, res: Response) => {
    const isEnabled = req.app.get('isFastForwardEnabled') === true;
    return res.json({ enabled: isEnabled });
});

router.post('/admin/simulation-toggle', (req: Request, res: Response) => {
    const { enabled } = req.body;
    req.app.set('isFastForwardEnabled', !!enabled);
    loggerService.logActivity(
        `⚙️ Simulation Matrix Altered: Fast-Forward Mode switched ${enabled ? 'ON (30s Window)' : 'OFF (7-Day Window)'}.`,
        'ALERT'
    );
    return res.json({ success: true, enabled: !!enabled });
});

export default router;