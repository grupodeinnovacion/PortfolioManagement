// Data consistency checker and fixer
const fs = require('fs');
const path = require('path');

function fixDataConsistency() {
  console.log('🔧 Checking and fixing data consistency...\n');
  
  // Read current data files
  const settingsPath = './data/settings.json';
  const portfoliosPath = './data/portfolios.json';
  const cashPositionsPath = './data/cash-positions.json';
  
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  const portfolios = JSON.parse(fs.readFileSync(portfoliosPath, 'utf8'));
  const cashPositions = JSON.parse(fs.readFileSync(cashPositionsPath, 'utf8'));
  
  console.log('Current State:');
  console.log(`Dashboard Base Currency: ${settings.general.baseCurrency}`);
  
  let hasChanges = false;
  
  // Check and fix portfolio currencies
  portfolios.forEach((portfolio, index) => {
    const expectedCurrency = settings.portfolios[portfolio.id]?.baseCurrency;
    if (expectedCurrency && portfolio.currency !== expectedCurrency) {
      console.log(`❌ Portfolio ${portfolio.name}: currency is ${portfolio.currency}, should be ${expectedCurrency}`);
      portfolios[index].currency = expectedCurrency;
      portfolios[index].updatedAt = new Date().toISOString();
      hasChanges = true;
    } else {
      console.log(`✅ Portfolio ${portfolio.name}: currency ${portfolio.currency} is correct`);
    }
  });
  
  // Verify cash positions make sense
  console.log('\nCash Positions:');
  portfolios.forEach(portfolio => {
    const cashAmount = cashPositions[portfolio.id];
    if (cashAmount !== undefined) {
      const symbol = portfolio.currency === 'INR' ? '₹' : '$';
      console.log(`${portfolio.name}: ${symbol}${cashAmount.toLocaleString()} (${portfolio.currency})`);
    }
  });
  
  if (hasChanges) {
    // Write updated portfolios
    fs.writeFileSync(portfoliosPath, JSON.stringify(portfolios, null, 2));
    console.log('\n✅ Data consistency fixed!');
  } else {
    console.log('\n✅ All data is consistent!');
  }
  
  console.log('\n📋 Expected Behavior:');
  console.log('- Dashboard views: Convert all values to dashboard base currency');
  console.log('- Individual portfolio views: Show values in native portfolio currency');
  console.log('- Currency settings changes: Only affect dashboard display, not portfolio data');
}

try {
  fixDataConsistency();
} catch (error) {
  console.error('Error:', error.message);
}
