# 🎟️ TICKETS HUB — Backend API

Node.js + Express backend for TICKETS HUB.

---

## 📁 File Structure

```
tickets-hub-backend/
├── server.js          ← Main Express server
├── db.js              ← File-based database (lowdb)
├── mailer.js          ← Email service (Nodemailer)
├── api.js             ← Frontend connector (copy to HTML folder)
├── .env.example       ← Environment variables template
├── .gitignore
├── package.json
├── middleware/
│   └── auth.js        ← JWT auth middleware
└── routes/
    ├── auth.js        ← Register, login, /me
    ├── orders.js      ← Orders CRUD + email triggers
    └── events.js      ← Events CRUD
```

---

## ⚙️ Setup (Step by Step)

### 1. Install Node.js
Download from https://nodejs.org (LTS version)

### 2. Install dependencies
```bash
cd tickets-hub-backend
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env
```
Open `.env` and fill in:
- `GMAIL_APP_PASSWORD` — see instructions below
- `JWT_SECRET` — change to any long random string

### 4. Get your Gmail App Password
1. Go to https://myaccount.google.com
2. **Security** → **2-Step Verification** (enable it if not already)
3. **Security** → **App Passwords**
4. Select **Mail** + **Other (Custom name)** → type `TicketsHub`
5. Copy the 16-character password
6. Paste it into `.env` as `GMAIL_APP_PASSWORD`

### 5. Start the server
```bash
# Development (auto-restarts on changes)
npm run dev

# Production
npm start
```

Server runs at: `http://localhost:5000`

---

## 🔗 Connect Frontend to Backend

1. Copy `api.js` into your HTML files folder (same folder as `index.html`)
2. Add this line to the `<head>` of every HTML page:
```html
<script src="api.js"></script>
```
3. The frontend now calls the real backend instead of localStorage

---

## 📡 API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/auth/register` | Public | Register new user |
| POST | `/auth/login` | Public | Login → returns JWT |
| GET | `/auth/me` | User | Get current user |
| GET | `/events` | Public | Get all events |
| GET | `/events/:id` | Public | Get single event |
| POST | `/events` | Admin | Add new event |
| PUT | `/events/:id` | Admin | Edit event |
| DELETE | `/events/:id` | Admin | Delete event |
| POST | `/orders` | User | Submit order → emails you |
| GET | `/orders` | Admin | Get all orders |
| GET | `/orders/my` | User | Get my orders |
| GET | `/orders/:id` | User/Admin | Get order details |
| PATCH | `/orders/:id/status` | Admin | Confirm or reject |
| GET | `/orders/:id/confirm?secret=` | Email link | Quick confirm |
| GET | `/orders/:id/reject?secret=` | Email link | Quick reject |

---

## 📧 Email Flow

| Trigger | Who receives | Content |
|---------|-------------|---------|
| Customer submits order | **You** (admin) | Full order details + Confirm/Reject buttons |
| You click Confirm | **Customer** | Ticket confirmation + what's next |
| You click Reject | **Customer** | Rejection notice + support contact |

---

## 🚀 Deploy to Render (Free)

1. Push backend to a **separate** GitHub repo
2. Go to https://render.com → New → Web Service
3. Connect your repo
4. Set:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
5. Add all `.env` variables under **Environment**
6. Deploy — you get a URL like `https://tickets-hub-api.onrender.com`
7. Update `api.js` → change `API_URL` to your Render URL
8. Update `FRONTEND_URL` in Render env vars to your GitHub Pages URL

---

## 🔐 Admin Credentials
- **Email:** `admin@ticketshub.com`
- **Password:** `Admin@2026!`
*(Set in `.env` — change before going live)*

---

## 🔗 One-Line URL Change to Go Live

In `api.js` (in your HTML folder), change line 6:
```js
// Local
const API_URL = 'http://localhost:5000';

// After deploying to Render:
const API_URL = 'https://your-app-name.onrender.com';
```
