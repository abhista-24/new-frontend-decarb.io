const { DynamicModel } = require('../db');

const OrderSchema = {
  user_id: { type: String, required: true }, // references User (customer or NGO)
  food_id: { type: String, required: true }, // references FoodListing
  quantity: { type: Number, required: true, default: 1 },
  total_price: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['placed', 'picked', 'completed'], 
    default: 'placed' 
  }
};

module.exports = new DynamicModel('Order', OrderSchema, 'orders');
