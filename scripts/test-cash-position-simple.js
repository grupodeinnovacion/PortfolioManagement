// Simple test for exchange rate calculation
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

console.log('Testing cash position currency conversion...\n');

// Test conversion rates
const usdToInr = getExchangeRate('USD', 'INR');
const inrToUsd = getExchangeRate('INR', 'USD');

console.log('Exchange Rates:');
console.log(`USD to INR: ${usdToInr}`);
console.log(`INR to USD: ${inrToUsd}`);

// Simulate cash positions from portfolios (as shown in screenshot)
const mockCashPositions = {
  'usa-alpha': 44513, // USD
  'usa-sip': 23000,   // USD  
  'india-inv': 484000 // INR
};

const mockPortfolios = [
  { id: 'usa-alpha', currency: 'USD' },
  { id: 'usa-sip', currency: 'USD' },
  { id: 'india-inv', currency: 'INR' }
];

console.log('\nOriginal Cash Positions (as shown in dashboard):');
console.log(`USA Alpha Fund: $${mockCashPositions['usa-alpha'].toLocaleString()}`);
console.log(`USA SIP: $${mockCashPositions['usa-sip'].toLocaleString()}`);
console.log(`India Investments: ₹${mockCashPositions['india-inv'].toLocaleString()}`);

// Convert all to INR (dashboard currency)
const dashboardCurrency = 'INR';
const convertedPositions = {};

for (const [portfolioId, amount] of Object.entries(mockCashPositions)) {
  const portfolio = mockPortfolios.find(p => p.id === portfolioId);
  const rate = getExchangeRate(portfolio.currency, dashboardCurrency);
  convertedPositions[portfolioId] = amount * rate;
}

console.log(`\nAfter conversion to ${dashboardCurrency} (should be uniform):`);
console.log(`USA Alpha Fund: ₹${convertedPositions['usa-alpha'].toLocaleString()}`);
console.log(`USA SIP: ₹${convertedPositions['usa-sip'].toLocaleString()}`);
console.log(`India Investments: ₹${convertedPositions['india-inv'].toLocaleString()}`);

const totalConverted = Object.values(convertedPositions).reduce((sum, amount) => sum + amount, 0);
console.log(`\nTotal Cash Position in ${dashboardCurrency}: ₹${totalConverted.toLocaleString()}`);

console.log('\n✅ All values should now show in INR currency format in the dashboard!');
