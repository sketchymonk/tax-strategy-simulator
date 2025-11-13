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
let currentlyEditingId = null; // Track transaction being edited
let currentSort = { column: 'date', direction: 'desc' }; // Sort state
let currentFilters = {
    search: '',
    type: 'all',
    holdingPeriod: 'all'
}; // Filter state

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
const exportCsvBtn = document.getElementById('export-csv');
const importCsvBtn = document.getElementById('import-csv-btn');
const importCsvInput = document.getElementById('import-csv-input');

// Results section
const resultsSection = document.getElementById('results-section');
const recommendationDiv = document.getElementById('recommendation');
const taxLotsDetails = document.getElementById('tax-lots-details');

// New UI elements (will be created)
let dashboardPanel = null;
let lastSavedIndicator = null;
let searchInput = null;
let typeFilter = null;
let holdingPeriodFilter = null;
let resetFiltersBtn = null;
let cancelEditBtn = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('App UI initialized');

    // Set default date to today
    setDefaultDates();

    // Load saved tax rates
    loadSavedTaxRates();

    // Create dynamic UI elements
    createDashboardPanel();
    createLastSavedIndicator();
    createSearchAndFilterUI();
    createCancelEditButton();
    initializeAnalytics();

    // Load and display existing portfolio
    refreshPortfolioDisplay();
    updateDashboard();
    updateAnalytics();

    // Attach event listeners
    transactionForm.addEventListener('submit', handleTransactionSubmit);
    analysisForm.addEventListener('submit', handleAnalysisSubmit);
    loadExampleBtn.addEventListener('click', loadExamplePortfolio);
    clearPortfolioBtn.addEventListener('click', handleClearPortfolio);
    exportCsvBtn.addEventListener('click', exportToCSV);
    importCsvBtn.addEventListener('click', () => importCsvInput.click());
    importCsvInput.addEventListener('change', handleImportCSV);

    // Tax rate auto-save
    document.getElementById('short-term-rate').addEventListener('change', handleTaxRateChange);
    document.getElementById('long-term-rate').addEventListener('change', handleTaxRateChange);

    console.log('Event listeners attached');
    console.log(`Portfolio loaded with ${portfolio.length} transactions`);
});

// ============================================================================
// TRANSACTION MANAGEMENT
// ============================================================================

/**
 * Handle transaction form submission (both add and update)
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

    // Check if we're editing or adding
    if (currentlyEditingId) {
        // Update existing transaction
        addTransaction(date, type, symbol, quantity, price, currentlyEditingId);
        showNotification(`Updated ${type} transaction: ${quantity} ${symbol.toUpperCase()} @ $${price}`, 'success');
        cancelEdit();
    } else {
        // Add new transaction
        addTransaction(date, type, symbol, quantity, price);
        showNotification(`Added ${type} transaction: ${quantity} ${symbol.toUpperCase()} @ $${price}`, 'success');
    }

    // Clear form
    transactionForm.reset();
    setDefaultDates();

    // Refresh display
    refreshPortfolioDisplay();
    updateDashboard();
    updateLastSavedIndicator();
    updateAnalytics();
}

/**
 * Refresh the portfolio display table with filtering and sorting
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

    // Apply filters
    let filteredPortfolio = [...portfolio];

    // Search filter
    if (currentFilters.search) {
        const searchTerm = currentFilters.search.toLowerCase();
        filteredPortfolio = filteredPortfolio.filter(txn =>
            txn.symbol.toLowerCase().includes(searchTerm)
        );
    }

    // Type filter
    if (currentFilters.type !== 'all') {
        filteredPortfolio = filteredPortfolio.filter(txn => txn.type === currentFilters.type);
    }

    // Holding period filter
    if (currentFilters.holdingPeriod !== 'all') {
        const today = new Date();
        const oneYearAgo = new Date(today);
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);

        filteredPortfolio = filteredPortfolio.filter(txn => {
            if (txn.type !== 'buy') return false; // Only applies to buys
            const isLongTerm = txn.date <= oneYearAgo;
            return currentFilters.holdingPeriod === 'long-term' ? isLongTerm : !isLongTerm;
        });
    }

    // Apply sorting
    filteredPortfolio.sort((a, b) => {
        let aVal, bVal;

        switch (currentSort.column) {
            case 'date':
                aVal = a.date;
                bVal = b.date;
                break;
            case 'symbol':
                aVal = a.symbol;
                bVal = b.symbol;
                break;
            case 'type':
                aVal = a.type;
                bVal = b.type;
                break;
            case 'quantity':
                aVal = a.quantity;
                bVal = b.quantity;
                break;
            case 'price':
                aVal = a.price;
                bVal = b.price;
                break;
            default:
                aVal = a.date;
                bVal = b.date;
        }

        if (aVal < bVal) return currentSort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Show "no results" if filtered portfolio is empty
    if (filteredPortfolio.length === 0) {
        portfolioTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #6c757d;">No transactions match your filters</td></tr>';
        return;
    }

    // Get wash sale flags
    const washSaleFlags = getWashSaleFlags();

    // Add rows for each transaction
    filteredPortfolio.forEach((txn) => {
        const row = document.createElement('tr');
        row.className = txn.type === 'buy' ? 'buy-row' : 'sell-row';

        const total = (txn.quantity * txn.price).toFixed(2);

        // Check for wash sale
        const washSaleInfo = washSaleFlags.get(txn.id);
        const washSaleBadge = washSaleInfo
            ? `<span class="wash-sale-badge" title="Wash Sale: $${formatNumber(washSaleInfo.disallowedLoss)} loss disallowed">⚠️ Wash Sale</span>`
            : '';

        // Add wash sale class to row if applicable
        if (washSaleInfo) {
            row.classList.add('wash-sale-row');
        }

        row.innerHTML = `
            <td>${formatDate(txn.date)} ${washSaleBadge}</td>
            <td><span class="badge badge-${txn.type}">${txn.type.toUpperCase()}</span></td>
            <td><strong>${txn.symbol}</strong></td>
            <td>${formatNumber(txn.quantity)}</td>
            <td>$${formatNumber(txn.price)}</td>
            <td>$${formatNumber(total)}</td>
            <td>
                <button class="edit-btn secondary-btn" data-id="${txn.id}" style="margin-right: 5px; padding: 8px 12px; font-size: 14px;">Edit</button>
                <button class="delete-btn danger-btn" data-id="${txn.id}" style="padding: 8px 12px; font-size: 14px;">Delete</button>
            </td>
        `;

        portfolioTbody.appendChild(row);
    });

    // Attach edit and delete handlers
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', handleEditTransaction);
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteTransaction);
    });

    // Update wash sale panel
    updateWashSalePanel();
}

/**
 * Edit a transaction - populate form with transaction data
 */
