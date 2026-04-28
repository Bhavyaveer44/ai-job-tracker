const express = require('express');
const authMiddleware = require('../middleware/auth');
const supabase = require('../db/supabase');

const router= express.Router();

//all routes below are protected
router.use(authMiddleware);

//GET all jobs for logged in user
router.get('/',async(req,res) => {
    const { data,error} = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id',req.userId)
        .order('created_at',{ascending: false});

    if(error) return res.status(500).json({error: error.message});
    res.json(data);
});

//POST create new job
router.post('/',async(req,res) =>{
    const {company,role,status,job_description,skills_required,salary_range,notes}= req.body;

    const {data,error}= await supabase
        .from('jobs')
        .insert({
            user_id: req.userId,
            company,
            role,
            status: status || applied,
            job_description,
            skills_required,
            salary_range,
            notes,
        })
        .select()
        .single();
    
        if(error) return res.status(500).json({error: error.message});
        res.status(201).json(data);
});

//PATCH update a job
router.patch('/:id',async(req,res) => {
    const {data,error} = await supabase
        .from('jobs')
        .update(req.body)
        .eq('id',req.params.id)
        .eq('user_id',req.userId)
        .select()
        .single();
    
    if(error) return res.status(500).json({error: error.message});
    res.json(data);
});

//DELETE delete a job
router.delete('/:id',async(req,res) =>{
    const {error}= await supabase
        .from('jobs')
        .delete()
        .eq('id',req.params.id)
        .eq('user_id',req.userId);

    if(error) return res.status(500).json({ error: error.message});
    res.json({message: 'Job deleted'});
});

router.get('/analytics', async (req, res) => {
  try {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', req.userId);

    if (error) throw error;

    // applications over time (last 30 days)
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });

    const appsByDate = last30.map(date => ({
      date: date.slice(5),
      count: jobs.filter(j => j.created_at?.split('T')[0] === date).length,
    }));

    // status breakdown
    const statusBreakdown = ['applied', 'interview', 'offer', 'rejected'].map(status => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: jobs.filter(j => j.status === status).length,
    }));

    // top companies
    const companyCounts = jobs.reduce((acc, j) => {
      acc[j.company] = (acc[j.company] || 0) + 1;
      return acc;
    }, {});
    const topCompanies = Object.entries(companyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([company, count]) => ({ company, count }));

    // avg match score
    const scored = jobs.filter(j => j.match_score);
    const avgMatchScore = scored.length
      ? Math.round(scored.reduce((sum, j) => sum + j.match_score, 0) / scored.length)
      : 0;

    // response rate (interview + offer / total)
    const responseRate = jobs.length
      ? Math.round(((jobs.filter(j => ['interview', 'offer'].includes(j.status)).length) / jobs.length) * 100)
      : 0;

    res.json({
      total: jobs.length,
      avgMatchScore,
      responseRate,
      appsByDate,
      statusBreakdown,
      topCompanies,
    });
  } catch (err) {
    console.error('Analytics error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports=router;