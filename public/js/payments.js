
// payments.js - Stripe Checkout integration
(function() {
  function getShippingAddress() {
    const el = document.getElementById('shipping-address-checkout') || document.getElementById('shipping-address');
    return el ? (el.value || '').trim() : '';
  }

  async function createCheckoutSession() {
    const btn = document.getElementById('stripe-checkout-btn');
    if (btn) btn.disabled = true;
    try {
      // Persist shipping address to restore after Stripe redirect
      const shippingAddress = getShippingAddress();
      if (shippingAddress) {
        localStorage.setItem('checkout_shipping_address', shippingAddress);
      }

      const response = await API.post('/pay/create-checkout-session', {});
      if (response.url) {
        window.location.href = response.url;
        return;
      }
      throw new Error('No checkout URL returned');
    } catch (err) {
      console.error('Stripe checkout error:', err);
      alert('Unable to start payment. Please try again.');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    const payBtn = document.getElementById('stripe-checkout-btn');
    if (payBtn) {
      payBtn.addEventListener('click', function() {
        createCheckoutSession();
      });
    }

    // On return from Stripe
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    if (paymentStatus === 'success') {
      const savedAddress = localStorage.getItem('checkout_shipping_address') || '';
      API.post('/pay/complete', { shippingAddress: savedAddress || 'Paid via Stripe Checkout (address not provided)' })
        .then(() => {
          localStorage.removeItem('checkout_shipping_address');
          // Refresh UI - simplest is reload to reflect empty cart and new orders
          window.location.replace('/customer-dashboard');
        })
        .catch((e) => {
          console.error('Finalize payment failed:', e);
          alert('Payment succeeded but order finalization failed. Please contact support.');
        });
    } else if (paymentStatus === 'cancelled') {
      // Clean up and remove the param
      localStorage.removeItem('checkout_shipping_address');
      history.replaceState({}, document.title, window.location.pathname);
    }
  });
})();


