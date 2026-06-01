// server.js — TICKETS HUB Backend
require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const authRoutes   = require('./routes/auth');
const orderRoutes  = require('./routes/orders');
const eventRoutes  = require('./routes/events');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://127.0.0.1:5500',  // Live Server (VS Code)
  'http://localhost:5500',
  // Add your GitHub Pages URL here once deployed:
  // 'https://yourusername.github.io'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// ── Body parsing ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Request logger ──
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
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
  console.log(`
  ╔══════════════════════════════════════╗
  ║   🎟️  TICKETS HUB API — RUNNING     ║
  ║   Port:  ${PORT}                        ║
  ║   Time:  ${new Date().toLocaleTimeString()}                 ║
  ╚══════════════════════════════════════╝
  `);
});

module.exports = app;
