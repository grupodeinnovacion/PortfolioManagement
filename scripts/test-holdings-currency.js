// Simple test to verify API responses
const fs = require('fs');

// Simulate the calculateHoldings function locally
function calculateHoldings(portfolioId) {
  const transactions = JSON.parse(fs.readFileSync('./data/transactions.json', 'utf8'));
  const portfolioTransactions = transactions.filter(t => t.portfolioId === portfolioId);
  
  const holdingsMap = new Map();

  portfolioTransactions
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach(transaction => {
      const key = transaction.ticker;
      const existing = holdingsMap.get(key) || {
        ticker: transaction.ticker,
        name: transaction.ticker,
        quantity: 0,
        avgBuyPrice: 0,
        currentPrice: 0,
        currentValue: 0,
        investedValue: 0,
        unrealizedPL: 0,
        unrealizedPLPercent: 0,
        dailyChange: 0,
        dailyChangePercent: 0,
        allocation: 0,
        country: transaction.country,
        currency: transaction.currency, // This should preserve INR for TCS
        exchange: transaction.exchange,
        totalCost: 0
      };

      if (transaction.action === 'BUY') {
        const newQuantity = existing.quantity + transaction.quantity;
        const newTotalCost = existing.totalCost + (transaction.quantity * transaction.tradePrice);
        
        existing.quantity = newQuantity;
        existing.totalCost = newTotalCost;
        existing.avgBuyPrice = newTotalCost / newQuantity;
        existing.investedValue = newTotalCost;
        existing.currentPrice = existing.avgBuyPrice; // Mock current price
        existing.currentValue = existing.quantity * existing.currentPrice;
      }

      holdingsMap.set(key, existing);
    });

  return Array.from(holdingsMap.values()).filter(h => h.quantity > 0);
}

console.log('🧪 Testing Holdings API Currency Behavior\n');

console.log('📊 India Investments Holdings (native currency):');
const indiaHoldings = calculateHoldings('india-investments');
indiaHoldings.forEach(holding => {
  console.log(`${holding.ticker}: ${holding.quantity} shares @ ${holding.currency}${holding.avgBuyPrice} = ${holding.currency}${holding.investedValue}`);
});

console.log('\n📊 USA Alpha Holdings (native currency):');
const usaHoldings = calculateHoldings('usa-alpha');
usaHoldings.forEach(holding => {
  console.log(`${holding.ticker}: ${holding.quantity} shares @ ${holding.currency}${holding.avgBuyPrice.toFixed(2)} = ${holding.currency}${holding.investedValue.toFixed(2)}`);
});

console.log('\n🎯 Expected Behavior:');
console.log('- Individual Portfolio Pages: Show holdings in NATIVE currency (TCS in INR, NVDA in USD)');
console.log('- Dashboard Page: Convert ALL holdings to selected dashboard currency');
console.log('- Current dashboard currency setting:', JSON.parse(fs.readFileSync('./data/settings.json', 'utf8')).general.baseCurrency);
