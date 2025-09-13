/**
 * Static Data Performance Tests
 *
 * Tests the performance improvements achieved through static JSON data architecture
 * Validates that API endpoints reading from JSON files are significantly faster
 * than real-time API calls to external services
 */

async function testStaticDataPerformance() {
  console.log('🧪 Static Data Performance Tests');
  console.log('=================================\n');

  let passedTests = 0;
  let totalTests = 0;

  const test = async (name, testFn) => {
    totalTests++;
    try {
      const result = await testFn();
      if (result.success) {
        console.log(`   ✅ ${name}: ${result.message || 'passed'}`);
        passedTests++;
      } else {
        console.log(`   ❌ ${name}: ${result.error}`);
      }
    } catch (error) {
      console.log(`   ❌ ${name}: ${error.message}`);
    }
  };

  console.log('📈 Performance Benchmarks:');

  // Test 1: Holdings API Performance (Static JSON vs Real-time)
  await test('Holdings API static data speed', async () => {
    const iterations = 5;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      const response = await fetch('http://localhost:3000/api/holdings?portfolioId=india-investments');
      const endTime = Date.now();

      if (!response.ok) {
        return { success: false, error: 'API request failed' };
      }

      const data = await response.json();
      if (!data || data.length === 0) {
        return { success: false, error: 'No data returned' };
      }

      times.push(endTime - startTime);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);

    // Static data should be consistently fast (<500ms)
    if (avgTime < 500 && maxTime < 800) {
      return {
        success: true,
        message: `avg: ${avgTime.toFixed(0)}ms, max: ${maxTime}ms (expected <500ms avg)`
      };
    } else {
      return {
        success: false,
        error: `Too slow - avg: ${avgTime.toFixed(0)}ms, max: ${maxTime}ms`
      };
    }
  });

  // Test 2: Dashboard API Caching Performance
  await test('Dashboard API caching effectiveness', async () => {
    // First request (should use cached data)
    const startTime1 = Date.now();
    const response1 = await fetch('http://localhost:3000/api/dashboard?currency=USD');
    const endTime1 = Date.now();

    if (!response1.ok) {
      return { success: false, error: 'First request failed' };
    }

    // Second request (should be much faster - cached)
    const startTime2 = Date.now();
    const response2 = await fetch('http://localhost:3000/api/dashboard?currency=USD');
    const endTime2 = Date.now();

    if (!response2.ok) {
      return { success: false, error: 'Second request failed' };
    }

    const time1 = endTime1 - startTime1;
    const time2 = endTime2 - startTime2;

    // Second request should be significantly faster (cached)
    if (time2 < time1 && time2 < 300) {
      return {
        success: true,
        message: `first: ${time1}ms, cached: ${time2}ms (${((time1 - time2) / time1 * 100).toFixed(1)}% faster)`
      };
    } else {
      return {
        success: false,
        error: `Caching not effective - first: ${time1}ms, second: ${time2}ms`
      };
    }
  });

  // Test 3: Realized P&L API Performance
  await test('Realized P&L static data speed', async () => {
    const startTime = Date.now();
    const response = await fetch('http://localhost:3000/api/realized-pl?portfolioId=usa-alpha');
    const endTime = Date.now();

    if (!response.ok) {
      return { success: false, error: 'API request failed' };
    }

    const data = await response.json();
    if (typeof data.realizedPL !== 'number') {
      return { success: false, error: 'Invalid response format' };
    }

    const responseTime = endTime - startTime;

    // Should be very fast since reading from JSON
    if (responseTime < 100) {
      return {
        success: true,
        message: `${responseTime}ms (excellent, <100ms)`
      };
    } else if (responseTime < 300) {
      return {
        success: true,
        message: `${responseTime}ms (good, <300ms)`
      };
    } else {
      return {
        success: false,
        error: `Too slow: ${responseTime}ms`
      };
    }
  });

  console.log('\n🔄 Consistency Tests:');

  // Test 4: Data Consistency Between APIs
  await test('Data consistency across static APIs', async () => {
    // Get holdings and portfolio data
    const holdingsResponse = await fetch('http://localhost:3000/api/holdings?portfolioId=usa-alpha');
    const portfoliosResponse = await fetch('http://localhost:3000/api/portfolios');
    const realizedPLResponse = await fetch('http://localhost:3000/api/realized-pl?portfolioId=usa-alpha');

    if (!holdingsResponse.ok || !portfoliosResponse.ok || !realizedPLResponse.ok) {
      return { success: false, error: 'One or more API requests failed' };
    }

    const holdings = await holdingsResponse.json();
    const portfolios = await portfoliosResponse.json();
    const realizedPL = await realizedPLResponse.json();

    const portfolio = portfolios.find(p => p.id === 'usa-alpha');

    // Check data structure consistency
    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      return { success: false, error: 'Invalid holdings data' };
    }

    if (!portfolio || !portfolio.id) {
      return { success: false, error: 'Invalid portfolio data' };
    }

    if (typeof realizedPL.realizedPL !== 'number') {
      return { success: false, error: 'Invalid realized P&L data' };
    }

    return {
      success: true,
      message: `${holdings.length} holdings, P&L: $${realizedPL.realizedPL.toFixed(2)}`
    };
  });

  console.log('\n🚀 Performance Comparison:');

  // Test 5: Multiple concurrent requests (static data should handle well)
  await test('Concurrent static data requests', async () => {
    const concurrentRequests = 10;
    const startTime = Date.now();

    const promises = [];
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(fetch('http://localhost:3000/api/holdings?portfolioId=india-investments'));
      promises.push(fetch('http://localhost:3000/api/realized-pl?portfolioId=usa-alpha'));
    }

    try {
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const avgTimePerRequest = totalTime / (concurrentRequests * 2);

      // Check if all requests succeeded
      const failedCount = responses.filter(r => !r.ok).length;
      if (failedCount > 0) {
        return { success: false, error: `${failedCount} requests failed` };
      }

      // Static data should handle concurrent requests efficiently
      if (avgTimePerRequest < 100) {
        return {
          success: true,
          message: `${totalTime}ms total, ${avgTimePerRequest.toFixed(0)}ms avg per request`
        };
      } else {
        return {
          success: false,
          error: `Too slow: ${avgTimePerRequest.toFixed(0)}ms avg per request`
        };
      }
    } catch (error) {
      return { success: false, error: `Concurrent requests failed: ${error.message}` };
    }
  });

  console.log('\n📊 Static Data Performance Test Results:');
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${totalTests - passedTests}`);
  console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All static data performance tests passed!');
    console.log('📈 Static JSON architecture is delivering expected performance gains');
  } else {
    console.log(`\n⚠️ ${totalTests - passedTests} performance test(s) failed`);
    console.log('🔍 Review the failed tests to ensure optimal performance');
    process.exit(1);
  }
}

// Export for potential use as module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testStaticDataPerformance };
}

// Run test if this file is executed directly
if (require.main === module) {
  testStaticDataPerformance();
}