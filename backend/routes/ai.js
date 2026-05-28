const express = require('express');
const router = express.Router();
const https = require('https');
const FoodListing = require('../models/FoodListing');
const Order = require('../models/Order');

// ─── Gemini API call ────────────────────────────────────────────────────────
function callGemini(systemPrompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return reject(new Error('GEMINI_API_KEY not set'));

    const data = JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt }] }]
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
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(body);
            const reply = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            resolve(reply ? reply.trim() : '');
          } catch (err) {
            reject(new Error('Failed to parse Gemini response'));
          }
        } else {
          reject(new Error(`Gemini API error ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

// ─── Smart local fallback responder ────────────────────────────────────────
function localSmartReply(message, foodListings, mealsRescued, co2Saved) {
  const msg = message.toLowerCase();

  // Food availability queries
  if (msg.match(/food|available|listing|eat|meal|box|order|buy|what.*there|show/)) {
    if (foodListings.length === 0) {
      return "No food boxes are available right now 😔 Check back soon — restaurants update listings throughout the day! 🍱";
    }
    const top = foodListings.slice(0, 3);
    const lines = top.map(f => {
      const rest = f.restaurant_id ? f.restaurant_id.name : 'Local Partner';
      return `🍱 *${f.title}* — ₹${f.price} (was ₹${f.original_price}) from ${rest} [${f.quantity} left]`;
    });
    const more = foodListings.length > 3 ? `\n\n...and ${foodListings.length - 3} more listing(s) on the app!` : '';
    return `Here's what's fresh right now! 🌟\n\n${lines.join('\n')}${more}`;
  }

  // CO2 / carbon / environment queries
  if (msg.match(/co2|carbon|environment|planet|green|eco|emission|climate|save|saving/)) {
    return `🌍 Together we've saved **${co2Saved.toFixed(1)} kg of CO₂** so far! That's like taking a car off the road for several hours. Keep rescuing food to grow that number! ♻️`;
  }

  // Meals rescued / impact stats
  if (msg.match(/meal|rescue|impact|stat|how many|count|total/)) {
    return `🎉 We've rescued **${mealsRescued} meals** in total! Every rescued meal means less food in landfills and more food on plates. You're making a real difference! 🌱`;
  }

  // Coins / rewards
  if (msg.match(/coin|reward|point|earn|credit|wallet|bonus/)) {
    return `🪙 You earn **GreenCoins** every time you rescue food! Complete an order → get coins. Donate them to NGOs or redeem for discounts. Check your profile to see your balance! 💚`;
  }

  // How it works / getting started
  if (msg.match(/how|work|start|begin|use|help|what is|what are|explain|guide|tips?/)) {
    return `Here's how LastBites works 🚀\n1️⃣ Browse available food boxes near you\n2️⃣ Place an order at a heavily discounted price\n3️⃣ Pick up before the window closes\n4️⃣ Earn GreenCoins & save the planet! 🌍`;
  }

  // Pickup / timing / window
  if (msg.match(/pickup|pick up|time|when|window|close|expire/)) {
    return `⏰ Each listing has a pickup window shown on the food card. Make sure to collect before it expires — orders are auto-cancelled after the window! Be quick! 🏃`;
  }

  // NGO / donation
  if (msg.match(/ngo|donat|charity|give|volunteer/)) {
    return `❤️ You can donate your GreenCoins directly to partner NGOs on the Donate page! Every coin helps fund meals for those who need it most. Such a hero move! 🦸`;
  }

  // Price / discount / cost
  if (msg.match(/price|cost|cheap|discount|deal|₹|rupee|how much/)) {
    if (foodListings.length > 0) {
      const cheapest = foodListings.reduce((a, b) => a.price < b.price ? a : b);
      return `💸 Deals start as low as **₹${cheapest.price}**! Listings are typically 50-80% off the original price. Great food for a fraction of the cost! 🎉`;
    }
    return `💸 Food boxes are typically 50-80% off original prices! You get a great deal AND save the planet. Win-win! 🌍`;
  }

  // Greeting
  if (msg.match(/hi|hello|hey|namaste|hola|sup|howdy/)) {
    return `Namaste! 👋 I'm LastBitesBot, your eco food assistant! I can help you find available food, check your CO₂ savings, or learn how to earn GreenCoins. What would you like to know? 🌱`;
  }

  // Thank you
  if (msg.match(/thank|thanks|thx|great|awesome|nice|good/)) {
    return `You're welcome! 😊 Keep rescuing food and saving the planet! Every meal counts. 🌍💚`;
  }

  // Default fallback
  return `I'm not sure about that one 🤔 Try asking me:\n• "What food is available?"\n• "How much CO₂ did we save?"\n• "How do I earn coins?"\n• "How does LastBites work?"`;
}

// ─── POST /api/ai ────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { message, userId } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 1. Fetch live data for context
    const foodListings = await FoodListing.find({ status: 'available' }).populate('restaurant_id');
    const orders = await Order.find().populate('food_id');
    const activeRescues = orders.filter(o => ['placed', 'picked', 'completed'].includes(o.status));

    let mealsRescued = 0;
    let co2Saved = 0;

    const targetOrders = userId
      ? activeRescues.filter(o => o.user_id === userId)
      : activeRescues;

    targetOrders.forEach(o => {
      mealsRescued += o.quantity;
      if (o.food_id) {
        const originalQty = Number(o.food_id.quantity) + Number(o.quantity);
        const itemCo2PerMeal = Number(o.food_id.co2_saved) / (originalQty || 1);
        co2Saved += itemCo2PerMeal * o.quantity;
      }
    });

    // Baseline stats fallback when no orders yet
    if (!userId) {
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

    // 2. Try Gemini first
    const systemPrompt = `
    You are LastBitesBot, the friendly AI assistant for the 'LastBites' (Decarb.io) surplus food rescue app in India.
    Your mission: help users rescue food, understand their environmental impact, and earn GreenCoins.

    Live App Data:
    - Available food listings: ${JSON.stringify(contextListings)}
    - Stats: ${mealsRescued} meals rescued, ${co2Saved.toFixed(1)} kg CO2 saved.

    Rules:
    - Respond in 2-3 lines max. Be casual and friendly. Use emojis sparingly.
    - Always use ₹ for prices.
    - If asked about food, list available items with prices and restaurant names.

    User: "${message}"
    `;

    try {
      const geminiReply = await callGemini(systemPrompt);
      if (geminiReply) {
        return res.json({ reply: geminiReply });
      }
    } catch (geminiErr) {
      // Gemini unavailable — fall through to local smart reply
      console.warn('[AI] Gemini unavailable, using local fallback:', geminiErr.message);
    }

    // 3. Local smart fallback — always works, uses live data
    const localReply = localSmartReply(message, foodListings, mealsRescued, co2Saved);
    return res.json({ reply: localReply });

  } catch (err) {
    console.error('[AI Router Error]:', err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again!' });
  }
});

module.exports = router;
