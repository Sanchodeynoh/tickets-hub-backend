require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const authRoutes    = require('./routes/auth');
const orderRoutes   = require('./routes/orders');
const eventRoutes   = require('./routes/events');
const messageRoutes = require('./routes/messages');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log('[' + new Date().toISOString() + '] ' + req.method + ' ' + req.path);
  next();
});

app.use('/auth',     authRoutes);
app.use('/orders',   orderRoutes);
app.use('/events',   eventRoutes);
app.use('/messages', messageRoutes);

app.get('/', (_req, res) => res.json({
  status: 'online', service: 'TICKETS HUB API', version: '1.1.0', time: new Date().toISOString()
}));

app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => console.log('TICKETS HUB API running on port ' + PORT));
module.exports = app;
