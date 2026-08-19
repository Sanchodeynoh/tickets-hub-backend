const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// User sends message
router.post('/', requireAuth, (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Message text required.' });
    const message = {
      id: uuidv4(),
      threadId: req.user.id || req.user.email,
      text: text.trim(),
      sender: 'user',
      senderName: req.user.name || 'User',
      senderEmail: req.user.email || '',
      read: false,
      createdAt: new Date().toISOString()
    };
    db.get('messages').push(message).write();
    return res.status(201).json({ message: 'Message sent.', data: message });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// User gets their own thread
router.get('/my', requireAuth, (req, res) => {
  const threadId = req.user.id || req.user.email;
  const messages = db.get('messages')
    .filter(m => m.threadId === threadId)
    .value()
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  db.get('messages')
    .filter(m => m.threadId === threadId && m.sender === 'admin' && !m.read)
    .each(m => { m.read = true; }).value();
  db.write();
  return res.json({ messages });
});

// Admin: all threads
router.get('/threads', requireAdmin, (req, res) => {
  const all = db.get('messages').value();
  const threads = {};
  all.forEach(m => {
    if (!threads[m.threadId]) {
      threads[m.threadId] = { threadId: m.threadId, userName: m.senderName, userEmail: m.senderEmail, messages: [], unread: 0, lastMessage: null };
    }
    threads[m.threadId].messages.push(m);
    if (m.sender === 'user' && !m.read) threads[m.threadId].unread++;
    threads[m.threadId].lastMessage = m;
  });
  const result = Object.values(threads).sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
  return res.json({ threads: result });
});

// Admin: specific thread
router.get('/thread/:threadId', requireAdmin, (req, res) => {
  const messages = db.get('messages')
    .filter(m => m.threadId === req.params.threadId)
    .value()
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  db.get('messages')
    .filter(m => m.threadId === req.params.threadId && m.sender === 'user' && !m.read)
    .each(m => { m.read = true; }).value();
  db.write();
  return res.json({ messages });
});

// Admin: reply
router.post('/reply/:threadId', requireAdmin, (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Message text required.' });
    const message = {
      id: uuidv4(),
      threadId: req.params.threadId,
      text: text.trim(),
      sender: 'admin',
      senderName: 'TICKETS HUB',
      senderEmail: process.env.ADMIN_EMAIL || 'admin@ticketshub.com',
      read: false,
      createdAt: new Date().toISOString()
    };
    db.get('messages').push(message).write();
    return res.status(201).json({ message: 'Reply sent.', data: message });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// Admin: unread count
router.get('/unread-count', requireAdmin, (req, res) => {
  const count = db.get('messages').filter(m => m.sender === 'user' && !m.read).value().length;
  return res.json({ count });
});

module.exports = router;
