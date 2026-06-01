// db.js — File-based database using lowdb
const low  = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);

// Set default structure
db.defaults({
  users:  [],
  orders: [],
  events: [
    {
      id: 'ev1',
      artist: 'BTS',
      name: 'ARIRANG WORLD TOUR 2026',
      date: 'TBA 2026',
      venue: 'Multiple Cities',
      status: 'presale',
      badge: 'presale',
      desc: 'BTS returns with their highly anticipated ARIRANG World Tour 2026 — a monumental concert series celebrating their journey, their roots, and their ARMY.',
      tiers: [
        { name: 'VIP EXPERIENCE',      price: 380 },
        { name: 'PREMIUM FLOOR',       price: 220 },
        { name: 'FLOOR STANDING',      price: 150 },
        { name: 'SEATED — LOWER BOWL', price: 120 }
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 'ev2',
      artist: 'THE WEEKND',
      name: 'HURRY UP TOMORROW WORLD TOUR',
      date: 'TBA 2026',
      venue: 'TBA',
      status: 'presale',
      badge: 'hot',
      desc: "The Weeknd's global tour in support of Hurry Up Tomorrow.",
      tiers: [
        { name: 'VIP',     price: 320 },
        { name: 'FLOOR',   price: 150 },
        { name: 'SEATED',  price: 95  }
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 'ev3',
      artist: 'EXO',
      name: 'COMEBACK CONCERT 2026',
      date: 'TBA 2026',
      venue: 'TBA',
      status: 'upcoming',
      badge: 'new',
      desc: "EXO's long-awaited comeback stage.",
      tiers: [
        { name: 'VIP',     price: 280 },
        { name: 'GENERAL', price: 85  }
      ],
      createdAt: new Date().toISOString()
    }
  ]
}).write();

module.exports = db;
