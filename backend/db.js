const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

// Ensure db directory and file exist for fallback
function readDb() {
  if (!fs.existsSync(path.dirname(DB_FILE))) {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], foodlistings: [], orders: [] }, null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return { users: [], foodlistings: [], orders: [] };
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Mock Query chain builder for populate/sort/etc.
class MockQuery {
  constructor(data, collectionName, db) {
    this.data = data;
    this.collectionName = collectionName;
    this.db = db;
  }

  populate(pathName) {
    this.data = this.data.map(item => {
      const newItem = { ...item };
      
      // Populate restaurant_id from users collection
      if (pathName === 'restaurant_id' && newItem.restaurant_id) {
        const found = this.db.users.find(u => u._id === newItem.restaurant_id || u.id === newItem.restaurant_id);
        if (found) {
          const { password, ...safeUser } = found;
          newItem.restaurant_id = safeUser;
        }
      }
      
      // Populate user_id from users collection
      if (pathName === 'user_id' && newItem.user_id) {
        const found = this.db.users.find(u => u._id === newItem.user_id || u.id === newItem.user_id);
        if (found) {
          const { password, ...safeUser } = found;
          newItem.user_id = safeUser;
        }
      }
      
      // Populate food_id from foodlistings collection
      if (pathName === 'food_id' && newItem.food_id) {
        const foundFood = this.db.foodlistings.find(f => f._id === newItem.food_id || f.id === newItem.food_id);
        if (foundFood) {
          const populatedFood = { ...foundFood };
          // Nested populate restaurant_id if present
          if (populatedFood.restaurant_id) {
            const foundRest = this.db.users.find(u => u._id === populatedFood.restaurant_id || u.id === populatedFood.restaurant_id);
            if (foundRest) {
              const { password, ...safeRest } = foundRest;
              populatedFood.restaurant_id = safeRest;
            }
          }
          newItem.food_id = populatedFood;
        }
      }
      
      return newItem;
    });
    return this;
  }

  sort(sortObj) {
    // simple sort implementation
    return this;
  }

  then(onFulfilled, onRejected) {
    return Promise.resolve(this.data).then(onFulfilled, onRejected);
  }
}

// Local JSON file database MockModel
class MockModel {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  find(query = {}) {
    const db = readDb();
    let items = db[this.collectionName] || [];
    items = items.filter(item => {
      for (let key in query) {
        if (query[key] !== undefined) {
          if (item[key] !== query[key]) return false;
        }
      }
      return true;
    });
    return new MockQuery(items, this.collectionName, db);
  }

  findOne(query = {}) {
    const db = readDb();
    const items = db[this.collectionName] || [];
    const found = items.find(item => {
      for (let key in query) {
        if (query[key] !== undefined) {
          if (item[key] !== query[key]) return false;
        }
      }
      return true;
    });
    return Promise.resolve(found ? { ...found } : null);
  }

  async findById(id) {
    return this.findOne({ _id: id });
  }

  async create(data) {
    const db = readDb();
    const newItem = {
      _id: 'mock_' + Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };
    if (!db[this.collectionName]) db[this.collectionName] = [];
    db[this.collectionName].push(newItem);
    writeDb(db);
    return newItem;
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const db = readDb();
    const items = db[this.collectionName] || [];
    const index = items.findIndex(item => item._id === id);
    if (index === -1) return null;

    let updatedItem = { ...items[index] };
    const setObj = update.$set || update;
    
    // Process $set/direct keys
    for (let key in setObj) {
      if (key !== '$inc') {
        updatedItem[key] = setObj[key];
      }
    }
    
    // Process $inc keys
    if (update.$inc) {
      for (let key in update.$inc) {
        updatedItem[key] = (updatedItem[key] || 0) + update.$inc[key];
      }
    }
    
    updatedItem.updatedAt = new Date().toISOString();
    items[index] = updatedItem;
    writeDb(db);
    return updatedItem;
  }

  async updateOne(query, update) {
    const db = readDb();
    const items = db[this.collectionName] || [];
    const index = items.findIndex(item => {
      for (let key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
    
    if (index === -1) return { nModified: 0 };
    
    let updatedItem = { ...items[index] };
    const setObj = update.$set || update;
    for (let key in setObj) {
      if (key !== '$inc') {
        updatedItem[key] = setObj[key];
      }
    }
    
    if (update.$inc) {
      for (let key in update.$inc) {
        updatedItem[key] = (updatedItem[key] || 0) + update.$inc[key];
      }
    }
    
    updatedItem.updatedAt = new Date().toISOString();
    items[index] = updatedItem;
    writeDb(db);
    return { nModified: 1 };
  }
}

// Database Connection Manager
let useMock = false;
let isConnected = false;
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.log("------------------------------------------------------------------");
  console.log("No MONGODB_URI environment variable detected.");
  console.log("Last Bite will run using the local JSON database fallback.");
  console.log(`Fallback database file: ${DB_FILE}`);
  console.log("------------------------------------------------------------------");
  useMock = true;
}

async function connectDB() {
  if (useMock) return;
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log("MongoDB database connected successfully.");
    isConnected = true;
  } catch (err) {
    console.error("MongoDB connection failed. Falling back to local JSON database. Error:", err.message);
    useMock = true;
  }
}

class DynamicModel {
  constructor(name, schemaObj, collectionName) {
    this.name = name;
    this.schemaObj = schemaObj;
    this.collectionName = collectionName;
    this.mockModel = new MockModel(collectionName);
    
    try {
      const schema = new mongoose.Schema(schemaObj, { timestamps: true });
      this.mongooseModel = mongoose.models[name] || mongoose.model(name, schema);
    } catch (e) {
      // Handled if mongoose is not installed or has error
    }
  }

  get model() {
    if (useMock || (!isConnected && uri)) {
      // default back if we decided to mock or if mongoose connection hasn't finished yet but failed
      if (useMock) return this.mockModel;
    }
    return this.mongooseModel || this.mockModel;
  }

  find(query) { return this.model.find(query); }
  findOne(query) { return this.model.findOne(query); }
  findById(id) { return this.model.findById(id); }
  create(data) { return this.model.create(data); }
  findByIdAndUpdate(id, update, options) { return this.model.findByIdAndUpdate(id, update, options); }
  updateOne(query, update) { return this.model.updateOne(query, update); }
}

module.exports = {
  connectDB,
  DynamicModel,
  getUseMock: () => useMock
};
