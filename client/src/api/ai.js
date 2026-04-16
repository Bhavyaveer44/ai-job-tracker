import api from './axiosInstance';

export const parseJobDescription = (jobDescription) =>
  api.post('/api/ai/parse', { jobDescription }).then(r => r.data);

export const getMatchScore = (userSkills, jobSkills, jobId) =>
  api.post('/api/ai/match', { userSkills, jobSkills, jobId }).then(r => r.data);

export const generateCoverLetter = (payload) =>
  api.post('/api/ai/cover-letter', payload).then(r => r.data);

export const getInterviewPrep = (payload) =>
  api.post('/api/ai/interview-prep', payload).then(r => r.data);