require('dotenv').config();

const express = require('express')
const app = express()
const port = process.env.PORT || 3000;

const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const MLService = require('./ml-models/ml_service');
const Stripe = require('stripe');

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB Connection - Local Database
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizconnect-ai';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';
const stripe = STRIPE_SECRET_KEY ? Stripe(STRIPE_SECRET_KEY) : null;

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB successfully');
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

// User Schema
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
  // Vendor-specific fields
  phone: {
    type: String,
    trim: true
  },
  shopName: {
    type: String,
    trim: true
  },
  businessType: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  gstNumber: {
    type: String,
    trim: true
  },
  panNumber: {
    type: String,
    trim: true
  },
  businessDescription: {
    type: String,
    trim: true
  },
  annualTurnover: {
    type: String,
    trim: true
  },
  employeeCount: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  documents: [{
    type: String,
    trim: true
  }],
  aadharFile: {
    name: { type: String },
    type: { type: String },
    size: { type: Number },
    data: { type: String } // Base64 encoded file data
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedAt: {
    type: Date
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: {
    type: String,
    trim: true
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

// Order Schema
const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  shippingAddress: {
    type: String,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  orderNumber: {
    type: String,
    unique: true,
    required: true
  }
});

// Cart Schema (for customer cart)
const cartSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);
const Cart = mongoose.model('Cart', cartSchema);

// Initialize ML Service
const mlService = new MLService();

// API Routes (must come before static middleware)
// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Simple password check (in production, use bcrypt)
    if (user.password !== password) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Return user data (excluding password)
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };

    res.json({
      message: 'Login successful',
      user: userResponse,
      accessToken: `token-${user._id}-${Date.now()}` // Simple token for demo
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, shopInfo } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        error: 'All fields are required' 
      });
    }

    if (!['admin', 'vendor', 'customer'].includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role. Must be admin, vendor, or customer' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User with this email already exists' 
      });
    }

    // For vendors, require shop information
    if (role === 'vendor' && !shopInfo) {
      return res.status(400).json({ 
        error: 'Shop information is required for vendor registration' 
      });
    }

    // Create new user
    const userData = {
      name,
      email: email.toLowerCase(),
      password, // In production, hash this password
      role
    };

    // Add vendor-specific fields if role is vendor
    if (role === 'vendor' && shopInfo) {
      userData.phone = shopInfo.phone || '';
      userData.shopName = shopInfo.shopName || '';
      userData.businessType = shopInfo.businessType || '';
      userData.address = shopInfo.address || '';
      userData.gstNumber = shopInfo.gstNumber || '';
      userData.panNumber = shopInfo.panNumber || '';
      userData.businessDescription = shopInfo.businessDescription || '';
      userData.annualTurnover = shopInfo.annualTurnover || '';
      userData.employeeCount = shopInfo.employeeCount || '';
      userData.documents = shopInfo.documents || [];
      
      // Add Aadhar file data if provided
      if (shopInfo.aadharFile) {
        userData.aadharFile = {
          name: shopInfo.aadharFile.name,
          type: shopInfo.aadharFile.type,
          size: shopInfo.aadharFile.size,
          data: shopInfo.aadharFile.data
        };
      }
      
      userData.approvalStatus = 'pending';
    }

    const newUser = new User(userData);
    await newUser.save();

    // Return user data (excluding password)
    const userResponse = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      phone: newUser.phone,
      shopName: newUser.shopName,
      businessType: newUser.businessType,
      address: newUser.address,
      gstNumber: newUser.gstNumber,
      panNumber: newUser.panNumber,
      businessDescription: newUser.businessDescription,
      annualTurnover: newUser.annualTurnover,
      employeeCount: newUser.employeeCount,
      website: newUser.website,
      documents: newUser.documents,
      approvalStatus: newUser.approvalStatus,
      createdAt: newUser.createdAt
    };

    res.status(201).json({
      message: role === 'vendor' ? 'Vendor registration submitted for approval' : 'User created successfully',
      user: userResponse,
      accessToken: `token-${newUser._id}-${Date.now()}`
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Get current user endpoint
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization;
    
    if (!token) {
      return res.status(401).json({ 
        error: 'No token provided' 
      });
    }

    // Simple token validation (in production, use JWT)
    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ 
        error: 'Invalid token' 
      });
    }

    const userId = tokenParts[1];
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found' 
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// ==================== PRODUCT MANAGEMENT API ====================

