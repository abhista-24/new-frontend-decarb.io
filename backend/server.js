const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./db');
const FoodListing = require('./models/FoodListing');

// Config environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// API Endpoints
app.use('/api/auth', require('./routes/auth'));
app.use('/api/food', require('./routes/food'));
app.use('/api/order', require('./routes/order'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/ai', require('./routes/ai'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Auto-Expiry Engine: periodic interval checking pickup windows
setInterval(async () => {
  try {
    const now = new Date();
    // Query all available listings and filter expired ones manually
    // to ensure 100% compliance across both Mongoose and the local JSON MockModel
    const availableListings = await FoodListing.find({ status: 'available' });
    const expiredListings = availableListings.filter(item => new Date(item.pickup_time) < now);

    for (let listing of expiredListings) {
      await FoodListing.findByIdAndUpdate(listing._id, {
        $set: { status: 'expired' }
      });
      console.log(`[Auto-Expiry Engine]: Listing "${listing.title}" (ID: ${listing._id}) has expired and is now offline.`);
    }
  } catch (err) {
    console.error('[Auto-Expiry Engine] Error:', err.message);
  }
}, 30000); // Runs every 30 seconds

// Bootstrap DB connection & start server
async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`==================================================================`);
    console.log(`  Last Bite Backend Server running on http://localhost:${PORT}`);
    console.log(`==================================================================`);
  });
}

startServer();
