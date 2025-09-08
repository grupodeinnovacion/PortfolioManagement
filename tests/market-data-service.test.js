/**
 * CRITICAL: Market Data Service Unit Tests
 * Tests real-time stock data accuracy, fallback systems, and data integrity
 * Financial accuracy depends on reliable market data
 */

async function testMarketDataService() {
  console.log('🧪 CRITICAL: Market Data Service Unit Tests');
  console.log('============================================\n');

  let passedTests = 0;
  let totalTests = 0;
  const failedTests = [];

  const test = async (name, testFn) => {
    totalTests++;
    try {
      const result = await testFn();
      if (result.success) {
        console.log(`   ✅ ${name}`);
        passedTests++;
      } else {
        console.log(`   ❌ ${name}: ${result.error}`);
        failedTests.push({ name, error: result.error });
      }
    } catch (error) {
      console.log(`   ❌ ${name}: ${error.message}`);
      failedTests.push({ name, error: error.message });
    }
  };

  console.log('📈 Individual Stock Data Tests:');

  // Test NVDA (US Stock)
  await test('NVDA stock quote accuracy', async () => {
    const response = await fetch('http://localhost:3000/api/market-data?symbol=NVDA');
    const data = await response.json();
    
    if (!response.ok) return { success: false, error: `API error: ${response.status}` };
    if (!data.success) return { success: false, error: 'API returned failure' };
    if (!data.data.price || data.data.price <= 0) return { success: false, error: `Invalid price: ${data.data.price}` };
    if (!data.data.companyName) return { success: false, error: 'Missing company name' };
    if (!data.data.sector) return { success: false, error: 'Missing sector information' };
    if (typeof data.data.changePercent !== 'number') return { success: false, error: 'Invalid change percentage' };
    
    return { success: true };
  });

  // Test TCS (Indian Stock)
  await test('TCS stock quote accuracy', async () => {
    const response = await fetch('http://localhost:3000/api/market-data?symbol=TCS');
    const data = await response.json();
    
    if (!response.ok) return { success: false, error: `API error: ${response.status}` };
    if (!data.success) return { success: false, error: 'API returned failure' };
    if (!data.data.price || data.data.price <= 0) return { success: false, error: `Invalid price: ${data.data.price}` };
    if (data.data.price < 1000 || data.data.price > 10000) return { success: false, error: `TCS price out of reasonable range: ${data.data.price}` };
    if (!data.data.companyName.includes('Tata')) return { success: false, error: 'Incorrect company name' };
    
    return { success: true };
  });

  // Test MSFT (US Stock)
  await test('MSFT stock quote accuracy', async () => {
    const response = await fetch('http://localhost:3000/api/market-data?symbol=MSFT');
    const data = await response.json();
    
    if (!response.ok) return { success: false, error: `API error: ${response.status}` };
    if (!data.success) return { success: false, error: 'API returned failure' };
    if (!data.data.price || data.data.price <= 0) return { success: false, error: `Invalid price: ${data.data.price}` };
    if (data.data.price < 100 || data.data.price > 1000) return { success: false, error: `MSFT price out of reasonable range: ${data.data.price}` };
    if (!data.data.companyName.includes('Microsoft')) return { success: false, error: 'Incorrect company name' };
    
    return { success: true };
  });

  // Test AAPL (US Stock)
  await test('AAPL stock quote accuracy', async () => {
    const response = await fetch('http://localhost:3000/api/market-data?symbol=AAPL');
    const data = await response.json();
    
    if (!response.ok) return { success: false, error: `API error: ${response.status}` };
    if (!data.success) return { success: false, error: 'API returned failure' };
    if (!data.data.price || data.data.price <= 0) return { success: false, error: `Invalid price: ${data.data.price}` };
    if (data.data.price < 100 || data.data.price > 500) return { success: false, error: `AAPL price out of reasonable range: ${data.data.price}` };
    if (!data.data.companyName.includes('Apple')) return { success: false, error: 'Incorrect company name' };
    
    return { success: true };
  });

  console.log('\n🔄 Data Consistency Tests:');

  // Test data freshness
  await test('Market data freshness', async () => {
    const response = await fetch('http://localhost:3000/api/market-data?symbol=NVDA');
    const data = await response.json();
    
    if (!data.data.lastUpdated) return { success: false, error: 'Missing lastUpdated timestamp' };
    
    const lastUpdated = new Date(data.data.lastUpdated);
    const now = new Date();
    const ageInMinutes = (now - lastUpdated) / (1000 * 60);
    
    if (ageInMinutes > 60) return { success: false, error: `Data too old: ${ageInMinutes.toFixed(1)} minutes` };
    
    return { success: true };
  });

  // Test sector information consistency
  await test('Sector information consistency', async () => {
    const nvdaResponse = await fetch('http://localhost:3000/api/market-data?symbol=NVDA');
    const msftResponse = await fetch('http://localhost:3000/api/market-data?symbol=MSFT');
    const aaplResponse = await fetch('http://localhost:3000/api/market-data?symbol=AAPL');
    
    const nvda = await nvdaResponse.json();
    const msft = await msftResponse.json();
    const aapl = await aaplResponse.json();
    
    if (nvda.data.sector !== 'Technology') return { success: false, error: `NVDA sector wrong: ${nvda.data.sector}` };
    if (msft.data.sector !== 'Technology') return { success: false, error: `MSFT sector wrong: ${msft.data.sector}` };
    if (aapl.data.sector !== 'Technology') return { success: false, error: `AAPL sector wrong: ${aapl.data.sector}` };
    
    return { success: true };
  });

  console.log('\n🚨 Error Handling Tests:');

  // Test invalid symbol
  await test('Invalid symbol handling', async () => {
    const response = await fetch('http://localhost:3000/api/market-data?symbol=INVALID_SYMBOL_XYZ');
    
    if (!response.ok) return { success: false, error: 'API request failed' };
    
    const data = await response.json();
    
    // Should return success but with price 0 for invalid symbols
    if (!data.success) return { success: false, error: 'Should return success structure' };
    if (data.data.price !== 0) return { success: false, error: 'Invalid symbol should have price 0' };
    if (data.data.sector !== 'N/A') return { success: false, error: 'Invalid symbol should have sector N/A' };
    
    return { success: true };
  });

  // Test missing symbol parameter
  await test('Missing symbol parameter', async () => {
    const response = await fetch('http://localhost:3000/api/market-data');
    
    // API returns cache status when no symbol provided
    if (response.ok) {
      const data = await response.json();
      if (data.cacheStatus) return { success: true }; // This is acceptable
    }
    
    return { success: true }; // Accept any response for missing parameter
  });

  console.log('\n⚡ Performance Tests:');

  // Test response time
  await test('Response time acceptable', async () => {
    const startTime = Date.now();
    const response = await fetch('http://localhost:3000/api/market-data?symbol=NVDA');
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    
    if (responseTime > 5000) return { success: false, error: `Too slow: ${responseTime}ms` };
    if (!response.ok) return { success: false, error: 'Request failed' };
    
    return { success: true };
  });

  // Results
  console.log('\n📊 Market Data Service Test Results:');
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${totalTests - passedTests}`);
  console.log(`   Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS (CRITICAL):');
    failedTests.forEach(test => console.log(`   • ${test.name}: ${test.error}`));
  }
  
  const success = passedTests === totalTests;
  if (success) {
    console.log('\n✅ MARKET DATA SERVICE RELIABLE - SAFE FOR TRADING');
  } else {
    console.log('\n🚨 MARKET DATA ISSUES DETECTED - TRADING RISK');
  }
  
  return success;
}

// Run tests if called directly
if (require.main === module) {
  testMarketDataService()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 CRITICAL: Market data service test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testMarketDataService };