function handleEditTransaction(e) {
    const id = e.target.dataset.id;
    const txn = getTransactionById(id);

    if (!txn) {
        showNotification('Transaction not found', 'error');
        return;
    }

    // Populate form fields
    document.getElementById('txn-date').value = txn.date instanceof Date
        ? txn.date.toISOString().split('T')[0]
        : new Date(txn.date).toISOString().split('T')[0];
    document.getElementById('txn-type').value = txn.type;
    document.getElementById('txn-symbol').value = txn.symbol;
    document.getElementById('txn-quantity').value = txn.quantity;
    document.getElementById('txn-price').value = txn.price;

    // Update state
    currentlyEditingId = id;

    // Change submit button text
    const submitBtn = transactionForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Update Transaction';
    submitBtn.style.background = '#17a2b8';

    // Show cancel button
    if (cancelEditBtn) {
        cancelEditBtn.style.display = 'inline-block';
    }

    // Scroll to form
    transactionForm.scrollIntoView({ behavior: 'smooth' });

    showNotification('Editing transaction - modify fields and click Update', 'info');
}

/**
 * Cancel editing mode
 */
function cancelEdit() {
    currentlyEditingId = null;

    // Reset submit button
    const submitBtn = transactionForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Add Transaction';
    submitBtn.style.background = '';

    // Hide cancel button
    if (cancelEditBtn) {
        cancelEditBtn.style.display = 'none';
    }

    // Clear form
    transactionForm.reset();
    setDefaultDates();
}

/**
 * Delete a transaction by ID
 */
function handleDeleteTransaction(e) {
    const id = e.target.dataset.id;

    if (confirm('Are you sure you want to delete this transaction?')) {
        const success = deleteTransaction(id);

        if (success) {
            refreshPortfolioDisplay();
            updateDashboard();
            updateLastSavedIndicator();
            updateAnalytics();
            showNotification('Transaction deleted', 'success');

            // If we were editing this transaction, cancel edit mode
            if (currentlyEditingId === id) {
                cancelEdit();
            }
        } else {
            showNotification('Failed to delete transaction', 'error');
        }
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
    updateDashboard();
    updateLastSavedIndicator();
    updateAnalytics();
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
        updateDashboard();
        updateLastSavedIndicator();
        updateAnalytics();
        resultsSection.style.display = 'none';
        showNotification('Portfolio cleared', 'success');
    }
}

// ============================================================================
// CSV IMPORT/EXPORT
// ============================================================================