// Get all products (for customer browsing)
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate('vendorId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get products by vendor
app.get('/api/vendor/products', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const vendorId = tokenParts[1];
    const vendor = await User.findById(vendorId);
    
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const products = await Product.find({ vendorId }).sort({ createdAt: -1 });
    res.json({ products });
  } catch (error) {
    console.error('Get vendor products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test endpoint to verify server is working
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
});

// ==================== PAYMENTS (Stripe Checkout) ====================
app.post('/api/pay/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured on server' });
    }

    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const customerId = tokenParts[1];
    const customer = await User.findById(customerId);
    if (!customer || customer.role !== 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Load cart items
    const cart = await Cart.findOne({ customerId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Build line items for Stripe Checkout
    const lineItems = cart.items.map((item) => ({
      price_data: {
        currency: 'inr',
        product_data: {
          name: item.productId.name,
          description: item.productId.description?.slice(0, 200) || undefined
        },
        unit_amount: Math.round(Number(item.price || item.productId.price) * 100)
      },
      quantity: item.quantity
    }));

    const origin = req.headers.origin || `http://localhost:${port}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${origin}/customer-dashboard?payment=success`,
      cancel_url: `${origin}/customer-dashboard?payment=cancelled`,
      metadata: {
        app_customer_id: customerId
      }
    });

    res.json({ id: session.id, url: session.url, publishableKey: STRIPE_PUBLISHABLE_KEY });
  } catch (error) {
    console.error('Stripe Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Finalize order after successful Stripe Checkout
app.post('/api/pay/complete', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const customerId = tokenParts[1];
    const customer = await User.findById(customerId);
    if (!customer || customer.role !== 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { shippingAddress } = req.body;
    if (!shippingAddress) {
      return res.status(400).json({ error: 'Shipping address is required' });
    }

    const cart = await Cart.findOne({ customerId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Group items by vendor and calculate totals (similar to /api/orders/create)
    const vendorOrders = {};
    let totalAmount = 0;

    for (const item of cart.items) {
      const product = item.productId;
      if (!product) {
        return res.status(400).json({ error: 'Product not found in cart item' });
      }
      const vendorId = product.vendorId.toString();
      if (!vendorOrders[vendorId]) {
        vendorOrders[vendorId] = { vendorId, items: [], vendorTotal: 0 };
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}. Only ${product.stock} items available.` });
      }
      const itemTotal = product.price * item.quantity;
      vendorOrders[vendorId].items.push({
        productId: product._id,
        quantity: item.quantity,
        price: product.price
      });
      vendorOrders[vendorId].vendorTotal += itemTotal;
      totalAmount += itemTotal;

      product.stock -= item.quantity;
      await product.save();
    }

    const orders = [];
    for (const vendorId in vendorOrders) {
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const order = new Order({
        customerId,
        vendorId,
        items: vendorOrders[vendorId].items,
        totalAmount: vendorOrders[vendorId].vendorTotal,
        shippingAddress,
        status: 'confirmed',
        paymentStatus: 'paid',
        orderNumber
      });
      await order.save();
      orders.push(order);
    }

    await Cart.findOneAndDelete({ customerId });

    res.status(201).json({
      message: 'Payment completed and orders created',
      orders,
      totalAmount
    });
  } catch (error) {
    console.error('Finalize payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add product (vendor only)
app.post('/api/vendor/products', async (req, res) => {
  try {
    console.log('POST /api/vendor/products - Request received');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    const token = req.headers.authorization;
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const vendorId = tokenParts[1];
    const vendor = await User.findById(vendorId);
    
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, description, price, category, stock, image, isActive } = req.body;

    if (!name || !description || !price || !category || stock === undefined) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    const product = new Product({
      name,
      description,
      price,
      category,
      vendorId,
      stock,
      image: image || '',
      isActive: isActive !== undefined ? isActive : true
    });

    await product.save();
    console.log('Product saved successfully:', product);
    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    console.error('Create product error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Update product (vendor only)
app.put('/api/vendor/products/:id', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const vendorId = tokenParts[1];
    const vendor = await User.findById(vendorId);
    
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const productId = req.params.id;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.vendorId.toString() !== vendorId) {
      return res.status(403).json({ error: 'You can only update your own products' });
    }

    const { name, description, price, category, stock, image, isActive } = req.body;

    if (name) product.name = name;
    if (description) product.description = description;
    if (price !== undefined) product.price = price;
    if (category) product.category = category;
    if (stock !== undefined) product.stock = stock;
    if (image !== undefined) product.image = image;
    if (isActive !== undefined) product.isActive = isActive;

    await product.save();
    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product (vendor only)
app.delete('/api/vendor/products/:id', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const vendorId = tokenParts[1];
    const vendor = await User.findById(vendorId);
    
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const productId = req.params.id;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.vendorId.toString() !== vendorId) {
      return res.status(403).json({ error: 'You can only delete your own products' });
    }

    await Product.findByIdAndDelete(productId);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== CART MANAGEMENT API ====================

// Get customer cart
app.get('/api/cart', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const customerId = tokenParts[1];
    const customer = await User.findById(customerId);
    
    if (!customer || customer.role !== 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const cart = await Cart.findOne({ customerId }).populate('items.productId');
    res.json({ cart: cart || { items: [] } });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add item to cart
app.post('/api/cart/add', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const customerId = tokenParts[1];
    const customer = await User.findById(customerId);
    
    if (!customer || customer.role !== 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { productId, quantity } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({ error: 'Product ID and quantity are required' });
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    let cart = await Cart.findOne({ customerId });
    
    if (!cart) {
      cart = new Cart({ customerId, items: [] });
    }

    // Check if product already exists in cart
    const existingItem = cart.items.find(item => item.productId.toString() === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ productId, quantity });
    }

    cart.updatedAt = new Date();
    await cart.save();

    res.json({ message: 'Item added to cart successfully', cart });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update cart item quantity
app.put('/api/cart/update', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const customerId = tokenParts[1];
    const customer = await User.findById(customerId);
    
    if (!customer || customer.role !== 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { productId, quantity } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({ error: 'Product ID and quantity are required' });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    const cart = await Cart.findOne({ customerId });
    
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const existingItem = cart.items.find(item => item.productId.toString() === productId);
    
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    existingItem.quantity = quantity;
    cart.updatedAt = new Date();
    await cart.save();

    res.json({ message: 'Cart updated successfully', cart });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove item from cart
app.delete('/api/cart/remove/:productId', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const customerId = tokenParts[1];
    const customer = await User.findById(customerId);
    
    if (!customer || customer.role !== 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { productId } = req.params;

    const cart = await Cart.findOne({ customerId });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => item.productId.toString() !== productId);
    cart.updatedAt = new Date();
    await cart.save();

    res.json({ message: 'Item removed from cart successfully', cart });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== VENDOR MANAGEMENT API ====================

// Get all vendors for admin approval
app.get('/api/admin/vendors', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const adminId = tokenParts[1];
    const admin = await User.findById(adminId);
    
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const vendors = await User.find({ role: 'vendor' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ vendors });
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve vendor
app.put('/api/admin/vendors/:vendorId/approve', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const adminId = tokenParts[1];
    const admin = await User.findById(adminId);
    
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { vendorId } = req.params;
    console.log('Approve vendor - received vendorId:', vendorId);
    const vendor = await User.findById(vendorId);
    
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    vendor.approvalStatus = 'approved';
    vendor.approvedAt = new Date();
    vendor.approvedBy = adminId;
    vendor.updatedAt = new Date();
    
    await vendor.save();

    res.json({ 
      message: 'Vendor approved successfully', 
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        shopName: vendor.shopName,
        approvalStatus: vendor.approvalStatus,
        approvedAt: vendor.approvedAt
      }
    });
  } catch (error) {
    console.error('Approve vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject vendor
app.put('/api/admin/vendors/:vendorId/reject', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const adminId = tokenParts[1];
    const admin = await User.findById(adminId);
    
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { vendorId } = req.params;
    console.log('Reject vendor - received vendorId:', vendorId);
    const { rejectionReason } = req.body;
    
    const vendor = await User.findById(vendorId);
    
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    vendor.approvalStatus = 'rejected';
    vendor.rejectionReason = rejectionReason || 'Application rejected';
    vendor.approvedAt = new Date();
    vendor.approvedBy = adminId;
    vendor.updatedAt = new Date();
    
    await vendor.save();

    res.json({ 
      message: 'Vendor rejected successfully', 
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        shopName: vendor.shopName,
        approvalStatus: vendor.approvalStatus,
        rejectionReason: vendor.rejectionReason
      }
    });
  } catch (error) {
    console.error('Reject vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update vendor profile
app.put('/api/vendor/profile', async (req, res) => {
  try {
    console.log('Vendor profile update request received');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    const token = req.headers.authorization;
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenParts = token.replace('Bearer ', '').split('-');
    console.log('Token parts:', tokenParts);
    if (tokenParts.length !== 3) {
      console.log('Invalid token format');
      return res.status(401).json({ error: 'Invalid token' });
    }

    const vendorId = tokenParts[1];
    console.log('Vendor ID:', vendorId);
    const vendor = await User.findById(vendorId);
    console.log('Found vendor:', vendor ? { id: vendor._id, name: vendor.name, role: vendor.role } : 'Not found');
    
    if (!vendor) {
      console.log('Vendor not found');
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    if (vendor.role !== 'vendor') {
      console.log('User is not a vendor, role:', vendor.role);
      return res.status(403).json({ error: 'Access denied - not a vendor' });
    }

    const { 
      phone, shopName, businessType, address, gstNumber, 
      panNumber, businessDescription, annualTurnover, 
      employeeCount, documents, aadharFile 
    } = req.body;

    // Update vendor fields
    if (phone !== undefined) vendor.phone = phone;
    if (shopName !== undefined) vendor.shopName = shopName;
    if (businessType !== undefined) vendor.businessType = businessType;
    if (address !== undefined) vendor.address = address;
    if (gstNumber !== undefined) vendor.gstNumber = gstNumber;
    if (panNumber !== undefined) vendor.panNumber = panNumber;
    if (businessDescription !== undefined) vendor.businessDescription = businessDescription;
    if (annualTurnover !== undefined) vendor.annualTurnover = annualTurnover;
    if (employeeCount !== undefined) vendor.employeeCount = employeeCount;
    if (documents !== undefined) vendor.documents = documents;
    
    // Update Aadhar file if provided
    if (aadharFile !== undefined) {
      vendor.aadharFile = {
        name: aadharFile.name,
        type: aadharFile.type,
        size: aadharFile.size,
        data: aadharFile.data
      };
    }
    
    vendor.updatedAt = new Date();
    await vendor.save();

    // Return updated vendor data (excluding password)
    const vendorResponse = {
      id: vendor._id,
      name: vendor.name,
      email: vendor.email,
      role: vendor.role,
      phone: vendor.phone,
      shopName: vendor.shopName,
      businessType: vendor.businessType,
      address: vendor.address,
      gstNumber: vendor.gstNumber,
      panNumber: vendor.panNumber,
      businessDescription: vendor.businessDescription,
      annualTurnover: vendor.annualTurnover,
      employeeCount: vendor.employeeCount,
      documents: vendor.documents,
      approvalStatus: vendor.approvalStatus,
      updatedAt: vendor.updatedAt
    };

    console.log('Profile updated successfully, sending response:', vendorResponse);
    res.json({ 
      message: 'Profile updated successfully', 
      vendor: vendorResponse 
    });
  } catch (error) {
    console.error('Update vendor profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ML PREDICTION API ====================

// Initialize ML pipeline
app.post('/api/ml/initialize', async (req, res) => {
  try {
    console.log('🚀 Initializing ML pipeline...');
    const success = await mlService.initializeMLPipeline();
    
    if (success) {
      res.json({ 
        message: 'ML pipeline initialized successfully',
        status: 'success'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to initialize ML pipeline',
        status: 'error'
      });
    }
  } catch (error) {
    console.error('ML initialization error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      status: 'error'
    });
  }
});

// Predict product performance
app.post('/api/ml/predict-product', async (req, res) => {
  try {
    const { productId } = req.body;
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }
    
    // Get product data from database
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Get sales data for the product
    const sales = await Order.find({ 'items.productId': productId });
    
    // Prepare product data for ML prediction
    const productData = {
      product_id: product._id,
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      stock: product.stock,
      vendor_id: product.vendorId,
      is_active: product.isActive,
      created_at: product.createdAt,
      total_sales: sales.reduce((sum, order) => {
        return sum + order.items.reduce((itemSum, item) => {
          return item.productId.toString() === productId.toString() ? itemSum + item.quantity : itemSum;
        }, 0);
      }, 0),
      total_revenue: sales.reduce((sum, order) => {
        return sum + order.items.reduce((itemSum, item) => {
          return item.productId.toString() === productId.toString() ? itemSum + (item.quantity * item.price) : itemSum;
        }, 0);
      }, 0)
    };
    
    const prediction = await mlService.predictProductPerformance(productData);
    
    if (prediction) {
      res.json({
        product_id: productId,
        predictions: prediction,
        status: 'success'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to generate prediction',
        status: 'error'
      });
    }
  } catch (error) {
    console.error('Product prediction error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      status: 'error'
    });
  }
});

// Get sales trends for a product
app.get('/api/ml/sales-trends/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { days = 30 } = req.query;
    
    const trends = await mlService.getSalesTrends(productId, parseInt(days));
    
    if (trends) {
      res.json({
        product_id: productId,
        trends: trends,
        status: 'success'
      });
    } else {
      res.status(404).json({ 
        error: 'No trend data available for this product',
        status: 'error'
      });
    }
  } catch (error) {
    console.error('Sales trends error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      status: 'error'
    });
  }
});

// Get top performing products
app.get('/api/ml/top-products', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Extract vendor ID from token for vendor-specific predictions
    let vendorId = null;
    const token = req.headers.authorization;
    console.log('ML Top Products - Token:', token);
    
    if (token) {
      try {
        const tokenParts = token.replace('Bearer ', '').split('-');
        console.log('Token parts:', tokenParts);
        
        if (tokenParts.length === 3) {
          const userId = tokenParts[1];
          console.log('User ID from token:', userId);
          
          const user = await User.findById(userId);
          console.log('User found:', user ? { id: user._id, role: user.role } : 'Not found');
          
          if (user && user.role === 'vendor') {
            vendorId = userId;
            console.log('Vendor ID set:', vendorId);
          }
        }
      } catch (tokenError) {
        console.log('Token parsing failed, using global predictions:', tokenError.message);
      }
    }
    
    console.log('Final vendor ID:', vendorId);
    
    const topProducts = await mlService.getTopPerformingProducts(parseInt(limit), vendorId);
    
    res.json({
      products: topProducts,
      count: topProducts.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Top products error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      status: 'error'
    });
  }
});

// Get low performing products
app.get('/api/ml/low-products', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Extract vendor ID from token for vendor-specific predictions
    let vendorId = null;
    const token = req.headers.authorization;
    if (token) {
      try {
        const tokenParts = token.replace('Bearer ', '').split('-');
        if (tokenParts.length === 3) {
          const userId = tokenParts[1];
          const user = await User.findById(userId);
          if (user && user.role === 'vendor') {
            vendorId = userId;
          }
        }
      } catch (tokenError) {
        console.log('Token parsing failed, using global predictions');
      }
    }
    
    const lowProducts = await mlService.getLowPerformingProducts(parseInt(limit), vendorId);
    
    res.json({
      products: lowProducts,
      count: lowProducts.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Low products error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      status: 'error'
    });
  }
});

// Get category insights
app.get('/api/ml/category-insights/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const insights = await mlService.getCategoryInsights(category);
    
    if (insights) {
      res.json({
        category: category,
        insights: insights,
        status: 'success'
      });
    } else {
      res.status(404).json({ 
        error: 'No insights available for this category',
        status: 'error'
      });
    }
  } catch (error) {
    console.error('Category insights error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      status: 'error'
    });
  }
});

// Get vendor insights
app.get('/api/ml/vendor-insights/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    const insights = await mlService.getVendorInsights(vendorId);
    
    if (insights) {
      res.json({
        vendor_id: vendorId,
        insights: insights,
        status: 'success'
      });
    } else {
      res.status(404).json({ 
        error: 'No insights available for this vendor',
        status: 'error'
      });
    }
  } catch (error) {
    console.error('Vendor insights error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      status: 'error'
    });
  }
});

// ==================== ORDER MANAGEMENT API ====================

// Create order from cart
app.post('/api/orders/create', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const customerId = tokenParts[1];
    const customer = await User.findById(customerId);
    
    if (!customer || customer.role !== 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { shippingAddress } = req.body;

    if (!shippingAddress) {
      return res.status(400).json({ error: 'Shipping address is required' });
    }

    const cart = await Cart.findOne({ customerId }).populate('items.productId');
    console.log('Cart found:', cart);
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    console.log('Cart items:', cart.items);

    // Group items by vendor
    const vendorOrders = {};
    let totalAmount = 0;

    for (const item of cart.items) {
      const product = item.productId;
      console.log('Processing item:', item);
      console.log('Product:', product);
      
      if (!product) {
        console.error('Product not found for item:', item);
        return res.status(400).json({ error: 'Product not found in cart item' });
      }
      
      const vendorId = product.vendorId.toString();

      if (!vendorOrders[vendorId]) {
        vendorOrders[vendorId] = {
          vendorId,
          items: [],
          vendorTotal: 0
        };
      }

      // Check if enough stock is available
      if (product.stock < item.quantity) {
        console.error(`Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
        return res.status(400).json({ 
          error: `Insufficient stock for ${product.name}. Only ${product.stock} items available.` 
        });
      }

      const itemTotal = product.price * item.quantity;
      vendorOrders[vendorId].items.push({
        productId: product._id,
        quantity: item.quantity,
        price: product.price
      });
      vendorOrders[vendorId].vendorTotal += itemTotal;
      totalAmount += itemTotal;

      // Update product stock
      product.stock -= item.quantity;
      await product.save();
    }

    // Create orders for each vendor
    const orders = [];
    for (const vendorId in vendorOrders) {
      // Generate unique order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const order = new Order({
        customerId,
        vendorId,
        items: vendorOrders[vendorId].items,
        totalAmount: vendorOrders[vendorId].vendorTotal,
        shippingAddress,
        status: 'pending',
        paymentStatus: 'pending',
        orderNumber: orderNumber
      });
      await order.save();
      orders.push(order);
    }

    // Clear cart
    await Cart.findOneAndDelete({ customerId });

    res.status(201).json({ 
      message: 'Orders created successfully', 
      orders,
      totalAmount 
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer orders (legacy endpoint)
app.get('/api/customer/orders', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const customerId = tokenParts[1];
    const customer = await User.findById(customerId);
    
    if (!customer || customer.role !== 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const orders = await Order.find({ customerId })
      .populate('vendorId', 'name email')
      .populate('items.productId', 'name price image')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer orders (new endpoint)
app.get('/api/orders/customer', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const customerId = tokenParts[1];
    const customer = await User.findById(customerId);
    
    if (!customer || customer.role !== 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const orders = await Order.find({ customerId })
      .populate('vendorId', 'name email')
      .populate('items.productId', 'name price image')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get vendor order statistics
app.get('/api/vendor/order-stats', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const vendorId = tokenParts[1];
    const vendor = await User.findById(vendorId);
    
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get order counts by status
    const stats = await Order.aggregate([
      { $match: { vendorId: mongoose.Types.ObjectId.createFromHexString(vendorId) } },
      { $group: { 
        _id: '$status', 
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }}
    ]);

    // Format the response
    const formattedStats = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      totalOrders: 0,
      totalRevenue: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
      formattedStats.totalOrders += stat.count;
      formattedStats.totalRevenue += stat.totalAmount;
    });

    // Calculate metrics for dashboard
    const metrics = {
      toBePacked: formattedStats.pending + formattedStats.confirmed,
      toBeShipped: formattedStats.processing,
      toBeDelivered: formattedStats.shipped,
      toBeInvoiced: formattedStats.delivered
    };

    res.json({ 
      stats: formattedStats,
      metrics: metrics
    });
  } catch (error) {
    console.error('Get vendor order stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status
app.put('/api/vendor/orders/:orderId/status', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const vendorId = tokenParts[1];
    const vendor = await User.findById(vendorId);
    
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await Order.findOne({ _id: orderId, vendorId: mongoose.Types.ObjectId.createFromHexString(vendorId) });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status;
    order.updatedAt = new Date();
    await order.save();

    res.json({ 
      message: 'Order status updated successfully',
      order: order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get vendor orders
app.get('/api/vendor/orders', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const vendorId = tokenParts[1];
    const vendor = await User.findById(vendorId);
    
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const orders = await Order.find({ vendorId: mongoose.Types.ObjectId.createFromHexString(vendorId) })
      .populate('customerId', 'name email')
      .populate('items.productId', 'name price')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    console.error('Get vendor orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status
app.put('/api/vendor/orders/:orderId/status', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenParts = token.replace('Bearer ', '').split('-');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const vendorId = tokenParts[1];
    const vendor = await User.findById(vendorId);
    
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { orderId } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await Order.findOne({ _id: orderId, vendorId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status;
    order.updatedAt = new Date();
    await order.save();

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Static file serving (must come after API routes)
app.use(express.static(__dirname + "/public"));

// Static Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + "/public/index.html")
})


app.get('/customer-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

app.get('/vendor-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'vendor.html'));
});

app.get('/customer-dashboard' , (req , res) => {
    res.sendFile(path.join(__dirname, 'public', 'customer-dashboard.html'));
})


app.get('/vendor-dashboard' , (req , res) => {
    res.sendFile(path.join(__dirname, 'public', 'vendor-dashboard.html'));
})

app.get('/admin-dashboard' , (req , res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
})

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`)
})
