// api.js — Frontend ↔ Backend connector
// ─────────────────────────────────────────────────────
// STEP 1: While running locally, keep this as-is
// STEP 2: After deploying backend to Render, replace the URL below
//         e.g. const API_URL = 'https://tickets-hub-api.onrender.com';

const API_URL = 'http://localhost:5000';

// ── Token helpers ──
function getToken()      { return localStorage.getItem('th_token'); }
function setToken(t)     { localStorage.setItem('th_token', t); }
function clearToken()    { localStorage.removeItem('th_token'); localStorage.removeItem('th_session'); }

// ── Base fetch ──
async function apiFetch(path, options = {}) {
  const token   = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res  = await fetch(API_URL + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed (' + res.status + ')');
  return data;
}

// ─────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────
const Auth = {
  async register(payload) {
    return apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  },

  async login(email, password) {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(data.token);
    localStorage.setItem('th_session', JSON.stringify(data.user));
    return data;
  },

  logout() {
    clearToken();
    window.location.href = 'index.html';
  },

  async me() {
    return apiFetch('/auth/me');
  },

  isLoggedIn() {
    return !!getToken();
  },

  getSession() {
    return JSON.parse(localStorage.getItem('th_session') || 'null');
  }
};

// ─────────────────────────────────────────
//  EVENTS
// ─────────────────────────────────────────
const Events = {
  async getAll() {
    return apiFetch('/events');
  },
  async getOne(id) {
    return apiFetch('/events/' + id);
  },
  async create(payload) {
    return apiFetch('/events', { method: 'POST', body: JSON.stringify(payload) });
  },
  async update(id, payload) {
    return apiFetch('/events/' + id, { method: 'PUT', body: JSON.stringify(payload) });
  },
  async delete(id) {
    return apiFetch('/events/' + id, { method: 'DELETE' });
  }
};

// ─────────────────────────────────────────
//  ORDERS
// ─────────────────────────────────────────
const Orders = {
  async submit(orderData) {
    return apiFetch('/orders', { method: 'POST', body: JSON.stringify(orderData) });
  },
  async getAll(params) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch('/orders' + q);
  },
  async getMy() {
    return apiFetch('/orders/my');
  },
  async getOne(orderId) {
    return apiFetch('/orders/' + orderId);
  },
  async updateStatus(orderId, status) {
    return apiFetch('/orders/' + orderId + '/status', {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }
};

// ─────────────────────────────────────────
//  CART  (localStorage — stays client-side)
// ─────────────────────────────────────────
const Cart = {
  get() {
    return JSON.parse(localStorage.getItem('th_cart') || '[]');
  },

  add(item) {
    const cart     = this.get();
    const existing = cart.find(i => i.tier === item.tier && i.event === item.event);
    if (existing) existing.qty = Math.min(6, existing.qty + item.qty);
    else cart.push(item);
    localStorage.setItem('th_cart', JSON.stringify(cart));
    this.updateCount();
  },

  remove(index) {
    const cart = this.get();
    cart.splice(index, 1);
    localStorage.setItem('th_cart', JSON.stringify(cart));
    this.updateCount();
  },

  updateQty(index, qty) {
    const cart = this.get();
    if (cart[index]) cart[index].qty = Math.min(6, Math.max(1, qty));
    localStorage.setItem('th_cart', JSON.stringify(cart));
    this.updateCount();
  },

  clear() {
    localStorage.removeItem('th_cart');
    this.updateCount();
  },

  count() {
    return this.get().reduce((s, i) => s + i.qty, 0);
  },

  updateCount() {
    document.querySelectorAll('.cart-count, #cartCount').forEach(el => {
      el.textContent = this.count();
    });
  }
};

// ─────────────────────────────────────────
//  INIT — runs on every page load
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Cart.updateCount();
});

// Expose globally
window.Auth   = Auth;
window.Events = Events;
window.Orders = Orders;
window.Cart   = Cart;
