// routes/orders.js
require('dotenv').config();
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { sendOrderNotification, sendBuyerConfirmation, sendBuyerRejection } = require('../mailer');
const router  = express.Router();

// ── POST /orders — create new order ──
router.post('/', requireAuth, async (req, res) => {
  try {
    const { items, buyer, subtotal, fee, discount, total } = req.body;

    if (!items || !items.length || !buyer || !total) {
      return res.status(400).json({ error: 'Missing required order fields.' });
    }

    const order = {
      orderId:   'TH-' + Date.now().toString(36).toUpperCase(),
      userId:    req.user.id || null,
      items,
      buyer,
      subtotal:  subtotal || 0,
      fee:       fee      || 0,
      discount:  discount || 0,
      total,
      status:    'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to DB
    db.get('orders').push(order).write();

    // Email admin immediately
    try {
      await sendOrderNotification(order);
    } catch (mailErr) {
      console.error('⚠️  Admin email failed:', mailErr.message);
      // Don't block the order — just log it
    }

    return res.status(201).json({
      message: 'Order submitted successfully.',
      orderId: order.orderId,
      status:  order.status
    });

  } catch (err) {
    console.error('Order create error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── GET /orders — admin: all orders ──
router.get('/', requireAdmin, (req, res) => {
  const { status, search } = req.query;
  let orders = db.get('orders').value();

  if (status)  orders = orders.filter(o => o.status === status);
  if (search) {
    const q = search.toLowerCase();
    orders = orders.filter(o =>
      o.orderId?.toLowerCase().includes(q) ||
      o.buyer?.name?.toLowerCase().includes(q) ||
      o.buyer?.email?.toLowerCase().includes(q)
    );
  }

  // Newest first
  orders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json({ orders, total: orders.length });
});

// ── GET /orders/my — user: their own orders ──
router.get('/my', requireAuth, (req, res) => {
  const orders = db.get('orders')
    .filter({ userId: req.user.id })
    .value()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json({ orders });
});

// ── GET /orders/:id — get single order ──
router.get('/:id', requireAuth, (req, res) => {
  const order = db.get('orders').find({ orderId: req.params.id }).value();
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (req.user.role !== 'admin' && order.userId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized.' });
  }
  return res.json({ order });
});

// ── PATCH /orders/:id/status — admin: update status ──
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['confirmed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be confirmed or rejected.' });
    }

    const order = db.get('orders').find({ orderId: req.params.id }).value();
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    db.get('orders')
      .find({ orderId: req.params.id })
      .assign({ status, updatedAt: new Date().toISOString() })
      .write();

    const updatedOrder = db.get('orders').find({ orderId: req.params.id }).value();

    // Send email to buyer
    try {
      if (status === 'confirmed') await sendBuyerConfirmation(updatedOrder);
      if (status === 'rejected')  await sendBuyerRejection(updatedOrder);
    } catch (mailErr) {
      console.error('⚠️  Buyer email failed:', mailErr.message);
    }

    return res.json({ message: `Order ${status}.`, orderId: req.params.id, status });

  } catch (err) {
    console.error('Status update error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── GET /orders/:id/confirm — quick confirm via email link ──
router.get('/:id/confirm', async (req, res) => {
  if (req.query.secret !== process.env.JWT_SECRET) {
    return res.status(403).send('<h2 style="font-family:sans-serif;color:red;">⛔ Unauthorized</h2>');
  }
  const order = db.get('orders').find({ orderId: req.params.id }).value();
  if (!order) return res.status(404).send('<h2>Order not found.</h2>');
  if (order.status !== 'pending') {
    return res.send(`<h2 style="font-family:sans-serif;">ℹ️ Order ${req.params.id} is already <strong>${order.status}</strong>.</h2>`);
  }

  db.get('orders').find({ orderId: req.params.id }).assign({ status: 'confirmed', updatedAt: new Date().toISOString() }).write();
  const updated = db.get('orders').find({ orderId: req.params.id }).value();
  try { await sendBuyerConfirmation(updated); } catch (e) { console.error(e.message); }

  return res.send(`
    <html><body style="font-family:sans-serif;background:#0e0620;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
      <div style="text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">✅</div>
        <h2 style="color:#10b981;">Order ${req.params.id} CONFIRMED</h2>
        <p style="color:#6b7280;">Buyer confirmation email has been sent to ${updated.buyer.email}</p>
        <p style="color:#a855f7;font-size:28px;font-weight:900;">$${updated.total} USD</p>
      </div>
    </body></html>
  `);
});

// ── GET /orders/:id/reject — quick reject via email link ──
router.get('/:id/reject', async (req, res) => {
  if (req.query.secret !== process.env.JWT_SECRET) {
    return res.status(403).send('<h2 style="font-family:sans-serif;color:red;">⛔ Unauthorized</h2>');
  }
  const order = db.get('orders').find({ orderId: req.params.id }).value();
  if (!order) return res.status(404).send('<h2>Order not found.</h2>');
  if (order.status !== 'pending') {
    return res.send(`<h2 style="font-family:sans-serif;">ℹ️ Order ${req.params.id} is already <strong>${order.status}</strong>.</h2>`);
  }

  db.get('orders').find({ orderId: req.params.id }).assign({ status: 'rejected', updatedAt: new Date().toISOString() }).write();
  const updated = db.get('orders').find({ orderId: req.params.id }).value();
  try { await sendBuyerRejection(updated); } catch (e) { console.error(e.message); }

  return res.send(`
    <html><body style="font-family:sans-serif;background:#0e0620;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
      <div style="text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">❌</div>
        <h2 style="color:#ef4444;">Order ${req.params.id} REJECTED</h2>
        <p style="color:#6b7280;">Rejection email has been sent to ${updated.buyer.email}</p>
      </div>
    </body></html>
  `);
});

module.exports = router;
                                 