/**
 * Export portfolio to CSV file
 */
function exportToCSV() {
    if (portfolio.length === 0) {
        showNotification('Portfolio is empty - nothing to export', 'info');
        return;
    }

    // CSV header
    const headers = ['Date', 'Type', 'Symbol', 'Quantity', 'Price', 'Total Value'];

    // Convert transactions to CSV rows
    const rows = portfolio.map(txn => {
        const date = txn.date instanceof Date
            ? txn.date.toISOString().split('T')[0]
            : new Date(txn.date).toISOString().split('T')[0];
        const total = (txn.quantity * txn.price).toFixed(2);

        return [
            date,
            txn.type.toUpperCase(),
            txn.symbol,
            txn.quantity,
            txn.price,
            total
        ].map(field => `"${field}"`).join(','); // Quote all fields
    });

    // Combine header and rows
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n'); // UTF-8 BOM for Excel

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const today = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `tax-portfolio-${today}.csv`;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification(`Exported ${portfolio.length} transactions to CSV`, 'success');
}

/**
 * Handle CSV file import
 */
function handleImportCSV(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(event) {
        const csvContent = event.target.result;
        parseAndImportCSV(csvContent);
    };

    reader.onerror = function() {
        showNotification('Error reading file', 'error');
    };

    reader.readAsText(file);

    // Reset file input so same file can be imported again
    e.target.value = '';
}

/**
 * Parse CSV content and import transactions
 */
function parseAndImportCSV(csvContent) {
    try {
        // Remove UTF-8 BOM if present
        if (csvContent.charCodeAt(0) === 0xFEFF) {
            csvContent = csvContent.slice(1);
        }

        // Split into lines
        const lines = csvContent.split(/\r?\n/).filter(line => line.trim());

        if (lines.length < 2) {
            showNotification('CSV file is empty or invalid', 'error');
            return;
        }

        // Parse header
        const header = lines[0];
        const hasHeader = header.toLowerCase().includes('date') || header.toLowerCase().includes('type');

        const dataLines = hasHeader ? lines.slice(1) : lines;

        const validTransactions = [];
        const errors = [];

        // Parse each line
        dataLines.forEach((line, index) => {
            const lineNum = index + (hasHeader ? 2 : 1);

            try {
                // Simple CSV parser that handles quoted fields
                const fields = parseCSVLine(line);

                if (fields.length < 5) {
                    errors.push(`Line ${lineNum}: Not enough fields (need Date, Type, Symbol, Quantity, Price)`);
                    return;
                }

                const [dateStr, type, symbol, quantityStr, priceStr] = fields;

                // Validate date
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) {
                    errors.push(`Line ${lineNum}: Invalid date "${dateStr}"`);
                    return;
                }

                // Validate type
                const normalizedType = type.toLowerCase().trim();
                if (normalizedType !== 'buy' && normalizedType !== 'sell') {
                    errors.push(`Line ${lineNum}: Type must be "buy" or "sell", got "${type}"`);
                    return;
                }

                // Validate symbol
                if (!symbol || symbol.trim() === '') {
                    errors.push(`Line ${lineNum}: Symbol cannot be empty`);
                    return;
                }

                // Validate quantity
                const quantity = parseFloat(quantityStr);
                if (isNaN(quantity) || quantity <= 0) {
                    errors.push(`Line ${lineNum}: Invalid quantity "${quantityStr}" (must be positive number)`);
                    return;
                }

                // Validate price
                const price = parseFloat(priceStr);
                if (isNaN(price) || price <= 0) {
                    errors.push(`Line ${lineNum}: Invalid price "${priceStr}" (must be positive number)`);
                    return;
                }

                validTransactions.push({
                    date: date,
                    type: normalizedType,
                    symbol: symbol.trim().toUpperCase(),
                    quantity: quantity,
                    price: price
                });

            } catch (err) {
                errors.push(`Line ${lineNum}: ${err.message}`);
            }
        });

        // Show import preview dialog
        showImportPreview(validTransactions, errors);

    } catch (err) {
        showNotification(`Error parsing CSV: ${err.message}`, 'error');
    }
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line) {
    const fields = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            // Toggle quote state
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            // Field separator (outside quotes)
            fields.push(currentField.trim());
            currentField = '';
        } else {
            currentField += char;
        }
    }

    // Add last field
    fields.push(currentField.trim());

    return fields;
}

/**
 * Show import preview dialog
 */
