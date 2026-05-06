const express= require('express');
const bcrypt= require('bcryptjs');
const jwt= require('jsonwebtoken');
const supabase= require('../db/supabase');

const router= express.Router();

//register
router.post('/register',async(req,res) => {
    const {email,password} =req.body;
    if(!email || !password)
        return res.status(400).json({error:'Email and password required'});

    try{
        //chk if user exists
        const {data: existing} = await supabase
            .from('users')
            .select('id')
            .eq('email',email)
            .single();

        if(existing) return res.status(409).json({error:'Email already in use'});

        const hashedPassword= await bcrypt.hash(password,10);

        const {data:user,error}= await supabase
            .from('users')
            .insert({email, password:hashedPassword})
            .select()
            .single();

        if(error) throw error;

        const token=jwt.sign(
            {userId: user.id, email: user.email},
            process.env.JWT_SECRET,
            { expiresIn: '7d'}
        );

        res.status(201).json({token, user: {id: user.id, email: user.email}});
    } catch(err){
        res.status(500).json({error: err.message});
    }
});

//login
router.post('/login', async(req,res)=> {
    const{email,password}= req.body;
    
    if(!email || !password)
        return res.status(400).json({error:'Email and password required'});

    try{
        const {data: user, error}= await supabase
            .from('users')
            .select('*')
            .eq('email',email)
            .single();
        
        if(error||!user)
            return res.status(401).json({error: 'Invalid Credentials'});

        const isMatch= await bcrypt.compare(password,user.password);
        if(!isMatch)
            return res.status(401).json({error:'Invalid Credentials'});

        const token=jwt.sign(
            {userId: user.id, email: user.email},
            process.env.JWT_SECRET,
            { expiresIn: '7d'}
        );

        res.json({token, user: {id: user.id, email: user.email}});
    } catch(err){
        res.status(500).json({error: err.message});
    }
});

// Demo login — returns token for pre-seeded demo account
router.post('/demo', async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'demo@jobtracker.com')
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Demo account not found — run the seed SQL first' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email },
      isDemo: true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports= router;