/**
 * Tax Strategy Simulator - UI Controller
 * Version 1.0.0
 *
 * Handles all user interface interactions and dynamic updates
 */

// ============================================================================
// GLOBAL STATE
// ============================================================================

let comparisonChart = null; // Store chart instance for updates

// ============================================================================
// DOM ELEMENTS
// ============================================================================

// Forms
const transactionForm = document.getElementById('transaction-form');
const analysisForm = document.getElementById('analysis-form');

// Portfolio elements
const portfolioTable = document.getElementById('portfolio-table');
const portfolioTbody = document.getElementById('portfolio-tbody');
const portfolioEmpty = document.getElementById('portfolio-empty');

// Buttons
const loadExampleBtn = document.getElementById('load-example');
const clearPortfolioBtn = document.getElementById('clear-portfolio');

// Results section
const resultsSection = document.getElementById('results-section');
const recommendationDiv = document.getElementById('recommendation');
const taxLotsDetails = document.getElementById('tax-lots-details');

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('App UI initialized');

    // Set default date to today
    setDefaultDates();

    // Load and display existing portfolio
    refreshPortfolioDisplay();

    // Attach event listeners
    transactionForm.addEventListener('submit', handleTransactionSubmit);
    analysisForm.addEventListener('submit', handleAnalysisSubmit);
    loadExampleBtn.addEventListener('click', loadExamplePortfolio);
    clearPortfolioBtn.addEventListener('click', handleClearPortfolio);

    console.log('Event listeners attached');
    console.log(`Portfolio loaded with ${portfolio.length} transactions`);
});

// ============================================================================
// TRANSACTION MANAGEMENT
// ============================================================================

/**
 * Handle transaction form submission
 */
function handleTransactionSubmit(e) {
    e.preventDefault();

    // Get form values
    const date = document.getElementById('txn-date').value;
    const type = document.getElementById('txn-type').value;
    const symbol = document.getElementById('txn-symbol').value.trim();
    const quantity = parseFloat(document.getElementById('txn-quantity').value);
    const price = parseFloat(document.getElementById('txn-price').value);

    // Validate inputs
    if (!date || !symbol || !quantity || !price) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    // Validate positive numbers
    if (quantity <= 0 || price <= 0) {
        showNotification('Quantity and price must be positive numbers', 'error');
        return;
    }

    // Validate date is not in future
    const txnDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    if (txnDate > today) {
        showNotification('Transaction date cannot be in the future', 'error');
        return;
    }

    // Add transaction using calculator.js function
    addTransaction(date, type, symbol, quantity, price);

    // Clear form
    transactionForm.reset();
    setDefaultDates();

    // Refresh display
    refreshPortfolioDisplay();

    // Show success notification
    showNotification(`Added ${type} transaction: ${quantity} ${symbol.toUpperCase()} @ $${price}`, 'success');
}

/**
 * Refresh the portfolio display table
 */
function refreshPortfolioDisplay() {
    // Check if portfolio is empty
    if (portfolio.length === 0) {
        portfolioTable.style.display = 'none';
        portfolioEmpty.style.display = 'block';
        return;
    }

    // Show table, hide empty state
    portfolioTable.style.display = 'table';
    portfolioEmpty.style.display = 'none';

    // Clear existing rows
    portfolioTbody.innerHTML = '';

    // Sort portfolio by date (newest first)
    const sortedPortfolio = [...portfolio].sort((a, b) => b.date - a.date);

    // Add rows for each transaction
    sortedPortfolio.forEach((txn) => {
        const row = document.createElement('tr');
        row.className = txn.type === 'buy' ? 'buy-row' : 'sell-row';

        const total = (txn.quantity * txn.price).toFixed(2);

        row.innerHTML = `
            <td>${formatDate(txn.date)}</td>
            <td><span class="badge badge-${txn.type}">${txn.type.toUpperCase()}</span></td>
            <td><strong>${txn.symbol}</strong></td>
            <td>${formatNumber(txn.quantity)}</td>
            <td>$${formatNumber(txn.price)}</td>
            <td>$${formatNumber(total)}</td>
            <td><button class="delete-btn danger-btn" data-index="${portfolio.indexOf(txn)}">Delete</button></td>
        `;

        portfolioTbody.appendChild(row);
    });

    // Attach delete handlers
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteTransaction);
    });
}

