/**
 * API Endpoints Integration Tests
 * Tests core API endpoints and data integrity
 */

async function testAPIEndpoints() {
  console.log('🧪 API Endpoints Integration Tests');
  console.log('==================================\n');

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Portfolios API endpoint
  totalTests++;
  console.log('Test 1: Portfolios API endpoint');
  try {
    const response = await fetch('http://localhost:3000/api/portfolios');
    if (response.ok) {
      const portfolios = await response.json();
      if (Array.isArray(portfolios) && portfolios.length > 0) {
        console.log(`   ✅ Got ${portfolios.length} portfolios`);
        passedTests++;
      } else {
        console.log(`   ❌ Invalid portfolios response`);
      }
    } else {
      console.log(`   ❌ API request failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 2: Holdings API endpoint
  totalTests++;
  console.log('\nTest 2: Holdings API endpoint');
  try {
    const response = await fetch('http://localhost:3000/api/holdings?portfolioId=india-investments');
    if (response.ok) {
      const holdings = await response.json();
      if (Array.isArray(holdings) && holdings.length > 0) {
        console.log(`   ✅ Got ${holdings.length} holdings for India Investments`);
        passedTests++;
      } else {
        console.log(`   ❌ No holdings found`);
      }
    } else {
      console.log(`   ❌ API request failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 3: Settings API endpoint
  totalTests++;
  console.log('\nTest 3: Settings API endpoint');
  try {
    const response = await fetch('http://localhost:3000/api/settings');
    if (response.ok) {
      const settings = await response.json();
      if (settings && settings.general) {
        console.log(`   ✅ Settings loaded with base currency: ${settings.general.baseCurrency}`);
        passedTests++;
      } else {
        console.log(`   ❌ Invalid settings response`);
      }
    } else {
      console.log(`   ❌ API request failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 4: Transactions API endpoint
  totalTests++;
  console.log('\nTest 4: Transactions API endpoint');
  try {
    const response = await fetch('http://localhost:3000/api/transactions');
    if (response.ok) {
      const transactions = await response.json();
      if (Array.isArray(transactions)) {
        console.log(`   ✅ Got ${transactions.length} transactions`);
        passedTests++;
      } else {
        console.log(`   ❌ Invalid transactions response`);
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
  testAPIEndpoints()
    .then(success => {
      console.log(success ? '\n🎉 All tests passed!' : '\n⚠️  Some tests failed');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testAPIEndpoints };
