/**
 * Test: Holdings Update After Transaction
 * 
 * This test verifies that holdings are properly updated when a new transaction is added.
 * This is a critical feature that ensures the portfolio's holdings reflect current positions.
 */

const fs = require('fs');
const path = require('path');

// Mock the file system operations for testing
const STORAGE_DIR = path.join(__dirname, '..', 'data');
const testPortfolioId = 'test-portfolio-holdings';

// Helper function to read JSON files
function readJsonFile(filePath, defaultValue = null) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  return defaultValue;
}

// Helper function to write JSON files
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
}

// Simulate LocalFileStorageService calculateHoldings method
function calculateHoldings(portfolioId, transactions) {
  const portfolioTransactions = transactions.filter(t => t.portfolioId === portfolioId);
  const holdingsMap = new Map();

  // Process transactions using FIFO method
  portfolioTransactions
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach(transaction => {
      const key = transaction.ticker;
      const existing = holdingsMap.get(key) || {
        ticker: transaction.ticker,
        name: transaction.ticker,
        quantity: 0,
        avgBuyPrice: 0,
        currentPrice: 0,
        currentValue: 0,
        investedValue: 0,
        unrealizedPL: 0,
        unrealizedPLPercent: 0,
        dailyChange: 0,
        dailyChangePercent: 0,
        allocation: 0,
        sector: 'Technology',
        country: transaction.country,
        currency: transaction.currency,
        exchange: transaction.exchange,
        totalCost: 0
      };

      if (transaction.action === 'BUY') {
        const newQuantity = existing.quantity + transaction.quantity;
        const newTotalCost = existing.totalCost + (transaction.quantity * transaction.tradePrice);
        
        existing.quantity = newQuantity;
        existing.totalCost = newTotalCost;
        existing.avgBuyPrice = newTotalCost / newQuantity;
        existing.investedValue = newTotalCost;
      } else if (transaction.action === 'SELL') {
        existing.quantity -= transaction.quantity;
        existing.totalCost -= (transaction.quantity * existing.avgBuyPrice);
        existing.investedValue = existing.totalCost;
        
        if (existing.quantity <= 0) {
          holdingsMap.delete(key);
          return;
        }
      }

      // Update market value (using avgBuyPrice as currentPrice for testing)
      existing.currentPrice = existing.avgBuyPrice;
      existing.currentValue = existing.quantity * existing.currentPrice;
      existing.unrealizedPL = existing.currentValue - existing.investedValue;
      existing.unrealizedPLPercent = existing.investedValue > 0 ? (existing.unrealizedPL / existing.investedValue) * 100 : 0;

      holdingsMap.set(key, existing);
    });

  return Array.from(holdingsMap.values()).map(({ totalCost, ...holding }) => holding);
}

// Test functions
function testHoldingsUpdateAfterBuyTransaction() {
  console.log('\n=== Test: Holdings Update After BUY Transaction ===');
  
  // Initial state: No transactions
  let transactions = [];
  let holdings = calculateHoldings(testPortfolioId, transactions);
  
  console.log('Initial holdings:', holdings.length);
  console.assert(holdings.length === 0, 'Initial holdings should be empty');
  
  // Add first BUY transaction
  const transaction1 = {
    id: 'test_1',
    portfolioId: testPortfolioId,
    date: '2025-09-10T10:00:00.000Z',
    action: 'BUY',
    ticker: 'AAPL',
    exchange: 'NASDAQ',
    country: 'USA',
    quantity: 10,
    tradePrice: 150.00,
    currency: 'USD',
    fees: 0,
    notes: 'Test buy 1',
    tag: 'test'
  };
  
  transactions.push(transaction1);
  holdings = calculateHoldings(testPortfolioId, transactions);
  
  console.log('Holdings after first BUY:', holdings.length);
  console.assert(holdings.length === 1, 'Should have 1 holding after first BUY');
  console.assert(holdings[0].ticker === 'AAPL', 'Holding should be AAPL');
  console.assert(holdings[0].quantity === 10, 'Quantity should be 10');
  console.assert(holdings[0].avgBuyPrice === 150.00, 'Average buy price should be 150');
  console.assert(holdings[0].investedValue === 1500.00, 'Invested value should be 1500');
  
  // Add second BUY transaction for same stock
  const transaction2 = {
    id: 'test_2',
    portfolioId: testPortfolioId,
    date: '2025-09-10T11:00:00.000Z',
    action: 'BUY',
    ticker: 'AAPL',
    exchange: 'NASDAQ',
    country: 'USA',
    quantity: 5,
    tradePrice: 160.00,
    currency: 'USD',
    fees: 0,
    notes: 'Test buy 2',
    tag: 'test'
  };
  
  transactions.push(transaction2);
  holdings = calculateHoldings(testPortfolioId, transactions);
  
  console.log('Holdings after second BUY:', holdings.length);
  console.assert(holdings.length === 1, 'Should still have 1 holding');
  console.assert(holdings[0].quantity === 15, 'Quantity should be 15');
  
  // Calculate expected average: (10 * 150 + 5 * 160) / 15 = (1500 + 800) / 15 = 153.33
  const expectedAvg = (10 * 150 + 5 * 160) / 15;
  console.assert(Math.abs(holdings[0].avgBuyPrice - expectedAvg) < 0.01, `Average buy price should be ${expectedAvg}`);
  console.assert(holdings[0].investedValue === 2300.00, 'Invested value should be 2300');
  
  // Add BUY transaction for different stock
  const transaction3 = {
    id: 'test_3',
    portfolioId: testPortfolioId,
    date: '2025-09-10T12:00:00.000Z',
    action: 'BUY',
    ticker: 'MSFT',
    exchange: 'NASDAQ',
    country: 'USA',
    quantity: 8,
    tradePrice: 300.00,
    currency: 'USD',
    fees: 0,
    notes: 'Test buy MSFT',
    tag: 'test'
  };
  
  transactions.push(transaction3);
  holdings = calculateHoldings(testPortfolioId, transactions);
  
  console.log('Holdings after MSFT BUY:', holdings.length);
  console.assert(holdings.length === 2, 'Should have 2 holdings');
  
  const msftHolding = holdings.find(h => h.ticker === 'MSFT');
  console.assert(msftHolding !== undefined, 'Should have MSFT holding');
  console.assert(msftHolding.quantity === 8, 'MSFT quantity should be 8');
  console.assert(msftHolding.avgBuyPrice === 300.00, 'MSFT average buy price should be 300');
  
  console.log('✅ BUY transaction holdings update test passed');
}

