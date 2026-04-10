const express = require('express');
const Groq = require('groq-sdk');
const authMiddleware = require('../middleware/auth');
const supabase = require('../db/supabase');

const router = express.Router();
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.use(authMiddleware);

const extractJSON = (text) => {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in AI response');
  return JSON.parse(match[0]);
};

router.post('/parse', async (req, res) => {
  const { jobDescription } = req.body;
  if (!jobDescription) return res.status(400).json({ error: 'No job description provided' });

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `Extract structured data from this job description.
          Return ONLY valid JSON with exactly these keys, nothing else, no markdown, no backticks:
          {
            "role": "job title as a string",
            "company": "company name as a string",
            "skills_required": ["skill1", "skill2"],
            "salary_range": "salary as string or null",
            "summary": "2 sentence summary of the role"
          }

          Job description:
          ${jobDescription}`,
        },
      ],
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content.trim();
    const parsed = extractJSON(raw);
    res.json(parsed);
  } catch (err) {
    console.error('Parse error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/match', async (req, res) => {
  const { userSkills, jobSkills, jobId } = req.body;
  if (!userSkills || !jobSkills) return res.status(400).json({ error: 'Skills required' });

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `You are a technical recruiter. Compare these two skill lists and return a match score.
          Return ONLY valid JSON with exactly these keys, no markdown, no backticks:
          {
            "score": <number 0-100>,
            "reason": "one sentence explanation"
          }

          Candidate skills: ${userSkills.join(', ')}
          Required skills: ${jobSkills.join(', ')}`,
        },
      ],
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content.trim();
    const result = extractJSON(raw);

    if (jobId) {
      await supabase
        .from('jobs')
        .update({ match_score: result.score })
        .eq('id', jobId)
        .eq('user_id', req.userId);
    }

    res.json(result);
  } catch (err) {
    console.error('Match error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/cover-letter', async (req, res) => {
  const { jobDescription, jobRole, jobCompany, userSkills, userName } = req.body;
  if (!jobDescription) return res.status(400).json({ error: 'Job description required' });

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `Write a professional, tailored cover letter for this job application.

          Candidate name: ${userName || 'the candidate'}
          Applying for: ${jobRole || 'the role'} at ${jobCompany || 'the company'}
          Candidate skills: ${userSkills?.join(', ') || 'not provided'}

          Job description:
          ${jobDescription}

          Instructions:
          - Write 3 short paragraphs only
          - First paragraph: express interest and mention 2-3 specific things from the job description
          - Second paragraph: match 2-3 of the candidate's skills directly to job requirements
          - Third paragraph: confident closing with a call to action
          - Tone: professional but human, not robotic
          - Do NOT include subject lines, dates, addresses, or placeholders like [Your Name]
          - Start directly with "I am writing to express..."
          - Return only the cover letter text, nothing else`,
        },
      ],
      temperature: 0.7,
    });

    const coverLetter = completion.choices[0].message.content.trim();
    res.json({ coverLetter });
  } catch (err) {
    console.error('Cover letter error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;