/**
 * Delete a transaction
 */
function handleDeleteTransaction(e) {
    const index = parseInt(e.target.dataset.index);

    if (confirm('Are you sure you want to delete this transaction?')) {
        portfolio.splice(index, 1);
        saveToStorage();
        refreshPortfolioDisplay();
        showNotification('Transaction deleted', 'success');
    }
}

/**
 * Load example portfolio with sample data
 */
function loadExamplePortfolio() {
    if (portfolio.length > 0) {
        if (!confirm('This will clear your existing portfolio. Continue?')) {
            return;
        }
    }

    // Clear existing portfolio
    clearPortfolio(true);

    // Add example transactions as specified
    addTransaction('2024-01-15', 'buy', 'BTC', 0.5, 45000);
    addTransaction('2024-06-20', 'buy', 'BTC', 0.3, 60000);
    addTransaction('2024-08-10', 'buy', 'BTC', 0.2, 52000);

    refreshPortfolioDisplay();
    showNotification('Example portfolio loaded! Try analyzing: sell 0.4 BTC at $55,000', 'success');
}

/**
 * Clear entire portfolio
 */
function handleClearPortfolio() {
    if (portfolio.length === 0) {
        showNotification('Portfolio is already empty', 'info');
        return;
    }

    if (confirm('Are you sure you want to clear all transactions? This cannot be undone.')) {
        clearPortfolio(true);
        refreshPortfolioDisplay();
        resultsSection.style.display = 'none';
        showNotification('Portfolio cleared', 'success');
    }
}

// ============================================================================
// TAX ANALYSIS
// ============================================================================

/**
 * Handle analysis form submission
 */
function handleAnalysisSubmit(e) {
    e.preventDefault();

    // Get form values
    const symbol = document.getElementById('sell-symbol').value.trim().toUpperCase();
    const quantity = parseFloat(document.getElementById('sell-quantity').value);
    const price = parseFloat(document.getElementById('sell-price').value);
    const dateStr = document.getElementById('sell-date').value;
    const shortTermRate = parseFloat(document.getElementById('short-term-rate').value);
    const longTermRate = parseFloat(document.getElementById('long-term-rate').value);

    // Validate inputs
    if (!symbol || !quantity || !price || !dateStr || !shortTermRate || !longTermRate) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    // Validate positive numbers
    if (quantity <= 0 || price <= 0) {
        showNotification('Quantity and price must be positive numbers', 'error');
        return;
    }

    // Validate tax rates (0-1)
    if (shortTermRate < 0 || shortTermRate > 1 || longTermRate < 0 || longTermRate > 1) {
        showNotification('Tax rates must be between 0 and 1 (e.g., 0.32 for 32%)', 'error');
        return;
    }

    // Validate date is not in future
    const sellDate = new Date(dateStr);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    if (sellDate > today) {
        showNotification('Sale date cannot be in the future', 'error');
        return;
    }

    // Validate symbol exists in portfolio
    const symbolExists = portfolio.some(txn => txn.symbol === symbol && txn.type === 'buy');
    if (!symbolExists) {
        showNotification(`No ${symbol} purchases found in portfolio`, 'error');
        return;
    }

    // Calculate total owned
    const buys = portfolio.filter(t => t.type === 'buy' && t.symbol === symbol && t.date <= sellDate);
    const totalOwned = buys.reduce((sum, t) => sum + t.quantity, 0);

    // Validate not selling more than owned
    if (quantity > totalOwned) {
        showNotification(`Cannot sell ${quantity} ${symbol}. You only own ${totalOwned.toFixed(8)}`, 'error');
        return;
    }

    // Calculate using all methods
    try {
        const comparison = compareAllMethods(symbol, quantity, price, sellDate, {
            shortTerm: shortTermRate,
            longTerm: longTermRate
        });

        // Display results
        displayResults(comparison, symbol, quantity, price);

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Analysis error:', error);
        showNotification('Error calculating tax scenarios. Check console for details.', 'error');
    }
}

