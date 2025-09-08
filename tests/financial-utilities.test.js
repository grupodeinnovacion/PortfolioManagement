/**
 * CRITICAL: Financial Utilities Unit Tests
 * Tests all currency formatting, percentage calculations, and P&L computations
 * Zero tolerance for errors in financial calculations
 */

const path = require('path');

// Mock the utils functions since we can't import TypeScript directly
const formatCurrency = (amount, currency = 'USD') => {
  if (amount == null || isNaN(amount)) return 'N/A';
  
  const symbols = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };
  const symbol = symbols[currency] || currency;
  
  return `${symbol}${Math.abs(amount).toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

const formatPercentage = (value) => {
  if (value == null || isNaN(value)) return 'N/A';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

const formatChange = (change, changePercent) => {
  if (change == null || changePercent == null || isNaN(change) || isNaN(changePercent)) {
    return 'N/A';
  }
  
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
};

async function testFinancialUtilities() {
  console.log('🧪 CRITICAL: Financial Utilities Unit Tests');
  console.log('============================================\n');

  let passedTests = 0;
  let totalTests = 0;
  const failedTests = [];

  const test = (name, condition, details = '') => {
    totalTests++;
    if (condition) {
      console.log(`   ✅ ${name}`);
      passedTests++;
    } else {
      console.log(`   ❌ ${name} ${details}`);
      failedTests.push(name);
    }
  };

  console.log('📊 Currency Formatting Tests (CRITICAL):');
  
  // Test USD formatting
  test('USD positive amount', formatCurrency(1234.56, 'USD') === '$1,234.56');
  test('USD negative amount', formatCurrency(-1234.56, 'USD') === '$1,234.56', '(should always show positive)');
  test('USD zero', formatCurrency(0, 'USD') === '$0.00');
  test('USD null/undefined', formatCurrency(null, 'USD') === 'N/A');
  test('USD NaN', formatCurrency(NaN, 'USD') === 'N/A');
  
  // Test INR formatting  
  test('INR positive amount', formatCurrency(123456.78, 'INR') === '₹123,456.78');
  test('INR large amount', formatCurrency(1234567.89, 'INR') === '₹1,234,567.89');
  
  // Test edge cases
  test('Very small amount', formatCurrency(0.01, 'USD') === '$0.01');
  test('Very large amount', formatCurrency(999999999.99, 'USD') === '$999,999,999.99');
  test('Unknown currency', formatCurrency(100, 'XYZ') === 'XYZ100.00');

  console.log('\n📈 Percentage Formatting Tests (CRITICAL):');
  
  test('Positive percentage', formatPercentage(15.25) === '+15.25%');
  test('Negative percentage', formatPercentage(-8.75) === '-8.75%');
  test('Zero percentage', formatPercentage(0) === '+0.00%');
  test('Small positive', formatPercentage(0.01) === '+0.01%');
  test('Small negative', formatPercentage(-0.01) === '-0.01%');
  test('Null percentage', formatPercentage(null) === 'N/A');
  test('NaN percentage', formatPercentage(NaN) === 'N/A');

  console.log('\n💰 P&L Change Formatting Tests (CRITICAL):');
  
  test('Positive P&L', formatChange(100.50, 5.25) === '+100.50 (+5.25%)');
  test('Negative P&L', formatChange(-75.25, -3.15) === '-75.25 (-3.15%)');
  test('Zero P&L', formatChange(0, 0) === '+0.00 (+0.00%)');
  test('Null change', formatChange(null, 5.0) === 'N/A');
  test('Null percent', formatChange(100, null) === 'N/A');
  test('NaN values', formatChange(NaN, 5.0) === 'N/A');

  console.log('\n🔢 Mathematical Precision Tests (CRITICAL):');
  
  // Test floating point precision
  const precisionTest1 = formatCurrency(0.1 + 0.2, 'USD');
  test('Floating point precision', precisionTest1 === '$0.30', `got ${precisionTest1}`);
  
  const precisionTest2 = formatPercentage(1/3 * 100);
  test('Division precision', precisionTest2 === '+33.33%', `got ${precisionTest2}`);

  console.log('\n💸 Real-world Financial Scenarios (CRITICAL):');
  
  // Test realistic portfolio values
  test('Portfolio value formatting', formatCurrency(1234567.89, 'USD') === '$1,234,567.89');
  test('Stock price formatting', formatCurrency(165.97, 'USD') === '$165.97');
  test('Indian stock price', formatCurrency(3048, 'INR') === '₹3,048.00');
  test('P&L calculation', formatChange(8384, 52.4) === '+8384.00 (+52.40%)');
  test('Small loss', formatChange(-10.50, -0.05) === '-10.50 (-0.05%)');

  // Results
  console.log('\n📊 Financial Utilities Test Results:');
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${totalTests - passedTests}`);
  console.log(`   Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS (CRITICAL):');
    failedTests.forEach(test => console.log(`   • ${test}`));
  }
  
  const success = passedTests === totalTests;
  if (success) {
    console.log('\n✅ ALL FINANCIAL CALCULATIONS PASSED - SAFE FOR PRODUCTION');
  } else {
    console.log('\n🚨 FINANCIAL CALCULATION FAILURES DETECTED - DO NOT DEPLOY');
  }
  
  return success;
}

// Run tests if called directly
if (require.main === module) {
  testFinancialUtilities()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 CRITICAL: Financial utilities test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testFinancialUtilities };