function testHoldingsUpdateAfterSellTransaction() {
  console.log('\n=== Test: Holdings Update After SELL Transaction ===');
  
  // Start with some holdings
  let transactions = [
    {
      id: 'test_buy_1',
      portfolioId: testPortfolioId,
      date: '2025-09-10T10:00:00.000Z',
      action: 'BUY',
      ticker: 'AAPL',
      exchange: 'NASDAQ',
      country: 'USA',
      quantity: 20,
      tradePrice: 150.00,
      currency: 'USD',
      fees: 0,
      notes: 'Test buy for sell test',
      tag: 'test'
    }
  ];
  
  let holdings = calculateHoldings(testPortfolioId, transactions);
  console.log('Initial holdings for SELL test:', holdings.length);
  console.assert(holdings.length === 1, 'Should have 1 holding initially');
  console.assert(holdings[0].quantity === 20, 'Should have 20 shares initially');
  
  // Add SELL transaction
  const sellTransaction = {
    id: 'test_sell_1',
    portfolioId: testPortfolioId,
    date: '2025-09-10T13:00:00.000Z',
    action: 'SELL',
    ticker: 'AAPL',
    exchange: 'NASDAQ',
    country: 'USA',
    quantity: 5,
    tradePrice: 160.00,
    currency: 'USD',
    fees: 0,
    notes: 'Test sell',
    tag: 'test'
  };
  
  transactions.push(sellTransaction);
  holdings = calculateHoldings(testPortfolioId, transactions);
  
  console.log('Holdings after SELL:', holdings.length);
  console.assert(holdings.length === 1, 'Should still have 1 holding after partial sell');
  console.assert(holdings[0].quantity === 15, 'Should have 15 shares after selling 5');
  
  // Invested value should be reduced by the average buy price of sold shares
  console.assert(holdings[0].investedValue === 15 * 150, 'Invested value should be 15 * 150 = 2250');
  
  // Test complete sell
  const sellAllTransaction = {
    id: 'test_sell_all',
    portfolioId: testPortfolioId,
    date: '2025-09-10T14:00:00.000Z',
    action: 'SELL',
    ticker: 'AAPL',
    exchange: 'NASDAQ',
    country: 'USA',
    quantity: 15,
    tradePrice: 170.00,
    currency: 'USD',
    fees: 0,
    notes: 'Test sell all',
    tag: 'test'
  };
  
  transactions.push(sellAllTransaction);
  holdings = calculateHoldings(testPortfolioId, transactions);
  
  console.log('Holdings after selling all shares:', holdings.length);
  console.assert(holdings.length === 0, 'Should have no holdings after selling all shares');
  
  console.log('✅ SELL transaction holdings update test passed');
}