/**
 * Display analysis results
 */
function displayResults(comparison, symbol, quantity, price) {
    // Show results section
    resultsSection.style.display = 'block';

    // Display each method's results
    displayMethodResults('fifo', comparison.fifo);
    displayMethodResults('lifo', comparison.lifo);
    displayMethodResults('hifo', comparison.hifo);

    // Highlight best method (lowest tax)
    highlightBestMethod(comparison.bestMethod);

    // Display recommendation
    displayRecommendation(comparison);

    // Display detailed tax lots
    displayTaxLots(comparison);

    // Create comparison chart
    createComparisonChart(comparison);
}

/**
 * Display results for a specific method
 */
function displayMethodResults(method, results) {
    const card = document.getElementById(`${method}-card`);
    const content = card.querySelector('.result-content');

    content.innerHTML = `
        <div class="result-row">
            <span class="label">Cost Basis:</span>
            <span class="value">$${formatNumber(results.costBasis)}</span>
        </div>
        <div class="result-row">
            <span class="label">Proceeds:</span>
            <span class="value">$${formatNumber(results.proceeds)}</span>
        </div>
        <div class="result-row highlight">
            <span class="label">Total Gain/Loss:</span>
            <span class="value ${results.gainLoss >= 0 ? 'positive' : 'negative'}">
                ${results.gainLoss >= 0 ? '+' : ''}$${formatNumber(results.gainLoss)}
            </span>
        </div>
        <div class="result-row">
            <span class="label">Short-term Gain:</span>
            <span class="value">$${formatNumber(results.shortTermGain)}</span>
        </div>
        <div class="result-row">
            <span class="label">Long-term Gain:</span>
            <span class="value">$${formatNumber(results.longTermGain)}</span>
        </div>
        <div class="result-row tax-row">
            <span class="label">Tax Owed:</span>
            <span class="value tax-amount">$${formatNumber(results.tax)}</span>
        </div>
        <div class="result-row highlight">
            <span class="label">After-Tax Proceeds:</span>
            <span class="value positive">$${formatNumber(results.afterTaxProceeds)}</span>
        </div>
        <div class="tax-lots-count">
            ${results.taxLots.length} tax lot${results.taxLots.length !== 1 ? 's' : ''}
        </div>
    `;
}

/**
 * Highlight the best method card (lowest tax)
 */
function highlightBestMethod(bestMethod) {
    // Remove previous highlights
    document.querySelectorAll('.result-card').forEach(card => {
        card.classList.remove('best-method');
        card.classList.remove('best');
    });

    // Add highlight to best method
    const bestCard = document.getElementById(`${bestMethod.toLowerCase()}-card`);
    if (bestCard) {
        bestCard.classList.add('best-method');
        bestCard.classList.add('best'); // Also add 'best' class for CSS compatibility
    }
}

/**
 * Display recommendation summary
 */
