const { DynamicModel } = require('../db');

const FoodListingSchema = {
  title: { type: String, required: true },
  description: { type: String },
  restaurant_id: { type: String, required: true }, // references a User of role 'restaurant'
  price: { type: Number, required: true }, // 0 price denotes a donation for NGOs/consumers
  original_price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  category: { 
    type: String, 
    enum: ['meals', 'bakery', 'groceries', 'beverages', 'other'], 
    default: 'meals' 
  },
  pickup_time: { type: Date, required: true },
  co2_saved: { type: Number, required: true }, // automatically calculated upon listing
  status: { 
    type: String, 
    enum: ['available', 'sold', 'expired'], 
    default: 'available' 
  },
  image: { type: String },
  preparation_date: { type: String },
  preparation_time: { type: String }
};

module.exports = new DynamicModel('FoodListing', FoodListingSchema, 'foodlistings');