function showImportPreview(validTransactions, errors) {
    const hasErrors = errors.length > 0;
    const errorSummary = hasErrors
        ? `<div class="import-errors"><h4>⚠️ ${errors.length} Error${errors.length !== 1 ? 's' : ''} Found:</h4><ul>${errors.slice(0, 10).map(err => `<li>${err}</li>`).join('')}${errors.length > 10 ? `<li>...and ${errors.length - 10} more</li>` : ''}</ul></div>`
        : '';

    const message = `
        <div class="import-preview">
            <h3>Import Preview</h3>
            <p><strong>${validTransactions.length}</strong> valid transaction${validTransactions.length !== 1 ? 's' : ''} found</p>
            ${errorSummary}
            <div class="import-options">
                <p>How would you like to import these transactions?</p>
                <button id="import-append" class="secondary-btn">📎 Append to Existing</button>
                <button id="import-replace" class="danger-btn">🔄 Replace Portfolio</button>
                <button id="import-cancel" class="secondary-btn">Cancel</button>
            </div>
        </div>
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'import-modal';
    modal.innerHTML = `
        <div class="import-modal-content">
            ${message}
        </div>
    `;

    document.body.appendChild(modal);

    // Attach event listeners
    document.getElementById('import-append').addEventListener('click', () => {
        importTransactions(validTransactions, false);
        document.body.removeChild(modal);
    });

    document.getElementById('import-replace').addEventListener('click', () => {
        if (confirm('This will delete all existing transactions. Are you sure?')) {
            importTransactions(validTransactions, true);
            document.body.removeChild(modal);
        }
    });

    document.getElementById('import-cancel').addEventListener('click', () => {
        document.body.removeChild(modal);
        showNotification('Import cancelled', 'info');
    });
}

/**
 * Import transactions into portfolio
 */
function importTransactions(transactions, replaceExisting) {
    if (replaceExisting) {
        clearPortfolio(true);
    }

    let imported = 0;
    let duplicates = 0;

    transactions.forEach(txn => {
        // Check for duplicate (same date, symbol, quantity, price, type)
        const isDuplicate = portfolio.some(existing =>
            existing.date.getTime() === txn.date.getTime() &&
            existing.symbol === txn.symbol &&
            existing.quantity === txn.quantity &&
            existing.price === txn.price &&
            existing.type === txn.type
        );

        if (!isDuplicate) {
            addTransaction(txn.date, txn.type, txn.symbol, txn.quantity, txn.price);
            imported++;
        } else {
            duplicates++;
        }
    });

    refreshPortfolioDisplay();
    updateDashboard();
    updateLastSavedIndicator();
    updateAnalytics();

    const msg = `Imported ${imported} transaction${imported !== 1 ? 's' : ''}${duplicates > 0 ? ` (${duplicates} duplicate${duplicates !== 1 ? 's' : ''} skipped)` : ''}`;
    showNotification(msg, 'success');
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
// UI CREATION AND MANAGEMENT
// ============================================================================

/**
 * Create dashboard panel showing portfolio statistics
 */
function createDashboardPanel() {
    const portfolioSection = document.getElementById('portfolio-section');

    dashboardPanel = document.createElement('div');
    dashboardPanel.id = 'dashboard-panel';
    dashboardPanel.className = 'dashboard-panel';
    dashboardPanel.innerHTML = `
        <h3>Portfolio Summary</h3>
        <div class="dashboard-grid">
            <div class="dashboard-card">
                <div class="dashboard-label">Total Transactions</div>
                <div class="dashboard-value" id="dash-total">0</div>
            </div>
            <div class="dashboard-card">
                <div class="dashboard-label">Total Invested</div>
                <div class="dashboard-value" id="dash-invested">$0.00</div>
            </div>
            <div class="dashboard-card">
                <div class="dashboard-label">Unique Assets</div>
                <div class="dashboard-value" id="dash-assets">0</div>
            </div>
            <div class="dashboard-card">
                <div class="dashboard-label">Long-term Holdings</div>
                <div class="dashboard-value" id="dash-longterm">0</div>
            </div>
            <div class="dashboard-card">
                <div class="dashboard-label">Short-term Holdings</div>
                <div class="dashboard-value" id="dash-shortterm">0</div>
            </div>
            <div class="dashboard-card">
                <div class="dashboard-label">Avg Cost Basis</div>
                <div class="dashboard-value" id="dash-avgcost">$0.00</div>
            </div>
        </div>
    `;

    portfolioSection.insertBefore(dashboardPanel, portfolioSection.querySelector('p.section-description').nextSibling);
}

/**
 * Create and update wash sale details panel
 */
function updateWashSalePanel() {
    const washSales = detectAllWashSales();
    let washSalePanel = document.getElementById('wash-sale-panel');

    // If no wash sales, remove panel if it exists
    if (washSales.length === 0) {
        if (washSalePanel) {
            washSalePanel.remove();
        }
        return;
    }

    // Create panel if it doesn't exist
    if (!washSalePanel) {
        washSalePanel = document.createElement('div');
        washSalePanel.id = 'wash-sale-panel';
        washSalePanel.className = 'wash-sale-details-panel';

        const portfolioSection = document.getElementById('portfolio-section');
        const filterContainer = document.querySelector('.filter-container');
        portfolioSection.insertBefore(washSalePanel, filterContainer);
    }

    // Build wash sale details HTML
    let html = `
        <h3>⚠️ Wash Sale Alert</h3>
        <p class="wash-sale-warning">
            <strong>${washSales.length}</strong> potential wash sale${washSales.length !== 1 ? 's' : ''} detected in your portfolio.
            These sales have losses that may be disallowed by the IRS.
            <a href="https://www.irs.gov/publications/p550#en_US_2023_publink1000107223" target="_blank" rel="noopener">Learn more about wash sales</a>
        </p>
    `;

    washSales.forEach((ws, index) => {
        html += `
            <div class="wash-sale-item">
                <h4>Wash Sale #${index + 1}: ${ws.symbol}</h4>
                <div class="wash-sale-summary">
                    <div class="wash-sale-detail">
                        <span class="label">Sale Date:</span>
                        <span class="value">${formatDate(ws.sellDate)}</span>
                    </div>
                    <div class="wash-sale-detail">
                        <span class="label">Quantity Sold:</span>
                        <span class="value">${formatNumber(ws.quantity)}</span>
                    </div>
                    <div class="wash-sale-detail">
                        <span class="label">Sale Price:</span>
                        <span class="value">$${formatNumber(ws.salePrice)}</span>
                    </div>
                    <div class="wash-sale-detail">
                        <span class="label">Total Loss:</span>
                        <span class="value negative">$${formatNumber(ws.totalLoss)}</span>
                    </div>
                    <div class="wash-sale-detail">
                        <span class="label">Disallowed Loss:</span>
                        <span class="value" style="color: #e65100; font-weight: bold;">$${formatNumber(ws.disallowedLoss)}</span>
                    </div>
                    <div class="wash-sale-detail">
                        <span class="label">Allowed Loss:</span>
                        <span class="value">$${formatNumber(ws.allowedLoss)}</span>
                    </div>
                </div>
                <div class="replacement-buys">
                    <strong>Replacement Purchases (within 30 days):</strong>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Quantity</th>
                                <th>Price</th>
                                <th>Days from Sale</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ws.replacementBuys.map(rb => `
                                <tr>
                                    <td>${formatDate(rb.date)}</td>
                                    <td>${formatNumber(rb.quantity)}</td>
                                    <td>$${formatNumber(rb.price)}</td>
                                    <td>${rb.daysFromSale} days ${rb.date > ws.sellDate ? 'after' : 'before'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ${ws.adjustedCostBasis > 0 ? `
                    <div class="wash-sale-warning" style="margin-top: 10px;">
                        <strong>Cost Basis Adjustment:</strong> The disallowed loss of $${formatNumber(ws.disallowedLoss)}
                        must be added to the cost basis of your replacement shares
                        ($${formatNumber(ws.adjustedCostBasis)} per share).
                    </div>
                ` : ''}
            </div>
        `;
    });

    washSalePanel.innerHTML = html;
}

