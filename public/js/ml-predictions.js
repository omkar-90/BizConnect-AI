/**
 * ML Prediction Integration for BizConnect-AI
 * Provides real-time ML predictions and insights
 */

class MLPredictions {
    constructor() {
        this.baseURL = '/api/ml';
        this.isInitialized = false;
    }

    async initializeML() {
        try {
            console.log('🚀 Initializing ML pipeline...');
            const response = await fetch(`${this.baseURL}/initialize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                this.isInitialized = true;
                console.log('✅ ML pipeline initialized successfully');
                this.showMLStatus('success', 'ML pipeline initialized successfully');
                return true;
            } else {
                console.error('❌ ML initialization failed:', result.error);
                this.showMLStatus('error', 'ML initialization failed');
                return false;
            }
        } catch (error) {
            console.error('❌ Error initializing ML:', error);
            this.showMLStatus('error', 'Error initializing ML pipeline');
            return false;
        }
    }

    async predictProductPerformance(productId) {
        try {
            const response = await fetch(`${this.baseURL}/predict-product`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ productId })
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                return result.predictions;
            } else {
                console.error('❌ Prediction failed:', result.error);
                return null;
            }
        } catch (error) {
            console.error('❌ Error predicting product performance:', error);
            return null;
        }
    }

    async getSalesTrends(productId, days = 30) {
        try {
            const response = await fetch(`${this.baseURL}/sales-trends/${productId}?days=${days}`);
            const result = await response.json();
            
            if (result.status === 'success') {
                return result.trends;
            } else {
                console.error('❌ Sales trends failed:', result.error);
                return null;
            }
        } catch (error) {
            console.error('❌ Error getting sales trends:', error);
            return null;
        }
    }

    async getTopPerformingProducts(limit = 10) {
        try {
            // Add cache-busting parameter
            const timestamp = new Date().getTime();
            const token = this.getAuthToken();
            
            console.log('ML Request - Token:', token);
            console.log('ML Request - URL:', `${this.baseURL}/top-products?limit=${limit}&_t=${timestamp}`);
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Add authorization header if token exists
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${this.baseURL}/top-products?limit=${limit}&_t=${timestamp}`, {
                headers: headers
            });
            const result = await response.json();
            
            console.log('ML Top Products Response:', result);
            
            if (result.status === 'success') {
                return result.products;
            } else {
                console.error('❌ Top products failed:', result.error);
                return [];
            }
        } catch (error) {
            console.error('❌ Error getting top products:', error);
            return [];
        }
    }

    // Helper method to get auth token
    getAuthToken() {
        try {
            if (typeof Storage !== 'undefined' && typeof Storage.getToken === 'function') {
                const token = Storage.getToken();
                if (token) return token;
            }
            const token = localStorage.getItem('accessToken');
            return token || null;
        } catch (error) {
            console.error('Error getting auth token:', error);
            return null;
        }
    }

    async getLowPerformingProducts(limit = 10) {
        try {
            const token = this.getAuthToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(`${this.baseURL}/low-products?limit=${limit}` , { headers });
            const result = await response.json();
            
            if (result.status === 'success') {
                return result.products;
            } else {
                console.error('❌ Low products failed:', result.error);
                return [];
            }
        } catch (error) {
            console.error('❌ Error getting low products:', error);
            return [];
        }
    }

    async getCategoryInsights(category) {
        try {
            const token = this.getAuthToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(`${this.baseURL}/category-insights/${encodeURIComponent(category)}`, { headers });
            const result = await response.json();
            
            if (result.status === 'success') {
                return result.insights;
            } else {
                console.error('❌ Category insights failed:', result.error);
                return null;
            }
        } catch (error) {
            console.error('❌ Error getting category insights:', error);
            return null;
        }
    }

    async getVendorInsights(vendorId) {
        try {
            const token = this.getAuthToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(`${this.baseURL}/vendor-insights/${vendorId}`, { headers });
            const result = await response.json();
            
            if (result.status === 'success') {
                return result.insights;
            } else {
                console.error('❌ Vendor insights failed:', result.error);
                return null;
            }
        } catch (error) {
            console.error('❌ Error getting vendor insights:', error);
            return null;
        }
    }

