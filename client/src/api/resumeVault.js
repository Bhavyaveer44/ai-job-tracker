import api from './axiosInstance';

export const getVersions = () =>
  api.get('/api/resume-vault').then(r => r.data);

export const saveVersion = (payload) =>
  api.post('/api/resume-vault', payload).then(r => r.data);

export const deleteVersion = (id) =>
  api.delete(`/api/resume-vault/${id}`).then(r => r.data);

export const attachResumeToJob = (jobId, resumeVersionId) =>
  api.patch(`/api/resume-vault/jobs/${jobId}/resume`, {
    resume_version_id: resumeVersionId,
  }).then(r => r.data);

export const getJobsForVersion = (id) =>
  api.get(`/api/resume-vault/${id}/jobs`).then(r => r.data);