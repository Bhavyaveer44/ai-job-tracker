import api from './axiosInstance';

export const getJobs = () => api.get('/api/jobs').then(r => r.data);

export const createJob = (jobData) => api.post('/api/jobs', jobData).then(r => r.data);

export const updateJob = (id,updates) => api.patch(`/api/jobs/${id}`, updates).then(r => r.data);

export const deleteJob = (id) => api.delete(`/api/jobs/${id}`).then(r => r.data);