/**
 * Create last saved indicator
 */
function createLastSavedIndicator() {
    const portfolioSection = document.getElementById('portfolio-section');

    lastSavedIndicator = document.createElement('div');
    lastSavedIndicator.id = 'last-saved-indicator';
    lastSavedIndicator.className = 'last-saved-indicator';
    lastSavedIndicator.innerHTML = 'Last saved: Never';

    portfolioSection.querySelector('h2').insertAdjacentElement('afterend', lastSavedIndicator);
}

/**
 * Create search and filter UI above portfolio table
 */
function createSearchAndFilterUI() {
    const portfolioSection = document.getElementById('portfolio-section');

    const filterContainer = document.createElement('div');
    filterContainer.className = 'filter-container';
    filterContainer.innerHTML = `
        <div class="filter-row">
            <div class="filter-group">
                <label for="search-input">Search Symbol</label>
                <input type="text" id="search-input" placeholder="Search by symbol..." />
            </div>
            <div class="filter-group">
                <label for="type-filter">Transaction Type</label>
                <select id="type-filter">
                    <option value="all">All Types</option>
                    <option value="buy">Buy Only</option>
                    <option value="sell">Sell Only</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="holding-filter">Holding Period</label>
                <select id="holding-filter">
                    <option value="all">All Holdings</option>
                    <option value="long-term">Long-term (>365 days)</option>
                    <option value="short-term">Short-term (≤365 days)</option>
                </select>
            </div>
            <div class="filter-group">
                <button id="reset-filters-btn" class="secondary-btn">Reset Filters</button>
            </div>
        </div>
    `;

    portfolioSection.insertBefore(filterContainer, document.getElementById('portfolio-empty'));

    // Get references
    searchInput = document.getElementById('search-input');
    typeFilter = document.getElementById('type-filter');
    holdingPeriodFilter = document.getElementById('holding-filter');
    resetFiltersBtn = document.getElementById('reset-filters-btn');

    // Attach event listeners
    searchInput.addEventListener('input', handleSearch);
    typeFilter.addEventListener('change', handleFilterChange);
    holdingPeriodFilter.addEventListener('change', handleFilterChange);
    resetFiltersBtn.addEventListener('click', resetFilters);

    // Make table headers sortable
    const headers = portfolioTable.querySelectorAll('th');
    headers.forEach((header, index) => {
        const columns = ['date', 'type', 'symbol', 'quantity', 'price', 'total', 'action'];
        const column = columns[index];

        if (column !== 'action' && column !== 'total') {
            header.style.cursor = 'pointer';
            header.style.userSelect = 'none';
            header.addEventListener('click', () => handleSort(column));
            header.title = `Click to sort by ${column}`;
        }
    });
}

