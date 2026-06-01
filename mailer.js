// mailer.js — Nodemailer email service
require('dotenv').config();
const nodemailer = require('nodemailer');

// ── Transporter ──
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// ── Helper: format ticket list ──
function formatTickets(items) {
  return items.map(item =>
    `• ${item.artist} — ${item.event}
     Tier: ${item.tier}
     Qty:  ${item.qty} × $${item.price} = $${item.price * item.qty}`
  ).join('\n\n');
}

function formatTicketsHTML(items) {
  return items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #2d1060;">
        <strong>${item.artist}</strong><br/>
        <span style="color:#a855f7;font-size:13px;">${item.event}</span><br/>
        <span style="color:#6b7280;font-size:12px;">🎟️ ${item.tier}</span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #2d1060;text-align:right;white-space:nowrap;">
        <strong>$${(item.price * item.qty).toLocaleString()}</strong><br/>
        <span style="color:#6b7280;font-size:12px;">${item.qty} × $${item.price}</span>
      </td>
    </tr>
  `).join('');
}

// ────────────────────────────────────────────
//  1. NEW ORDER — sent to admin (you)
// ────────────────────────────────────────────
async function sendOrderNotification(order) {
  const apiBase = process.env.API_BASE_URL || 'http://localhost:5000';
  const confirmLink = `${apiBase}/orders/${order.orderId}/confirm?secret=${process.env.JWT_SECRET}`;
  const rejectLink  = `${apiBase}/orders/${order.orderId}/reject?secret=${process.env.JWT_SECRET}`;

  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"/></head>
  <body style="margin:0;padding:0;background:#0e0620;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

      <!-- Header -->
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:28px;font-weight:900;letter-spacing:0.08em;color:#fff;">
          TICKETS<span style="color:#a855f7;">HUB</span>
        </div>
        <div style="font-size:11px;color:#6b7280;letter-spacing:0.1em;text-transform:uppercase;margin-top:4px;">Admin Notification</div>
      </div>

      <!-- Alert banner -->
      <div style="background:#7c3aed;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
        <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:0.04em;">🎟️ NEW ORDER RECEIVED</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:6px;">A customer has submitted a payment. Review and confirm below.</div>
      </div>

      <!-- Order ID -->
      <div style="background:#120826;border:1px solid rgba(124,58,237,0.3);border-radius:12px;padding:16px 24px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
        <div style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">Order Reference</div>
        <div style="color:#f59e0b;font-size:20px;font-weight:800;letter-spacing:0.06em;">${order.orderId}</div>
      </div>

      <!-- Buyer details -->
      <div style="background:#120826;border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:20px 24px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6b7280;margin-bottom:14px;">👤 Buyer Details</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:5px 0;width:35%;">Name</td>
            <td style="color:#fff;font-weight:600;font-size:13px;">${order.buyer.name}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:5px 0;">Email</td>
            <td style="color:#a855f7;font-weight:600;font-size:13px;"><a href="mailto:${order.buyer.email}" style="color:#a855f7;">${order.buyer.email}</a></td>
          </tr>
          ${order.buyer.phone ? `<tr><td style="color:#6b7280;font-size:13px;padding:5px 0;">Phone</td><td style="color:#fff;font-weight:600;font-size:13px;">${order.buyer.phone}</td></tr>` : ''}
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:5px 0;">Country</td>
            <td style="color:#fff;font-weight:600;font-size:13px;">${order.buyer.country}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:5px 0;">Date</td>
            <td style="color:#fff;font-weight:600;font-size:13px;">${new Date(order.createdAt).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <!-- Tickets -->
      <div style="background:#120826;border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:20px 24px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6b7280;margin-bottom:14px;">🎟️ Tickets Ordered</div>
        <table style="width:100%;border-collapse:collapse;">
          ${formatTicketsHTML(order.items)}
        </table>
        <div style="border-top:1px solid #2d1060;margin-top:12px;padding-top:12px;display:flex;justify-content:space-between;">
          <div style="color:#6b7280;font-size:13px;">Subtotal</div>
          <div style="color:#fff;font-weight:600;font-size:13px;">$${order.subtotal.toLocaleString()}</div>
        </div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;">
          <div style="color:#6b7280;font-size:13px;">Service fee</div>
          <div style="color:#fff;font-weight:600;font-size:13px;">$${order.fee.toLocaleString()}</div>
        </div>
        ${order.discount > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;"><div style="color:#6b7280;font-size:13px;">Discount</div><div style="color:#10b981;font-weight:600;font-size:13px;">-$${order.discount.toLocaleString()}</div></div>` : ''}
        <div style="border-top:1px solid #2d1060;margin-top:8px;padding-top:12px;display:flex;justify-content:space-between;align-items:center;">
          <div style="color:#fff;font-weight:700;font-size:15px;">TOTAL</div>
          <div style="color:#a855f7;font-size:24px;font-weight:900;">$${order.total.toLocaleString()} USD</div>
        </div>
      </div>

      <!-- Action buttons -->
      <div style="margin-bottom:28px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6b7280;margin-bottom:14px;text-align:center;">⚡ Quick Actions</div>
        <div style="display:flex;gap:12px;justify-content:center;">
          <a href="${confirmLink}" style="display:inline-block;padding:14px 28px;background:#10b981;color:#fff;border-radius:10px;font-weight:800;font-size:14px;text-decoration:none;letter-spacing:0.03em;">✓ CONFIRM PAYMENT</a>
          <a href="${rejectLink}"  style="display:inline-block;padding:14px 28px;background:#ef4444;color:#fff;border-radius:10px;font-weight:800;font-size:14px;text-decoration:none;letter-spacing:0.03em;">✗ REJECT ORDER</a>
        </div>
        <div style="text-align:center;margin-top:10px;font-size:11px;color:#6b7280;">Or log in to your <a href="${process.env.FRONTEND_URL}/admin.html" style="color:#a855f7;">Admin Dashboard</a> to manage orders</div>
      </div>

      <!-- Footer -->
      <div style="text-align:center;font-size:11px;color:#4b5563;border-top:1px solid rgba(124,58,237,0.15);padding-top:20px;">
        TICKETS HUB Admin System · This email was sent automatically when a customer submitted their payment.
      </div>
    </div>
  </body>
  </html>
  `;

  const text = `
