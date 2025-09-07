// Test script to verify dashboard cash position currency conversion
const { portfolioService } = require('../src/services/portfolioService');

async function testCashPositionConversion() {
  console.log('Testing cash position currency conversion...\n');
  
  // Test conversion rates
  const usdToInr = portfolioService.getExchangeRate('USD', 'INR');
  const inrToUsd = portfolioService.getExchangeRate('INR', 'USD');
  
  console.log('Exchange Rates:');
  console.log(`USD to INR: ${usdToInr}`);
  console.log(`INR to USD: ${inrToUsd}`);
  
  // Simulate cash positions from portfolios
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
  
  console.log('\nOriginal Cash Positions:');
  console.log(`USA Alpha Fund: $${mockCashPositions['usa-alpha'].toLocaleString()}`);
  console.log(`USA SIP: $${mockCashPositions['usa-sip'].toLocaleString()}`);
  console.log(`India Investments: ₹${mockCashPositions['india-inv'].toLocaleString()}`);
  
  // Convert to INR (dashboard currency)
  const dashboardCurrency = 'INR';
  const convertedPositions = {};
  
  for (const [portfolioId, amount] of Object.entries(mockCashPositions)) {
    const portfolio = mockPortfolios.find(p => p.id === portfolioId);
    const rate = portfolioService.getExchangeRate(portfolio.currency, dashboardCurrency);
    convertedPositions[portfolioId] = amount * rate;
  }
  
  console.log(`\nConverted to ${dashboardCurrency}:`);
  console.log(`USA Alpha Fund: ₹${convertedPositions['usa-alpha'].toLocaleString()}`);
  console.log(`USA SIP: ₹${convertedPositions['usa-sip'].toLocaleString()}`);
  console.log(`India Investments: ₹${convertedPositions['india-inv'].toLocaleString()}`);
  
  const totalConverted = Object.values(convertedPositions).reduce((sum, amount) => sum + amount, 0);
  console.log(`\nTotal Cash Position in ${dashboardCurrency}: ₹${totalConverted.toLocaleString()}`);
}

testCashPositionConversion();
