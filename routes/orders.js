require('dotenv').config();
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Email helpers (inline to avoid circular deps)
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } });

async function notifyAdmin(order) {
  const apiBase = process.env.API_BASE_URL || 'http://localhost:5000';
  const confirmLink = apiBase+'/orders/'+order.orderId+'/confirm?secret='+process.env.JWT_SECRET;
  const rejectLink  = apiBase+'/orders/'+order.orderId+'/reject?secret='+process.env.JWT_SECRET;
  try {
    await transporter.sendMail({
      from: '"TICKETS HUB" <'+process.env.GMAIL_USER+'>',
      to: process.env.NOTIFY_EMAIL,
      subject: 'New Order '+order.orderId+' — $'+order.total+' — '+order.buyer.name,
      html: '<div style="font-family:sans-serif;background:#1a0a2e;color:#fff;padding:2rem;border-radius:12px;">'+
        '<h2 style="color:#a855f7;">NEW ORDER RECEIVED</h2>'+
        '<p><strong>Order ID:</strong> '+order.orderId+'</p>'+
        '<p><strong>Name:</strong> '+order.buyer.name+'</p>'+
        '<p><strong>Email:</strong> '+order.buyer.email+'</p>'+
        '<p><strong>Country:</strong> '+order.buyer.country+'</p>'+
        '<p><strong>Total:</strong> $'+order.total+' USD</p>'+
        '<hr style="border-color:rgba(124,58,237,0.3);"/>'+
        '<h3>Tickets:</h3>'+
        (order.items||[]).map(i=>'<p>'+i.artist+' — '+i.event+' | '+i.tier+' | '+i.qty+'×$'+i.price+'</p>').join('')+
        '<br/><a href="'+confirmLink+'" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-right:12px;font-weight:bold;">CONFIRM PAYMENT</a>'+
        '<a href="'+rejectLink+'" style="background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">REJECT ORDER</a>'+
        '</div>'
    });
  } catch(e) { console.error('Email failed:', e.message); }
}

async function confirmEmail(order) {
  try {
    await transporter.sendMail({
      from: '"TICKETS HUB" <'+process.env.GMAIL_USER+'>',
      to: order.buyer.email,
      subject: 'Tickets Confirmed — '+order.orderId+' | TICKETS HUB',
      html: '<div style="font-family:sans-serif;background:#1a0a2e;color:#fff;padding:2rem;border-radius:12px;">'+
        '<h2 style="color:#10b981;">YOUR TICKETS ARE CONFIRMED!</h2>'+
        '<p><strong>Order Reference:</strong> <span style="color:#f59e0b;">'+order.orderId+'</span></p>'+
        '<p><strong>Name:</strong> '+order.buyer.name+'</p>'+
        '<p><strong>Email:</strong> '+order.buyer.email+'</p>'+
        '<hr style="border-color:rgba(124,58,237,0.3);"/>'+
        (order.items||[]).map(i=>'<p>'+i.artist+' — '+i.tier+' | '+i.qty+' ticket(s) — $'+(i.price*i.qty)+'</p>').join('')+
        '<p><strong>Total Paid:</strong> $'+order.total+' USD</p>'+
        '<hr style="border-color:rgba(124,58,237,0.3);"/>'+
        '<p>Venue and entry details will be sent to this email closer to the event date.</p>'+
        '<p>Questions? Email <a href="mailto:support@ticketshub.com" style="color:#a855f7;">support@ticketshub.com</a></p>'+
        '</div>'
    });
  } catch(e) { console.error('Confirm email failed:', e.message); }
}

async function rejectEmail(order) {
  try {
    await transporter.sendMail({
      from: '"TICKETS HUB" <'+process.env.GMAIL_USER+'>',
      to: order.buyer.email,
      subject: 'Payment Issue — Order '+order.orderId+' | TICKETS HUB',
      html: '<div style="font-family:sans-serif;background:#1a0a2e;color:#fff;padding:2rem;border-radius:12px;">'+
        '<h2 style="color:#ef4444;">PAYMENT NOT VERIFIED</h2>'+
        '<p>Hi '+order.buyer.name+', we could not verify your payment for order <strong>'+order.orderId+'</strong>.</p>'+
        '<p>Please contact us at <a href="mailto:support@ticketshub.com" style="color:#a855f7;">support@ticketshub.com</a> with your payment screenshot.</p>'+
        '</div>'
    });
  } catch(e) { console.error('Reject email failed:', e.message); }
}

