/**
 * CRITICAL: API Stress and Performance Tests
 * Tests system performance under load and concurrent access
 * Ensures system reliability under trading conditions
 */

async function testAPIStressPerformance() {
  console.log('🧪 CRITICAL: API Stress and Performance Tests');
  console.log('=============================================\n');

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
      failedTests.forEach({ name, error: error.message });
    }
  };

  console.log('⚡ Performance Benchmarks:');

  // Test single API response times
  await test('Market data API response time', async () => {
    const startTime = Date.now();
    const response = await fetch('http://localhost:3000/api/market-data?symbol=NVDA');
    const endTime = Date.now();
    
    if (!response.ok) return { success: false, error: 'API request failed' };
    
    const responseTime = endTime - startTime;
    if (responseTime > 3000) return { success: false, error: `Too slow: ${responseTime}ms` };
    
    return { success: true, responseTime };
  });

  await test('Holdings API response time', async () => {
    const startTime = Date.now();
    const response = await fetch('http://localhost:3000/api/holdings?portfolioId=india-investments');
    const endTime = Date.now();
    
    if (!response.ok) return { success: false, error: 'API request failed' };
    
    const responseTime = endTime - startTime;
    if (responseTime > 2000) return { success: false, error: `Too slow: ${responseTime}ms` };
    
    return { success: true, responseTime };
  });

  await test('Portfolios API response time', async () => {
    const startTime = Date.now();
    const response = await fetch('http://localhost:3000/api/portfolios');
    const endTime = Date.now();
    
    if (!response.ok) return { success: false, error: 'API request failed' };
    
    const responseTime = endTime - startTime;
    if (responseTime > 1000) return { success: false, error: `Too slow: ${responseTime}ms` };
    
    return { success: true, responseTime };
  });

  console.log('\n🔄 Concurrent Access Tests:');

  // Test concurrent API calls
  await test('Concurrent market data requests', async () => {
    const symbols = ['NVDA', 'MSFT', 'AAPL', 'TCS'];
    const startTime = Date.now();
    
    const promises = symbols.map(symbol => 
      fetch(`http://localhost:3000/api/market-data?symbol=${symbol}`)
    );
    
    const responses = await Promise.all(promises);
    const endTime = Date.now();
    
    const totalTime = endTime - startTime;
    
    // All should succeed
    for (let i = 0; i < responses.length; i++) {
      if (!responses[i].ok) {
        return { success: false, error: `${symbols[i]} request failed` };
      }
    }
    
    // Should be faster than sequential
    if (totalTime > 8000) return { success: false, error: `Concurrent requests too slow: ${totalTime}ms` };
    
    return { success: true, totalTime };
  });

  // Test concurrent holdings requests
  await test('Concurrent holdings requests', async () => {
    const portfolios = ['india-investments', 'usa-alpha', 'usa-sip'];
    const startTime = Date.now();
    
    const promises = portfolios.map(portfolioId => 
      fetch(`http://localhost:3000/api/holdings?portfolioId=${portfolioId}`)
    );
    
    const responses = await Promise.all(promises);
    const endTime = Date.now();
    
    const totalTime = endTime - startTime;
    
    // All should succeed
    for (let i = 0; i < responses.length; i++) {
      if (!responses[i].ok) {
        return { success: false, error: `${portfolios[i]} request failed` };
      }
    }
    
    if (totalTime > 5000) return { success: false, error: `Concurrent holdings too slow: ${totalTime}ms` };
    
    return { success: true, totalTime };
  });

  console.log('\n📈 Load Testing:');

  // Test rapid successive calls
  await test('Rapid successive API calls', async () => {
    const callCount = 10;
    const startTime = Date.now();
    
    const promises = [];
    for (let i = 0; i < callCount; i++) {
      promises.push(fetch('http://localhost:3000/api/portfolios'));
    }
    
    const responses = await Promise.all(promises);
    const endTime = Date.now();
    
    const totalTime = endTime - startTime;
    const avgTime = totalTime / callCount;
    
    // All should succeed
    const failedCount = responses.filter(r => !r.ok).length;
    if (failedCount > 0) return { success: false, error: `${failedCount}/${callCount} requests failed` };
    
    // Average response should be reasonable
    if (avgTime > 500) return { success: false, error: `Average response too slow: ${avgTime}ms` };
    
    return { success: true, avgTime };
  });

  console.log('\n🚨 Error Recovery Tests:');

  // Test invalid requests don't crash system
  await test('Invalid request handling', async () => {
    const invalidRequests = [
      'http://localhost:3000/api/market-data?symbol=INVALID123',
      'http://localhost:3000/api/holdings',
      'http://localhost:3000/api/holdings?portfolioId=invalid',
      'http://localhost:3000/api/market-data' // No symbol parameter
    ];
    
    for (const url of invalidRequests) {
      try {
        const response = await fetch(url);
        // Should return some response, not crash
        if (!response.ok && response.status >= 500) {
          return { success: false, error: `Server error for ${url}` };
        }
        
        // For successful responses, check they return valid JSON
        if (response.ok) {
          const data = await response.json();
          if (!data) {
            return { success: false, error: `No data returned for ${url}` };
          }
        }
      } catch (error) {
        return { success: false, error: `Request crashed system: ${url}` };
      }
    }
    
    return { success: true };
  });

  // Test system stability after stress
  await test('System stability after stress', async () => {
    // Run many requests to stress the system
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(fetch('http://localhost:3000/api/portfolios'));
      promises.push(fetch('http://localhost:3000/api/market-data?symbol=NVDA'));
      promises.push(fetch('http://localhost:3000/api/holdings?portfolioId=india-investments'));
    }
    
    await Promise.all(promises);
    
    // Verify system still responds correctly
    const testResponse = await fetch('http://localhost:3000/api/portfolios');
    if (!testResponse.ok) return { success: false, error: 'System unresponsive after stress' };
    
    const data = await testResponse.json();
    if (!Array.isArray(data) || data.length === 0) {
      return { success: false, error: 'Invalid data after stress test' };
    }
    
    return { success: true };
  });

  console.log('\n🔄 Refresh Operation Tests:');

  // Test refresh operation performance
  await test('Refresh operation performance', async () => {
    const startTime = Date.now();
    const response = await fetch('http://localhost:3000/api/refresh', { method: 'POST' });
    const endTime = Date.now();
    
    if (!response.ok) return { success: false, error: 'Refresh failed' };
    
    const refreshTime = endTime - startTime;
    if (refreshTime > 10000) return { success: false, error: `Refresh too slow: ${refreshTime}ms` };
    
    const data = await response.json();
    if (!data.success) return { success: false, error: 'Refresh reported failure' };
    
    return { success: true, refreshTime };
  });

  // Test system responsiveness during refresh
  await test('System responsiveness during refresh', async () => {
    // Start refresh in background
    const refreshPromise = fetch('http://localhost:3000/api/refresh', { method: 'POST' });
    
    // Test other APIs while refresh is running
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    const portfoliosResponse = await fetch('http://localhost:3000/api/portfolios');
    if (!portfoliosResponse.ok) return { success: false, error: 'Portfolios API failed during refresh' };
    
    const holdingsResponse = await fetch('http://localhost:3000/api/holdings?portfolioId=india-investments');
    if (!holdingsResponse.ok) return { success: false, error: 'Holdings API failed during refresh' };
    
    // Wait for refresh to complete
    const refreshResponse = await refreshPromise;
    if (!refreshResponse.ok) return { success: false, error: 'Refresh failed' };
    
    return { success: true };
  });

  console.log('\n🛡️ Security and Rate Limiting:');

  // Test for potential memory leaks (simplified)
  await test('Memory usage stability', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Make many requests
    for (let i = 0; i < 50; i++) {
      await fetch('http://localhost:3000/api/portfolios');
    }
    
    // Force garbage collection if available
    if (global.gc) global.gc();
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (less than 50MB)
    if (memoryIncrease > 50 * 1024 * 1024) {
      return { success: false, error: `Excessive memory usage: ${(memoryIncrease / 1024 / 1024).toFixed(1)}MB` };
    }
    
    return { success: true, memoryIncrease: (memoryIncrease / 1024 / 1024).toFixed(1) };
  });

  // Results
  console.log('\n📊 API Stress Test Results:');
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${totalTests - passedTests}`);
  console.log(`   Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS (PERFORMANCE/RELIABILITY):');
    failedTests.forEach(test => console.log(`   • ${test.name}: ${test.error}`));
  }
  
  const success = passedTests === totalTests;
  if (success) {
    console.log('\n✅ SYSTEM PERFORMANCE ACCEPTABLE - READY FOR PRODUCTION LOAD');
  } else {
    console.log('\n🚨 PERFORMANCE ISSUES DETECTED - SCALING CONCERNS');
  }
  
  return success;
}

// Run tests if called directly
if (require.main === module) {
  testAPIStressPerformance()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 CRITICAL: API stress test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testAPIStressPerformance };
