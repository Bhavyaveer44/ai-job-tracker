const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

//safe JSON extract
const extractJSON = (text) => {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in scorer response');
  return JSON.parse(match[0]);
};

// scorer function
async function scoreResume({ resume, job_description, rewritten_sections }) {
  const completion = await client.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    messages: [
      {
        role: 'user',
        content: `You are an ATS expert. Score this resume against the job description.
Return ONLY valid JSON, no markdown, no backticks:
{
  "score": <number 0-100>,
  "weakest_section": "<section name: e.g. Experience, Skills, Summary, Projects, Education>",
  "reason": "<one sentence why this section is weakest>",
  "sections_found": ["list", "of", "section", "names", "found", "in", "resume"]
}

Already rewritten sections (do NOT pick these again): ${rewritten_sections}
Job Description: ${job_description}
Resume: ${resume}`,
      },
    ],
    temperature: 0.2,
  });

  return extractJSON(completion.choices[0].message.content);
}

// rewriter function
async function rewriteResume({ resume, job_description, section }) {
  const completion = await client.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    messages: [
      {
        role: 'user',
        content: `You are an expert resume writer. Rewrite ONLY the "${section}" section of this resume.
Use the XYZ formula for bullets: "Accomplished X by doing Y which resulted in Z"
Add metrics where reasonable. Match keywords from the job description.
Return the COMPLETE resume with only that section rewritten.
Do not add any explanation — return only the full resume text.

Job Description: ${job_description}
Current Resume: ${resume}
Section to rewrite: ${section}`,
      },
    ],
    temperature: 0.2,
  });

  return completion.choices[0].message.content;
}

//main agent loop
async function runResumeAgent({ resumeText, jobDescription, onIteration }) {
  const MAX_ITERATIONS = 3;
  const TARGET_SCORE = 80;

  let currentResume = resumeText;
  const iterations = [];
  const rewrittenSections = [];
  let previousScore = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    try {
      //call 1: score
      const scored = await scoreResume({
        resume: currentResume.slice(0, 4000),
        job_description: jobDescription.slice(0, 2000),
        rewritten_sections: rewrittenSections.join(', ') || 'none',
      });

      const { score, weakest_section, reason } = scored;

      //call 2: rewrite
      const newResume = await rewriteResume({
        resume: currentResume.slice(0, 4000),
        job_description: jobDescription.slice(0, 2000),
        section: weakest_section,
      });

      const iterationData = {
        iteration: i + 1,
        score_before: i === 0 ? score : previousScore,
        score_after: null, // filled after next scorer call
        weakest_section,
        reason,
        resume_before: currentResume,
        resume_after: newResume.trim(),
      };

      //rescore the new resume
      const rescored = await scoreResume({
        resume: newResume.slice(0, 4000),
        job_description: jobDescription.slice(0, 2000),
        rewritten_sections: [...rewrittenSections, weakest_section].join(', '),
      });

      iterationData.score_after = rescored.score;
      iterationData.score_before = score;

      currentResume = newResume.trim();
      rewrittenSections.push(weakest_section);
      previousScore = rescored.score;
      iterations.push(iterationData);

      // emit iteration to caller (for streaming response)
      if (onIteration) onIteration(iterationData);

      // exit conditions
      if (rescored.score >= TARGET_SCORE) break;
      if (i > 0 && rescored.score <= iterations[i - 1]?.score_after) break;

    } catch (err) {
      console.error(`Agent iteration ${i + 1} failed:`, err.message);
      // return what we have so far — rule 3
      break;
    }
  }

  return {
    iterations,
    final_resume: currentResume,
    start_score: iterations[0]?.score_before ?? 0,
    final_score: previousScore,
    total_iterations: iterations.length,
  };
}

module.exports = { runResumeAgent };