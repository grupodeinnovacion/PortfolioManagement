/**
 * Market Data Service Integration Tests
 * Tests real-time market data fetching and API integration
 */

async function testMarketDataIntegration() {
  console.log('🧪 Market Data Service Integration Tests');
  console.log('========================================\n');

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Single stock quote via API
  totalTests++;
  console.log('Test 1: Fetch single stock quote (NVDA) via API');
  try {
    const response = await fetch('http://localhost:3000/api/market-data?symbol=NVDA');
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data.price > 0) {
        console.log(`   ✅ NVDA Price: $${result.data.price} (${result.data.changePercent.toFixed(2)}%)`);
        passedTests++;
      } else {
        console.log(`   ❌ Invalid NVDA response:`, result);
      }
    } else {
      console.log(`   ❌ API request failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 2: Indian stock quote via API
  totalTests++;
  console.log('\nTest 2: Fetch Indian stock quote (TCS) via API');
  try {
    const response = await fetch('http://localhost:3000/api/market-data?symbol=TCS');
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data.price > 0) {
        console.log(`   ✅ TCS Price: ₹${result.data.price} (${result.data.changePercent.toFixed(2)}%)`);
        passedTests++;
      } else {
        console.log(`   ❌ Invalid TCS response:`, result);
      }
    } else {
      console.log(`   ❌ API request failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 3: Multiple quotes via holdings API
  totalTests++;
  console.log('\nTest 3: Fetch multiple quotes via holdings');
  try {
    const response = await fetch('http://localhost:3000/api/holdings?portfolioId=usa-alpha');
    if (response.ok) {
      const holdings = await response.json();
      const validQuotes = holdings.filter(h => h.currentPrice > 0);
      if (validQuotes.length >= 1) {
        console.log(`   ✅ Got ${validQuotes.length} valid quotes from holdings`);
        passedTests++;
      } else {
        console.log(`   ❌ No valid quotes found in holdings`);
      }
    } else {
      console.log(`   ❌ API request failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 4: Sector information via holdings
  totalTests++;
  console.log('\nTest 4: Verify sector information is included');
  try {
    const response = await fetch('http://localhost:3000/api/holdings?portfolioId=india-investments');
    if (response.ok) {
      const holdings = await response.json();
      if (holdings.length > 0 && holdings[0].sector) {
        console.log(`   ✅ TCS Sector: ${holdings[0].sector}`);
        passedTests++;
      } else {
        console.log(`   ❌ No sector information found`);
      }
    } else {
      console.log(`   ❌ API request failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Results
  console.log('\n📊 Test Results:');
  console.log(`   Passed: ${passedTests}/${totalTests}`);
  console.log(`   Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);
  
  return passedTests === totalTests;
}

// Run tests if called directly
if (require.main === module) {
  testMarketDataIntegration()
    .then(success => {
      console.log(success ? '\n🎉 All tests passed!' : '\n⚠️  Some tests failed');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testMarketDataIntegration };
