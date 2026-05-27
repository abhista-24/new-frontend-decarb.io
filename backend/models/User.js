const { DynamicModel } = require('../db');

const UserSchema = {
  role: {
    type: String,
    enum: ['customer', 'restaurant', 'ngo'],
    required: true
  },
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // Human-readable address (new — replaces raw coords on registration form)
  address: {
    area:     { type: String, default: '' },
    locality: { type: String, default: '' },
    pincode:  { type: String, default: '' },
    state:    { type: String, default: '' }
  },

  // Geocoded coords (auto-filled by backend using Nominatim)
  location: {
    lat: { type: Number, default: 20.5937 },
    lng: { type: Number, default: 78.9629 }
  },

  // Restaurant-specific
  gstin: { type: String, default: '' },

  // NGO-specific
  ngo_id:      { type: String, default: '' },
  certificate: { type: String, default: '' }
};

module.exports = new DynamicModel('User', UserSchema, 'users');
