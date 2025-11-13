/**
 * Tax Strategy Simulator - Calculator Module
 * Version 1.0.0 - Full Implementation
 *
 * This module implements tax lot accounting methods for capital gains calculations:
 * - FIFO (First In, First Out): Matches oldest purchases first
 * - LIFO (Last In, First Out): Matches newest purchases first
 * - HIFO (Highest In, First Out): Matches highest cost purchases first to minimize gains
 */

// ============================================================================
// TRANSACTION STORAGE
// ============================================================================

/**
 * Portfolio array stores all transactions
 * Each transaction: {date, type, symbol, quantity, price}
 * - date: JavaScript Date object
 * - type: 'buy' or 'sell'
 * - symbol: stock/crypto symbol (e.g., 'AAPL', 'BTC')
 * - quantity: number of shares/units
 * - price: price per share/unit at time of transaction
 */
let portfolio = [];

// ============================================================================
// CORE TRANSACTION FUNCTIONS
// ============================================================================

/**
 * Generate unique ID for transactions
 * @returns {string} Unique ID based on timestamp and random number
 */
function generateTransactionId() {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add a transaction to the portfolio
 * @param {Date|string} date - Transaction date
 * @param {string} type - 'buy' or 'sell'
 * @param {string} symbol - Asset symbol
 * @param {number} quantity - Number of shares/units
 * @param {number} price - Price per share/unit
 * @param {string} id - Optional transaction ID (for updates)
 * @returns {Object} The added/updated transaction
 */
function addTransaction(date, type, symbol, quantity, price, id = null) {
    // Convert string date to Date object if needed
    const transactionDate = date instanceof Date ? date : new Date(date);

    const transaction = {
        id: id || generateTransactionId(),
        date: transactionDate,
        type: type.toLowerCase(),
        symbol: symbol.toUpperCase(),
        quantity: parseFloat(quantity),
        price: parseFloat(price)
    };

    // If ID provided, update existing transaction
    if (id) {
        const index = portfolio.findIndex(t => t.id === id);
        if (index !== -1) {
            portfolio[index] = transaction;
            console.log(`Updated transaction: ${type} ${quantity} ${symbol} @ $${price}`);
        }
    } else {
        portfolio.push(transaction);
        console.log(`Added ${type}: ${quantity} ${symbol} @ $${price} on ${transactionDate.toLocaleDateString()}`);
    }

    saveToStorage();
    return transaction;
}

/**
 * Delete a transaction by ID
 * @param {string} id - Transaction ID
 * @returns {boolean} Success status
 */
function deleteTransaction(id) {
    const index = portfolio.findIndex(t => t.id === id);
    if (index !== -1) {
        const deleted = portfolio.splice(index, 1)[0];
        saveToStorage();
        console.log(`Deleted transaction: ${deleted.type} ${deleted.quantity} ${deleted.symbol}`);
        return true;
    }
    return false;
}

/**
 * Get transaction by ID
 * @param {string} id - Transaction ID
 * @returns {Object|null} Transaction or null if not found
 */
function getTransactionById(id) {
    return portfolio.find(t => t.id === id) || null;
}

// ============================================================================
// TAX LOT ACCOUNTING METHODS
// ============================================================================

/**
 * Calculate capital gains using FIFO (First In, First Out) method
 * Matches sell against oldest purchases first - IRS default method
 *
 * @param {string} symbol - Asset symbol
 * @param {number} sellQty - Quantity being sold
 * @param {number} sellPrice - Sale price per unit
 * @param {Date} sellDate - Date of sale
 * @returns {Object} Results with cost basis, proceeds, gains, and tax lots
 */
function calculateFIFO(symbol, sellQty, sellPrice, sellDate) {
    // Get all buy transactions for this symbol, sorted by date (oldest first)
    const buys = portfolio
        .filter(t => t.type === 'buy' && t.symbol === symbol.toUpperCase() && t.date < sellDate)
        .sort((a, b) => a.date - b.date); // Oldest first for FIFO

    return matchTaxLots(buys, sellQty, sellPrice, sellDate, 'FIFO');
}

/**
 * Calculate capital gains using LIFO (Last In, First Out) method
 * Matches sell against newest purchases first
 *
 * @param {string} symbol - Asset symbol
 * @param {number} sellQty - Quantity being sold
 * @param {number} sellPrice - Sale price per unit
 * @param {Date} sellDate - Date of sale
 * @returns {Object} Results with cost basis, proceeds, gains, and tax lots
 */
function calculateLIFO(symbol, sellQty, sellPrice, sellDate) {
    // Get all buy transactions for this symbol, sorted by date (newest first)
    const buys = portfolio
        .filter(t => t.type === 'buy' && t.symbol === symbol.toUpperCase() && t.date < sellDate)
        .sort((a, b) => b.date - a.date); // Newest first for LIFO

    return matchTaxLots(buys, sellQty, sellPrice, sellDate, 'LIFO');
}

/**
 * Calculate capital gains using HIFO (Highest In, First Out) method
 * Matches sell against highest cost purchases first to minimize taxable gains
 * This is the most tax-advantageous method when you have gains
 *
 * @param {string} symbol - Asset symbol
 * @param {number} sellQty - Quantity being sold
 * @param {number} sellPrice - Sale price per unit
 * @param {Date} sellDate - Date of sale
 * @returns {Object} Results with cost basis, proceeds, gains, and tax lots
 */
function calculateHIFO(symbol, sellQty, sellPrice, sellDate) {
    // Get all buy transactions for this symbol, sorted by price (highest first)
    const buys = portfolio
        .filter(t => t.type === 'buy' && t.symbol === symbol.toUpperCase() && t.date < sellDate)
        .sort((a, b) => b.price - a.price); // Highest price first for HIFO

    return matchTaxLots(buys, sellQty, sellPrice, sellDate, 'HIFO');
}

/**
 * Core matching algorithm for tax lot accounting
 * Matches a sale against available purchase lots based on ordering
 *
 * @param {Array} buys - Sorted array of buy transactions
 * @param {number} sellQty - Quantity being sold
 * @param {number} sellPrice - Sale price per unit
 * @param {Date} sellDate - Date of sale
 * @param {string} method - Method name for logging
 * @returns {Object} Detailed results with all calculations
 */
function matchTaxLots(buys, sellQty, sellPrice, sellDate, method) {
    let remainingToSell = sellQty;
    let totalCostBasis = 0;
    let totalProceeds = 0;
    let shortTermGain = 0;
    let longTermGain = 0;
    const taxLots = [];

    // Track available quantities (handle partial sells)
    const availableQuantities = new Map();
    buys.forEach((buy, index) => {
        availableQuantities.set(index, buy.quantity);
    });

    // Match sell quantity against buys
    for (let i = 0; i < buys.length && remainingToSell > 0; i++) {
        const buy = buys[i];
        const available = availableQuantities.get(i);

        if (available <= 0) continue;

        // Determine how much to match from this lot
        const qtyToMatch = Math.min(remainingToSell, available);

        // Calculate financials for this tax lot
        const lotCostBasis = qtyToMatch * buy.price;
        const lotProceeds = qtyToMatch * sellPrice;
        const lotGainLoss = lotProceeds - lotCostBasis;

        // Classify gain/loss as short-term or long-term
        const classification = classifyGains(buy.date, sellDate, lotGainLoss);

        // Accumulate totals
        totalCostBasis += lotCostBasis;
        totalProceeds += lotProceeds;

        if (classification.type === 'short-term') {
            shortTermGain += lotGainLoss;
        } else {
            longTermGain += lotGainLoss;
        }

        // Record this tax lot
        taxLots.push({
            buyDate: buy.date,
            buyPrice: buy.price,
            quantity: qtyToMatch,
            costBasis: lotCostBasis,
            proceeds: lotProceeds,
            gainLoss: lotGainLoss,
            gainType: classification.type,
            daysHeld: classification.daysHeld
        });

        // Update remaining quantities
        remainingToSell -= qtyToMatch;
        availableQuantities.set(i, available - qtyToMatch);
    }

    // Check if we had enough shares to cover the sale
    if (remainingToSell > 0) {
        console.warn(`Warning: Insufficient shares for sale. Short by ${remainingToSell} units.`);
    }

    const totalGainLoss = totalProceeds - totalCostBasis;

    return {
        method: method,
        costBasis: totalCostBasis,
        proceeds: totalProceeds,
        gainLoss: totalGainLoss,
        shortTermGain: shortTermGain,
        longTermGain: longTermGain,
        taxLots: taxLots,
        quantityMatched: sellQty - remainingToSell,
        quantityShort: remainingToSell
    };
}

// ============================================================================
// TAX CLASSIFICATION
// ============================================================================

/**
 * Classify capital gains as short-term or long-term
 * IRS rule: Assets held > 365 days qualify for long-term capital gains rates
 * Short-term gains are taxed as ordinary income (higher rates)
 * Long-term gains have preferential tax rates (0%, 15%, or 20%)
 *
 * @param {Date} buyDate - Purchase date
 * @param {Date} sellDate - Sale date
 * @param {number} gain - Gain or loss amount
 * @returns {Object} Classification with type, gain, and days held
 */
function classifyGains(buyDate, sellDate, gain) {
    // Calculate holding period in days
    const daysHeld = Math.floor((sellDate - buyDate) / (1000 * 60 * 60 * 24));

    // IRS requires >365 days (not >=365) for long-term treatment
    const isLongTerm = daysHeld > 365;

    return {
        type: isLongTerm ? 'long-term' : 'short-term',
        gain: gain,
        daysHeld: daysHeld
    };
}

// ============================================================================
// WASH SALE DETECTION
// ============================================================================

/**
 * Detect wash sales per IRS rules
 * A wash sale occurs when you sell a security at a loss and purchase the same
 * or "substantially identical" security within 30 days before or after the sale.
 *
 * IRS Wash Sale Rule (IRC Section 1091):
 * - Loss deduction is disallowed
 * - Loss is added to cost basis of replacement shares
 * - 61-day window: 30 days before + sale date + 30 days after
 *
 * @param {Date} sellDate - Date of sale
 * @param {string} symbol - Asset symbol
 * @param {Array} transactions - Portfolio transactions (defaults to global portfolio)
 * @returns {Object} Wash sale detection result
 */
function detectWashSale(sellDate, symbol, transactions = portfolio) {
    // Define 61-day window (30 days before + sale date + 30 days after)
    const windowStart = new Date(sellDate);
    windowStart.setDate(windowStart.getDate() - 30);

    const windowEnd = new Date(sellDate);
    windowEnd.setDate(windowEnd.getDate() + 30);

    // Find any purchases of the same symbol within the window (excluding the sell date)
    const washSaleBuys = transactions.filter(t =>
        t.type === 'buy' &&
        t.symbol === symbol.toUpperCase() &&
        t.date >= windowStart &&
        t.date <= windowEnd &&
        t.date.getTime() !== sellDate.getTime()
    );

    const isWashSale = washSaleBuys.length > 0;

    return {
        isWashSale: isWashSale,
        matchingBuys: washSaleBuys,
        windowStart: windowStart,
        windowEnd: windowEnd,
        message: isWashSale
            ? `Wash sale detected! ${washSaleBuys.length} purchase(s) within 30-day window.`
            : 'No wash sale detected.'
    };
}

// ============================================================================
// METHOD COMPARISON
// ============================================================================

/**
 * Calculate using Specific Identification method with custom lot selection
 * @param {Array} selectedLots - Array of {lot, quantity} pairs selected by user
 * @param {number} sellPrice - Sale price per unit
 * @param {Date} sellDate - Date of sale
 * @returns {Object} Calculation results with tax lots
 */
function calculateSpecificID(selectedLots, sellPrice, sellDate) {
    const taxLots = [];
    let totalCostBasis = 0;
    let totalQuantity = 0;

    // Process each selected lot
    selectedLots.forEach(selection => {
        const lot = selection.lot;
        const quantity = selection.quantity;

        // Calculate holding period
        const daysHeld = Math.floor((sellDate - lot.date) / (1000 * 60 * 60 * 24));
        const gainType = daysHeld > 365 ? 'long-term' : 'short-term';

        // Calculate gain/loss for this lot
        const costBasis = quantity * lot.price;
        const proceeds = quantity * sellPrice;
        const gainLoss = proceeds - costBasis;

        totalCostBasis += costBasis;
        totalQuantity += quantity;

        taxLots.push({
            buyDate: lot.date,
            buyPrice: lot.price,
            quantity: quantity,
            daysHeld: daysHeld,
            gainType: gainType,
            costBasis: costBasis,
            proceeds: proceeds,
            gainLoss: gainLoss
        });
    });

    // Classify gains as short-term or long-term
    const classified = classifyGains(taxLots);

    return {
        method: 'Specific ID',
        costBasis: totalCostBasis,
        proceeds: totalQuantity * sellPrice,
        gainLoss: (totalQuantity * sellPrice) - totalCostBasis,
        shortTermGain: classified.shortTermGain,
        longTermGain: classified.longTermGain,
        taxLots: taxLots
    };
}

/**
 * Get available lots for a symbol that can be sold
 * @param {string} symbol - Asset symbol
 * @param {Date} sellDate - Date of intended sale
 * @returns {Array} Available lots with remaining quantities
 */
function getAvailableLots(symbol, sellDate) {
    // Get all buys for this symbol before sell date
    const buys = portfolio
        .filter(t => t.type === 'buy' && t.symbol === symbol && t.date <= sellDate)
        .sort((a, b) => a.date - b.date);

    // Get all sells for this symbol before this sell date
    const sells = portfolio
        .filter(t => t.type === 'sell' && t.symbol === symbol && t.date < sellDate)
        .sort((a, b) => a.date - b.date);

    // Calculate remaining quantities using FIFO to track what's been sold
    const availableLots = [];
    const buyLots = buys.map(b => ({ ...b, remaining: b.quantity }));

    // Subtract sold quantities using FIFO
    sells.forEach(sell => {
        let remainingToSubtract = sell.quantity;

        for (const lot of buyLots) {
            if (remainingToSubtract <= 0) break;

            const subtractFromThisLot = Math.min(lot.remaining, remainingToSubtract);
            lot.remaining -= subtractFromThisLot;
            remainingToSubtract -= subtractFromThisLot;
        }
    });

    // Filter to lots with remaining quantity
    buyLots.forEach((lot, index) => {
        if (lot.remaining > 0) {
            availableLots.push({
                lotIndex: index,
                id: lot.id,
                date: lot.date,
                price: lot.price,
                originalQuantity: lot.quantity,
                availableQuantity: lot.remaining,
                daysHeld: Math.floor((sellDate - lot.date) / (1000 * 60 * 60 * 24)),
                gainType: Math.floor((sellDate - lot.date) / (1000 * 60 * 60 * 24)) > 365 ? 'long-term' : 'short-term'
            });
        }
    });

    return availableLots;
}

/**
 * Compare all three tax lot accounting methods
 * Calculates tax liability for each method to help choose the most advantageous
 *
 * Tax Rates (2024):
 * - Short-term: Taxed as ordinary income (10%, 12%, 22%, 24%, 32%, 35%, 37%)
 * - Long-term: 0%, 15%, or 20% depending on income
 *
 * @param {string} symbol - Asset symbol
 * @param {number} sellQty - Quantity being sold
 * @param {number} sellPrice - Sale price per unit
 * @param {Date} sellDate - Date of sale
 * @param {Object} taxRates - Object with shortTerm and longTerm tax rates (as decimals)
 * @returns {Object} Comparison of all three methods with tax calculations
 */
function compareAllMethods(symbol, sellQty, sellPrice, sellDate, taxRates) {
    // Calculate using all three methods
    const fifo = calculateFIFO(symbol, sellQty, sellPrice, sellDate);
    const lifo = calculateLIFO(symbol, sellQty, sellPrice, sellDate);
    const hifo = calculateHIFO(symbol, sellQty, sellPrice, sellDate);

    // Calculate tax liability for each method
    // Tax = (short-term gains × short-term rate) + (long-term gains × long-term rate)
    fifo.tax = (fifo.shortTermGain * taxRates.shortTerm) + (fifo.longTermGain * taxRates.longTerm);
    lifo.tax = (lifo.shortTermGain * taxRates.shortTerm) + (lifo.longTermGain * taxRates.longTerm);
    hifo.tax = (hifo.shortTermGain * taxRates.shortTerm) + (hifo.longTermGain * taxRates.longTerm);

    // Calculate after-tax proceeds
    fifo.afterTaxProceeds = fifo.proceeds - fifo.tax;
    lifo.afterTaxProceeds = lifo.proceeds - lifo.tax;
    hifo.afterTaxProceeds = hifo.proceeds - hifo.tax;

    // Determine the best method (highest after-tax proceeds)
    const methods = [
        { name: 'FIFO', ...fifo },
        { name: 'LIFO', ...lifo },
        { name: 'HIFO', ...hifo }
    ];

    const bestMethod = methods.reduce((best, current) =>
        current.afterTaxProceeds > best.afterTaxProceeds ? current : best
    );

    // Calculate potential tax savings
    const worstTax = Math.max(fifo.tax, lifo.tax, hifo.tax);
    const bestTax = Math.min(fifo.tax, lifo.tax, hifo.tax);
    const taxSavings = worstTax - bestTax;

    return {
        fifo: fifo,
        lifo: lifo,
        hifo: hifo,
        bestMethod: bestMethod.name,
        taxSavings: taxSavings,
        summary: {
            lowestTax: bestTax,
            highestTax: worstTax,
            savingsPercentage: worstTax > 0 ? (taxSavings / worstTax * 100).toFixed(2) : 0
        }
    };
}

// ============================================================================
// PORTFOLIO ANALYTICS
// ============================================================================

/**
 * Get portfolio summary for a specific symbol
 * @param {string} symbol - Asset symbol
 * @returns {Object} Portfolio summary
 */
function getPortfolioSummary(symbol) {
    const filtered = portfolio.filter(t => t.symbol === symbol.toUpperCase());
    const buys = filtered.filter(t => t.type === 'buy');
    const sells = filtered.filter(t => t.type === 'sell');

    const totalBought = buys.reduce((sum, t) => sum + t.quantity, 0);
    const totalSold = sells.reduce((sum, t) => sum + t.quantity, 0);
    const totalInvested = buys.reduce((sum, t) => sum + (t.quantity * t.price), 0);

    const avgBuyPrice = totalBought > 0 ? totalInvested / totalBought : 0;
    const currentHolding = totalBought - totalSold;

    return {
        symbol: symbol.toUpperCase(),
        totalBought: totalBought,
        totalSold: totalSold,
        currentHolding: currentHolding,
        totalInvested: totalInvested,
        avgBuyPrice: avgBuyPrice,
        transactionCount: filtered.length
    };
}

/**
 * Get overall portfolio dashboard summary
 * @returns {Object} Dashboard statistics
 */
function getPortfolioDashboard() {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    const buys = portfolio.filter(t => t.type === 'buy');
    const sells = portfolio.filter(t => t.type === 'sell');

    // Calculate total invested
    const totalInvested = buys.reduce((sum, t) => sum + (t.quantity * t.price), 0);

    // Get unique symbols
    const symbols = new Set(portfolio.map(t => t.symbol));

    // Count long-term and short-term holdings
    const longTermHoldings = buys.filter(t => t.date <= oneYearAgo).length;
    const shortTermHoldings = buys.filter(t => t.date > oneYearAgo).length;

    // Calculate average cost basis
    const totalQuantity = buys.reduce((sum, t) => sum + t.quantity, 0);
    const avgCostBasis = totalQuantity > 0 ? totalInvested / totalQuantity : 0;

    return {
        totalTransactions: portfolio.length,
        totalBuys: buys.length,
        totalSells: sells.length,
        totalInvested: totalInvested,
        uniqueAssets: symbols.size,
        longTermHoldings: longTermHoldings,
        shortTermHoldings: shortTermHoldings,
        avgCostBasis: avgCostBasis,
        symbols: Array.from(symbols).sort()
    };
}

/**
 * Get all symbols in portfolio
 * @returns {Array} Array of unique symbols
 */
function getAllSymbols() {
    const symbols = new Set(portfolio.map(t => t.symbol));
    return Array.from(symbols).sort();
}

/**
 * Clear all transactions (with confirmation)
 * @param {boolean} confirm - Must be true to execute
 */
function clearPortfolio(confirm = false) {
    if (!confirm) {
        console.error('clearPortfolio requires confirm=true parameter');
        return false;
    }

    portfolio = [];
    saveToStorage();
    console.log('Portfolio cleared');
    return true;
}

// ============================================================================
// WASH SALE DETECTION
// ============================================================================

/**
 * Detect all wash sales in the portfolio
 * A wash sale occurs when you sell an asset at a loss and buy the same asset
 * within 30 days before or after the sale
 * @returns {Array} Array of wash sale detections
 */
function detectAllWashSales() {
    const washSales = [];
    const sells = portfolio.filter(t => t.type === 'sell').sort((a, b) => a.date - b.date);

    sells.forEach(sell => {
        const washSale = detectWashSaleForTransaction(sell);
        if (washSale) {
            washSales.push(washSale);
        }
    });

    return washSales;
}

/**
 * Detect wash sale for a specific sell transaction
 * @param {Object} sellTxn - The sell transaction
 * @returns {Object|null} Wash sale details or null if not a wash sale
 */
function detectWashSaleForTransaction(sellTxn) {
    // Get all buys for this symbol
    const buys = portfolio
        .filter(t => t.type === 'buy' && t.symbol === sellTxn.symbol)
        .sort((a, b) => a.date - b.date);

    // Calculate cost basis for this sell using FIFO
    let remainingToSell = sellTxn.quantity;
    let totalCost = 0;
    const lotsUsed = [];

    for (const buy of buys) {
        if (remainingToSell <= 0) break;
        if (buy.date > sellTxn.date) break; // Can't use future buys

        const quantityFromThisLot = Math.min(remainingToSell, buy.quantity);
        totalCost += quantityFromThisLot * buy.price;
        lotsUsed.push({
            buyDate: buy.date,
            buyPrice: buy.price,
            quantity: quantityFromThisLot
        });
        remainingToSell -= quantityFromThisLot;
    }

    const proceeds = sellTxn.quantity * sellTxn.price;
    const gainLoss = proceeds - totalCost;

    // Only check for wash sale if there's a loss
    if (gainLoss >= 0) {
        return null;
    }

    // Find replacement shares within 30-day window
    const windowStart = new Date(sellTxn.date);
    windowStart.setDate(windowStart.getDate() - 30);
    const windowEnd = new Date(sellTxn.date);
    windowEnd.setDate(windowEnd.getDate() + 30);

    const replacementBuys = portfolio.filter(t =>
        t.type === 'buy' &&
        t.symbol === sellTxn.symbol &&
        t.date >= windowStart &&
        t.date <= windowEnd &&
        t.date.getTime() !== sellTxn.date.getTime() // Exclude same-day (already counted in cost basis)
    );

    if (replacementBuys.length === 0) {
        return null; // No wash sale - no replacement shares purchased
    }

    // Calculate disallowed loss
    const totalReplacementShares = replacementBuys.reduce((sum, b) => sum + b.quantity, 0);
    const lossAmount = Math.abs(gainLoss);
    const disallowedLoss = Math.min(lossAmount, Math.min(sellTxn.quantity, totalReplacementShares) * (lossAmount / sellTxn.quantity));

    return {
        sellTransaction: sellTxn,
        sellDate: sellTxn.date,
        symbol: sellTxn.symbol,
        quantity: sellTxn.quantity,
        salePrice: sellTxn.price,
        costBasis: totalCost,
        proceeds: proceeds,
        totalLoss: lossAmount,
        disallowedLoss: disallowedLoss,
        allowedLoss: lossAmount - disallowedLoss,
        replacementBuys: replacementBuys.map(b => ({
            date: b.date,
            quantity: b.quantity,
            price: b.price,
            daysFromSale: Math.abs(Math.floor((b.date - sellTxn.date) / (1000 * 60 * 60 * 24)))
        })),
        adjustedCostBasis: totalReplacementShares > 0 ? disallowedLoss / totalReplacementShares : 0
    };
}

/**
 * Check if a specific transaction is involved in a wash sale
 * @param {string} transactionId - Transaction ID
 * @returns {Object|null} Wash sale details or null
 */
function isWashSale(transactionId) {
    const txn = getTransactionById(transactionId);
    if (!txn || txn.type !== 'sell') return null;

    return detectWashSaleForTransaction(txn);
}

/**
 * Get all wash sale flags for portfolio table display
 * @returns {Map} Map of transaction ID to wash sale flag
 */
function getWashSaleFlags() {
    const flags = new Map();
    const washSales = detectAllWashSales();

    washSales.forEach(ws => {
        if (ws.sellTransaction.id) {
            flags.set(ws.sellTransaction.id, {
                isWashSale: true,
                disallowedLoss: ws.disallowedLoss,
                allowedLoss: ws.allowedLoss,
                totalLoss: ws.totalLoss
            });
        }
    });

    return flags;
}

// ============================================================================
// LOCAL STORAGE PERSISTENCE
// ============================================================================

/**
 * Save portfolio to browser's localStorage
 * Persists data across browser sessions
 */
function saveToStorage() {
    try {
        // Convert dates to ISO strings for storage
        const serialized = portfolio.map(t => ({
            ...t,
            date: t.date instanceof Date ? t.date.toISOString() : t.date
        }));

        localStorage.setItem('taxSimulatorPortfolio', JSON.stringify(serialized));
        localStorage.setItem('taxSimulatorLastSaved', new Date().toISOString());
        console.log(`Portfolio saved: ${portfolio.length} transactions`);
        return true;
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.error('LocalStorage quota exceeded. Unable to save portfolio.');
            alert('Storage quota exceeded. Please clear some data.');
        } else {
            console.error('Error saving to localStorage:', error);
        }
        return false;
    }
}

