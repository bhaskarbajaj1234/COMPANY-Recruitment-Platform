import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function CandidatePortal() {
    const [rollNumber, setRollNumber] = useState<string>('COMPANY-CS-001');
    const [candidate, setCandidate] = useState<any>(null);
    const [notice, setNotice] = useState<string>('');

    const fetchProfile = async () => {
        if (!rollNumber) return;
        try {
            const res = await api.get(`/candidate/profile/${rollNumber.toUpperCase()}`);
            setCandidate(res.data);
        } catch (err) {
            console.error("Profile sync failure", err);
            setNotice("❌ Profile not found in the current recruitment batch.");
            setCandidate(null);
        }
    };

    // Live sync interval to track real-time admin shortlist & offer movements
    useEffect(() => {
        if (candidate) {
            const interval = setInterval(fetchProfile, 3000);
            return () => clearInterval(interval);
        }
    }, [candidate?.rollNumber]);

    const handleAction = async (actionType: 'accept' | 'decline' | 'digilocker') => {
        try {
            let endpoint = '';
            if (actionType === 'accept') endpoint = '/candidate/accept-offer';
            if (actionType === 'decline') endpoint = '/candidate/decline-offer';
            if (actionType === 'digilocker') endpoint = '/candidate/verify-digilocker';

            await api.post(endpoint, { rollNumber: candidate.rollNumber });

            if (actionType === 'digilocker') {
                setNotice("📧 DigiLocker Verification Successful! Syncing profile status...");
            } else if (actionType === 'accept') {
                setNotice("🎉 Appointment Offer Formally Secured!");
            } else {
                setNotice("❌ Employment Position Declined.");
            }
            fetchProfile();
        } catch (err) {
            setNotice("⚠️ Operational transaction error.");
        }
    };

    const renderTimer = (extendedAtString: string) => {
        if (!extendedAtString) return '-';
        const extendedDate = new Date(extendedAtString);
        const expiryDate = new Date(extendedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        const diffTime = expiryDate.getTime() - new Date().getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) return <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Expired</span>;
        return <span style={{ color: '#d97706', fontWeight: '600' }}>⏳ {diffDays} days left</span>;
    };

    return (
        <div style={{ padding: '40px 24px', fontFamily: '"Segoe UI", Roboto, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '750px', backgroundColor: '#0f172a', padding: '36px', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>

                <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', textAlign: 'center', color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
                    Candidate Recruitment Portal
                </h2>

                {/* Search Bar Block */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
                    <input type="text" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="Enter Roll Number" style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #475569', background: '#1e293b', color: 'white', fontSize: '15px' }} />
                    <button onClick={fetchProfile} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '0 24px', borderRadius: '8px', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>Search</button>
                </div>

                {notice && (
                    <div style={{ padding: '12px 16px', background: '#1e293b', borderLeft: '4px solid #38bdf8', color: '#38bdf8', marginBottom: '24px', borderRadius: '4px', fontSize: '14px', fontFamily: 'monospace' }}>
                        {notice}
                    </div>
                )}

                {candidate ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* Profile Info Grid */}
                        <div style={{ background: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                            <div>
                                <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>FULL NAME</span>
                                <span style={{ fontSize: '16px', fontWeight: '600' }}>{candidate.name}</span>
                            </div>
                            <div>
                                <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>ROLL NUMBER</span>
                                <span style={{ fontSize: '16px', fontWeight: '600', color: '#38bdf8' }}>{candidate.rollNumber}</span>
                            </div>
                            <div>
                                <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>BRANCH & SEGMENT</span>
                                <span style={{ fontSize: '16px', fontWeight: '600' }}>{candidate.branch} ({candidate.category})</span>
                            </div>
                            <div>
                                <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>CURRENT REGISTRY STATUS</span>
                                <span style={{ fontSize: '16px', fontWeight: '700', color: '#fbbf24' }}>{candidate.status}</span>
                            </div>
                        </div>

                        {/* Lifecycle Interactive Container */}
                        <div style={{ background: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>

                            {/* Phase 1: DigiLocker Capture */}
                            {!candidate.isVerified && (
                                <div>
                                    <h4 style={{ margin: '0 0 8px 0', color: '#fbbf24' }}>⚠️ Mandatory Identity Verification</h4>
                                    <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#94a3b8', lineHeight: '1.5' }}>To process your placement file at COMPANY, verification via legal DigiLocker API parameters is mandatory.</p>
                                    <button onClick={() => handleAction('digilocker')} style={{ background: '#ea580c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>🔗 Authenticate via DigiLocker</button>
                                </div>
                            )}

                            {/* Phase 2: Verified, Awaiting Shortlist */}
                            {candidate.isVerified && candidate.status === 'APPLIED' && (
                                <div>
                                    <h4 style={{ margin: '0 0 8px 0', color: '#34d399' }}>✅ Profile Records Authenticated</h4>
                                    <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', lineHeight: '1.5' }}>Your credentials have been securely linked. Screening test cutoffs are being calculated by the administrative node. Keep monitoring this space.</p>
                                </div>
                            )}

                            {/* Phase 3: Shortlisted in Round 1 */}
                            {candidate.status === 'WRITTEN_SHORTLISTED' && (
                                <div>
                                    <h4 style={{ margin: '0 0 8px 0', color: '#38bdf8' }}>🎉 Congratulations! Shortlisted for Round-2</h4>
                                    <p style={{ margin: 0, fontSize: '14px', color: '#cbd5e1', lineHeight: '1.5' }}>Your written score of <strong>{candidate.writtenScore}</strong> has cleared the bracket matrix. Details regarding Group Discussion & Personal Interview schedules have been logged to your registered email node.</p>
                                </div>
                            )}

                            {/* Phase 4: Eliminated in Round 1 */}
                            {candidate.status === 'REJECTED_ROUND_1' && (
                                <div>
                                    <h4 style={{ margin: '0 0 8px 0', color: '#f87171' }}>Recruitment Notice: Stage 1 Concluded</h4>
                                    <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', lineHeight: '1.5' }}>We regret to inform you that your tier performance values did not meet the exact 1:12 capacity metrics threshold calculated for this batch category.</p>
                                </div>
                            )}

                            {/* Phase 5: Selection Offer Sheet (The Core Workflow) */}
                            {candidate.status === 'OFFER_EXTENDED' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                        <div>
                                            <h4 style={{ margin: '0 0 6px 0', color: '#34d399', fontSize: '18px' }}>🔥 Provisional Appointment Offer Issued!</h4>
                                            <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Aggregate Merit: <strong>{candidate.finalTotalScore} Points</strong> (Written: {candidate.writtenScore} | GD: {candidate.gdScore} | PI: {candidate.piScore})</span>
                                        </div>
                                        <div style={{ background: '#7c2d12', color: '#ffedd5', padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}>
                                            {renderTimer(candidate.offerExtendedAt)}
                                        </div>
                                    </div>
                                    <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#94a3b8', lineHeight: '1.5' }}>COMPANY has officially generated an employment assignment matrix for your account profiles. Secure your confirmation triggers before the validity window closes.</p>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button onClick={() => handleAction('accept')} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Accept Corporate Offer</button>
                                        <button onClick={() => handleAction('decline')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Decline Position</button>
                                    </div>
                                </div>
                            )}

                            {/* Phase 6: Waitlisted Cluster */}
                            {candidate.status === 'WAITLISTED' && (
                                <div>
                                    <h4 style={{ margin: '0 0 8px 0', color: '#fbbf24' }}>Registry Status: Pool Waitlist Active</h4>
                                    <p style={{ margin: 0, fontSize: '14px', color: '#cbd5e1', lineHeight: '1.5' }}>Your total score of <strong>{candidate.finalTotalScore}</strong> is verified. Current seat quotas are saturated. You are now safely positioned in the waitlist matrix loop. If any primary selected candidate declines their contract assignment, the engine will instantly auto-promote you based on your merit hierarchy rank.</p>
                                </div>
                            )}

                            {/* Phase 7: Locked Finals */}
                            {(candidate.status === 'OFFER_ACCEPTED' || candidate.status === 'OFFER_DECLINED') && (
                                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                                    <h4 style={{ margin: '0 0 6px 0', color: candidate.status === 'OFFER_ACCEPTED' ? '#34d399' : '#f87171' }}>
                                        {candidate.status === 'OFFER_ACCEPTED' ? "🎉 Selection Finalized & Contract Signed!" : "💼 Position Application Closed"}
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Decisions are permanently encrypted inside systemic tables.</p>
                                </div>
                            )}

                        </div>

                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '36px', border: '2px dashed #334155', borderRadius: '8px', color: '#64748b', fontSize: '14px' }}>
                        Provide your verified Roll Number above to inspect active status panels.
                    </div>
                )}

            </div>
        </div>
    );
}