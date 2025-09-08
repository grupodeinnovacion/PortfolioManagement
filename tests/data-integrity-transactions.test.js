/**
 * CRITICAL: Data Integrity and Transaction Tests
 * Tests transaction processing, cash position management, and data consistency
 * Ensures financial transactions are processed accurately
 */

async function testDataIntegrityTransactions() {
  console.log('🧪 CRITICAL: Data Integrity and Transaction Tests');
  console.log('================================================\n');

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

  console.log('💳 Transaction Data Validation:');

  // Test transaction data integrity
  await test('Transaction data completeness', async () => {
    const response = await fetch('http://localhost:3000/api/transactions');
    const transactions = await response.json();
    
    if (!Array.isArray(transactions)) return { success: false, error: 'Transactions not an array' };
    if (transactions.length === 0) return { success: false, error: 'No transactions found' };
    
    for (const transaction of transactions) {
      // Required fields
      if (!transaction.id) return { success: false, error: 'Missing transaction ID' };
      if (!transaction.portfolioId) return { success: false, error: 'Missing portfolio ID' };
      if (!transaction.ticker) return { success: false, error: 'Missing ticker' };
      if (!transaction.action || !['BUY', 'SELL'].includes(transaction.action)) {
        return { success: false, error: `Invalid action: ${transaction.action}` };
      }
      if (!transaction.quantity || transaction.quantity <= 0) {
        return { success: false, error: `Invalid quantity: ${transaction.quantity}` };
      }
      if (!transaction.tradePrice || transaction.tradePrice <= 0) {
        return { success: false, error: `Invalid trade price: ${transaction.tradePrice}` };
      }
      if (!transaction.currency) return { success: false, error: 'Missing currency' };
      if (!transaction.date) return { success: false, error: 'Missing date' };
      
      // Validate date format
      const date = new Date(transaction.date);
      if (isNaN(date.getTime())) return { success: false, error: 'Invalid date format' };
      
      // Validate fees (can be 0 but must be present)
      if (typeof transaction.fees !== 'number' || transaction.fees < 0) {
        return { success: false, error: `Invalid fees: ${transaction.fees}` };
      }
    }
    
    return { success: true };
  });

  // Test transaction-portfolio consistency
  await test('Transaction-Portfolio consistency', async () => {
    const transactionsResponse = await fetch('http://localhost:3000/api/transactions');
    const portfoliosResponse = await fetch('http://localhost:3000/api/portfolios');
    
    const transactions = await transactionsResponse.json();
    const portfolios = await portfoliosResponse.json();
    
    const portfolioIds = new Set(portfolios.map(p => p.id));
    
    for (const transaction of transactions) {
      if (!portfolioIds.has(transaction.portfolioId)) {
        return { success: false, error: `Transaction ${transaction.id} references non-existent portfolio ${transaction.portfolioId}` };
      }
    }
    
    return { success: true };
  });

  console.log('\n💰 Cash Position Tests:');

  // Test cash position data integrity
  await test('Cash position data integrity', async () => {
    const response = await fetch('http://localhost:3000/api/cash-position');
    const cashPositions = await response.json();
    
    if (typeof cashPositions !== 'object') return { success: false, error: 'Cash positions not an object' };
    
    for (const [portfolioId, amount] of Object.entries(cashPositions)) {
      if (typeof amount !== 'number') return { success: false, error: `Invalid cash amount for ${portfolioId}` };
      if (amount < 0) return { success: false, error: `Negative cash position for ${portfolioId}: ${amount}` };
    }
    
    return { success: true };
  });

  // Test cash-portfolio consistency
  await test('Cash-Portfolio consistency', async () => {
    const cashResponse = await fetch('http://localhost:3000/api/cash-position');
    const portfoliosResponse = await fetch('http://localhost:3000/api/portfolios');
    
    const cashPositions = await cashResponse.json();
    const portfolios = await portfoliosResponse.json();
    
    for (const portfolio of portfolios) {
      const cashAmount = cashPositions[portfolio.id];
      
      if (typeof cashAmount !== 'number') {
        return { success: false, error: `No cash position for portfolio ${portfolio.id}` };
      }
      
      // Check if portfolio.cashPosition matches separate cash-position
      if (Math.abs(portfolio.cashPosition - cashAmount) > 0.01) {
        return { success: false, error: `Cash position mismatch for ${portfolio.id}: ${portfolio.cashPosition} vs ${cashAmount}` };
      }
    }
    
    return { success: true };
  });

  console.log('\n🔄 Holdings-Transaction Consistency:');

  // Test holdings calculation from transactions
  await test('Holdings match transactions (India)', async () => {
    const transactionsResponse = await fetch('http://localhost:3000/api/transactions');
    const holdingsResponse = await fetch('http://localhost:3000/api/holdings?portfolioId=india-investments');
    
    const allTransactions = await transactionsResponse.json();
    const holdings = await holdingsResponse.json();
    
    const indiaTransactions = allTransactions.filter(t => t.portfolioId === 'india-investments');
    
    // Calculate expected holdings from transactions
    const expectedHoldings = {};
    for (const transaction of indiaTransactions) {
      if (!expectedHoldings[transaction.ticker]) {
        expectedHoldings[transaction.ticker] = {
          quantity: 0,
          totalCost: 0
        };
      }
      
      if (transaction.action === 'BUY') {
        expectedHoldings[transaction.ticker].quantity += transaction.quantity;
        expectedHoldings[transaction.ticker].totalCost += transaction.quantity * transaction.tradePrice;
      } else if (transaction.action === 'SELL') {
        expectedHoldings[transaction.ticker].quantity -= transaction.quantity;
        // For FIFO, we'd need to calculate the cost basis properly
      }
    }
    
    // Verify holdings match
    for (const holding of holdings) {
      const expected = expectedHoldings[holding.ticker];
      if (!expected) return { success: false, error: `Unexpected holding: ${holding.ticker}` };
      
      if (Math.abs(holding.quantity - expected.quantity) > 0.001) {
        return { success: false, error: `Quantity mismatch for ${holding.ticker}: ${holding.quantity} vs ${expected.quantity}` };
      }
      
      const expectedAvgPrice = expected.totalCost / expected.quantity;
      if (Math.abs(holding.avgBuyPrice - expectedAvgPrice) > 0.01) {
        return { success: false, error: `Avg price mismatch for ${holding.ticker}: ${holding.avgBuyPrice} vs ${expectedAvgPrice}` };
      }
    }
    
    return { success: true };
  });

  console.log('\n📊 Settings and Configuration:');

  // Test settings data integrity
  await test('Settings data integrity', async () => {
    const response = await fetch('http://localhost:3000/api/settings');
    const settings = await response.json();
    
    if (!settings.general) return { success: false, error: 'Missing general settings' };
    if (!settings.general.baseCurrency) return { success: false, error: 'Missing base currency' };
    if (!settings.general.refreshInterval) return { success: false, error: 'Missing refresh interval' };
    
    const validCurrencies = ['USD', 'INR', 'EUR', 'GBP'];
    if (!validCurrencies.includes(settings.general.baseCurrency)) {
      return { success: false, error: `Invalid base currency: ${settings.general.baseCurrency}` };
    }
    
    if (typeof settings.general.refreshInterval !== 'number' || settings.general.refreshInterval <= 0) {
      return { success: false, error: `Invalid refresh interval: ${settings.general.refreshInterval}` };
    }
    
    return { success: true };
  });

  console.log('\n🔒 API Security and Error Handling:');

  // Test API error handling
  await test('API error handling', async () => {
    // Test invalid portfolio ID
    const response1 = await fetch('http://localhost:3000/api/holdings?portfolioId=');
    if (response1.status !== 400) return { success: false, error: 'Should return 400 for empty portfolio ID' };
    
    // Test missing parameters
    const response2 = await fetch('http://localhost:3000/api/holdings');
    if (response2.status !== 400) return { success: false, error: 'Should return 400 for missing portfolio ID' };
    
    return { success: true };
  });

  // Test data consistency after refresh
  await test('Data consistency after refresh', async () => {
    // Get initial state
    const initialPortfolios = await fetch('http://localhost:3000/api/portfolios').then(r => r.json());
    const initialHoldings = await fetch('http://localhost:3000/api/holdings?portfolioId=india-investments').then(r => r.json());
    
    // Trigger refresh
    const refreshResponse = await fetch('http://localhost:3000/api/refresh', { method: 'POST' });
    if (!refreshResponse.ok) return { success: false, error: 'Refresh failed' };
    
    // Get state after refresh
    const afterPortfolios = await fetch('http://localhost:3000/api/portfolios').then(r => r.json());
    const afterHoldings = await fetch('http://localhost:3000/api/holdings?portfolioId=india-investments').then(r => r.json());
    
    // Verify data structure consistency (quantities shouldn't change)
    const initialPortfolio = initialPortfolios.find(p => p.id === 'india-investments');
    const afterPortfolio = afterPortfolios.find(p => p.id === 'india-investments');
    
    if (Math.abs(initialPortfolio.totalInvested - afterPortfolio.totalInvested) > 0.01) {
      return { success: false, error: 'Total invested changed after refresh' };
    }
    
    if (initialHoldings.length !== afterHoldings.length) {
      return { success: false, error: 'Number of holdings changed after refresh' };
    }
    
    // Quantities should remain the same
    if (Math.abs(initialHoldings[0].quantity - afterHoldings[0].quantity) > 0.001) {
      return { success: false, error: 'Holding quantity changed after refresh' };
    }
    
    return { success: true };
  });

  // Results
  console.log('\n📊 Data Integrity Test Results:');
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${totalTests - passedTests}`);
  console.log(`   Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS (CRITICAL - DATA INTEGRITY):');
    failedTests.forEach(test => console.log(`   • ${test.name}: ${test.error}`));
  }
  
  const success = passedTests === totalTests;
  if (success) {
    console.log('\n✅ ALL DATA INTEGRITY CHECKS PASSED - SAFE FOR PRODUCTION');
  } else {
    console.log('\n🚨 DATA INTEGRITY ISSUES DETECTED - CORRUPTION RISK');
  }
  
  return success;
}

// Run tests if called directly
if (require.main === module) {
  testDataIntegrityTransactions()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 CRITICAL: Data integrity test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testDataIntegrityTransactions };
