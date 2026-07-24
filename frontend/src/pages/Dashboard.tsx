import React, { useEffect, useState, useRef } from 'react';
import api, { getAllCandidates, triggerShortlist, getSimulationMode, toggleSimulationMode } from '../services/api';

interface LogItem {
    id: string;
    timestamp: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'ALERT';
}

export default function Dashboard() {
    // Authentication Layer State (Feature #3)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return localStorage.getItem('company_admin_session') === 'active';
    });
    const [emailInput, setEmailInput] = useState<string>('');
    const [passwordInput, setPasswordInput] = useState<string>('');
    const [authError, setAuthError] = useState<string>('');

    const [candidates, setCandidates] = useState<any[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
    const [actionMessage, setActionMessage] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);

    // System Event Streaming & Simulation State Layers
    const [logs, setLogs] = useState<LogItem[]>([]);
    const [isFastForward, setIsFastForward] = useState<boolean>(false);
    const terminalEndRef = useRef<HTMLDivElement>(null);

    const fetchCandidates = async () => {
        if (!isAuthenticated) return; // Unauthorized direct entry blocks data grid loads completely
        try {
            const { data } = await getAllCandidates();
            setCandidates(data);
        } catch (error) {
            console.error("Failed to fetch candidates from registry", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSimulationStatus = async () => {
        if (!isAuthenticated) return;
        try {
            const { data } = await getSimulationMode();
            setIsFastForward(data.enabled);
        } catch (error) {
            console.error("Failed to sync simulation state", error);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchCandidates();
            fetchSimulationStatus();
            const interval = setInterval(fetchCandidates, 3000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated]);

    // Server-Sent Events Connection Hook
    useEffect(() => {
        if (!isAuthenticated) return;

        const eventSource = new EventSource('http://localhost:5000/api/stream-logs');

        eventSource.onmessage = (event) => {
            const newLog: LogItem = JSON.parse(event.data);
            setLogs((prevLogs) => [...prevLogs.slice(-29), newLog]);
        };

        return () => eventSource.close();
    }, [isAuthenticated]);

    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Simple Gatekeeper Authentication Execution Handler
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (emailInput === 'admin@company.in' && passwordInput === 'company2026') {
            localStorage.setItem('company_admin_session', 'active');
            setIsAuthenticated(true);
            setAuthError('');
        } else {
            setAuthError('❌ Unauthorized Entry! Access Denied for this node context.');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('company_admin_session');
        setIsAuthenticated(false);
        setCandidates([]);
    };

    const handleSimulationToggle = async () => {
        const targetState = !isFastForward;
        try {
            const { data } = await toggleSimulationMode(targetState);
            setIsFastForward(data.enabled);
            setActionMessage(`Simulation State Changed: Fast-Forward mode switched ${data.enabled ? 'ON (30s Windows)' : 'OFF (7-Day Windows)'}`);
        } catch (error) {
            setActionMessage("❌ Failed to switch operational runtime simulation criteria.");
        }
    };

    const handleShortlist = async (branch: string) => {
        setActionMessage(`Processing multi-quota shortlisting for ${branch}...`);
        try {
            await triggerShortlist(branch);
            setActionMessage(`✅ Round-1 Elimination complete for ${branch}! Non-quota qualifiers dropped.`);
            setSelectedBranch(branch);
            fetchCandidates();
        } catch (error) {
            setActionMessage(`❌ Error executing shortlist matrix for ${branch}`);
        }
    };

    const parseCSV = (text: string) => {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            return headers.reduce((obj: any, header, index) => {
                obj[header] = values[index];
                return obj;
            }, {});
        });
    };

    const handleInitialCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setActionMessage("Initializing database purge & fresh batch registry load...");
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const csvData = parseCSV(event.target?.result as string);
                const res = await api.post('/admin/upload-candidates', { data: csvData });
                if (res.data.success) {
                    setActionMessage("✅ Previous datasets wiped out successfully! Fresh batch loaded in APPLIED state.");
                } else {
                    setActionMessage(`❌ Grid Failure: ${res.data.error}`);
                }
                fetchCandidates();
            } catch (err) {
                setActionMessage("❌ Failed parsing targeted candidate record stream");
            }
        };
        reader.readAsText(file);
    };

    const handleMarksCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setActionMessage("Parsing performance metrics map...");
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const csvData = parseCSV(event.target?.result as string);
                const res = await api.post('/admin/update-marks', { updates: csvData });
                if (res.data.success) {
                    setActionMessage("✅ GD/PI scores aligned. Selection pools routed successfully.");
                } else {
                    setActionMessage(`❌ Engine Error: ${res.data.error}`);
                }
                fetchCandidates();
            } catch (err) {
                setActionMessage("❌ Score injection validation rejected");
            }
        };
        reader.readAsText(file);
    };

    const renderTimer = (extendedAtString: string) => {
        if (!extendedAtString) return '-';
        const extendedDate = new Date(extendedAtString);

        if (isFastForward) {
            const expiryDate = new Date(extendedDate.getTime() + 30 * 1000);
            const diffTime = expiryDate.getTime() - new Date().getTime();
            const diffSeconds = Math.ceil(diffTime / 1000);

            if (diffSeconds <= 0) return <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Expired</span>;
            return <span style={{ color: '#d97706', fontWeight: '600' }}>⏳ {diffSeconds}s left</span>;
        } else {
            const expiryDate = new Date(extendedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            const diffTime = expiryDate.getTime() - new Date().getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) return <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Expired</span>;
            return <span style={{ color: '#d97706', fontWeight: '600' }}>⏳ {diffDays} days left</span>;
        }
    };

    // UI View 1: Strict Authentication Form Barrier
    if (!isAuthenticated) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0f172a', fontFamily: '"Segoe UI", sans-serif' }}>
                <form onSubmit={handleLogin} style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)', width: '100%', maxWidth: '400px' }}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '22px', fontWeight: 700, textAlign: 'center' }}>COMPANY Security Gateway</h3>
                    <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '13px', textAlign: 'center' }}>Authorized Registry Admin Personnel Only</p>

                    {authError && (
                        <div style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '12px', marginBottom: '16px', fontWeight: 600 }}>
                            {authError}
                        </div>
                    )}

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Corporate Email</label>
                        <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="admin@company.in" required style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Verification Token Key</label>
                        <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="••••••••" required style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>

                    <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s' }}>
                        Unlock Recruitment Matrix
                    </button>
                </form>
            </div>
        );
    }

    const filteredCandidates = selectedBranch === 'ALL'
        ? candidates
        : candidates.filter(c => c.branch === selectedBranch);

    // UI View 2: Full Admin Application Workspace Grid Dashboard
    return (
        <div style={{ padding: '32px 32px 220px 32px', fontFamily: '"Segoe UI", Roboto, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto', backgroundColor: '#ffffff', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>

                {/* Dashboard Control Panel Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                    <div>
                        <h2 style={{ margin: 0, color: '#0f172a', fontSize: '26px', fontWeight: 700 }}>COMPANY Recruitment Management Console</h2>
                        <button onClick={handleLogout} style={{ marginTop: '6px', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: 600, padding: 0 }}>
                            🔒 Lock Console Node Session
                        </button>
                    </div>

                    {/* Active Simulation Fast-Forward Switch Widget */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f1f5f9', padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Demo Fast-Forward (30s)</span>
                        <button
                            onClick={handleSimulationToggle}
                            style={{
                                width: '48px', height: '24px', borderRadius: '50px', border: 'none', cursor: 'pointer',
                                backgroundColor: isFastForward ? '#22c55e' : '#94a3b8', position: 'relative',
                                transition: 'background-color 0.2s', padding: 0
                            }}
                        >
                            <div style={{
                                width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#ffffff',
                                position: 'absolute', top: '3px', left: isFastForward ? '27px' : '3px',
                                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                            }} />
                        </button>
                    </div>
                </div>

                {/* Processing Pipelines Control Box */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '8px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '32px' }}>
                    <div style={{ flex: '1', minWidth: '280px' }}>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px', color: '#334155' }}>1. Upload Base Profiles (CSV)</label>
                        <input type="file" accept=".csv" onChange={handleInitialCSV} style={{ fontSize: '13px', color: '#475569' }} />
                    </div>
                    <div style={{ borderLeft: '1px solid #cbd5e1' }}></div>
                    <div style={{ flex: '1', minWidth: '280px' }}>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px', color: '#334155' }}>2. Upload GD & PI Marks (CSV)</label>
                        <input type="file" accept=".csv" onChange={handleMarksCSV} style={{ fontSize: '13px', color: '#475569' }} />
                    </div>
                </div>

                {/* Algorithmic Engine Shifters */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    <button onClick={() => handleShortlist('MECH')} style={{ padding: '10px 18px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>Execute Quota Filter (MECH)</button>
                    <button onClick={() => handleShortlist('CS')} style={{ padding: '10px 18px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>Execute Quota Filter (CS)</button>
                </div>

                {/* Status Notice Area */}
                {actionMessage && (
                    <div style={{ padding: '14px 18px', background: '#eff6ff', borderLeft: '4px solid #3b82f6', color: '#1e40af', marginBottom: '24px', borderRadius: '6px', fontSize: '14px', fontWeight: 500 }}>
                        {actionMessage}
                    </div>
                )}

                {/* Quota Segregation View Switcher */}
                <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '20px', gap: '8px' }}>
                    {['ALL', 'MECH', 'CS', 'ELEC', 'IOT'].map(branch => (
                        <button
                            key={branch}
                            onClick={() => setSelectedBranch(branch)}
                            style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', color: selectedBranch === branch ? '#2563eb' : '#64748b', borderBottom: selectedBranch === branch ? '3px solid #2563eb' : '3px solid transparent', marginBottom: '-2px', transition: 'all 0.2s' }}
                        >
                            {branch}
                        </button>
                    ))}
                </div>

                {/* Main Identity Data Matrix Grid */}
                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ background: '#0f172a', color: '#f8fafc' }}>
                                <th style={{ padding: '14px 16px', fontWeight: '600' }}>Roll Number</th>
                                <th style={{ padding: '14px 16px', fontWeight: '600' }}>Full Name</th>
                                <th style={{ padding: '14px 16px', fontWeight: '600' }}>Branch</th>
                                <th style={{ padding: '14px 16px', fontWeight: '600' }}>Quota Category</th>
                                <th style={{ padding: '14px 16px', fontWeight: '600', textAlign: 'center' }}>Written</th>
                                <th style={{ padding: '14px 16px', fontWeight: '600', textAlign: 'center' }}>GD</th>
                                <th style={{ padding: '14px 16px', fontWeight: '600', textAlign: 'center' }}>PI</th>
                                <th style={{ padding: '14px 16px', fontWeight: '600', textAlign: 'center' }}>Aggregate</th>
                                <th style={{ padding: '14px 16px', fontWeight: '600' }}>Offer Validity</th>
                                <th style={{ padding: '14px 16px', fontWeight: '600' }}>Registry Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && candidates.length === 0 ? (
                                <tr><td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Synchronizing local node registry grids...</td></tr>
                            ) : filteredCandidates.length === 0 ? (
                                <tr><td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No records found matching criteria in this stream segment.</td></tr>
                            ) : filteredCandidates.map((c, i) => (
                                <tr key={c.id || i} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: i % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                                    <td style={{ padding: '14px 16px', fontWeight: '600', color: '#1e293b' }}>{c.rollNumber}</td>
                                    <td style={{ padding: '14px 16px', color: '#334155' }}>{c.name}</td>
                                    <td style={{ padding: '14px 16px' }}><span style={{ padding: '3px 8px', background: '#e2e8f0', color: '#334155', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>{c.branch}</span></td>
                                    <td style={{ padding: '14px 16px' }}><span style={{ padding: '3px 8px', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>{c.category}</span></td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '500' }}>{c.writtenScore}</td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>{c.gdScore !== null && c.gdScore !== undefined ? c.gdScore : 'TBD'}</td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>{c.piScore !== null && c.piScore !== undefined ? c.piScore : 'TBD'}</td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700' }}>{c.finalTotalScore !== null && c.finalTotalScore !== undefined ? c.finalTotalScore : 'TBD'}</td>
                                    <td style={{ padding: '14px 16px', fontSize: '13px' }}>{renderTimer(c.offerExtendedAt)}</td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <span style={{
                                            padding: '6px 12px', borderRadius: '50px', fontSize: '11px', fontWeight: '700',
                                            background: c.status === 'OFFER_EXTENDED' ? '#dcfce7' :
                                                c.status === 'WAITLISTED' ? '#fef9c3' :
                                                    c.status === 'REJECTED_ROUND_1' ? '#fee2e2' :
                                                        c.status === 'REJECTED' ? '#ffeeec' :
                                                            c.status === 'OFFER_ACCEPTED' ? '#ccfbf1' :
                                                                c.status === 'OFFER_DECLINED' ? '#ffedd5' : '#f1f5f9',
                                            color: c.status === 'OFFER_EXTENDED' ? '#166534' :
                                                c.status === 'WAITLISTED' ? '#854d0e' :
                                                    c.status === 'REJECTED_ROUND_1' ? '#991b1b' :
                                                        c.status === 'REJECTED' ? '#c53030' :
                                                            c.status === 'OFFER_ACCEPTED' ? '#115e59' :
                                                                c.status === 'OFFER_DECLINED' ? '#9a3412' : '#475569'
                                        }}>
                                            {c.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* LIVE TERMINAL LOGGER UI BOX */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, height: '180px',
                backgroundColor: '#0f172a', borderTop: '2px solid #334155', padding: '12px 20px',
                fontFamily: 'monospace', fontSize: '12px', zIndex: 9999, display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', borderBottom: '1px solid #1e293b', paddingBottom: '6px', marginBottom: '8px', fontWeight: 'bold' }}>
                    <span>⚙️ LIVE SYSTEM ACTIVITY ALERT LOG SHELL</span>
                    <button onClick={() => setLogs([])} style={{ background: '#1e293b', color: '#f8fafc', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>Clear Terminal</button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', color: '#34d399', lineHeight: '1.6' }}>
                    {logs.length === 0 ? (
                        <div style={{ color: '#64748b', fontStyle: 'italic' }}>Listening for upstream operational pipeline updates, system mutations, and simulated SMTP notices...</div>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} style={{ display: 'flex', gap: '8px' }}>
                                <span style={{ color: '#64748b' }}>[{log.timestamp}]</span>
                                <span style={{
                                    color: log.type === 'SUCCESS' ? '#34d399' :
                                        log.type === 'ALERT' ? '#fbbf24' : '#60a5fa',
                                    fontWeight: 'bold'
                                }}>[{log.type}]</span>
                                <span style={{ color: '#cbd5e1' }}>{log.message}</span>
                            </div>
                        ))
                    )}
                    <div ref={terminalEndRef} />
                </div>
            </div>
        </div>
    );
}