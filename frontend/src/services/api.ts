import axios from 'axios';

export const api = axios.create({
    baseURL: 'http://localhost:5000/api',
});

// Candidate APIs
export const getCandidateStatus = (identifier: string) => api.get(`/candidate/${identifier}`);
export const verifyCandidateDocument = (applicationId: string, documentId: string) => api.post('/candidate/verify', { applicationId, documentId });

// Admin APIs
export const getAllCandidates = () => api.get('/admin/candidates');
export const triggerShortlist = (branch: string) => api.post('/admin/shortlist', { branch });

// Simulation Control APIs (Feature #2)
export const getSimulationMode = () => api.get('/admin/simulation-mode');
export const toggleSimulationMode = (enabled: boolean) => api.post('/admin/simulation-toggle', { enabled });

export default api;