NEW ORDER — TICKETS HUB
========================
Order ID: ${order.orderId}
Date: ${new Date(order.createdAt).toLocaleString()}

BUYER:
  Name:    ${order.buyer.name}
  Email:   ${order.buyer.email}
  Phone:   ${order.buyer.phone || 'N/A'}
  Country: ${order.buyer.country}

TICKETS:
${formatTickets(order.items)}

TOTAL: $${order.total} USD

CONFIRM: ${confirmLink}
REJECT:  ${rejectLink}
  `;

  await transporter.sendMail({
    from:    `"TICKETS HUB" <${process.env.GMAIL_USER}>`,
    to:      process.env.NOTIFY_EMAIL,
    subject: `🎟️ New Order ${order.orderId} — $${order.total} USD — ${order.buyer.name}`,
    text,
    html
  });

  console.log(`✅ Order notification sent for ${order.orderId}`);
}

// ────────────────────────────────────────────
//  2. CONFIRMATION — sent to buyer
// ────────────────────────────────────────────
async function sendBuyerConfirmation(order) {
  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"/></head>
  <body style="margin:0;padding:0;background:#0e0620;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

      <!-- Header -->
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:28px;font-weight:900;letter-spacing:0.08em;color:#fff;">
          TICKETS<span style="color:#a855f7;">HUB</span>
        </div>
      </div>

      <!-- Success banner -->
      <div style="background:linear-gradient(135deg,#065f46,#047857);border-radius:12px;padding:28px 24px;margin-bottom:24px;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">🎟️</div>
        <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:0.04em;">YOUR TICKETS ARE CONFIRMED!</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:8px;">Payment verified · See you at the show!</div>
      </div>

      <!-- Order ref -->
      <div style="background:#120826;border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:16px 24px;margin-bottom:20px;text-align:center;">
        <div style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Your Order Reference</div>
        <div style="color:#f59e0b;font-size:24px;font-weight:900;letter-spacing:0.08em;">${order.orderId}</div>
        <div style="color:#6b7280;font-size:11px;margin-top:4px;">Keep this safe — you'll need it for entry</div>
      </div>

      <!-- Buyer -->
      <div style="background:#120826;border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:20px 24px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6b7280;margin-bottom:12px;">👤 Booking Details</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#6b7280;font-size:13px;padding:5px 0;width:35%;">Name</td><td style="color:#fff;font-weight:600;font-size:13px;">${order.buyer.name}</td></tr>
          <tr><td style="color:#6b7280;font-size:13px;padding:5px 0;">Email</td><td style="color:#fff;font-weight:600;font-size:13px;">${order.buyer.email}</td></tr>
          <tr><td style="color:#6b7280;font-size:13px;padding:5px 0;">Country</td><td style="color:#fff;font-weight:600;font-size:13px;">${order.buyer.country}</td></tr>
          <tr><td style="color:#6b7280;font-size:13px;padding:5px 0;">Confirmed</td><td style="color:#10b981;font-weight:600;font-size:13px;">${new Date().toLocaleString()}</td></tr>
        </table>
      </div>

      <!-- Tickets -->
      <div style="background:#120826;border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:20px 24px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6b7280;margin-bottom:14px;">🎵 Your Tickets</div>
        <table style="width:100%;border-collapse:collapse;">
          ${formatTicketsHTML(order.items)}
        </table>
        <div style="border-top:1px solid #2d1060;margin-top:12px;padding-top:12px;display:flex;justify-content:space-between;align-items:center;">
          <div style="color:#fff;font-weight:700;">Total Paid</div>
          <div style="color:#a855f7;font-size:22px;font-weight:900;">$${order.total.toLocaleString()} USD</div>
        </div>
      </div>

      <!-- What to expect -->
      <div style="background:#120826;border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6b7280;margin-bottom:14px;">⏭️ What's Next</div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="width:28px;height:28px;border-radius:50%;background:rgba(124,58,237,0.2);border:1px solid rgba(124,58,237,0.4);color:#a855f7;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">1</div>
            <div style="font-size:13px;color:#d1d5db;">Venue and date details will be sent to this email as soon as they are confirmed by the event organizer.</div>
          </div>
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="width:28px;height:28px;border-radius:50%;background:rgba(124,58,237,0.2);border:1px solid rgba(124,58,237,0.4);color:#a855f7;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">2</div>
            <div style="font-size:13px;color:#d1d5db;">Your entry QR code / ticket PDF will be emailed to you closer to the event date.</div>
          </div>
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="width:28px;height:28px;border-radius:50%;background:rgba(124,58,237,0.2);border:1px solid rgba(124,58,237,0.4);color:#a855f7;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">3</div>
            <div style="font-size:13px;color:#d1d5db;">Questions? Reply to this email or contact us at <a href="mailto:support@ticketshub.com" style="color:#a855f7;">support@ticketshub.com</a></div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align:center;font-size:11px;color:#4b5563;border-top:1px solid rgba(124,58,237,0.15);padding-top:20px;">
        TICKETS HUB is an independent resale marketplace and is not affiliated with any official artist or ticketing entity.<br/>
        © 2026 TicketsHub · <a href="mailto:support@ticketshub.com" style="color:#6b7280;">support@ticketshub.com</a>
      </div>
    </div>
  </body>
  </html>
  `;

  await transporter.sendMail({
    from:    `"TICKETS HUB" <${process.env.GMAIL_USER}>`,
    to:      order.buyer.email,
    subject: `✅ Tickets Confirmed — ${order.orderId} | TICKETS HUB`,
    html
  });

  console.log(`✅ Buyer confirmation sent to ${order.buyer.email}`);
}

