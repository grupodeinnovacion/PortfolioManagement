const fs = require('fs');
const path = require('path');

/**
 * Test script to verify currency conversion calculations and debug dashboard data
 */

async function testPortfolioCurrencyConversions() {
  console.log('💱 Testing Portfolio Currency Conversion Calculations\n');

  // Read current data
  const portfoliosPath = path.join(__dirname, '..', 'data', 'portfolios.json');
  const cashPositionsPath = path.join(__dirname, '..', 'data', 'cash-positions.json');
  
  const portfolios = JSON.parse(fs.readFileSync(portfoliosPath, 'utf8'));
  const cashPositions = JSON.parse(fs.readFileSync(cashPositionsPath, 'utf8'));
  
  console.log('📊 Current Portfolio Data:');
  portfolios.forEach(portfolio => {
    const cash = cashPositions[portfolio.id] || 0;
    const invested = portfolio.totalInvested || 0;
    const total = cash + invested;
    
    console.log(`  ${portfolio.name} (${portfolio.currency}):`);
    console.log(`    Cash: ${portfolio.currency}${cash.toLocaleString()}`);
    console.log(`    Invested: ${portfolio.currency}${invested.toLocaleString()}`);
    console.log(`    Total: ${portfolio.currency}${total.toLocaleString()}`);
  });

  // Manual calculation with expected exchange rates
  const EXPECTED_USD_TO_INR = 83.25; // Expected realistic rate
  const EXPECTED_INR_TO_USD = 1 / EXPECTED_USD_TO_INR;

  console.log('\n🧮 Manual Currency Conversion Calculations:');
  console.log(`Expected Exchange Rates: 1 USD = ${EXPECTED_USD_TO_INR} INR, 1 INR = ${EXPECTED_INR_TO_USD.toFixed(6)} USD\n`);

  // Calculate totals by currency
  let totalUSDValue = 0;
  let totalINRValue = 0;

  portfolios.forEach(portfolio => {
    const cash = cashPositions[portfolio.id] || 0;
    const invested = portfolio.totalInvested || 0;
    const total = cash + invested;
    
    if (portfolio.currency === 'USD') {
      totalUSDValue += total;
    } else if (portfolio.currency === 'INR') {
      totalINRValue += total;
    }
  });

  console.log('💰 Portfolio Totals by Currency:');
  console.log(`  USD Portfolios: $${totalUSDValue.toLocaleString()}`);
  console.log(`  INR Portfolios: ₹${totalINRValue.toLocaleString()}`);

  console.log('\n🔄 Expected Dashboard Conversions:');
  
  // When viewing in USD
  const inrConvertedToUSD = totalINRValue * EXPECTED_INR_TO_USD;
  const grandTotalUSD = totalUSDValue + inrConvertedToUSD;
  
  console.log('  When dashboard currency = USD:');
  console.log(`    USD portfolios: $${totalUSDValue.toLocaleString()}`);
  console.log(`    INR portfolios converted: ₹${totalINRValue.toLocaleString()} = $${inrConvertedToUSD.toLocaleString()}`);
  console.log(`    Grand Total: $${grandTotalUSD.toLocaleString()}`);

  // When viewing in INR
  const usdConvertedToINR = totalUSDValue * EXPECTED_USD_TO_INR;
  const grandTotalINR = totalINRValue + usdConvertedToINR;
  
  console.log('\n  When dashboard currency = INR:');
  console.log(`    INR portfolios: ₹${totalINRValue.toLocaleString()}`);
  console.log(`    USD portfolios converted: $${totalUSDValue.toLocaleString()} = ₹${usdConvertedToINR.toLocaleString()}`);
  console.log(`    Grand Total: ₹${grandTotalINR.toLocaleString()}`);

  console.log('\n📋 Your Screenshot Values vs Expected:');
  console.log('  Your USD Dashboard:');
  console.log('    Cash: $73,321.00');
  console.log('    Invested: $12,328.80');
  console.log('    Total: $85,649.80');
  
  console.log('\n  Your INR Dashboard:');
  console.log('    Cash: ₹6,097,705.95');
  console.log('    Invested: ₹1,025,174.92');
  console.log('    Total: ₹7,122,880.87');

  console.log('\n  Expected if rate is 83.25:');
  console.log(`    USD Dashboard Total: $${grandTotalUSD.toLocaleString()}`);
  console.log(`    INR Dashboard Total: ₹${grandTotalINR.toLocaleString()}`);

  // Check conversion accuracy
  const yourConversionRate = 7122880.87 / 85649.80;
  console.log(`\n🔍 Your conversion rate: ${yourConversionRate.toFixed(2)} (should be ~${EXPECTED_USD_TO_INR})`);
  
  if (Math.abs(yourConversionRate - EXPECTED_USD_TO_INR) > 5) {
    console.log('❌ Conversion rate is incorrect - dashboard using wrong exchange rate');
  } else {
    console.log('✅ Conversion rate looks correct');
  }

  console.log('\n⚠️  Action Items:');
  console.log('  1. Check if dashboard service is using real-time exchange rates');
  console.log('  2. Verify async currency conversion is working correctly');
  console.log('  3. Ensure all cash positions are converted with correct portfolio currency');
  console.log('  4. Test dashboard after recent async conversion updates');
}

testPortfolioCurrencyConversions().catch(console.error);
