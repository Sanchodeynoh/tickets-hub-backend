// routes/events.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db     = require('../db');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// ── GET /events — public: all events ──
router.get('/', (req, res) => {
  const events = db.get('events')
    .value()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json({ events });
});

// ── GET /events/:id — public: single event ──
router.get('/:id', (req, res) => {
  const event = db.get('events').find({ id: req.params.id }).value();
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  return res.json({ event });
});

// ── POST /events — admin: create event ──
router.post('/', requireAdmin, (req, res) => {
  const { artist, name, date, venue, status, desc, tiers, badge } = req.body;
  if (!artist || !name) return res.status(400).json({ error: 'Artist and event name are required.' });

  const event = {
    id:        uuidv4(),
    artist:    artist.trim(),
    name:      name.trim(),
    date:      date?.trim()   || 'TBA',
    venue:     venue?.trim()  || 'TBA',
    status:    status         || 'upcoming',
    badge:     badge          || 'new',
    desc:      desc?.trim()   || '',
    tiers:     tiers          || [],
    createdAt: new Date().toISOString()
  };

  db.get('events').push(event).write();
  return res.status(201).json({ message: 'Event created.', event });
});

// ── PUT /events/:id — admin: update event ──
router.put('/:id', requireAdmin, (req, res) => {
  const event = db.get('events').find({ id: req.params.id }).value();
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  const { artist, name, date, venue, status, desc, tiers, badge } = req.body;
  const updates = {};
  if (artist !== undefined) updates.artist = artist.trim();
  if (name   !== undefined) updates.name   = name.trim();
  if (date   !== undefined) updates.date   = date.trim();
  if (venue  !== undefined) updates.venue  = venue.trim();
  if (status !== undefined) updates.status = status;
  if (badge  !== undefined) updates.badge  = badge;
  if (desc   !== undefined) updates.desc   = desc.trim();
  if (tiers  !== undefined) updates.tiers  = tiers;
  updates.updatedAt = new Date().toISOString();

  db.get('events').find({ id: req.params.id }).assign(updates).write();
  const updated = db.get('events').find({ id: req.params.id }).value();
  return res.json({ message: 'Event updated.', event: updated });
});

// ── DELETE /events/:id — admin: delete event ──
router.delete('/:id', requireAdmin, (req, res) => {
  const event = db.get('events').find({ id: req.params.id }).value();
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  db.get('events').remove({ id: req.params.id }).write();
  return res.json({ message: 'Event deleted.' });
});

module.exports = router;
           
