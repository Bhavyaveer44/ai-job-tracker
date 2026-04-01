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
module.exports=router;