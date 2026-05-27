const express = require('express');
const router = express.Router();
const https = require('https');
const FoodListing = require('../models/FoodListing');
const Order = require('../models/Order');

// Helper function to call Gemini API via native https to guarantee node compatibility
function callGemini(systemPrompt) {
  return new Promise((resolve, reject) => {
    const apiKey = "AIzaSyCjT9JM0NdQc_TdzrLVcvhgH-iidqYBUG8";
    const data = JSON.stringify({
      contents: [{
        parts: [{
          text: systemPrompt
        }]
      }]
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(responseBody);
            const reply = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            resolve(reply ? reply.trim() : '');
          } catch (err) {
            reject(new Error(`Failed to parse Gemini response: ${err.message}`));
          }
        } else {
          reject(new Error(`Gemini API error code ${res.statusCode}: ${responseBody}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

// POST /api/ai
router.post('/', async (req, res) => {
  try {
    const { message, userId } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 1. Fetch available food listings
    const foodListings = await FoodListing.find({ status: 'available' }).populate('restaurant_id');

    // 2. Fetch stats to provide context
    const orders = await Order.find().populate('food_id');
    const activeRescues = orders.filter(o => ['placed', 'picked', 'completed'].includes(o.status));

    let mealsRescued = 0;
    let co2Saved = 0;

    if (userId) {
      const userOrders = activeRescues.filter(o => o.user_id === userId);
      userOrders.forEach(o => {
        mealsRescued += o.quantity;
        if (o.food_id) {
          const originalQty = Number(o.food_id.quantity) + Number(o.quantity);
          const itemCo2PerMeal = Number(o.food_id.co2_saved) / (originalQty || 1);
          co2Saved += itemCo2PerMeal * o.quantity;
        }
      });
    } else {
      activeRescues.forEach(o => {
        mealsRescued += o.quantity;
        if (o.food_id) {
          const originalQty = Number(o.food_id.quantity) + Number(o.quantity);
          const itemCo2PerMeal = Number(o.food_id.co2_saved) / (originalQty || 1);
          co2Saved += itemCo2PerMeal * o.quantity;
        }
      });
      // Fallback baseline stats
      mealsRescued = mealsRescued || 124;
      co2Saved = co2Saved || 310.5;
    }

    const contextListings = foodListings.map(item => {
      const restName = item.restaurant_id ? item.restaurant_id.name : 'Local Partner';
      return {
        title: item.title,
        price: `₹${item.price}`,
        original_price: `₹${item.original_price}`,
        quantity: item.quantity,
        restaurant: restName,
        co2_saved: `${item.co2_saved} kg`
      };
    });

    // 3. Compile the system prompt
    const systemPrompt = `
    You are LastBitesBot, the brilliant and friendly AI assistant for the 'LastBites' (Decarb.io) app in India.
    Your mission is to help users rescue surplus food, understand their environmental impact, and donate rewards.
    
    Current App Context:
    - Active food listings available right now: ${JSON.stringify(contextListings)}
    - User/System current stats: ${mealsRescued} meals rescued and ${co2Saved.toFixed(1)} kg CO2 saved.
    
    Guidelines:
    - Talk casually like a helpful peer. Use emojis occasionally.
    - Keep answers short and crisp (maximum 2-3 lines).
    - Always use INR (₹) for prices.
    - If asked what food is available, look at the listings provided above and recommend them. Mention the price and restaurant.
    
    User says: "${message}"
    `;

    // 4. Generate AI response
    const reply = await callGemini(systemPrompt);
    res.json({ reply: reply || "I'm sorry, I couldn't formulate a response right now. Please try again." });

  } catch (err) {
    console.error('[AI Router Error]:', err.message);
    res.status(500).json({ error: 'Sorry, I am facing trouble connecting right now. Please try again soon!' });
  }
});

module.exports = router;
