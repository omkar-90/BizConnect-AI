// scripts/seedDatabase.js
require('dotenv').config();
const mongoose = require('mongoose');

// User Schema (same as in server.js)
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'vendor', 'customer'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Product Schema
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  image: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);

// MongoDB Connection - loaded from environment variable
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set. Please define it in your .env file.');
  process.exit(1);
}

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);

    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    console.log('Cleared existing data...');

    // Create test users
    const testUsers = [
      {
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'admin123',
        role: 'admin'
      },
      {
        name: 'Rajesh Grocery Store',
        email: 'rajesh@grocery.com',
        password: 'vendor123',
        role: 'vendor'
      },
      {
        name: 'Priya Electronics',
        email: 'priya@electronics.com',
        password: 'vendor123',
        role: 'vendor'
      },
      {
        name: 'Amit Clothing Store',
        email: 'amit@clothing.com',
        password: 'vendor123',
        role: 'vendor'
      },
      {
        name: 'Sunita Pharmacy',
        email: 'sunita@pharmacy.com',
        password: 'vendor123',
        role: 'vendor'
      },
      {
        name: 'Vikram Hardware',
        email: 'vikram@hardware.com',
        password: 'vendor123',
        role: 'vendor'
      },
      {
        name: 'Customer User',
        email: 'customer@test.com',
        password: 'customer123',
        role: 'customer'
      }
    ];

    const createdUsers = [];
    for (const userData of testUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`Created ${userData.role} user: ${userData.email}`);
    }

    // Create sample products for each vendor
    const vendors = createdUsers.filter(user => user.role === 'vendor');
    
    const sampleProducts = [
      // Rajesh Grocery Store
      {
        name: 'Fresh Tomatoes',
        description: 'Fresh red tomatoes, perfect for cooking',
        price: 40,
        category: 'Vegetables',
        vendorId: vendors[0]._id,
        stock: 50
      },
      {
        name: 'Basmati Rice',
        description: 'Premium quality basmati rice, 1kg pack',
        price: 120,
        category: 'Grains',
        vendorId: vendors[0]._id,
        stock: 30
      },
      {
        name: 'Cooking Oil',
        description: 'Sunflower oil, 1 liter bottle',
        price: 150,
        category: 'Cooking Essentials',
        vendorId: vendors[0]._id,
        stock: 25
      },

      // Priya Electronics
      {
        name: 'Smartphone Charger',
        description: 'Fast charging USB-C cable, 2m length',
        price: 299,
        category: 'Mobile Accessories',
        vendorId: vendors[1]._id,
        stock: 40
      },
      {
        name: 'Bluetooth Headphones',
        description: 'Wireless headphones with noise cancellation',
        price: 1299,
        category: 'Audio',
        vendorId: vendors[1]._id,
        stock: 15
      },
      {
        name: 'Power Bank',
        description: '10000mAh portable power bank',
        price: 899,
        category: 'Mobile Accessories',
        vendorId: vendors[1]._id,
        stock: 20
      },

      // Amit Clothing Store
      {
        name: 'Cotton T-Shirt',
        description: 'Comfortable cotton t-shirt, various sizes available',
        price: 399,
        category: 'Clothing',
        vendorId: vendors[2]._id,
        stock: 60
      },
      {
        name: 'Denim Jeans',
        description: 'Classic blue denim jeans, regular fit',
        price: 1299,
        category: 'Clothing',
        vendorId: vendors[2]._id,
        stock: 25
      },
      {
        name: 'Sports Shoes',
        description: 'Comfortable running shoes, all sizes',
        price: 1999,
        category: 'Footwear',
        vendorId: vendors[2]._id,
        stock: 30
      },

      // Sunita Pharmacy
      {
        name: 'Paracetamol Tablets',
        description: 'Pain relief tablets, 10 tablets strip',
        price: 25,
        category: 'Medicine',
        vendorId: vendors[3]._id,
        stock: 100
      },
      {
        name: 'Vitamin C Tablets',
        description: 'Immune booster vitamin C, 30 tablets',
        price: 199,
        category: 'Supplements',
        vendorId: vendors[3]._id,
        stock: 50
      },
      {
        name: 'Bandage Roll',
        description: 'Medical bandage roll, 5cm width',
        price: 45,
        category: 'First Aid',
        vendorId: vendors[3]._id,
        stock: 40
      },

      // Vikram Hardware
      {
        name: 'Screwdriver Set',
        description: 'Professional screwdriver set with 10 pieces',
        price: 299,
        category: 'Tools',
        vendorId: vendors[4]._id,
        stock: 20
      },
      {
        name: 'LED Bulb',
        description: 'Energy efficient LED bulb, 9W',
        price: 89,
        category: 'Electrical',
        vendorId: vendors[4]._id,
        stock: 50
      },
      {
        name: 'Water Pipe',
        description: 'PVC water pipe, 1 inch diameter, 6 feet',
        price: 199,
        category: 'Plumbing',
        vendorId: vendors[4]._id,
        stock: 30
      }
    ];

    for (const productData of sampleProducts) {
      const product = new Product(productData);
      await product.save();
      console.log(`Created product: ${productData.name} for ${productData.category}`);
    }

    console.log('\nDatabase seeded successfully!');
    console.log('\nTest users created:');
    console.log('Admin: admin@test.com / admin123');
    console.log('Customer: customer@test.com / customer123');
    console.log('\nVendors created:');
    vendors.forEach((vendor, index) => {
      console.log(`${index + 1}. ${vendor.name} - ${vendor.email} / vendor123`);
    });
    console.log(`\nTotal products created: ${sampleProducts.length}`);

  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

seedDatabase();
