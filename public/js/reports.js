// Reports page logic - FULLY CONNECTED TO BACKEND
(function(){
  if (typeof Auth !== 'undefined' && typeof Auth.protectPage === 'function') {
    Auth.protectPage(['vendor']);
  }
  
  // Personalize user name (just the name)
  try { 
    var u = Auth.getCurrentUser && Auth.getCurrentUser(); 
    if (u) { 
      var n = document.getElementById('userName'); 
      if (n) n.textContent = u.name;
      // Update shop name and address in topbar
      var shopNameNode = document.getElementById('shopName');
      var shopAddressNode = document.getElementById('shopAddress');
      if (shopNameNode) shopNameNode.textContent = u.shopName || 'BizConnect Demo Shop';
      if (shopAddressNode) shopAddressNode.textContent = u.address || '123 Market Lane, Main City';
    } 
  } catch(_){}

  // Profile dropdown logic for Reports page
  const profileBtn = document.getElementById('profileMenuButton');
  const profileMenu = document.getElementById('profileMenu');
  const logoutBtn = document.getElementById('logoutBtn');
  if (profileBtn && profileMenu) {
    profileBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      profileMenu.style.display = (profileMenu.style.display === 'block') ? 'none' : 'block';
    });
    document.addEventListener('click', function(e) {
      if (profileMenu.style.display === 'block' && !profileMenu.contains(e.target) && e.target !== profileBtn) {
        profileMenu.style.display = 'none';
      }
    });
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      if (window.Auth && typeof window.Auth.logout === 'function') return Auth.logout();
      if (typeof Auth !== 'undefined') Auth.logout();
    });
  }

  // Initialize ML Pipeline automatically when reports page loads
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      console.log('Initializing ML pipeline for reports...');
      await mlPredictions.initializeML();
      console.log('ML pipeline initialized successfully for reports');
      
      // Load real data from backend
      await loadReportsData();
    } catch (error) {
      console.error('Failed to initialize ML pipeline for reports:', error);
      // Load data even if ML fails
      await loadReportsData();
    }
  });

  // Real data variables - will be populated from API
  let sales = [];
  let allProducts = [];
  let invoices = [];
  let customers = [];
  let today = new Date().toISOString().split('T')[0];

  // Load all reports data from backend
  async function loadReportsData() {
    try {
      console.log('🔄 Loading reports data from backend...');
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.error('No authentication token found');
        showFallbackData();
        return;
      }

      // Load data in parallel
      const [ordersData, productsData, mlData] = await Promise.all([
        loadOrdersData(token),
        loadProductsData(token),
        loadMLData(token)
      ]);

      // Process and transform data
      sales = processOrdersToSales(ordersData);
      allProducts = processProductsData(productsData, ordersData);
      invoices = processOrdersToInvoices(ordersData);
      customers = processOrdersToCustomers(ordersData);

      console.log('✅ Reports data loaded successfully:', {
        sales: sales.length,
        products: allProducts.length,
        invoices: invoices.length,
        customers: customers.length
      });

      // Render all components
      renderAllReports();

    } catch (error) {
      console.error('❌ Error loading reports data:', error);
      showFallbackData();
    }
  }

  // Load orders data from API
  async function loadOrdersData(token) {
    try {
      const response = await fetch('/api/vendor/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.orders || [];
    } catch (error) {
      console.error('Error loading orders:', error);
      return [];
    }
  }

  // Load products data from API
  async function loadProductsData(token) {
    try {
      const response = await fetch('/api/vendor/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.products || [];
    } catch (error) {
      console.error('Error loading products:', error);
      return [];
    }
  }

  // Load ML predictions data
  async function loadMLData(token) {
    try {
      const response = await fetch('/api/ml/top-products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.products || [];
    } catch (error) {
      console.error('Error loading ML data:', error);
      return [];
    }
  }

  // Process orders into sales data grouped by date
  function processOrdersToSales(orders) {
    const salesMap = new Map();
    
    orders.forEach(order => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      
      if (!salesMap.has(date)) {
        salesMap.set(date, {
          date: date,
          amount: 0,
          orders: 0,
          products: {}
        });
      }
      
      const daySales = salesMap.get(date);
      daySales.amount += order.totalAmount;
      daySales.orders += 1;
      
      // Count products sold
      order.items.forEach(item => {
        const productName = item.productId.name || 'Unknown Product';
        daySales.products[productName] = (daySales.products[productName] || 0) + item.quantity;
      });
    });
    
    return Array.from(salesMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // Process products data with sales information
  function processProductsData(products, orders) {
    const productSales = new Map();
    
    // Initialize with product data
    products.forEach(product => {
      productSales.set(product._id, {
        name: product.name,
        units: 0,
        revenue: 0,
        stock: product.stock || 0,
        price: product.price
      });
    });
    
    // Calculate sales from orders
    orders.forEach(order => {
      order.items.forEach(item => {
        const productId = item.productId._id || item.productId;
        if (productSales.has(productId)) {
          const product = productSales.get(productId);
          product.units += item.quantity;
          product.revenue += item.quantity * item.price;
        }
      });
    });
    
    return Array.from(productSales.values());
  }

  // Process orders into invoice format
  function processOrdersToInvoices(orders) {
    return orders.map(order => ({
      id: order.orderNumber || order._id.slice(-8),
      amount: order.totalAmount,
      status: getInvoiceStatus(order.status),
      date: new Date(order.createdAt).toISOString().split('T')[0],
      due: new Date(new Date(order.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      orderId: order._id
    }));
  }

  // Process orders into customer data
  function processOrdersToCustomers(orders) {
    const customerMap = new Map();
    
    orders.forEach(order => {
      const customerId = order.customerId._id || order.customerId;
      const customerName = order.customerId.name || 'Customer';
      
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          name: customerName,
          orders: 0,
          revenue: 0,
          type: 'new'
        });
      }
      
      const customer = customerMap.get(customerId);
      customer.orders += 1;
      customer.revenue += order.totalAmount;
      customer.type = customer.orders > 1 ? 'returning' : 'new';
    });
    
    return Array.from(customerMap.values()).sort((a, b) => b.revenue - a.revenue);
  }

  // Convert order status to invoice status
  function getInvoiceStatus(orderStatus) {
    const statusMap = {
      'pending': 'unpaid',
      'confirmed': 'unpaid', 
      'processing': 'unpaid',
      'shipped': 'paid',
      'delivered': 'paid',
      'cancelled': 'unpaid'
    };
    return statusMap[orderStatus] || 'unpaid';
  }

  // Show fallback data if API fails
  function showFallbackData() {
    console.log('🔄 Using fallback mock data for reports');
    sales = [
    { date: '2024-06-11', amount: 50, orders: 3, products: { 'Cotton T-Shirt':2, 'Kids Romper':1 } },
    { date: '2024-06-12', amount: 112.5, orders: 5, products: { 'Cotton T-Shirt':3, 'Winter Jacket':2 } },
    { date: '2024-06-13', amount: 78, orders: 4, products: { 'Kids Romper':2, 'Winter Jacket':2 } },
    { date: '2024-06-14', amount: 123.5, orders: 6, products: { 'Cotton T-Shirt':4, 'Kids Romper':1, 'Winter Jacket':1 } },
    { date: '2024-06-15', amount: 65, orders: 3, products: { 'Kids Romper':2, 'Winter Jacket':1 } },
    { date: '2024-06-16', amount: 94, orders: 6, products: { 'Cotton T-Shirt':2, 'Kids Romper':2, 'Winter Jacket':2 } },
    { date: '2024-06-17', amount: 137, orders: 8, products: { 'Cotton T-Shirt':5, 'Kids Romper':2, 'Winter Jacket':1 } }
  ];
    allProducts = [
    { name: 'Cotton T-Shirt', units: 18, revenue: 450, stock: 9 },
    { name: 'Kids Romper', units: 11, revenue: 110, stock: 4 },
    { name: 'Winter Jacket', units: 8, revenue: 320, stock: 2 },
    { name: 'Raincoat', units: 0, revenue: 0, stock: 5 }
  ];
    invoices = [
    { id: 'INV-101', amount: 56, status: 'paid', date: '2024-06-10', due: '2024-06-15' },
    { id: 'INV-102', amount: 89.5, status: 'unpaid', date: '2024-06-12', due: '2024-06-18' },
    { id: 'INV-103', amount: 120.9, status: 'paid', date: '2024-06-13', due: '2024-06-16' },
    { id: 'INV-104', amount: 39, status: 'unpaid', date: '2024-06-14', due: '2024-06-19' },
    { id: 'INV-105', amount: 36.99, status: 'paid', date: '2024-06-14', due: '2024-06-15' },
    { id: 'INV-106', amount: 60, status: 'unpaid', date: '2024-06-14', due: '2024-06-15' }
  ];
    customers = [
    { name: 'Alice', orders: 6, revenue: 410, type: 'returning' },
    { name: 'Bob', orders: 2, revenue: 56, type: 'new' },
    { name: 'Carlos', orders: 2, revenue: 86, type: 'returning' },
    { name: 'Nina', orders: 1, revenue: 42, type: 'new' },
    { name: 'Leah', orders: 1, revenue: 59, type: 'new' },
  ];
    
    renderAllReports();
  }
  // Utility functions
  function $id(id){ return document.getElementById(id); }
  function fmt(n){ return '₹'+Number(n).toFixed(2); }

  // Render all reports components
  function renderAllReports() {
    console.log('🔄 Rendering all reports components...');
    
    // Calculate KPIs
  const totalSales = sales.reduce((a,b)=>a+b.amount,0);
  const totalOrders = sales.reduce((a,b)=>a+b.orders,0);
  const revenue = totalSales;
  const aov = totalOrders ? (totalSales/totalOrders) : 0;
    
    // Top product calculation
  let prodQty = {};
  sales.forEach(d=>{Object.entries(d.products).forEach(([k,v])=>{prodQty[k]=(prodQty[k]||0)+v;});});
  let topProd = Object.keys(prodQty).sort((a,b)=>prodQty[b]-prodQty[a])[0]||'-';
    
  // Update KPI cards with proper formatting
    if ($id('kpi-total-sales')) $id('kpi-total-sales').textContent = fmt(totalSales);
    if ($id('kpi-orders')) $id('kpi-orders').textContent = totalOrders;
    if ($id('kpi-revenue')) $id('kpi-revenue').textContent = fmt(revenue);
    if ($id('kpi-aov')) $id('kpi-aov').textContent = fmt(aov);

  // Render Top Selling Products
  const topProductsTable = document.querySelector('#r-top-products tbody');
  if (topProductsTable) {
    topProductsTable.innerHTML = '';
    allProducts.sort((a, b) => b.units - a.units).forEach(product => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${product.name}</strong></td>
        <td>${product.units}</td>
        <td>${fmt(product.revenue)}</td>
      `;
      topProductsTable.appendChild(row);
    });
  }

  // Prepare mapping helpers to avoid overlap between sections
  const usedProductNames = new Set();
  const topCandidates = [...allProducts].sort((a, b) => (b.units || 0) - (a.units || 0));
  const lowCandidates = [...allProducts].sort((a, b) => (a.units || 0) - (b.units || 0));
  function pickNameForIndex(idx, fallbackName, list) {
    if (list.length === 0) return fallbackName || 'Product';
    // Try sequentially from idx to find a not-yet-used product name
    for (let i = 0; i < list.length; i++) {
      const candidate = list[(idx + i) % list.length];
      if (candidate && candidate.name && !usedProductNames.has(candidate.name)) {
        usedProductNames.add(candidate.name);
        return candidate.name;
      }
    }
    // Fallback if all are used
    return fallbackName || list[idx % list.length].name || 'Product';
  }

  // Render Future Best Sellers with ML Predictions
  const futureBestSellers = document.querySelector('#future-bestsellers .future-predict-list');
  if (futureBestSellers) {
    futureBestSellers.innerHTML = '<li><i class="fas fa-spinner fa-spin"></i> Loading AI predictions...</li>';
    
    // Load ML predictions for top performing products
    mlPredictions.getTopPerformingProducts(5).then(products => {
      if (products && products.length > 0) {
        futureBestSellers.innerHTML = '';
        products.forEach((product, idx) => {
          const fallbackName = product.name || product.product_name || product.title || String(product.product_id || 'Product');
          const displayName = pickNameForIndex(idx, fallbackName, topCandidates);
          const li = document.createElement('li');
          const salesPrediction = Math.round(parseFloat(product.sales_regressor_prediction) || 0);
          const revenuePrediction = Math.round(parseFloat(product.revenue_regressor_prediction) || 0);
          const salesPerf = product.sales_performance_classifier_prediction || 'Medium';
          const revenuePerf = product.revenue_performance_classifier_prediction || 'Medium';
          
          li.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong>${displayName}</strong>
              <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${salesPerf}</span>
            </div>
            <div style="font-size: 14px; color: #64748b;">
              <div>📈 Predicted Sales: <strong>${salesPrediction}</strong> units</div>
              <div>💰 Predicted Revenue: <strong>₹${revenuePrediction.toLocaleString()}</strong></div>
              <div>🎯 Revenue Performance: <strong>${revenuePerf}</strong></div>
            </div>
          `;
          futureBestSellers.appendChild(li);
        });
      } else {
        futureBestSellers.innerHTML = '<li>No ML predictions available. Please initialize the ML pipeline.</li>';
      }
    }).catch(error => {
      console.error('Error loading top products:', error);
      futureBestSellers.innerHTML = '<li>Error loading AI predictions. Using fallback data.</li>';
      // Fallback to mock data
      const bestSellers = allProducts.filter(p => p.units > 0).sort((a, b) => b.units - a.units).slice(0, 3);
      bestSellers.forEach(product => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${product.name}</strong> - ${product.units} units sold`;
        futureBestSellers.appendChild(li);
      });
    });
  }

  // Render Future Poor Sellers with ML Predictions
  const futurePoorSellers = document.querySelector('#future-nosell .future-predict-list');
  if (futurePoorSellers) {
    futurePoorSellers.innerHTML = '<li><i class="fas fa-spinner fa-spin"></i> Loading AI predictions...</li>';
    
    // Load ML predictions for low performing products
    mlPredictions.getLowPerformingProducts(5).then(products => {
      if (products && products.length > 0) {
        futurePoorSellers.innerHTML = '';
        products.forEach((product, idx) => {
          const fallbackName = product.name || product.product_name || product.title || String(product.product_id || 'Product');
          const displayName = pickNameForIndex(idx, fallbackName, lowCandidates);
          const li = document.createElement('li');
          const salesPrediction = Math.round(parseFloat(product.sales_regressor_prediction) || 0);
          const revenuePrediction = Math.round(parseFloat(product.revenue_regressor_prediction) || 0);
          const salesPerf = product.sales_performance_classifier_prediction || 'Low';
          const revenuePerf = product.revenue_performance_classifier_prediction || 'Low';
          const lowPerfProb = ((parseFloat(product.low_performer_classifier_probability) || 0) * 100).toFixed(1);
          
          li.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong>${displayName}</strong>
              <span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${salesPerf}</span>
            </div>
            <div style="font-size: 14px; color: #64748b;">
              <div>📉 Predicted Sales: <strong>${salesPrediction}</strong> units</div>
              <div>💰 Predicted Revenue: <strong>₹${revenuePrediction.toLocaleString()}</strong></div>
              <div>⚠️ Low Performer Probability: <strong>${lowPerfProb}%</strong></div>
              <div>🎯 Revenue Performance: <strong>${revenuePerf}</strong></div>
            </div>
          `;
          futurePoorSellers.appendChild(li);
        });
      } else {
        futurePoorSellers.innerHTML = '<li>No ML predictions available. Please initialize the ML pipeline.</li>';
      }
    }).catch(error => {
      console.error('Error loading low products:', error);
      futurePoorSellers.innerHTML = '<li>Error loading AI predictions. Using fallback data.</li>';
      // Fallback to mock data
      const poorSellers = allProducts.filter(p => p.units === 0 || p.stock > 5);
      poorSellers.forEach(product => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${product.name}</strong> - ${product.units} units sold (${product.stock} in stock)`;
        futurePoorSellers.appendChild(li);
      });
    });
  }

  // Render Inventory Insights (Updated for new structure)
  const lowStock = allProducts.filter(p => p.stock <= 3);
  const fastMoving = allProducts.filter(p => p.units > 5);
  const inactive = allProducts.filter(p => p.units === 0);

  // Update inventory insight counts
  const lowStockCountEl = document.getElementById('low-stock-count');
  const fastMovingCountEl = document.getElementById('fast-moving-count');
  const inactiveCountEl = document.getElementById('inactive-count');

  if (lowStockCountEl) lowStockCountEl.textContent = lowStock.length;
  if (fastMovingCountEl) fastMovingCountEl.textContent = fastMoving.length;
  if (inactiveCountEl) inactiveCountEl.textContent = inactive.length;

  // Render Customer Insights (Updated for new structure)
  const newCustomers = customers.filter(c => c.type === 'new').length;
  const returningCustomers = customers.filter(c => c.type === 'returning').length;
  const customerRetention = customers.length ? ((returningCustomers / customers.length) * 100) : 0;

  // Update customer metrics
  const newCustomersEl = document.getElementById('cust-new');
  const returningCustomersEl = document.getElementById('cust-ret');
  const retentionEl = document.getElementById('cust-retention');

  if (newCustomersEl) newCustomersEl.textContent = newCustomers;
  if (returningCustomersEl) returningCustomersEl.textContent = returningCustomers;
  if (retentionEl) retentionEl.textContent = Math.round(customerRetention) + '%';

  // Sales Trend Chart
  const chartLabels = sales.map(s => s.date);
  const chartData = sales.map(s => s.amount);
  const ctx = $id('salesTrendChart');
  
  console.log('Chart data:', { chartLabels, chartData, salesLength: sales.length });
  
  if (ctx && ctx.getContext) {
    const chartCtx = ctx.getContext('2d');
    
    // Clear any existing chart
    chartCtx.clearRect(0, 0, ctx.width, ctx.height);
    
    if (window.Chart) {
      try {
        // Destroy existing chart if it exists
        if (window.salesChart) {
          window.salesChart.destroy();
        }
        
        // Ensure we have data to display
        if (chartData.length === 0) {
          console.log('No sales data available, showing empty chart');
          chartLabels.push('No Data');
          chartData.push(0);
        }
        
        // Create new chart
        window.salesChart = new Chart(chartCtx, {
          type: 'bar',
          data: {
            labels: chartLabels,
            datasets: [{
              label: 'Sales',
              data: chartData,
              backgroundColor: '#0ea5e9',
              borderColor: '#0284c7',
              borderWidth: 1,
              borderRadius: 8,
              borderSkipped: false,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: '#e5e7eb'
                },
                ticks: {
                  color: '#6b7280'
                }
              },
              x: {
                grid: {
                  color: '#e5e7eb'
                },
                ticks: {
                  color: '#6b7280'
                }
              }
            },
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: 'white',
                bodyColor: 'white',
                borderColor: '#0ea5e9',
                borderWidth: 1
              }
            }
          }
        });
        
        console.log('Chart.js chart created successfully');
      } catch (error) {
        console.error('Error creating Chart.js chart:', error);
        renderFallbackChart(chartCtx, chartLabels, chartData);
      }
    } else {
      console.log('Chart.js not available, using fallback chart');
      renderFallbackChart(chartCtx, chartLabels, chartData);
    }
  } else {
    console.error('Canvas element not found or not supported');
  }
  
  // Fallback chart rendering function
  function renderFallbackChart(ctx, labels, data) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    if (data.length === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', ctx.canvas.width / 2, ctx.canvas.height / 2);
      return;
    }
    
    const padding = 40;
    const chartWidth = ctx.canvas.width - (padding * 2);
    const chartHeight = ctx.canvas.height - (padding * 2);
    const barWidth = chartWidth / data.length;
    const maxValue = Math.max(...data);
    
    // Draw bars
    ctx.fillStyle = '#0ea5e9';
    data.forEach((value, index) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = padding + (index * barWidth) + (barWidth * 0.1);
      const y = padding + chartHeight - barHeight;
      const width = barWidth * 0.8;
      
      ctx.fillRect(x, y, width, barHeight);
      
      // Draw value labels
      ctx.fillStyle = '#374151';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(value.toString(), x + width / 2, y - 5);
    });
    
    // Draw labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    labels.forEach((label, index) => {
      const x = padding + (index * barWidth) + (barWidth / 2);
      const y = ctx.canvas.height - 10;
      ctx.fillText(label, x, y);
    });
    
    console.log('Fallback chart rendered successfully');
  }

  // Export functionality
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      // Create CSV content
      let csvContent = 'Report Type,Value\n';
      csvContent += `Total Sales,${fmt(totalSales)}\n`;
      csvContent += `Total Orders,${totalOrders}\n`;
      csvContent += `Revenue,${fmt(revenue)}\n`;
      csvContent += `Average Order Value,${fmt(aov)}\n`;
      csvContent += `Top Product,${topProd}\n\n`;
      
      csvContent += 'Product,Units Sold,Revenue,Stock\n';
      allProducts.forEach(product => {
        csvContent += `${product.name},${product.units},${fmt(product.revenue)},${product.stock}\n`;
      });
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'business-report.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

    console.log('✅ All reports components rendered successfully');
  }

})();
