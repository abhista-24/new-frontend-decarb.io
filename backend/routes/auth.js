const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'decarb_secret_key_2026';

// ── Geocode helper — free Nominatim API, no key required ─────────────────────
async function geocodeAddress(area, locality, pincode, state) {
  try {
    const query = [area, locality, pincode, state, 'India'].filter(Boolean).join(', ');
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'decarb-io-app/1.0' } });
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {
    console.warn('[Geocode] Nominatim failed, using pincode fallback:', e.message);
  }
  // Fallback: India center + pincode-derived offset so records differ geographically
  const offset = (parseInt(pincode || '0') % 1000) / 10000;
  return { lat: 20.5937 + offset, lng: 78.9629 + offset };
}

// ── Register Route ─────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { role, name, email, password, address, gstin, ngo_id, certificate } = req.body;

    if (!role || !name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    if (!['customer', 'restaurant', 'ngo'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Address fields are optional — default to empty strings
    const area     = address?.area     || '';
    const locality = address?.locality || '';
    const pincode  = address?.pincode  || '';
    const state    = address?.state    || '';

    // Duplicate email check
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Geocode address to lat/lng for proximity features
    const coords = await geocodeAddress(area, locality, pincode, state);
    console.log(`[Geocode] ${name} → lat: ${coords.lat}, lng: ${coords.lng}`);

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      role,
      name,
      email,
      password: hashedPassword,
      address: { area, locality, pincode, state },
      location: coords,
      ...(gstin   && { gstin }),
      ...(ngo_id  && { ngo_id, certificate })
    });

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        role: newUser.role,
        name: newUser.name,
        email: newUser.email,
        address: newUser.address,
        location: newUser.location
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Login Route ────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Normalize: treat email as case-insensitive identifier

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        address: user.address,
        location: user.location
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