router.post('/', requireAuth, async (req, res) => {
  try {
    const { items, buyer, subtotal, fee, discount, total } = req.body;
    if (!items || !items.length || !buyer || !total) return res.status(400).json({ error: 'Missing required fields.' });
    const order = { orderId: 'TH-'+Date.now().toString(36).toUpperCase(), userId: req.user.id||null, items, buyer, subtotal: subtotal||0, fee: fee||0, discount: discount||0, total, status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.get('orders').push(order).write();
    await notifyAdmin(order);
    return res.status(201).json({ message: 'Order submitted.', orderId: order.orderId, status: order.status });
  } catch(err) { console.error(err); return res.status(500).json({ error: 'Server error.' }); }
});

router.get('/', requireAdmin, (req, res) => {
  const { status, search } = req.query;
  let orders = db.get('orders').value();
  if (status) orders = orders.filter(o => o.status === status);
  if (search) { const q=search.toLowerCase(); orders=orders.filter(o => (o.orderId||'').toLowerCase().includes(q)||(o.buyer?.name||'').toLowerCase().includes(q)||(o.buyer?.email||'').toLowerCase().includes(q)); }
  orders = [...orders].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  return res.json({ orders, total: orders.length });
});

router.get('/my', requireAuth, (req, res) => {
  const orders = db.get('orders').filter({ userId: req.user.id }).value().sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  return res.json({ orders });
});

router.get('/:id', requireAuth, (req, res) => {
  const order = db.get('orders').find({ orderId: req.params.id }).value();
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (req.user.role !== 'admin' && order.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized.' });
  return res.json({ order });
});

router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['confirmed','rejected'].includes(status)) return res.status(400).json({ error: 'Status must be confirmed or rejected.' });
    const order = db.get('orders').find({ orderId: req.params.id }).value();
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    db.get('orders').find({ orderId: req.params.id }).assign({ status, updatedAt: new Date().toISOString() }).write();
    const updated = db.get('orders').find({ orderId: req.params.id }).value();
    if (status === 'confirmed') await confirmEmail(updated);
    if (status === 'rejected')  await rejectEmail(updated);
    return res.json({ message: 'Order '+status+'.', orderId: req.params.id, status });
  } catch(err) { console.error(err); return res.status(500).json({ error: 'Server error.' }); }
});

router.get('/:id/confirm', async (req, res) => {
  if (req.query.secret !== process.env.JWT_SECRET) return res.status(403).send('<h2>Unauthorized</h2>');
  const order = db.get('orders').find({ orderId: req.params.id }).value();
  if (!order) return res.status(404).send('<h2>Order not found.</h2>');
  if (order.status !== 'pending') return res.send('<h2>Order already '+order.status+'.</h2>');
  db.get('orders').find({ orderId: req.params.id }).assign({ status: 'confirmed', updatedAt: new Date().toISOString() }).write();
  const updated = db.get('orders').find({ orderId: req.params.id }).value();
  await confirmEmail(updated);
  return res.send('<html><body style="font-family:sans-serif;background:#0e0620;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><div style="font-size:3rem;">✅</div><h2 style="color:#10b981;">Order '+req.params.id+' CONFIRMED</h2><p>Confirmation email sent to '+updated.buyer.email+'</p></div></body></html>');
});

router.get('/:id/reject', async (req, res) => {
  if (req.query.secret !== process.env.JWT_SECRET) return res.status(403).send('<h2>Unauthorized</h2>');
  const order = db.get('orders').find({ orderId: req.params.id }).value();
  if (!order) return res.status(404).send('<h2>Order not found.</h2>');
  if (order.status !== 'pending') return res.send('<h2>Order already '+order.status+'.</h2>');
  db.get('orders').find({ orderId: req.params.id }).assign({ status: 'rejected', updatedAt: new Date().toISOString() }).write();
  const updated = db.get('orders').find({ orderId: req.params.id }).value();
  await rejectEmail(updated);
  return res.send('<html><body style="font-family:sans-serif;background:#0e0620;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><div style="font-size:3rem;">❌</div><h2 style="color:#ef4444;">Order '+req.params.id+' REJECTED</h2><p>Rejection email sent to '+updated.buyer.email+'</p></div></body></html>');
});

module.exports = router;
