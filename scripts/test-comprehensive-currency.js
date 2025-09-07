// Comprehensive test for currency conversion scenarios
const EXCHANGE_RATES = {
  USD: { USD: 1, INR: 83.12, EUR: 0.85, GBP: 0.73 },
  INR: { USD: 0.012, INR: 1, EUR: 0.0102, GBP: 0.0088 },
  EUR: { USD: 1.18, INR: 98.35, EUR: 1, GBP: 0.86 },
  GBP: { USD: 1.37, INR: 113.89, EUR: 1.16, GBP: 1 }
};

function getExchangeRate(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return 1;
  return EXCHANGE_RATES[fromCurrency]?.[toCurrency] || 1;
}

console.log('🧪 Testing Currency Conversion Scenarios\n');

// Mock holdings data based on transactions
const mockHoldings = [
  {
    ticker: 'TCS',
    quantity: 8,
    avgBuyPrice: 2000,      // INR per share
    investedValue: 16000,   // 8 × 2000 = 16000 INR
    currency: 'INR'
  },
  {
    ticker: 'NVDA',
    quantity: 43,           // 10 + 33 shares
    avgBuyPrice: 165.99,    // USD per share (weighted average)
    investedValue: 7137.7,  // Total invested in USD
    currency: 'USD'
  },
  {
    ticker: 'MSFT',
    quantity: 9.997,
    avgBuyPrice: 300,       // USD per share
    investedValue: 2999.1,  // 9.997 × 300
    currency: 'USD'
  }
];

console.log('📊 Original Holdings Data:');
mockHoldings.forEach(holding => {
  const symbol = holding.currency === 'INR' ? '₹' : '$';
  console.log(`${holding.ticker}: ${holding.quantity} shares @ ${symbol}${holding.avgBuyPrice} = ${symbol}${holding.investedValue.toLocaleString()}`);
});

// Test Scenario 1: Dashboard Currency = USD
console.log('\n💰 Scenario 1: Dashboard Currency = USD');
console.log('Expected: TCS should convert from INR to USD, others remain in USD\n');

const convertedToUSD = mockHoldings.map(holding => {
  const rate = getExchangeRate(holding.currency, 'USD');
  return {
    ...holding,
    avgBuyPrice: holding.avgBuyPrice * rate,
    investedValue: holding.investedValue * rate,
    currency: 'USD'
  };
});

convertedToUSD.forEach(holding => {
  console.log(`${holding.ticker}: ${holding.quantity} shares @ $${holding.avgBuyPrice.toFixed(2)} = $${holding.investedValue.toFixed(2)}`);
});

const totalUSD = convertedToUSD.reduce((sum, h) => sum + h.investedValue, 0);
console.log(`Total Invested in USD: $${totalUSD.toFixed(2)}`);

// Test Scenario 2: Dashboard Currency = INR
console.log('\n💰 Scenario 2: Dashboard Currency = INR');
console.log('Expected: USD holdings should convert to INR, TCS remains in INR\n');

const convertedToINR = mockHoldings.map(holding => {
  const rate = getExchangeRate(holding.currency, 'INR');
  return {
    ...holding,
    avgBuyPrice: holding.avgBuyPrice * rate,
    investedValue: holding.investedValue * rate,
    currency: 'INR'
  };
});

convertedToINR.forEach(holding => {
  console.log(`${holding.ticker}: ${holding.quantity} shares @ ₹${holding.avgBuyPrice.toFixed(2)} = ₹${holding.investedValue.toFixed(2)}`);
});

const totalINR = convertedToINR.reduce((sum, h) => sum + h.investedValue, 0);
console.log(`Total Invested in INR: ₹${totalINR.toFixed(2)}`);

// Verification
console.log('\n✅ Verification:');
console.log(`USD to INR conversion rate: ${getExchangeRate('USD', 'INR')}`);
console.log(`INR to USD conversion rate: ${getExchangeRate('INR', 'USD')}`);

const tcsInUSD = 16000 * getExchangeRate('INR', 'USD');
const nvdaInINR = 7137.7 * getExchangeRate('USD', 'INR');

console.log(`TCS ₹16,000 → $${tcsInUSD.toFixed(2)} (should be ~$192.45)`);
console.log(`NVDA $7,137.7 → ₹${nvdaInINR.toFixed(2)} (should be ~₹593,318)`);

console.log('\n🎯 Key Points:');
console.log('- Each holding should convert using its own currency (TCS=INR, NVDA=USD, MSFT=USD)');
console.log('- Portfolio base currency should only affect cash positions');
console.log('- Dashboard should show all values in selected base currency from settings');