function displayRecommendation(comparison) {
    const savingsPercent = comparison.summary.savingsPercentage;
    const savings = comparison.taxSavings;

    recommendationDiv.innerHTML = `
        <div class="recommendation-box">
            <h3>💡 Recommendation</h3>
            <p class="best-method-text">
                <strong>${comparison.bestMethod}</strong> is the most tax-efficient method for this sale.
            </p>
            <div class="savings-highlight">
                <div class="savings-amount">Save $${formatNumber(savings)}</div>
                <div class="savings-percent">${savingsPercent}% less tax vs worst method</div>
            </div>
            <div class="tax-summary">
                <div class="tax-summary-item">
                    <span class="label">Best case (${comparison.bestMethod}):</span>
                    <span class="value">$${formatNumber(comparison.summary.lowestTax)}</span>
                </div>
                <div class="tax-summary-item">
                    <span class="label">Worst case:</span>
                    <span class="value">$${formatNumber(comparison.summary.highestTax)}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Display detailed tax lots breakdown
 */
function displayTaxLots(comparison) {
    const method = comparison.bestMethod.toLowerCase();
    const results = comparison[method];

    let html = `
        <div class="tax-lots-section">
            <h3>Tax Lots Detail (${comparison.bestMethod})</h3>
            <div class="tax-lots-grid">
    `;

    results.taxLots.forEach((lot, index) => {
        html += `
            <div class="tax-lot-card">
                <div class="lot-header">Lot ${index + 1}</div>
                <div class="lot-detail">
                    <span class="label">Buy Date:</span>
                    <span class="value">${formatDate(lot.buyDate)}</span>
                </div>
                <div class="lot-detail">
                    <span class="label">Buy Price:</span>
                    <span class="value">$${formatNumber(lot.buyPrice)}</span>
                </div>
                <div class="lot-detail">
                    <span class="label">Quantity:</span>
                    <span class="value">${formatNumber(lot.quantity)}</span>
                </div>
                <div class="lot-detail">
                    <span class="label">Days Held:</span>
                    <span class="value">${lot.daysHeld} days</span>
                </div>
                <div class="lot-detail">
                    <span class="label">Gain Type:</span>
                    <span class="badge badge-${lot.gainType}">${lot.gainType}</span>
                </div>
                <div class="lot-detail highlight">
                    <span class="label">Gain/Loss:</span>
                    <span class="value ${lot.gainLoss >= 0 ? 'positive' : 'negative'}">
                        ${lot.gainLoss >= 0 ? '+' : ''}$${formatNumber(lot.gainLoss)}
                    </span>
                </div>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    taxLotsDetails.innerHTML = html;
}

/**
 * Create comparison chart using Chart.js
 * Shows Cost Basis, Proceeds, and Tax Owed for each method
 */
function createComparisonChart(comparison) {
    const ctx = document.getElementById('comparison-chart');

    // Destroy existing chart if it exists
    if (comparisonChart) {
        comparisonChart.destroy();
    }

    // Prepare data
    const methods = ['FIFO', 'LIFO', 'HIFO'];
    const costBasisData = [comparison.fifo.costBasis, comparison.lifo.costBasis, comparison.hifo.costBasis];
    const proceedsData = [comparison.fifo.proceeds, comparison.lifo.proceeds, comparison.hifo.proceeds];
    const taxData = [comparison.fifo.tax, comparison.lifo.tax, comparison.hifo.tax];

    // Create chart
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: methods,
            datasets: [
                {
                    label: 'Cost Basis',
                    data: costBasisData,
                    backgroundColor: 'rgba(54, 162, 235, 0.8)', // Blue
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Proceeds',
                    data: proceedsData,
                    backgroundColor: 'rgba(40, 167, 69, 0.8)', // Green
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Tax Owed',
                    data: taxData,
                    backgroundColor: 'rgba(220, 53, 69, 0.8)', // Red
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Tax Method Comparison',
                    font: {
                        size: 18,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + formatNumber(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format date for display
 */
function formatDate(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format number with commas and decimals
 */
function formatNumber(num) {
    if (typeof num !== 'number') {
        num = parseFloat(num);
    }
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8
    });
}

/**
 * Set default dates in forms
 */
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];

    // Transaction form
    const txnDate = document.getElementById('txn-date');
    if (txnDate && !txnDate.value) {
        txnDate.value = today;
    }

    // Analysis form
    const sellDate = document.getElementById('sell-date');
    if (sellDate && !sellDate.value) {
        sellDate.value = today;
    }
}

/**
 * Show notification message
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add to page
    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Remove after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 400);
    }, 4000);
}

// ============================================================================
// EXPORT FOR TESTING
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatDate,
        formatNumber,
        refreshPortfolioDisplay,
        displayResults
    };
}
