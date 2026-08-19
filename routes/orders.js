require('dotenv').config();
const express  = require('express');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const db       = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router   = express.Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
});

async function emailAdmin(order) {
  const base = process.env.API_BASE_URL || 'http://localhost:5000';
  const confirmLink = base + '/orders/' + order.orderId + '/confirm?secret=' + process.env.JWT_SECRET;
  const rejectLink  = base + '/orders/' + order.orderId + '/reject?secret='  + process.env.JWT_SECRET;
  try {
    await transporter.sendMail({
      from: '"TICKETS HUB" <' + process.env.GMAIL_USER + '>',
      to:   process.env.NOTIFY_EMAIL,
      subject: 'New Order ' + order.orderId + ' — $' + order.total + ' — ' + order.buyer.name,
      html: '<div style="font-family:sans-serif;background:#1a0a2e;color:#fff;padding:2rem;max-width:600px;">' +
        '<h2 style="color:#a855f7;">NEW ORDER RECEIVED</h2>' +
        '<p><b>Order ID:</b> ' + order.orderId + '</p>' +
        '<p><b>Name:</b> '    + order.buyer.name + '</p>' +
        '<p><b>Email:</b> '   + order.buyer.email + '</p>' +
        '<p><b>Country:</b> ' + order.buyer.country + '</p>' +
        '<p><b>Total:</b> $'  + order.total + ' USD</p><hr style="border-color:#7c3aed;"/>' +
        (order.items||[]).map(i => '<p>' + i.artist + ' — ' + i.tier + ' | ' + i.qty + 'x$' + i.price + '</p>').join('') +
        '<br/><a href="' + confirmLink + '" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-right:12px;font-weight:bold;display:inline-block;">CONFIRM PAYMENT</a>' +
        '<a href="' + rejectLink + '" style="background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">REJECT ORDER</a>' +
        '</div>'
    });
  } catch (e) { console.error('Admin email failed:', e.message); }
}

async function emailBuyerConfirm(order) {
  try {
    await transporter.sendMail({
      from: '"TICKETS HUB" <' + process.env.GMAIL_USER + '>',
      to:   order.buyer.email,
      subject: 'Tickets Confirmed — ' + order.orderId + ' | TICKETS HUB',
      html: '<div style="font-family:sans-serif;background:#1a0a2e;color:#fff;padding:2rem;max-width:600px;">' +
        '<h2 style="color:#10b981;">YOUR TICKETS ARE CONFIRMED!</h2>' +
        '<p><b>Order Ref:</b> <span style="color:#f59e0b;">' + order.orderId + '</span></p>' +
        '<p><b>Name:</b> '  + order.buyer.name + '</p>' +
        '<p><b>Email:</b> ' + order.buyer.email + '</p>' +
        '<hr style="border-color:#7c3aed;"/>' +
        (order.items||[]).map(i => '<p>' + i.artist + ' — ' + i.tier + ' | ' + i.qty + ' ticket(s) — $' + (i.price*i.qty) + '</p>').join('') +
        '<p><b>Total Paid:</b> $' + order.total + ' USD</p>' +
        '<hr style="border-color:#7c3aed;"/>' +
        '<p>Venue and entry details will be sent to this email closer to the event.</p>' +
        '<p>Questions? <a href="mailto:support@ticketshub.com" style="color:#a855f7;">support@ticketshub.com</a></p>' +
        '</div>'
    });
  } catch (e) { console.error('Buyer confirm email failed:', e.message); }
}

async function emailBuyerReject(order) {
  try {
    await transporter.sendMail({
      from: '"TICKETS HUB" <' + process.env.GMAIL_USER + '>',
      to:   order.buyer.email,
      subject: 'Payment Issue — Order ' + order.orderId + ' | TICKETS HUB',
      html: '<div style="font-family:sans-serif;background:#1a0a2e;color:#fff;padding:2rem;max-width:600px;">' +
        '<h2 style="color:#ef4444;">PAYMENT NOT VERIFIED</h2>' +
        '<p>Hi ' + order.buyer.name + ', we could not verify payment for order <b>' + order.orderId + '</b>.</p>' +
        '<p>Contact <a href="mailto:support@ticketshub.com" style="color:#a855f7;">support@ticketshub.com</a> with your payment screenshot.</p>' +
        '</div>'
    });
  } catch (e) { console.error('Buyer reject email failed:', e.message); }
}