/**
 * Create cancel edit button in transaction form
 */
function createCancelEditButton() {
    const submitBtn = transactionForm.querySelector('button[type="submit"]');

    cancelEditBtn = document.createElement('button');
    cancelEditBtn.type = 'button';
    cancelEditBtn.textContent = 'Cancel Edit';
    cancelEditBtn.className = 'secondary-btn';
    cancelEditBtn.style.display = 'none';
    cancelEditBtn.addEventListener('click', cancelEdit);

    submitBtn.insertAdjacentElement('afterend', cancelEditBtn);
}

/**
 * Update dashboard with current portfolio stats
 */
function updateDashboard() {
    if (!dashboardPanel) return;

    const stats = getPortfolioDashboard();

    document.getElementById('dash-total').textContent = stats.totalTransactions;
    document.getElementById('dash-invested').textContent = '$' + formatNumber(stats.totalInvested);
    document.getElementById('dash-assets').textContent = stats.uniqueAssets;
    document.getElementById('dash-longterm').textContent = stats.longTermHoldings;
    document.getElementById('dash-shortterm').textContent = stats.shortTermHoldings;
    document.getElementById('dash-avgcost').textContent = '$' + formatNumber(stats.avgCostBasis);
}

/**
 * Update last saved timestamp indicator
 */
function updateLastSavedIndicator() {
    if (!lastSavedIndicator) return;

    const lastSaved = getLastSavedTime();

    if (lastSaved) {
        const date = new Date(lastSaved);
        const timeAgo = getTimeAgo(date);
        lastSavedIndicator.innerHTML = `💾 Last saved: ${timeAgo}`;
        lastSavedIndicator.style.color = '#28a745';
    } else {
        lastSavedIndicator.innerHTML = '💾 Last saved: Never';
        lastSavedIndicator.style.color = '#6c757d';
    }
}

/**
 * Load saved tax rates from localStorage
 */
function loadSavedTaxRates() {
    const rates = loadTaxRates();

    if (rates) {
        document.getElementById('short-term-rate').value = rates.shortTerm;
        document.getElementById('long-term-rate').value = rates.longTerm;
        console.log('Loaded saved tax rates:', rates);
    }
}

/**
 * Handle tax rate changes - auto-save
 */
function handleTaxRateChange() {
    const shortTerm = parseFloat(document.getElementById('short-term-rate').value);
    const longTerm = parseFloat(document.getElementById('long-term-rate').value);

    if (!isNaN(shortTerm) && !isNaN(longTerm)) {
        saveTaxRates(shortTerm, longTerm);
        showNotification('Tax rates saved', 'success');
    }
}

/**
 * Handle sorting
 */
function handleSort(column) {
    if (currentSort.column === column) {
        // Toggle direction
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // New column, default to ascending
        currentSort.column = column;
        currentSort.direction = 'asc';
    }

    refreshPortfolioDisplay();

    // Update visual indicators
    const headers = portfolioTable.querySelectorAll('th');
    headers.forEach(header => {
        header.textContent = header.textContent.replace(' ▲', '').replace(' ▼', '');
    });

    const columns = ['date', 'type', 'symbol', 'quantity', 'price', 'total', 'action'];
    const headerIndex = columns.indexOf(column);
    if (headerIndex !== -1) {
        const header = headers[headerIndex];
        header.textContent += currentSort.direction === 'asc' ? ' ▲' : ' ▼';
    }
}

