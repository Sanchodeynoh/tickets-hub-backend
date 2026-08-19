require('dotenv').config();
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');
const router  = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, country } = req.body;
    if (!firstName || !lastName || !email || !password || !country)
      return res.status(400).json({ error: 'All fields are required.' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (db.get('users').find({ email: email.toLowerCase() }).value())
      return res.status(409).json({ error: 'An account with this email already exists.' });
    const hashed = await bcrypt.hash(password, 12);
    const user = {
      id: uuidv4(),
      firstName: firstName.trim(), lastName: lastName.trim(),
      email: email.toLowerCase().trim(), password: hashed,
      country: country.trim(), role: 'user',
      createdAt: new Date().toISOString()
    };
    db.get('users').push(user).write();
    return res.status(201).json({ message: 'Account created.', user: { id: user.id, firstName: user.firstName, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
    if (email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase() && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign({ role: 'admin', email: process.env.ADMIN_EMAIL, name: 'Admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { role: 'admin', email: process.env.ADMIN_EMAIL, name: 'Admin' } });
    }
    const user = db.get('users').find({ email: email.toLowerCase() }).value();
    if (!user) return res.status(401).json({ error: 'Incorrect email or password.' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Incorrect email or password.' });
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, name: user.firstName },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    );
    return res.json({ token, user: { id: user.id, role: user.role, email: user.email, name: user.firstName, country: user.country } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.get('users').find({ id: req.user.id }).value();
  if (!user) return res.json({ role: req.user.role, email: req.user.email, name: req.user.name });
  return res.json({ id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, country: user.country, role: user.role });
});

module.exports = router;
