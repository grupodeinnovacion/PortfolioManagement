/**
 * Test Runner - Executes all unit tests
 * Run with: node tests/run-tests.js
 */

const { testMarketDataIntegration } = require('./market-data.test.js');
const { testAPIEndpoints } = require('./currency-service.test.js');
const { testPortfolioCalculations } = require('./portfolio-calculations.test.js');

async function runAllTests() {
  console.log('🚀 Portfolio Management System - Test Suite');
  console.log('==========================================\n');
  
  const startTime = Date.now();
  let totalPassed = 0;
  let totalTests = 3;
  
  // Run Market Data Tests
  console.log('Running Market Data Tests...');
  try {
    const result1 = await testMarketDataIntegration();
    if (result1) totalPassed++;
  } catch (error) {
    console.error('Market Data Tests failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Run API Endpoints Tests
  console.log('Running API Endpoints Tests...');
  try {
    const result2 = await testAPIEndpoints();
    if (result2) totalPassed++;
  } catch (error) {
    console.error('API Endpoints Tests failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Run Portfolio Calculations Tests
  console.log('Running Portfolio Calculations Tests...');
  try {
    const result3 = await testPortfolioCalculations();
    if (result3) totalPassed++;
  } catch (error) {
    console.error('Portfolio Calculations Tests failed:', error.message);
  }
  
  // Final Results
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 FINAL TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`Total Test Suites: ${totalTests}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalTests - totalPassed}`);
  console.log(`Success Rate: ${((totalPassed/totalTests) * 100).toFixed(1)}%`);
  console.log(`Duration: ${duration}ms`);
  
  if (totalPassed === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉');
    console.log('The Portfolio Management System is working correctly.');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED');
    console.log('Please check the failed tests and fix any issues.');
  }
  
  return totalPassed === totalTests;
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests };
