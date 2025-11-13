# 💰 Tax Strategy Simulator

A powerful, browser-based tool for comparing FIFO, LIFO, and HIFO tax lot accounting methods to optimize your capital gains tax strategy.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![No Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)

## 🎯 What This App Does

The Tax Strategy Simulator helps investors and traders understand how different tax lot accounting methods affect their capital gains taxes. When you sell stocks, crypto, or other assets, the IRS allows you to choose which specific "lots" you're selling, dramatically affecting your tax bill.

### Key Features

- **Compare Three Methods**:
  - **FIFO** (First In, First Out): Sells oldest purchases first - IRS default
  - **LIFO** (Last In, First Out): Sells newest purchases first
  - **HIFO** (Highest In, First Out): Sells highest-cost purchases first - often most tax-efficient

- **Accurate Tax Calculations**:
  - Short-term vs. long-term capital gains classification (365-day threshold)
  - Detailed tax lot breakdown with holding periods
  - Cost basis, proceeds, and gain/loss tracking

- **Visual Comparison**:
  - Side-by-side result cards showing all three methods
  - Interactive Chart.js visualizations
  - Clear recommendation of the best tax strategy

- **Privacy-First**:
  - 100% browser-based - no server, no tracking
  - Data stored locally in your browser
  - No personal information transmitted

- **Mobile-Optimized**:
  - iPad-friendly design with 44px touch targets
  - Responsive layout for all devices
  - Works offline once loaded

## 🚀 Quick Start

### Option 1: Open Locally

1. Clone or download this repository
2. Open `index.html` in any modern browser
3. Start analyzing your tax strategy!

### Option 2: GitHub Pages (Live Demo)

Visit: `https://[your-username].github.io/tax-strategy-simulator/`

_(Note: Replace with your actual GitHub Pages URL)_

## 📖 How to Use

### Step 1: Add Your Transactions

Click **"Load Example Portfolio"** to see sample data, or add your own:

1. Select transaction date
2. Choose Buy or Sell
3. Enter symbol (e.g., BTC, AAPL, ETH)
4. Enter quantity and price
5. Click "Add Transaction"

**Example Transaction**:
```
Date: 2024-01-15
Type: Buy
Symbol: BTC
Quantity: 0.5
Price: $45,000
```

### Step 2: Analyze a Sale

Fill in the analysis form:

1. **Symbol to analyze**: BTC (must match your purchases)
2. **Quantity to sell**: 0.4
3. **Sell price**: $55,000
4. **Sell date**: 2024-11-10
5. **Short-term tax rate**: 0.32 (32%)
6. **Long-term tax rate**: 0.15 (15%)

Click **"Calculate Tax Scenarios"** to see results.

### Step 3: Review Results

The app displays:

- **Three result cards** (FIFO, LIFO, HIFO) with:
  - Cost basis
  - Proceeds
  - Total gain/loss
  - Short-term vs. long-term breakdown
  - Tax owed
  - After-tax proceeds

- **Best method highlighted** in green with a recommendation

- **Tax lot details** showing exactly which purchases are matched

- **Visual chart** comparing all three methods

### Step 4: Make Your Decision

The app recommends the method with the **lowest tax liability**, showing exactly how much you'd save.

## 📊 Example Walkthrough

### Scenario: Selling Bitcoin

**Your Purchases**:
- Jan 15, 2024: Bought 0.5 BTC @ $45,000
- Jun 20, 2024: Bought 0.3 BTC @ $60,000
- Aug 10, 2024: Bought 0.2 BTC @ $52,000

**Today's Sale** (Nov 10, 2024):
- Selling 0.4 BTC @ $55,000

### Results:

**FIFO** (First In, First Out):
- Matches: 0.4 BTC from Jan 15 purchase
- Cost Basis: $18,000 (0.4 × $45,000)
- Proceeds: $22,000 (0.4 × $55,000)
- Gain: $4,000 (long-term, held >365 days)
- Tax: **$600** (15% long-term rate)

