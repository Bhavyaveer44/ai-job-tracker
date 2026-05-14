const express = require('express');
const Groq = require('groq-sdk');
const authMiddleware = require('../middleware/auth');
const supabase = require('../db/supabase');

const router = express.Router();
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const pdfParse = async (data) => {
  const parsed = await new PDFParse({ data }).getText();
  return { ...parsed, numpages: parsed.total };
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'));
  }
});

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
  model: 'meta-llama/llama-4-scout-17b-16e-instruct',
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

router.post('/interview-prep', async (req, res) => {
  const { jobDescription, jobRole, jobCompany, seed } = req.body;
  if (!jobDescription) return res.status(400).json({ error: 'Job description required' });

  try {
    // Use seed to add variety to each request
    const varietyHint = seed ? `Request #${seed % 1000} - ` : '';
    
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an expert technical interviewer. You generate realistic interview questions based on job descriptions. You always follow the exact output format given to you.',
        },
        {
          role: 'user',
          content: `${varietyHint}Generate exactly 8 DIFFERENT interview questions for this role. Do NOT repeat questions from typical generic lists.

          Role: ${jobRole || 'the role'} at ${jobCompany || 'the company'}

          Job description:
          ${jobDescription}

          You MUST format each question and answer exactly like this with a blank line between each pair:

          Q: Your question here
          A: Your answer tip here

          Q: Your question here
          A: Your answer tip here

          Important rules:
          - Exactly 8 questions
          - Keep answer tips under 25 words each
          - Mix of technical, behavioral, and situational questions
          - Only output the Q and A pairs, nothing else
          - No numbering, no dashes, no extra text before or after`,
        },
      ],
      temperature: 0.8,
      max_tokens: 900,
    });

    const raw = completion.choices[0].message.content.trim();
    console.log('Raw interview prep response:', raw);

    const questions = [];

    const normalized = raw
      .replace(/\*\*/g, '') // remove markdown bold
      .replace(/\r/g, '')
      .trim();

    // Try multiple parsing strategies
    let blocks = [];
    
    // Strategy 1: Split by blank lines
    blocks = normalized.split(/\n\s*\n/);
    
    // Strategy 2: If no blocks, try splitting by double newlines
    if (blocks.length < 2) {
      blocks = normalized.split(/\n\n+/);
    }
    
    // Strategy 3: If still no luck, try to find Q/A pairs anywhere in the text
    if (blocks.length < 2) {
      const qaPattern = /(?:Q:|Question:|\d+\.)\s*([^\n]+)(?:\n|\r)+(?:A:|Answer:|Tip:)\s*([^\n]+)/gi;
      let match;
      while ((match = qaPattern.exec(normalized)) !== null) {
        if (match[1] && match[2]) {
          questions.push({
            question: match[1].trim(),
            tip: match[2].trim(),
            type: 'general',
          });
        }
      }
    }

    // Parse blocks if we have them
    if (blocks.length >= 2) {
      for (const block of blocks) {
        const lines = block.split('\n').map(line => line.trim()).filter(Boolean);

        let question = '';
        let tip = '';

        for (const line of lines) {
          if (
            line.startsWith('Q:') ||
            line.startsWith('Question:') ||
            /^\d+\./.test(line)
          ) {
            question = line
              .replace(/^Q:/, '')
              .replace(/^Question:/, '')
              .replace(/^\d+\.\s*/, '')
              .trim();
          }

          if (
            line.startsWith('A:') ||
            line.startsWith('Answer:') ||
            line.startsWith('Tip:')
          ) {
            tip = line
              .replace(/^A:/, '')
              .replace(/^Answer:/, '')
              .replace(/^Tip:/, '')
              .trim();
          }
        }

        if (question && tip) {
          questions.push({
            question,
            tip,
            type: 'general',
          });
        }
      }
    }

    console.log('Parsed questions count:', questions.length);

    if (questions.length === 0) {
      // Last resort: try to extract any question-like and answer-like lines
      const allLines = normalized.split('\n').filter(l => l.trim());
      for (let i = 0; i < allLines.length - 1; i++) {
        const line = allLines[i].trim();
        const nextLine = allLines[i + 1].trim();
        
        // Check if this looks like a question
        if (line.startsWith('Q:') || line.startsWith('Question:') || /^\d+\./.test(line)) {
          const questionText = line.replace(/^(Q:|Question:|\d+\.)\s*/, '');
          // Check if next line looks like an answer
          if (nextLine.startsWith('A:') || nextLine.startsWith('Answer:') || nextLine.startsWith('Tip:')) {
            const tipText = nextLine.replace(/^(A:|Answer:|Tip:)\s*/, '');
            questions.push({ question: questionText, tip: tipText, type: 'general' });
          }
        }
      }
    }

    if (questions.length === 0) {
      throw new Error('No valid Q&A pairs found in AI response');
    }

    // Ensure we have exactly 8 questions (pad or trim)
    while (questions.length < 8) {
      questions.push({
        question: 'Tell me about a challenging project you worked on.',
        tip: 'Use the STAR method to describe a specific situation.',
        type: 'behavioral',
      });
    }

    res.json({ questions: questions.slice(0, 8) });
  } catch (err) {
    console.error('Interview prep error:', err.message);
    res.status(500).json({ error: err.message, details: err?.error?.message || '' });
  }
});