/**
 * Load portfolio from browser's localStorage
 * Automatically called on page load
 */
function loadFromStorage() {
    try {
        const saved = localStorage.getItem('taxSimulatorPortfolio');
        if (saved) {
            const parsed = JSON.parse(saved);

            // Convert ISO strings back to Date objects
            // Add IDs to legacy transactions that don't have them
            portfolio = parsed.map(t => ({
                ...t,
                id: t.id || generateTransactionId(),
                date: new Date(t.date)
            }));

            console.log(`Portfolio loaded: ${portfolio.length} transactions`);
            return true;
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        alert('Error loading saved portfolio. Data may be corrupted.');
    }
    return false;
}

/**
 * Save tax rate preferences to localStorage
 * @param {number} shortTerm - Short-term tax rate
 * @param {number} longTerm - Long-term tax rate
 */
function saveTaxRates(shortTerm, longTerm) {
    try {
        const rates = { shortTerm, longTerm };
        localStorage.setItem('taxSimulatorRates', JSON.stringify(rates));
        console.log(`Tax rates saved: ST=${shortTerm}, LT=${longTerm}`);
        return true;
    } catch (error) {
        console.error('Error saving tax rates:', error);
        return false;
    }
}

/**
 * Load tax rate preferences from localStorage
 * @returns {Object|null} Tax rates object or null
 */
function loadTaxRates() {
    try {
        const saved = localStorage.getItem('taxSimulatorRates');
        if (saved) {
            const rates = JSON.parse(saved);
            console.log(`Tax rates loaded: ST=${rates.shortTerm}, LT=${rates.longTerm}`);
            return rates;
        }
    } catch (error) {
        console.error('Error loading tax rates:', error);
    }
    return null;
}

/**
 * Get last saved timestamp
 * @returns {string|null} ISO timestamp or null
 */
function getLastSavedTime() {
    try {
        return localStorage.getItem('taxSimulatorLastSaved');
    } catch (error) {
        return null;
    }
}

/**
 * Clear all saved data from localStorage
 * @returns {boolean} Success status
 */
function clearAllStoredData() {
    try {
        localStorage.removeItem('taxSimulatorPortfolio');
        localStorage.removeItem('taxSimulatorRates');
        localStorage.removeItem('taxSimulatorLastSaved');
        console.log('All stored data cleared');
        return true;
    } catch (error) {
        console.error('Error clearing stored data:', error);
        return false;
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Tax Strategy Simulator initialized');
    console.log('Version 1.0.0 - Full Implementation');

    // Load saved portfolio
    loadFromStorage();

    // Update status to confirm JavaScript is working
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = `✓ Calculator ready! ${portfolio.length} transactions loaded.`;
        statusElement.classList.add('success');
    }

    // Log available functions for developer console
    console.log('Available functions:');
    console.log('  addTransaction(date, type, symbol, quantity, price)');
    console.log('  calculateFIFO(symbol, sellQty, sellPrice, sellDate)');
    console.log('  calculateLIFO(symbol, sellQty, sellPrice, sellDate)');
    console.log('  calculateHIFO(symbol, sellQty, sellPrice, sellDate)');
    console.log('  compareAllMethods(symbol, sellQty, sellPrice, sellDate, taxRates)');
    console.log('  detectWashSale(sellDate, symbol)');
    console.log('  getPortfolioSummary(symbol)');
    console.log('  getAllSymbols()');
    console.log('  clearPortfolio(true)');

    console.log('\nTry it out! Example:');
    console.log('  addTransaction("2023-01-15", "buy", "AAPL", 100, 150)');
    console.log('  addTransaction("2024-06-15", "sell", "AAPL", 50, 180)');
    console.log('  compareAllMethods("AAPL", 50, 180, new Date("2024-06-15"), {shortTerm: 0.32, longTerm: 0.15})');
});

// Export functions for testing (if module system is available)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        addTransaction,
        calculateFIFO,
        calculateLIFO,
        calculateHIFO,
        classifyGains,
        detectWashSale,
        compareAllMethods,
        getPortfolioSummary,
        getAllSymbols,
        clearPortfolio,
        saveToStorage,
        loadFromStorage
    };
}