// POST /orders — submit order
router.post('/', requireAuth, async (req, res) => {
  try {
    const { items, buyer, subtotal, fee, discount, total } = req.body;
    if (!items || !items.length || !buyer || !total)
      return res.status(400).json({ error: 'Missing required fields.' });
    const order = {
      orderId: 'TH-' + Date.now().toString(36).toUpperCase(),
      userId: req.user.id || null,
      items, buyer, subtotal: subtotal||0, fee: fee||0, discount: discount||0, total,
      status: 'pending',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    db.get('orders').push(order).write();
    await emailAdmin(order);
    return res.status(201).json({ message: 'Order submitted.', orderId: order.orderId, status: order.status });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// GET /orders — admin: all orders
router.get('/', requireAdmin, (req, res) => {
  const { status, search } = req.query;
  let orders = db.get('orders').value();
  if (status) orders = orders.filter(o => o.status === status);
  if (search) {
    const q = search.toLowerCase();
    orders = orders.filter(o =>
      (o.orderId||'').toLowerCase().includes(q) ||
      (o.buyer?.name||'').toLowerCase().includes(q) ||
      (o.buyer?.email||'').toLowerCase().includes(q)
    );
  }
  orders = [...orders].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json({ orders, total: orders.length });
});

// GET /orders/my — user's own orders
router.get('/my', requireAuth, (req, res) => {
  const orders = db.get('orders')
    .filter({ userId: req.user.id })
    .value()
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json({ orders });
});

// GET /orders/:id — single order
router.get('/:id', requireAuth, (req, res) => {
  const order = db.get('orders').find({ orderId: req.params.id }).value();
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (req.user.role !== 'admin' && order.userId !== req.user.id)
    return res.status(403).json({ error: 'Not authorized.' });
  return res.json({ order });
});

// PATCH /orders/:id/status — admin: confirm or reject
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['confirmed','rejected'].includes(status))
      return res.status(400).json({ error: 'Status must be confirmed or rejected.' });
    const order = db.get('orders').find({ orderId: req.params.id }).value();
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    db.get('orders').find({ orderId: req.params.id })
      .assign({ status, updatedAt: new Date().toISOString() }).write();
    const updated = db.get('orders').find({ orderId: req.params.id }).value();
    if (status === 'confirmed') await emailBuyerConfirm(updated);
    if (status === 'rejected')  await emailBuyerReject(updated);
    return res.json({ message: 'Order ' + status + '.', orderId: req.params.id, status });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// GET /orders/:id/confirm — quick confirm via email link
router.get('/:id/confirm', async (req, res) => {
  if (req.query.secret !== process.env.JWT_SECRET)
    return res.status(403).send('<h2 style="font-family:sans-serif;color:red;">Unauthorized</h2>');
  const order = db.get('orders').find({ orderId: req.params.id }).value();
  if (!order) return res.status(404).send('<h2>Order not found.</h2>');
  if (order.status !== 'pending')
    return res.send('<h2 style="font-family:sans-serif;">Order already ' + order.status + '.</h2>');
  db.get('orders').find({ orderId: req.params.id })
    .assign({ status: 'confirmed', updatedAt: new Date().toISOString() }).write();
  const updated = db.get('orders').find({ orderId: req.params.id }).value();
  await emailBuyerConfirm(updated);
  return res.send('<html><body style="font-family:sans-serif;background:#0e0620;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><div style="font-size:4rem;">✅</div><h2 style="color:#10b981;">Order CONFIRMED</h2><p>' + req.params.id + '</p><p>Confirmation email sent to ' + updated.buyer.email + '</p></div></body></html>');
});

// GET /orders/:id/reject — quick reject via email link
router.get('/:id/reject', async (req, res) => {
  if (req.query.secret !== process.env.JWT_SECRET)
    return res.status(403).send('<h2 style="font-family:sans-serif;color:red;">Unauthorized</h2>');
  const order = db.get('orders').find({ orderId: req.params.id }).value();
  if (!order) return res.status(404).send('<h2>Order not found.</h2>');
  if (order.status !== 'pending')
    return res.send('<h2 style="font-family:sans-serif;">Order already ' + order.status + '.</h2>');
  db.get('orders').find({ orderId: req.params.id })
    .assign({ status: 'rejected', updatedAt: new Date().toISOString() }).write();
  const updated = db.get('orders').find({ orderId: req.params.id }).value();
  await emailBuyerReject(updated);
  return res.send('<html><body style="font-family:sans-serif;background:#0e0620;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><div style="font-size:4rem;">❌</div><h2 style="color:#ef4444;">Order REJECTED</h2><p>' + req.params.id + '</p></div></body></html>');
});

module.exports = router;