**LIFO** (Last In, First Out):
- Matches: 0.2 from Aug + 0.2 from Jun
- Cost Basis: $22,400
- Proceeds: $22,000
- Loss: -$400 (short-term)
- Tax: **$0** (loss = no tax)

**HIFO** (Highest In, First Out):
- Matches: 0.3 from Jun ($60k) + 0.1 from Aug ($52k)
- Cost Basis: $23,200
- Proceeds: $22,000
- Loss: -$1,200 (short-term)
- Tax: **$0** (loss = no tax)

**Recommendation**: Use **HIFO** - saves $600 compared to FIFO!

## ⚠️ Important Disclaimers

### This is NOT Tax Advice

This tool is for **educational purposes only**. It does NOT:

- Constitute professional tax advice
- Replace consultation with a qualified tax professional
- Account for all tax rules and regulations
- Handle complex scenarios (wash sales, specific identification, etc.)

### Tax Rules Vary

- **IRS Rules**: U.S. tax rates and rules as of 2024
- **Your Situation**: May differ based on income, state, filing status
- **Cryptocurrency**: Has additional IRS reporting requirements
- **Wash Sales**: Not fully implemented for all scenarios

### Always Consult a Professional

Before making any tax decisions:
- Consult a Certified Public Accountant (CPA)
- Work with a qualified tax attorney
- Use professional tax software for filing
- Keep detailed records of all transactions

**The creators of this tool assume no liability for any tax decisions made using this calculator.**

## 🔧 Technical Details

### Files

- `index.html` - Main application interface
- `styles.css` - iPad-optimized responsive design
- `calculator.js` - Tax calculation engine (FIFO/LIFO/HIFO logic)
- `app.js` - UI controller and event handling
- `README.md` - This documentation

### Technology Stack

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with flexbox/grid
- **Vanilla JavaScript** - No frameworks or dependencies
- **Chart.js** (CDN) - Data visualization
- **LocalStorage** - Client-side data persistence

### Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Safari 14+ (iOS/macOS)
- ✅ Firefox 88+
- ✅ Any modern browser with ES6+ support

### Privacy & Security

- **No server**: Runs entirely in your browser
- **No tracking**: Zero analytics or telemetry
- **No data transmission**: All calculations are local
- **LocalStorage**: Data persists only on your device
- **No cookies**: Doesn't use cookies or third-party scripts

## 🎨 Features in Detail

### Validation

The app includes comprehensive validation:

- ✅ Can't sell more than you own
- ✅ Dates can't be in the future
- ✅ All numbers must be positive
- ✅ Tax rates must be between 0 and 1
- ✅ Required field validation
- ✅ Symbol matching validation

### Tax Calculations

Accurate implementation of:

- **Short-term gains**: Assets held ≤365 days (taxed as ordinary income)
- **Long-term gains**: Assets held >365 days (preferential rates: 0%, 15%, 20%)
- **Cost basis tracking**: Precise per-share calculations
- **Tax lot matching**: Simulates actual IRS lot accounting
- **Gain/loss calculation**: Proceeds minus cost basis

### Data Persistence

- Portfolio automatically saves to LocalStorage
- Survives browser refreshes
- Clear portfolio option available
- Import/export via example data

## 🐛 Known Limitations

1. **Wash Sales**: Basic detection only, not fully implemented
2. **Specific Identification**: Would require manual lot selection
3. **State Taxes**: Only federal rates are calculated
4. **Crypto Special Rules**: Simplified treatment
5. **Fractional Shares**: May have rounding differences

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with modern web standards
- Inspired by real-world tax optimization needs
- Designed for educational purposes

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Check the code comments for implementation details
- Review IRS Publication 550 for official tax guidance

---

**Remember**: This is a learning tool. Always consult a tax professional for your specific situation.

**Made with ❤️ for better tax education**