// ────────────────────────────────────────────
//  3. REJECTION — sent to buyer
// ────────────────────────────────────────────
async function sendBuyerRejection(order) {
  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"/></head>
  <body style="margin:0;padding:0;background:#0e0620;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:28px;font-weight:900;letter-spacing:0.08em;color:#fff;">TICKETS<span style="color:#a855f7;">HUB</span></div>
      </div>
      <div style="background:linear-gradient(135deg,#7f1d1d,#991b1b);border-radius:12px;padding:28px 24px;margin-bottom:24px;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">⚠️</div>
        <div style="font-size:20px;font-weight:800;color:#fff;">PAYMENT NOT VERIFIED</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:8px;">Order Reference: ${order.orderId}</div>
      </div>
      <div style="background:#120826;border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:20px 24px;margin-bottom:20px;color:#d1d5db;font-size:14px;line-height:1.7;">
        Hi ${order.buyer.name},<br/><br/>
        Unfortunately we were unable to verify your payment for order <strong style="color:#f59e0b;">${order.orderId}</strong>.<br/><br/>
        This may be because:<br/>
        • The payment amount did not match<br/>
        • The payment was not received<br/>
        • There was an issue with the QR scan<br/><br/>
        Please contact us at <a href="mailto:support@ticketshub.com" style="color:#a855f7;">support@ticketshub.com</a> with your order reference and payment screenshot and we'll resolve this for you.
      </div>
      <div style="text-align:center;font-size:11px;color:#4b5563;border-top:1px solid rgba(124,58,237,0.15);padding-top:20px;">
        © 2026 TicketsHub · <a href="mailto:support@ticketshub.com" style="color:#6b7280;">support@ticketshub.com</a>
      </div>
    </div>
  </body>
  </html>
  `;

  await transporter.sendMail({
    from:    `"TICKETS HUB" <${process.env.GMAIL_USER}>`,
    to:      order.buyer.email,
    subject: `⚠️ Payment Issue — Order ${order.orderId} | TICKETS HUB`,
    html
  });

  console.log(`📧 Rejection email sent to ${order.buyer.email}`);
}

module.exports = { sendOrderNotification, sendBuyerConfirmation, sendBuyerRejection };
