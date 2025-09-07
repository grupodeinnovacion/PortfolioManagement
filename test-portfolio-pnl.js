// Test script to verify P&L calculations are working correctly
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Portfolio P&L Calculations');
console.log('=====================================');

// Read portfolios data
const portfoliosPath = path.join(__dirname, 'data', 'portfolios.json');
const portfolios = JSON.parse(fs.readFileSync(portfoliosPath, 'utf8'));

portfolios.forEach(portfolio => {
  console.log(`\n📊 ${portfolio.name} (${portfolio.currency})`);
  console.log(`   Total Invested: ${formatCurrency(portfolio.totalInvested, portfolio.currency)}`);
  console.log(`   Current Value:  ${formatCurrency(portfolio.currentValue, portfolio.currency)}`);
  console.log(`   Unrealized P&L: ${formatCurrency(portfolio.unrealizedPL, portfolio.currency)} (${portfolio.totalReturnPercent.toFixed(2)}%)`);
  console.log(`   Last Updated:   ${new Date(portfolio.updatedAt).toLocaleString()}`);
  
  // Check if P&L calculation is correct
  const calculatedPL = portfolio.currentValue - portfolio.totalInvested;
  const calculatedPercent = portfolio.totalInvested > 0 ? (calculatedPL / portfolio.totalInvested) * 100 : 0;
  
  const plMatch = Math.abs(calculatedPL - portfolio.unrealizedPL) < 0.01;
  const percentMatch = Math.abs(calculatedPercent - portfolio.totalReturnPercent) < 0.01;
  
  if (plMatch && percentMatch) {
    console.log(`   ✅ P&L calculations are correct!`);
  } else {
    console.log(`   ❌ P&L calculation mismatch:`);
    console.log(`      Expected P&L: ${formatCurrency(calculatedPL, portfolio.currency)}`);
    console.log(`      Stored P&L:   ${formatCurrency(portfolio.unrealizedPL, portfolio.currency)}`);
  }
});

// Test if any portfolio still shows zero P&L when it shouldn't
const zeroPlPortfolios = portfolios.filter(p => p.unrealizedPL === 0 && p.totalInvested > 0);
if (zeroPlPortfolios.length > 0) {
  console.log(`\n⚠️  Warning: ${zeroPlPortfolios.length} portfolios with investments but zero P&L:`);
  zeroPlPortfolios.forEach(p => console.log(`   - ${p.name} (${p.currency})`));
} else {
  console.log(`\n✅ All portfolios with investments have calculated P&L values!`);
}

function formatCurrency(amount, currency) {
  const symbol = currency === 'USD' ? '$' : currency === 'INR' ? '₹' : currency;
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

console.log('\n🎉 Portfolio P&L test completed!');