/**
 * Handle search input
 */
function handleSearch(e) {
    currentFilters.search = e.target.value.trim();
    refreshPortfolioDisplay();
}

/**
 * Handle filter changes
 */
function handleFilterChange() {
    currentFilters.type = typeFilter.value;
    currentFilters.holdingPeriod = holdingPeriodFilter.value;
    refreshPortfolioDisplay();
}

/**
 * Reset all filters
 */
function resetFilters() {
    currentFilters = {
        search: '',
        type: 'all',
        holdingPeriod: 'all'
    };

    searchInput.value = '';
    typeFilter.value = 'all';
    holdingPeriodFilter.value = 'all';

    refreshPortfolioDisplay();
    showNotification('Filters reset', 'info');
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
 * Get time ago string (e.g., "2 minutes ago")
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'Just now';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;

    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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
// PORTFOLIO ANALYTICS & VISUALIZATIONS
// ============================================================================

let distributionChart = null;
let timelineChart = null;

/**
 * Initialize analytics section with event listeners
 */
function initializeAnalytics() {
    // Chart tab switching
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const chartType = this.dataset.chart;

            // Update active tab
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // Update active panel
            document.querySelectorAll('.chart-panel').forEach(p => p.classList.remove('active'));
            document.getElementById(`${chartType}-chart-container`).classList.add('active');
            document.getElementById(`${chartType}-dashboard-container`)?.classList.add('active');

            // Generate chart if needed
            if (chartType === 'distribution') {
                createDistributionChart();
            } else if (chartType === 'timeline') {
                createTimelineChart();
            } else if (chartType === 'aging') {
                createAgingDashboard();
            }
        });
    });
}

/**
 * Update analytics section visibility and content
 */
function updateAnalytics() {
    const analyticsSection = document.getElementById('analytics-section');

    if (portfolio.length === 0) {
        analyticsSection.style.display = 'none';
        return;
    }

    // Show analytics if there are transactions
    const buys = portfolio.filter(t => t.type === 'buy');
    if (buys.length > 0) {
        analyticsSection.style.display = 'block';

        // Generate the active chart
        const activeChart = document.querySelector('.chart-tab.active')?.dataset.chart || 'distribution';
        if (activeChart === 'distribution') {
            createDistributionChart();
        } else if (activeChart === 'timeline') {
            createTimelineChart();
        } else if (activeChart === 'aging') {
            createAgingDashboard();
        }
    } else {
        analyticsSection.style.display = 'none';
    }
}

/**
 * Create cost basis distribution histogram
 */