    showMLStatus(type, message) {
        // Create or update ML status indicator
        let statusElement = document.getElementById('ml-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'ml-status';
            statusElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 15px;
                border-radius: 5px;
                color: white;
                font-weight: bold;
                z-index: 10000;
                max-width: 300px;
                word-wrap: break-word;
            `;
            document.body.appendChild(statusElement);
        }

        statusElement.style.backgroundColor = type === 'success' ? '#10b981' : '#ef4444';
        statusElement.textContent = message;

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (statusElement) {
                statusElement.remove();
            }
        }, 5000);
    }

    formatPredictionResult(predictions) {
        if (!predictions) return null;

        return {
            salesPerformance: predictions.sales_performance,
            revenuePerformance: predictions.revenue_performance,
            isHighPerformer: predictions.is_high_performer,
            highPerformerProbability: (predictions.high_performer_probability * 100).toFixed(1),
            isLowPerformer: predictions.is_low_performer,
            lowPerformerProbability: (predictions.low_performer_probability * 100).toFixed(1),
            predictedTotalSales: Math.round(predictions.predicted_total_sales),
            predictedTotalRevenue: Math.round(predictions.predicted_total_revenue),
            confidenceScore: (predictions.confidence_score * 100).toFixed(1)
        };
    }

    formatTrendResult(trends) {
        if (!trends) return null;

        return {
            currentSalesVelocity: Math.round(trends.current_sales_velocity),
            salesTrend7d: (trends.sales_trend_7d * 100).toFixed(1),
            revenueTrend7d: (trends.revenue_trend_7d * 100).toFixed(1),
            predictedSalesNext30d: Math.round(trends.predicted_sales_next_30d),
            trendDirection: trends.trend_direction,
            confidence: (trends.confidence * 100).toFixed(1)
        };
    }

    createPredictionCard(predictions, title = 'Product Performance Prediction') {
        const formatted = this.formatPredictionResult(predictions);
        if (!formatted) return null;

        const card = document.createElement('div');
        card.className = 'prediction-card';
        card.innerHTML = `
            <div class="card-header">
                <h3>${title}</h3>
            </div>
            <div class="card-body">
                <div class="prediction-grid">
                    <div class="prediction-item">
                        <span class="label">Sales Performance:</span>
                        <span class="value ${formatted.salesPerformance.toLowerCase()}">${formatted.salesPerformance}</span>
                    </div>
                    <div class="prediction-item">
                        <span class="label">Revenue Performance:</span>
                        <span class="value ${formatted.revenuePerformance.toLowerCase()}">${formatted.revenuePerformance}</span>
                    </div>
                    <div class="prediction-item">
                        <span class="label">High Performer:</span>
                        <span class="value ${formatted.isHighPerformer ? 'yes' : 'no'}">${formatted.isHighPerformer ? 'Yes' : 'No'} (${formatted.highPerformerProbability}%)</span>
                    </div>
                    <div class="prediction-item">
                        <span class="label">Low Performer:</span>
                        <span class="value ${formatted.isLowPerformer ? 'yes' : 'no'}">${formatted.isLowPerformer ? 'Yes' : 'No'} (${formatted.lowPerformerProbability}%)</span>
                    </div>
                    <div class="prediction-item">
                        <span class="label">Predicted Sales:</span>
                        <span class="value">${formatted.predictedTotalSales}</span>
                    </div>
                    <div class="prediction-item">
                        <span class="label">Predicted Revenue:</span>
                        <span class="value">₹${formatted.predictedTotalRevenue.toLocaleString()}</span>
                    </div>
                    <div class="prediction-item">
                        <span class="label">Confidence:</span>
                        <span class="value">${formatted.confidenceScore}%</span>
                    </div>
                </div>
            </div>
        `;

        return card;
    }

    createTrendCard(trends, title = 'Sales Trends') {
        const formatted = this.formatTrendResult(trends);
        if (!formatted) return null;

        const card = document.createElement('div');
        card.className = 'trend-card';
        card.innerHTML = `
            <div class="card-header">
                <h3>${title}</h3>
            </div>
            <div class="card-body">
                <div class="trend-grid">
                    <div class="trend-item">
                        <span class="label">Current Sales Velocity:</span>
                        <span class="value">${formatted.currentSalesVelocity} units/day</span>
                    </div>
                    <div class="trend-item">
                        <span class="label">7-Day Sales Trend:</span>
                        <span class="value ${formatted.salesTrend7d >= 0 ? 'positive' : 'negative'}">${formatted.salesTrend7d}%</span>
                    </div>
                    <div class="trend-item">
                        <span class="label">7-Day Revenue Trend:</span>
                        <span class="value ${formatted.revenueTrend7d >= 0 ? 'positive' : 'negative'}">${formatted.revenueTrend7d}%</span>
                    </div>
                    <div class="trend-item">
                        <span class="label">Predicted Sales (30 days):</span>
                        <span class="value">${formatted.predictedSalesNext30d} units</span>
                    </div>
                    <div class="trend-item">
                        <span class="label">Trend Direction:</span>
                        <span class="value ${formatted.trendDirection}">${formatted.trendDirection}</span>
                    </div>
                    <div class="trend-item">
                        <span class="label">Confidence:</span>
                        <span class="value">${formatted.confidence}%</span>
                    </div>
                </div>
            </div>
        `;

        return card;
    }

    addMLStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .prediction-card, .trend-card {
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                margin: 15px 0;
                overflow: hidden;
            }

            .card-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 20px;
            }

            .card-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }

            .card-body {
                padding: 20px;
            }

            .prediction-grid, .trend-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }

            .prediction-item, .trend-item {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }

            .label {
                font-size: 12px;
                color: #666;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .value {
                font-size: 16px;
                font-weight: 600;
                color: #333;
            }

            .value.high, .value.very.high, .value.yes, .value.positive {
                color: #10b981;
            }

            .value.medium {
                color: #f59e0b;
            }

            .value.low, .value.no, .value.negative {
                color: #ef4444;
            }

            .value.increasing {
                color: #10b981;
            }

            .value.decreasing {
                color: #ef4444;
            }

            .ml-section {
                margin: 30px 0;
                padding: 20px;
                background: #f8fafc;
                border-radius: 8px;
            }

            .ml-section h2 {
                color: #1f2937;
                margin-bottom: 20px;
                font-size: 24px;
            }

            .ml-button {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                transition: transform 0.2s;
            }

            .ml-button:hover {
                transform: translateY(-2px);
            }

            .ml-button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }

            .loading {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Global ML instance
const mlPredictions = new MLPredictions();

// Add styles when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    mlPredictions.addMLStyles();
});