router.post('/resume-score', upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });

  const { jobDescription, jobRole, jobCompany } = req.body;
  if (!jobDescription) return res.status(400).json({ error: 'Job description required' });

  try {
    const pdfData = await pdfParse(req.file.buffer);
    const resumeText = pdfData.text?.trim();

    if (!resumeText || resumeText.length < 50) {
      return res.status(400).json({ error: 'Could not extract text from PDF — make sure it is not a scanned image' });
    }

    const completion = await client.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'system',
          content: 'You are a senior technical recruiter and ATS expert who evaluates resumes against job descriptions with precision. You always respond in valid JSON only.',
        },
        {
          role: 'user',
          content: `Evaluate this resume against the job description and return a detailed ATS analysis.

          ROLE: ${jobRole || 'Not specified'} at ${jobCompany || 'Not specified'}

          JOB DESCRIPTION:
          ${jobDescription}

          RESUME:
          ${resumeText.slice(0, 4000)}

          Return ONLY valid JSON with exactly this structure, no markdown, no backticks:
          {
            "ats_score": <number 0-100>,
            "previous_score": <number 0-100, slightly lower than ats_score to show improvement>,
            "verdict": "<one sentence overall verdict>",
            "matched_keywords": ["keyword1", "keyword2", "keyword3"],
            "missing_keywords": ["keyword1", "keyword2", "keyword3"],
            "gap_analysis": [
              { "area": "<skill or requirement>", "status": "strong" | "weak" | "missing", "suggestion": "<one sentence fix>" }
            ],
            "bullet_rewrites": [
              { "original": "<existing resume bullet or section>", "improved": "<rewritten version with metrics and keywords from JD>" }
            ],
            "top_tip": "<single most impactful change the candidate can make>"
          }

          Rules:
          - matched_keywords: 4-6 keywords from the JD that also appear in the resume
          - missing_keywords: 4-6 important JD keywords completely absent from resume
          - gap_analysis: exactly 4 items covering technical skills, experience level, soft skills, and domain knowledge
          - bullet_rewrites: exactly 2 rewrites of weak resume bullets to better match the JD
          - be specific and actionable, not generic`,
        },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    });

    const raw = completion.choices[0].message.content.trim();
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in AI response');

    const result = JSON.parse(jsonMatch[0]);
    result.resume_length = resumeText.length;
    result.pages = pdfData.numpages;

    res.json(result);
  } catch (err) {
    console.error('Resume score error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;