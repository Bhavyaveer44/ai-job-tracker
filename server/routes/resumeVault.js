const express = require('express');
const authMiddleware = require('../middleware/auth');
const supabase = require('../db/supabase');

const router = express.Router();
router.use(authMiddleware);

// get all versions for user
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('resume_versions')
    .select('*')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

//save a new version
router.post('/', async (req, res) => {
  const { name, content, ats_score, parent_id, iteration_log } = req.body;
  if (!name || !content) return res.status(400).json({ error: 'Name and content required' });

  console.log('Saving resume version:', { name, userId: req.userId, hasContent: !!content });

  const { data, error } = await supabase
    .from('resume_versions')
    .insert({
      user_id: req.userId,
      name,
      content,
      ats_score: ats_score || null,
      parent_id: parent_id || null,
      iteration_log: iteration_log || [],
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase error saving resume version:', error);
    return res.status(500).json({ error: error.message, details: error });
  }
  res.status(201).json(data);
});

// delete a version
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('resume_versions')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Deleted' });
});

// attach resume version to a job
router.patch('/jobs/:jobId/resume', async (req, res) => {
  const { resume_version_id } = req.body;

  const { data, error } = await supabase
    .from('jobs')
    .update({ resume_version_id })
    .eq('id', req.params.jobId)
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

//get jobs that use a specific version
router.get('/:id/jobs', async (req, res) => {
  const { data, error } = await supabase
    .from('jobs')
    .select('id, company, role, status')
    .eq('resume_version_id', req.params.id)
    .eq('user_id', req.userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;