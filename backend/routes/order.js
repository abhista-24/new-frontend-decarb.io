const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const FoodListing = require('../models/FoodListing');

// POST Place Order / Claim Donation
router.post('/place', async (req, res) => {
  try {
    const { user_id, food_id, quantity } = req.body;
    
    if (!user_id || !food_id || !quantity) {
      return res.status(400).json({ error: 'user_id, food_id, and quantity are required' });
    }

    const qty = Number(quantity);
    if (qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero' });
    }

    const listing = await FoodListing.findById(food_id);
    if (!listing) {
      return res.status(404).json({ error: 'Food listing not found' });
    }

    if (listing.status !== 'available') {
      return res.status(400).json({ error: 'This listing is no longer available' });
    }

    if (Number(listing.quantity) < qty) {
      return res.status(400).json({ error: `Insufficient inventory. Only ${listing.quantity} remaining.` });
    }

    // Decrement stock and toggle status if empty
    const updatedQty = Number(listing.quantity) - qty;
    const updatedStatus = updatedQty === 0 ? 'sold' : 'available';

    await FoodListing.findByIdAndUpdate(food_id, {
      $set: { quantity: updatedQty, status: updatedStatus }
    });

    const totalPrice = Number((Number(listing.price) * qty).toFixed(2));

    const newOrder = await Order.create({
      user_id,
      food_id,
      quantity: qty,
      total_price: totalPrice,
      status: 'placed'
    });

    res.status(201).json(newOrder);
  } catch (err) {
    console.error('Error placing order:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET User's Claims/Orders (Customer or NGO)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ user_id: userId }).populate('food_id');
    res.json(orders);
  } catch (err) {
    console.error('Error fetching user orders:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET Restaurant's Order Incoming Requests
router.get('/restaurant/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const allOrders = await Order.find().populate('food_id');
    
    // Filter orders whose food listing belongs to this restaurant
    const filteredOrders = allOrders.filter(order => {
      const food = order.food_id;
      if (food && food.restaurant_id) {
        const rId = typeof food.restaurant_id === 'object' 
          ? (food.restaurant_id._id || food.restaurant_id.id)
          : food.restaurant_id;
        return rId === restaurantId;
      }
      return false;
    });
    
    res.json(filteredOrders);
  } catch (err) {
    console.error('Error fetching restaurant orders:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST Update Order Status (e.g. placed -> picked -> completed)
router.post('/update-status', async (req, res) => {
  try {
    const { order_id, status } = req.body;
    
    if (!order_id || !status) {
      return res.status(400).json({ error: 'order_id and status are required' });
    }

    if (!['placed', 'picked', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status transition' });
    }

    const updatedOrder = await Order.findByIdAndUpdate(order_id, {
      $set: { status }
    });

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order status updated successfully', order: updatedOrder });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