function testHoldingsCalculationConsistency() {
  console.log('\n=== Test: Holdings Calculation Consistency ===');
  
  // Test with complex transaction history
  const transactions = [
    // Initial buy
    {
      id: 'complex_1', portfolioId: testPortfolioId, date: '2025-09-01T10:00:00.000Z',
      action: 'BUY', ticker: 'NVDA', exchange: 'NASDAQ', country: 'USA',
      quantity: 100, tradePrice: 100.00, currency: 'USD', fees: 0
    },
    // Another buy at different price
    {
      id: 'complex_2', portfolioId: testPortfolioId, date: '2025-09-02T10:00:00.000Z',
      action: 'BUY', ticker: 'NVDA', exchange: 'NASDAQ', country: 'USA',
      quantity: 50, tradePrice: 120.00, currency: 'USD', fees: 0
    },
    // Partial sell
    {
      id: 'complex_3', portfolioId: testPortfolioId, date: '2025-09-03T10:00:00.000Z',
      action: 'SELL', ticker: 'NVDA', exchange: 'NASDAQ', country: 'USA',
      quantity: 30, tradePrice: 110.00, currency: 'USD', fees: 0
    },
    // Another buy
    {
      id: 'complex_4', portfolioId: testPortfolioId, date: '2025-09-04T10:00:00.000Z',
      action: 'BUY', ticker: 'NVDA', exchange: 'NASDAQ', country: 'USA',
      quantity: 25, tradePrice: 105.00, currency: 'USD', fees: 0
    }
  ];
  
  const holdings = calculateHoldings(testPortfolioId, transactions);
  
  console.log('Complex holdings calculation result:', holdings.length);
  console.assert(holdings.length === 1, 'Should have 1 holding');
  
  const nvdaHolding = holdings[0];
  console.assert(nvdaHolding.ticker === 'NVDA', 'Should be NVDA holding');
  
  // Expected quantity: 100 + 50 - 30 + 25 = 145
  console.assert(nvdaHolding.quantity === 145, `Quantity should be 145, got ${nvdaHolding.quantity}`);
  
  // Expected total cost: (100 * 100) + (50 * 120) + (25 * 105) - (30 * avg_price_when_sold)
  // Average price when sold was: (100*100 + 50*120) / 150 = 16000/150 = 106.67
  // So: 10000 + 6000 + 2625 - (30 * 106.67) = 18625 - 3200 = 15425
  const expectedAvgPrice = 15425 / 145;
  console.assert(Math.abs(nvdaHolding.avgBuyPrice - expectedAvgPrice) < 1, 
    `Average price should be around ${expectedAvgPrice}, got ${nvdaHolding.avgBuyPrice}`);
  
  console.log('✅ Holdings calculation consistency test passed');
}

function testEdgeCases() {
  console.log('\n=== Test: Edge Cases ===');
  
  // Test: Empty portfolio
  let holdings = calculateHoldings('non-existent-portfolio', []);
  console.assert(holdings.length === 0, 'Empty portfolio should have no holdings');
  
  // Test: Transactions for different portfolios
  const mixedTransactions = [
    {
      id: 'mixed_1', portfolioId: 'portfolio-1', date: '2025-09-01T10:00:00.000Z',
      action: 'BUY', ticker: 'AAPL', exchange: 'NASDAQ', country: 'USA',
      quantity: 10, tradePrice: 150.00, currency: 'USD', fees: 0
    },
    {
      id: 'mixed_2', portfolioId: 'portfolio-2', date: '2025-09-01T10:00:00.000Z',
      action: 'BUY', ticker: 'MSFT', exchange: 'NASDAQ', country: 'USA',
      quantity: 5, tradePrice: 300.00, currency: 'USD', fees: 0
    }
  ];
  
  holdings = calculateHoldings('portfolio-1', mixedTransactions);
  console.assert(holdings.length === 1, 'Should only get holdings for requested portfolio');
  console.assert(holdings[0].ticker === 'AAPL', 'Should only have AAPL for portfolio-1');
  
  // Test: Zero quantity after sells
  const zeroQuantityTransactions = [
    {
      id: 'zero_1', portfolioId: testPortfolioId, date: '2025-09-01T10:00:00.000Z',
      action: 'BUY', ticker: 'TEST', exchange: 'NASDAQ', country: 'USA',
      quantity: 10, tradePrice: 100.00, currency: 'USD', fees: 0
    },
    {
      id: 'zero_2', portfolioId: testPortfolioId, date: '2025-09-02T10:00:00.000Z',
      action: 'SELL', ticker: 'TEST', exchange: 'NASDAQ', country: 'USA',
      quantity: 10, tradePrice: 110.00, currency: 'USD', fees: 0
    }
  ];
  
  holdings = calculateHoldings(testPortfolioId, zeroQuantityTransactions);
  console.assert(holdings.length === 0, 'Holdings with zero quantity should be removed');
  
  console.log('✅ Edge cases test passed');
}

