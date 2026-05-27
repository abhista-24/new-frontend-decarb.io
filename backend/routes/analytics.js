const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const FoodListing = require('../models/FoodListing');

// GET Stats Route
router.get('/stats', async (req, res) => {
  try {
    const { user_id, restaurant_id } = req.query;

    const orders = await Order.find().populate('food_id');
    const listings = await FoodListing.find().populate('restaurant_id');

    let mealsRescued = 0;
    let co2Saved = 0;
    let revenueRecovered = 0;

    // Filter active or completed rescues
    const activeRescues = orders.filter(o => ['placed', 'picked', 'completed'].includes(o.status));

    // Case 1: Filter stats for a specific user (Customer / NGO)
    if (user_id) {
      const userOrders = activeRescues.filter(o => o.user_id === user_id);
      
      userOrders.forEach(o => {
        mealsRescued += o.quantity;
        revenueRecovered += o.total_price;
        if (o.food_id) {
          const originalQty = Number(o.food_id.quantity) + Number(o.quantity);
          const itemCo2PerMeal = Number(o.food_id.co2_saved) / (originalQty || 1);
          co2Saved += itemCo2PerMeal * o.quantity;
        }
      });

      return res.json({
        mealsRescued,
        co2Saved: Number(co2Saved.toFixed(1)),
        revenueRecovered: Number(revenueRecovered.toFixed(2))
      });
    }

    // Case 2: Filter stats for a specific restaurant
    if (restaurant_id) {
      const restaurantOrders = activeRescues.filter(o => {
        const food = o.food_id;
        if (food) {
          const rId = typeof food.restaurant_id === 'object'
            ? (food.restaurant_id._id || food.restaurant_id.id)
            : food.restaurant_id;
          return rId === restaurant_id;
        }
        return false;
      });

      restaurantOrders.forEach(o => {
        mealsRescued += o.quantity;
        revenueRecovered += o.total_price;
        if (o.food_id) {
          const originalQty = Number(o.food_id.quantity) + Number(o.quantity);
          const itemCo2PerMeal = Number(o.food_id.co2_saved) / (originalQty || 1);
          co2Saved += itemCo2PerMeal * o.quantity;
        }
      });

      // Count active listings online for this restaurant
      const activeListingsCount = listings.filter(l => {
        const rId = typeof l.restaurant_id === 'object'
          ? (l.restaurant_id._id || l.restaurant_id.id)
          : l.restaurant_id;
        return rId === restaurant_id && l.status === 'available';
      }).length;

      return res.json({
        mealsRescued,
        co2Saved: Number(co2Saved.toFixed(1)),
        revenueRecovered: Number(revenueRecovered.toFixed(2)),
        activeListingsCount
      });
    }

    // Case 3: Global System Stats
    activeRescues.forEach(o => {
      mealsRescued += o.quantity;
      revenueRecovered += o.total_price;
      if (o.food_id) {
        const originalQty = Number(o.food_id.quantity) + Number(o.quantity);
        const itemCo2PerMeal = Number(o.food_id.co2_saved) / (originalQty || 1);
        co2Saved += itemCo2PerMeal * o.quantity;
      }
    });

    // Baseline stats for visual engagement if the platform is brand new
    res.json({
      mealsRescued: mealsRescued || 124,
      co2Saved: Number((co2Saved || 310.5).toFixed(1)),
      revenueRecovered: Number((revenueRecovered || 620.0).toFixed(2))
    });

  } catch (err) {
    console.error('Error fetching analytics stats:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
