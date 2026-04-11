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
  model: 'mixtral-8x7b-32768',
  messages: [
    {
      role: 'system',
      content: `You are a professional career coach and copywriter who has helped thousands of candidates land jobs at top companies. You write cover letters that sound like a real, smart human wrote them — never robotic, never generic. You follow instructions exactly and never deviate from the word count or structure given.`,
    },
    {
      role: 'user',
      content: `Write a highly effective, human-sounding cover letter tailored for this application.

        Candidate name: ${userName || 'the candidate'}
        Applying for: ${jobRole || 'the role'} at ${jobCompany || 'the company'}
        Candidate skills: ${userSkills?.join(', ') || 'not provided'}

        Job description:
        ${jobDescription}

        GOAL:
        Write a cover letter that feels written by a smart real candidate, not AI-generated. It should increase chances of recruiter response by being specific, concise, and relevant.

        STRICT RULES:
        - Maximum 220 words
        - 3 short paragraphs only
        - Natural tone: confident, warm, sharp, professional
        - No robotic phrases
        - No clichés like "I am writing to express", "dynamic company", "I am confident", "thrilled to apply", "please find attached"
        - No repetition
        - No exaggerated claims
        - No placeholders
        - No subject line, no addresses, no date

        STRUCTURE:
        Paragraph 1:
        - Start with a strong natural opening that references the specific role
        - Mention 2 specific things from the job description that genuinely interest you
        - Show real understanding of what the company needs

        Paragraph 2:
        - Match 2-3 of the candidate's skills DIRECTLY to specific requirements in the job description
        - Use concrete language — what you built, solved, or improved
        - No vague praise like "strong communicator" or "team player"

        Paragraph 3:
        - Strong, short close
        - One sentence on why this specific company
        - Clear call to action

        STYLE:
        - Sentences vary between short punchy ones and longer detailed ones
        - Sounds like a top candidate wrote it in 10 minutes, not a template
        - Easy to skim in 20 seconds

        Return ONLY the final cover letter text. No subject line. No intro. No explanation.`,
      },
    ],
    temperature: 0.85,
    max_tokens: 500,
  });

    const coverLetter = completion.choices[0].message.content.trim();
    res.json({ coverLetter });
  } catch (err) {
    console.error('Cover letter error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;