const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

//1.GLOBAL MIDDLEWARE
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://ai-job-tracker-dun.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());

//2.ROUTES
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const jobRoutes = require('./routes/jobs');
app.use('/api/jobs', jobRoutes);

const aiRoutes = require('./routes/ai');
app.use('/api/ai', aiRoutes);

const resumeAgentRoutes = require('./routes/resumeAgent');
app.use('/api/resume-agent', resumeAgentRoutes);

const resumeVaultRoutes = require('./routes/resumeVault');
app.use('/api/resume-vault', resumeVaultRoutes);

//3.HEALTH CHECK/BASE ROUTE
app.get('/', (req, res) => res.send('Server is running'));

//4.SERVER START
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));