function createDistributionChart() {
    const ctx = document.getElementById('distribution-chart');
    if (!ctx) return;

    // Get all buy transactions
    const buys = portfolio.filter(t => t.type === 'buy');
    if (buys.length === 0) return;

    // Determine price bins
    const prices = buys.map(t => t.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const numBins = Math.min(10, buys.length);
    const binSize = (maxPrice - minPrice) / numBins || 1;

    // Create bins
    const bins = Array(numBins).fill(0).map((_, i) => ({
        min: minPrice + (i * binSize),
        max: minPrice + ((i + 1) * binSize),
        count: 0,
        shortTerm: 0,
        longTerm: 0
    }));

    // Classify transactions into bins
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    buys.forEach(txn => {
        const binIndex = Math.min(Math.floor((txn.price - minPrice) / binSize), numBins - 1);
        bins[binIndex].count++;

        const isLongTerm = txn.date <= oneYearAgo;
        if (isLongTerm) {
            bins[binIndex].longTerm++;
        } else {
            bins[binIndex].shortTerm++;
        }
    });

    // Destroy existing chart
    if (distributionChart) {
        distributionChart.destroy();
    }

    // Create chart
    distributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: bins.map(b => `$${formatNumber(b.min)} - $${formatNumber(b.max)}`),
            datasets: [
                {
                    label: 'Short-term (<365 days)',
                    data: bins.map(b => b.shortTerm),
                    backgroundColor: 'rgba(220, 53, 69, 0.7)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Long-term (>365 days)',
                    data: bins.map(b => b.longTerm),
                    backgroundColor: 'rgba(40, 167, 69, 0.7)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Cost Basis Distribution by Holding Period',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y + ' lots';
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Price Range'
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Lots'
                    },
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

/**
 * Create timeline scatter plot
 */
function createTimelineChart() {
    const ctx = document.getElementById('timeline-chart');
    if (!ctx) return;

    const buys = portfolio.filter(t => t.type === 'buy');
    if (buys.length === 0) return;

    // Prepare data points
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    const shortTermPoints = [];
    const longTermPoints = [];

    buys.forEach(txn => {
        const point = {
            x: txn.date,
            y: txn.price,
            r: Math.max(5, Math.min(20, txn.quantity * 2)) // Size by quantity
        };

        const isLongTerm = txn.date <= oneYearAgo;
        if (isLongTerm) {
            longTermPoints.push(point);
        } else {
            shortTermPoints.push(point);
        }
    });

    // Destroy existing chart
    if (timelineChart) {
        timelineChart.destroy();
    }

    // Create chart
    timelineChart = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [
                {
                    label: 'Short-term (<365 days)',
                    data: shortTermPoints,
                    backgroundColor: 'rgba(220, 53, 69, 0.6)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Long-term (>365 days)',
                    data: longTermPoints,
                    backgroundColor: 'rgba(40, 167, 69, 0.6)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Purchase Timeline (bubble size = quantity)',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const date = new Date(context.parsed.x);
                            return [
                                'Date: ' + formatDate(date),
                                'Price: $' + formatNumber(context.parsed.y),
                                'Status: ' + context.dataset.label
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM YYYY'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Purchase Date'
                    }
                },
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Purchase Price'
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

/**
 * Create aging dashboard showing lots approaching long-term status
 */
function createAgingDashboard() {
    const container = document.getElementById('aging-dashboard');
    if (!container) return;

    const buys = portfolio.filter(t => t.type === 'buy');
    if (buys.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 40px;">No purchase transactions to analyze</p>';
        return;
    }

    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    // Analyze each lot
    const lots = buys.map(txn => {
        const daysHeld = Math.floor((today - txn.date) / (1000 * 60 * 60 * 24));
        const daysToLongTerm = Math.max(0, 366 - daysHeld);
        const isLongTerm = daysHeld >= 366;
        const isApproaching = !isLongTerm && daysToLongTerm <= 30;

        return {
            ...txn,
            daysHeld,
            daysToLongTerm,
            isLongTerm,
            isApproaching,
            longTermDate: new Date(txn.date.getTime() + (366 * 24 * 60 * 60 * 1000))
        };
    });

    // Sort: approaching first, then by days to long-term
    lots.sort((a, b) => {
        if (a.isLongTerm && !b.isLongTerm) return 1;
        if (!a.isLongTerm && b.isLongTerm) return -1;
        return a.daysToLongTerm - b.daysToLongTerm;
    });

    // Generate HTML
    let html = '';
    lots.forEach(lot => {
        const cardClass = lot.isLongTerm ? 'longterm' : (lot.isApproaching ? 'approaching-longterm' : '');
        const badgeClass = lot.isLongTerm ? 'badge-longterm' : (lot.isApproaching ? 'badge-approaching' : 'badge-shortterm');
        const badgeText = lot.isLongTerm ? 'LONG-TERM' : (lot.isApproaching ? 'APPROACHING' : 'SHORT-TERM');

        html += `
            <div class="aging-lot-card ${cardClass}">
                <div class="aging-lot-header">
                    <div class="aging-lot-symbol">${lot.symbol}</div>
                    <div class="aging-lot-badge ${badgeClass}">${badgeText}</div>
                </div>
                <div class="aging-lot-detail">
                    <span class="label">Purchase Date:</span>
                    <span class="value">${formatDate(lot.date)}</span>
                </div>
                <div class="aging-lot-detail">
                    <span class="label">Purchase Price:</span>
                    <span class="value">$${formatNumber(lot.price)}</span>
                </div>
                <div class="aging-lot-detail">
                    <span class="label">Quantity:</span>
                    <span class="value">${formatNumber(lot.quantity)}</span>
                </div>
                <div class="aging-lot-detail">
                    <span class="label">Days Held:</span>
                    <span class="value">${lot.daysHeld} days</span>
                </div>
                ${!lot.isLongTerm ? `
                    <div class="aging-countdown">
                        <div class="days-remaining">${lot.daysToLongTerm}</div>
                        <div class="label">days until long-term</div>
                        <div class="label" style="margin-top: 8px;">Becomes long-term: ${formatDate(lot.longTermDate)}</div>
                    </div>
                ` : `
                    <div class="aging-countdown" style="background: #f1f8f4;">
                        <div class="days-remaining" style="color: #28a745;">✓ Long-term</div>
                        <div class="label">Qualifies for preferential tax rates</div>
                    </div>
                `}
            </div>
        `;
    });

    container.innerHTML = html;
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