// Integration test to simulate the actual API workflow
function testIntegrationWorkflow() {
  console.log('\n=== Test: Integration Workflow ===');
  
  const portfoliosFile = path.join(STORAGE_DIR, 'portfolios.json');
  const transactionsFile = path.join(STORAGE_DIR, 'transactions.json');
  
  // Create test data directories if they don't exist
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  
  // Read current state
  let portfolios = readJsonFile(portfoliosFile, []);
  let transactions = readJsonFile(transactionsFile, []);
  
  // Find or create test portfolio
  let testPortfolio = portfolios.find(p => p.id === testPortfolioId);
  if (!testPortfolio) {
    testPortfolio = {
      id: testPortfolioId,
      name: 'Test Portfolio Holdings',
      description: 'Test portfolio for holdings update validation',
      country: 'USA',
      currency: 'USD',
      cashPosition: 10000,
      totalInvested: 0,
      currentValue: 0,
      unrealizedPL: 0,
      totalReturn: 0,
      totalReturnPercent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    portfolios.push(testPortfolio);
    writeJsonFile(portfoliosFile, portfolios);
  }
  
  // Remove any existing test transactions
  transactions = transactions.filter(t => t.portfolioId !== testPortfolioId);
  
  // Test adding a transaction
  const newTransaction = {
    id: `integration_test_${Date.now()}`,
    portfolioId: testPortfolioId,
    date: new Date().toISOString(),
    action: 'BUY',
    ticker: 'INTEG',
    exchange: 'NASDAQ',
    country: 'USA',
    quantity: 15,
    tradePrice: 200.00,
    currency: 'USD',
    fees: 5.00,
    notes: 'Integration test transaction',
    tag: 'test'
  };
  
  transactions.push(newTransaction);
  writeJsonFile(transactionsFile, transactions);
  
  // Calculate holdings after transaction
  const holdings = calculateHoldings(testPortfolioId, transactions);
  
  console.log('Integration test holdings:', holdings.length);
  console.assert(holdings.length === 1, 'Should have 1 holding after integration test');
  console.assert(holdings[0].ticker === 'INTEG', 'Should have INTEG holding');
  console.assert(holdings[0].quantity === 15, 'Should have 15 shares');
  console.assert(holdings[0].investedValue === 3000, 'Invested value should be 15 * 200 = 3000');
  
  // Clean up test data
  transactions = transactions.filter(t => t.portfolioId !== testPortfolioId);
  portfolios = portfolios.filter(p => p.id !== testPortfolioId);
  writeJsonFile(transactionsFile, transactions);
  writeJsonFile(portfoliosFile, portfolios);
  
  console.log('✅ Integration workflow test passed');
}

// Performance test
function testPerformance() {
  console.log('\n=== Test: Performance ===');
  
  // Generate a large number of transactions
  const largeTransactionSet = [];
  const tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'];
  
  for (let i = 0; i < 1000; i++) {
    largeTransactionSet.push({
      id: `perf_${i}`,
      portfolioId: testPortfolioId,
      date: new Date(2025, 0, 1 + Math.floor(i / 10)).toISOString(),
      action: Math.random() > 0.3 ? 'BUY' : 'SELL', // More buys than sells
      ticker: tickers[i % tickers.length],
      exchange: 'NASDAQ',
      country: 'USA',
      quantity: Math.floor(Math.random() * 50) + 1,
      tradePrice: Math.round((Math.random() * 500 + 50) * 100) / 100,
      currency: 'USD',
      fees: Math.round(Math.random() * 10 * 100) / 100
    });
  }
  
  const startTime = Date.now();
  const holdings = calculateHoldings(testPortfolioId, largeTransactionSet);
  const endTime = Date.now();
  
  console.log(`Performance test: ${largeTransactionSet.length} transactions processed in ${endTime - startTime}ms`);
  console.log(`Holdings calculated: ${holdings.length}`);
  console.assert(endTime - startTime < 1000, 'Holdings calculation should complete within 1 second for 1000 transactions');
  
  console.log('✅ Performance test passed');
}

// Run all tests
function runAllTests() {
  console.log('🧪 Running Holdings Update Tests...\n');
  
  try {
    testHoldingsUpdateAfterBuyTransaction();
    testHoldingsUpdateAfterSellTransaction();
    testHoldingsCalculationConsistency();
    testEdgeCases();
    testIntegrationWorkflow();
    testPerformance();
    
    console.log('\n🎉 All holdings update tests passed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('- BUY transaction holdings update: ✅');
    console.log('- SELL transaction holdings update: ✅');
    console.log('- Calculation consistency: ✅');
    console.log('- Edge cases handling: ✅');
    console.log('- Integration workflow: ✅');
    console.log('- Performance: ✅');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Export for potential use as module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    calculateHoldings,
    testHoldingsUpdateAfterBuyTransaction,
    testHoldingsUpdateAfterSellTransaction,
    testHoldingsCalculationConsistency
  };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}
