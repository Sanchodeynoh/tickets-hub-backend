// server.js — TICKETS HUB Backend
require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const authRoutes   = require('./routes/auth');
const orderRoutes  = require('./routes/orders');
const eventRoutes  = require('./routes/events');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS — allow all origins (fixes GitHub Pages connection) ──
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

// ── Body parsing ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Request logger ──
app.use((req, _res, next) => {
  console.log('[' + new Date().toISOString() + '] ' + req.method + ' ' + req.path);
  next();
});

// ── Routes ──
app.use('/auth',   authRoutes);
app.use('/orders', orderRoutes);
app.use('/events', eventRoutes);

// ── Health check ──
app.get('/', (_req, res) => {
  res.json({
    status:  'online',
    service: 'TICKETS HUB API',
    version: '1.0.0',
    time:    new Date().toISOString()
  });
});

// ── 404 handler ──
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Global error handler ──
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── Start ──
app.listen(PORT, () => {
  console.log('TICKETS HUB API running on port ' + PORT);
});

module.exports = app;
