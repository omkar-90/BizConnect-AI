// js/cart.js - Updated to work with backend API

const Cart = {
  // Load cart from backend
  async loadCart() {
    try {
      console.log('Loading cart from backend...');
      const response = await API.get(API_CONFIG.endpoints.cart);
      console.log('Cart API response:', response);
      this.renderCart(response.cart);
    } catch (error) {
      console.error('Error loading cart:', error);
      this.renderCart({ items: [] });
    }
  },

  // Render cart items
  renderCart(cart) {
    console.log('=== RENDER CART START ===');
    console.log('Cart data received:', JSON.stringify(cart, null, 2));
    console.log('Cart items:', cart.items);
    console.log('Cart items length:', cart.items ? cart.items.length : 'undefined');
    
    const cartItemsContainer = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const cartSubtotal = document.getElementById('cartSubtotal');
    const cartCountText = document.getElementById('cart-count');
    const cartTotalText = document.getElementById('cart-total');
    
    console.log('Cart elements found:', {
      cartItemsContainer: !!cartItemsContainer,
      cartCount: !!cartCount,
      cartSubtotal: !!cartSubtotal,
      cartCountText: !!cartCountText,
      cartTotalText: !!cartTotalText
    });
    
    if (!cartItemsContainer) {
      console.error('cartItemsContainer not found!');
      return;
    }

    if (!cart.items || cart.items.length === 0) {
      console.log('Cart is empty, showing empty message');
      cartItemsContainer.innerHTML = '<div class="text-center py-8 text-gray-500">Your cart is empty</div>';
      if (cartCount) cartCount.textContent = '0';
      if (cartSubtotal) cartSubtotal.textContent = '₹0';
      if (cartCountText) cartCountText.textContent = '0 items in cart';
      if (cartTotalText) cartTotalText.textContent = '₹0';
      console.log('=== RENDER CART END (EMPTY) ===');
      return;
    }

    let total = 0;
    console.log('Processing cart items...');
    cartItemsContainer.innerHTML = cart.items.map((item, index) => {
      console.log(`Processing item ${index}:`, item);
      console.log(`Item productId:`, item.productId);
      console.log(`Item quantity:`, item.quantity);
      
      if (!item.productId) {
        console.error(`Item ${index} has no productId!`);
        return '';
      }
      
      const itemTotal = item.productId.price * item.quantity;
      total += itemTotal;
      
      console.log(`Item ${index} total:`, itemTotal);
      
      return `
        <div class="flex items-center gap-3 p-3 border-b border-gray-100">
          <img src="${item.productId.image || '/img/placeholder.jpg'}" alt="${item.productId.name}" class="w-12 h-12 rounded-lg object-cover">
          <div class="flex-1">
            <h4 class="font-medium text-gray-900">${item.productId.name}</h4>
            <p class="text-sm text-gray-600">₹${item.productId.price}</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="Cart.updateQuantity('${item.productId._id}', ${item.quantity - 1})" class="p-1 rounded-full hover:bg-gray-100">-</button>
            <span class="w-8 text-center">${item.quantity}</span>
            <button onclick="Cart.updateQuantity('${item.productId._id}', ${item.quantity + 1})" class="p-1 rounded-full hover:bg-gray-100">+</button>
            <button onclick="Cart.removeItem('${item.productId._id}')" class="p-1 rounded-full hover:bg-gray-100 text-red-600">×</button>
          </div>
        </div>
      `;
    }).join('');

    const totalCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    console.log('Updating cart display:', { totalCount, total });
    
    // Update all cart count and total elements
    if (cartCount) cartCount.textContent = totalCount;
    if (cartSubtotal) cartSubtotal.textContent = `₹${total}`;
    if (cartCountText) cartCountText.textContent = `${totalCount} items in cart`;
    if (cartTotalText) cartTotalText.textContent = `₹${total}`;
    
    console.log('Cart count updated to:', cartCount ? cartCount.textContent : 'not found');
    console.log('Cart subtotal updated to:', cartSubtotal ? cartSubtotal.textContent : 'not found');
    console.log('=== RENDER CART END (WITH ITEMS) ===');
  },

  // Add item to cart
  async addItem(productId, quantity = 1) {
    try {
      console.log('Adding to cart:', { productId, quantity });
      await API.post(API_CONFIG.endpoints.addToCart, {
        productId,
        quantity
      });
      this.loadCart();
      this.showMessage('Item added to cart!', 'success');
    } catch (error) {
      console.error('Error adding to cart:', error);
      this.showMessage('Failed to add item to cart', 'error');
    }
  },

  // Alias for backward compatibility
  async addToCart(productId, quantity = 1) {
    return this.addItem(productId, quantity);
  },

  // Update item quantity
  async updateQuantity(productId, newQuantity) {
    console.log('Updating quantity:', { productId, newQuantity });
    
    if (newQuantity < 1) {
      await this.removeItem(productId);
      return;
    }

    try {
      // Use PUT method to update quantity directly
      await API.put(API_CONFIG.endpoints.updateCart, {
        productId,
        quantity: newQuantity
      });
      
      console.log('Reloading cart...');
      this.loadCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      // Fallback to remove and re-add method
      try {
        console.log('Fallback: Removing and re-adding item...');
        await API.delete(`${API_CONFIG.endpoints.removeFromCart}/${productId}`);
        await API.post(API_CONFIG.endpoints.addToCart, {
          productId,
          quantity: newQuantity
        });
        this.loadCart();
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        this.showMessage('Failed to update quantity', 'error');
      }
    }
  },

  // Remove item from cart
  async removeItem(productId) {
    try {
      await API.delete(`${API_CONFIG.endpoints.removeFromCart}/${productId}`);
      this.loadCart();
      this.showMessage('Item removed from cart', 'success');
    } catch (error) {
      console.error('Error removing from cart:', error);
      this.showMessage('Failed to remove item', 'error');
    }
  },

  // Clear cart
  async clearCart() {
    try {
      // Remove all items one by one
      const cartItems = document.querySelectorAll('#cartItems .flex');
      for (const item of cartItems) {
        const removeBtn = item.querySelector('button[onclick*="removeItem"]');
        if (removeBtn) {
          const onclick = removeBtn.getAttribute('onclick');
          const productId = onclick.match(/'([^']+)'/)[1];
          await this.removeItem(productId);
        }
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  },

  // Show checkout form
  showCheckoutForm() {
    console.log('showCheckoutForm() called');
    const checkoutForm = document.getElementById('checkout-form');
    console.log('Checkout form element:', checkoutForm);
    
    if (checkoutForm) {
      // Load current cart and populate checkout form
      this.loadCartForCheckout();
      checkoutForm.style.display = 'block';
      console.log('Checkout form shown');
    } else {
      console.error('Checkout form element not found');
    }
  },

  // Load cart data for checkout form
  async loadCartForCheckout() {
    console.log('loadCartForCheckout() called');
    try {
      const response = await API.get(API_CONFIG.endpoints.cart);
      console.log('Cart data for checkout:', response);
      this.populateCheckoutForm(response.cart);
    } catch (error) {
      console.error('Error loading cart for checkout:', error);
      this.showMessage('Failed to load cart for checkout', 'error');
    }
  },

  // Populate checkout form with cart items
  populateCheckoutForm(cart) {
    console.log('populateCheckoutForm() called with cart:', cart);
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutTotal = document.getElementById('checkout-total');
    
    console.log('Checkout form elements:', {
      checkoutItems: !!checkoutItems,
      checkoutTotal: !!checkoutTotal
    });
    
    if (!checkoutItems || !checkoutTotal) {
      console.error('Checkout form elements not found');
      return;
    }

    if (!cart.items || cart.items.length === 0) {
      console.log('Cart is empty');
      checkoutItems.innerHTML = '<p class="text-gray-500">No items in cart</p>';
      checkoutTotal.textContent = '₹0';
      return;
    }

    let total = 0;
    checkoutItems.innerHTML = cart.items.map(item => {
      const itemTotal = item.productId.price * item.quantity;
      total += itemTotal;
      
      return `
        <div class="flex justify-between items-center text-sm">
          <div class="flex-1">
            <span class="font-medium">${item.productId.name}</span>
            <span class="text-gray-600"> x${item.quantity}</span>
          </div>
          <span class="font-medium">₹${itemTotal}</span>
        </div>
      `;
    }).join('');

    console.log('Checkout total calculated:', total);
    checkoutTotal.textContent = `₹${total}`;
  },

  // Hide checkout form
  hideCheckoutForm() {
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
      checkoutForm.style.display = 'none';
    }
  },

  // Process checkout
  async processCheckout() {
    const shippingAddressInput = document.getElementById('shipping-address') || document.getElementById('shipping-address-checkout');
    const shippingAddress = (shippingAddressInput ? shippingAddressInput.value : '').trim();
    
    if (!shippingAddress) {
      this.showMessage('Please enter a shipping address', 'error');
      return;
    }

    try {
      const response = await API.post(API_CONFIG.endpoints.createOrder, {
        shippingAddress
      });
      
      this.showMessage('Order placed successfully!', 'success');
      this.hideCheckoutForm();
      this.loadCart(); // This will clear the cart
      
      // Redirect to orders page or show success message
      setTimeout(() => {
        window.location.href = '/customer-dashboard';
      }, 2000);
      
    } catch (error) {
      console.error('Error processing checkout:', error);
      this.showMessage('Failed to place order', 'error');
    }
  },

  // Show message
  showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500 text-white' : 
      type === 'error' ? 'bg-red-500 text-white' : 
      'bg-blue-500 text-white'
    }`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
  },

  // Cart drawer functionality
  openCartDrawer() {
    Drawer.open();
  },

  closeCartDrawer() {
    Drawer.close();
  },

  // Initialize cart functionality
  init() {
    console.log('=== Cart.init() START ===');
    console.log('Initializing cart functionality...');
    
    // Load cart when page loads
    console.log('Loading initial cart...');
    this.loadCart();
    
    // Bind cart drawer controls
    const cartButton = document.getElementById('cartButton');
    const cartClose = document.getElementById('cartClose');
    const cartBackdrop = document.getElementById('cartBackdrop');
    
    console.log('Cart elements found:', {
      cartButton: !!cartButton,
      cartClose: !!cartClose,
      cartBackdrop: !!cartBackdrop
    });
    
    if (cartButton) {
      cartButton.addEventListener('click', () => {
        console.log('Cart button clicked - opening drawer');
        Drawer.open();
      });
    } else {
      console.error('Cart button not found!');
    }
    if (cartClose) {
      cartClose.addEventListener('click', () => {
        console.log('Cart close clicked');
        Drawer.close();
      });
    }
    if (cartBackdrop) {
      cartBackdrop.addEventListener('click', () => {
        console.log('Cart backdrop clicked');
        Drawer.close();
      });
    }
    
    // Bind checkout buttons
    const checkoutBtn = document.getElementById('checkout-btn');
    const checkoutBtnMain = document.getElementById('checkout-btn-main');
    const processCheckoutBtn = document.getElementById('process-checkout-btn');
    
    console.log('Checkout buttons found:', {
      checkoutBtn: !!checkoutBtn,
      checkoutBtnMain: !!checkoutBtnMain,
      processCheckoutBtn: !!processCheckoutBtn
    });
    
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        console.log('Checkout button clicked');
        this.showCheckoutForm();
      });
    }
    
    if (checkoutBtnMain) {
      checkoutBtnMain.addEventListener('click', () => {
        console.log('Checkout main button clicked');
        this.showCheckoutForm();
      });
    }
    
    if (processCheckoutBtn) {
      processCheckoutBtn.addEventListener('click', () => {
        console.log('Process checkout button clicked');
        this.processCheckout();
      });
    }
    
    console.log('=== Cart.init() END ===');
  }
};

// Drawer functionality
const Drawer = {
  open() {
    console.log('Drawer.open() called');
    const drawer = document.getElementById('cartDrawer');
    const panel = drawer?.querySelector('aside');
    const backdrop = document.getElementById('cartBackdrop');
    
    console.log('Drawer elements found:', {
      drawer: !!drawer,
      panel: !!panel,
      backdrop: !!backdrop
    });
    
    if (!drawer || !panel || !backdrop) {
      console.error('Missing drawer elements');
      return;
    }
    
    // Reload cart when opening drawer
    console.log('Reloading cart before opening drawer...');
    Cart.loadCart();
    
    drawer.classList.remove('hidden');
    requestAnimationFrame(() => {
      backdrop.classList.remove('opacity-0');
      panel.classList.remove('translate-x-full');
    });
    console.log('Drawer opened successfully');
  },
  close() {
    const drawer = document.getElementById('cartDrawer');
    const panel = drawer?.querySelector('aside');
    const backdrop = document.getElementById('cartBackdrop');
    if (!drawer || !panel || !backdrop) return;
    
    backdrop.classList.add('opacity-0');
    panel.classList.add('translate-x-full');
    setTimeout(() => drawer.classList.add('hidden'), 200);
  }
};

// Initialize cart when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('=== CART INITIALIZATION START ===');
  console.log('DOM loaded, initializing cart...');
  Cart.init();
  console.log('=== CART INITIALIZATION END ===');
});