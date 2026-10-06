const express = require('express');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const authMiddleware = require('../middleware/auth');
const supabase = require('../db/supabase');
const { runResumeAgent } = require('../agents/resumeAgent');

const pdfParse = async (data) => {
  const parsed = await new PDFParse({ data }).getText();
  return { ...parsed, numpages: parsed.total };
};

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'));
  },
});

router.use(authMiddleware);

// POST /api/resume-agent/run
// streams iterations back as NDJSON (newline-delimited JSON)
router.post('/run', upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });
  const { jobDescription } = req.body;
  if (!jobDescription) return res.status(400).json({ error: 'Job description required' });

  try {
    const pdfData = await pdfParse(req.file.buffer);
    const resumeText = pdfData.text?.trim();
    if (!resumeText || resumeText.length < 50)
      return res.status(400).json({ error: 'Could not extract text from PDF' });

    // set up streaming headers
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();

    const result = await runResumeAgent({
      resumeText,
      jobDescription,
      onIteration: (iteration) => {
        // stream each iteration as it completes
        res.write(JSON.stringify({ type: 'iteration', data: iteration }) + '\n');
      },
    });

    // stream final result
    res.write(JSON.stringify({ type: 'done', data: result }) + '\n');
    res.end();

  } catch (err) {
    console.error('Agent route error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(JSON.stringify({ type: 'error', data: { message: err.message } }) + '\n');
      res.end();
    }
  }
});

module.exports = router;