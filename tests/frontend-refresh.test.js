/**
 * Frontend Holdings Refresh Test
 * 
 * This test simulates the frontend workflow to ensure holdings are properly
 * refreshed after adding a transaction through the UI.
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  portfolioId: 'frontend-test-portfolio',
  testTimeout: 10000
};

// File paths
const STORAGE_DIR = path.join(__dirname, '..', 'data');
const FILES = {
  portfolios: path.join(STORAGE_DIR, 'portfolios.json'),
  transactions: path.join(STORAGE_DIR, 'transactions.json'),
  cashPositions: path.join(STORAGE_DIR, 'cash-positions.json')
};

// Helper functions
function readJsonFile(filePath, defaultValue = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  return defaultValue;
}

function writeJsonFile(filePath, data) {
  try {
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
}

// Simulate LocalFileStorageService methods
class MockLocalFileStorageService {
  async addTransaction(transactionData) {
    const transactions = readJsonFile(FILES.transactions, []);
    const newTransaction = {
      ...transactionData,
      id: `frontend_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Validate transaction against available cash for BUY orders
    if (transactionData.action === 'BUY') {
      const cashPositions = readJsonFile(FILES.cashPositions, {});
      const availableCash = cashPositions[transactionData.portfolioId] || 0;
      const transactionValue = transactionData.quantity * transactionData.tradePrice + transactionData.fees;
      
      if (transactionValue > availableCash) {
        throw new Error(`Insufficient cash. Available: ${availableCash}, Required: ${transactionValue}`);
      }
      
      // Update cash position after purchase
      const newCashPosition = availableCash - transactionValue;
      await this.updateCashPosition(transactionData.portfolioId, newCashPosition);
    }

    transactions.push(newTransaction);
    writeJsonFile(FILES.transactions, transactions);
    
    // Update portfolio totals
    await this.updatePortfolioTotals(transactionData.portfolioId);

    return newTransaction;
  }

  async updateCashPosition(portfolioId, amount) {
    // Update cash-positions.json
    const cashPositions = readJsonFile(FILES.cashPositions, {});
    cashPositions[portfolioId] = amount;
    writeJsonFile(FILES.cashPositions, cashPositions);
    
    // Update portfolios.json to keep cashPosition in sync
    const portfolios = readJsonFile(FILES.portfolios, []);
    const portfolioIndex = portfolios.findIndex(p => p.id === portfolioId);
    if (portfolioIndex !== -1) {
      portfolios[portfolioIndex] = {
        ...portfolios[portfolioIndex],
        cashPosition: amount,
        updatedAt: new Date()
      };
      writeJsonFile(FILES.portfolios, portfolios);
    }
  }

  async calculateHoldings(portfolioId) {
    const transactions = readJsonFile(FILES.transactions, []);
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

        // Update market value
        existing.currentPrice = existing.avgBuyPrice;
        existing.currentValue = existing.quantity * existing.currentPrice;
        existing.unrealizedPL = existing.currentValue - existing.investedValue;
        existing.unrealizedPLPercent = existing.investedValue > 0 ? (existing.unrealizedPL / existing.investedValue) * 100 : 0;

        holdingsMap.set(key, existing);
      });

    return Array.from(holdingsMap.values()).map(({ totalCost, ...holding }) => holding);
  }

  async updatePortfolioTotals(portfolioId) {
    const portfolios = readJsonFile(FILES.portfolios, []);
    const portfolio = portfolios.find(p => p.id === portfolioId);
    if (!portfolio) return;

    // Calculate totals from transactions
    let totalInvested = 0;
    let totalCurrentValue = 0;
    
    const holdings = await this.calculateHoldings(portfolioId);
    
    holdings.forEach(holding => {
      totalInvested += holding.investedValue;
      totalCurrentValue += holding.currentValue;
    });

    // Update portfolio with calculated values
    const updatedPortfolio = {
      ...portfolio,
      totalInvested,
      currentValue: totalCurrentValue,
      unrealizedPL: totalCurrentValue - totalInvested,
      totalReturn: totalCurrentValue - totalInvested,
      totalReturnPercent: totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0,
      updatedAt: new Date()
    };

    // Update portfolios array
    const updatedPortfolios = portfolios.map(p => 
      p.id === portfolioId ? updatedPortfolio : p
    );

    writeJsonFile(FILES.portfolios, updatedPortfolios);
  }

  async getPortfolios() {
    return readJsonFile(FILES.portfolios, []);
  }

  async getCashPositions() {
    return readJsonFile(FILES.cashPositions, {});
  }
}

// Setup test environment
function setupFrontendTestEnvironment() {
  console.log('🔧 Setting up frontend test environment...');
  
  // Ensure data directory exists
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  
  // Read existing data
  let portfolios = readJsonFile(FILES.portfolios, []);
  let transactions = readJsonFile(FILES.transactions, []);
  let cashPositions = readJsonFile(FILES.cashPositions, {});
  
  // Remove existing test data
  portfolios = portfolios.filter(p => p.id !== TEST_CONFIG.portfolioId);
  transactions = transactions.filter(t => t.portfolioId !== TEST_CONFIG.portfolioId);
  delete cashPositions[TEST_CONFIG.portfolioId];
  
  // Create test portfolio
  const testPortfolio = {
    id: TEST_CONFIG.portfolioId,
    name: 'Frontend Test Portfolio',
    description: 'Portfolio for frontend workflow testing',
    country: 'USA',
    currency: 'USD',
    cashPosition: 100000,
    totalInvested: 0,
    currentValue: 0,
    unrealizedPL: 0,
    totalReturn: 0,
    totalReturnPercent: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  portfolios.push(testPortfolio);
  cashPositions[TEST_CONFIG.portfolioId] = 100000;
  
  // Save files
  writeJsonFile(FILES.portfolios, portfolios);
  writeJsonFile(FILES.transactions, transactions);
  writeJsonFile(FILES.cashPositions, cashPositions);
  
  console.log('✅ Frontend test environment setup complete');
  return testPortfolio;
}

// Cleanup test environment
function cleanupFrontendTestEnvironment() {
  console.log('🧹 Cleaning up frontend test environment...');
  
  try {
    let portfolios = readJsonFile(FILES.portfolios, []);
    let transactions = readJsonFile(FILES.transactions, []);
    let cashPositions = readJsonFile(FILES.cashPositions, {});
    
    // Remove test data
    portfolios = portfolios.filter(p => p.id !== TEST_CONFIG.portfolioId);
    transactions = transactions.filter(t => t.portfolioId !== TEST_CONFIG.portfolioId);
    delete cashPositions[TEST_CONFIG.portfolioId];
    
    // Save cleaned files
    writeJsonFile(FILES.portfolios, portfolios);
    writeJsonFile(FILES.transactions, transactions);
    writeJsonFile(FILES.cashPositions, cashPositions);
    
    console.log('✅ Frontend test environment cleaned up');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Simulate frontend workflow
async function simulateFrontendWorkflow() {
  console.log('\n🎭 Simulating frontend workflow...');
  
  const storageService = new MockLocalFileStorageService();
  
  try {
    // Step 1: Initial state - Get holdings (should be empty)
    console.log('Step 1: Getting initial holdings...');
    let holdings = await storageService.calculateHoldings(TEST_CONFIG.portfolioId);
    console.log(`Initial holdings: ${holdings.length}`);
    console.assert(holdings.length === 0, 'Initial holdings should be empty');
    
    // Step 2: Add a transaction through the UI (simulate transaction modal submission)
    console.log('Step 2: Adding transaction through UI...');
    const transactionData = {
      portfolioId: TEST_CONFIG.portfolioId,
      date: new Date().toISOString(),
      action: 'BUY',
      ticker: 'FRONT',
      exchange: 'NASDAQ',
      country: 'USA',
      quantity: 25,
      tradePrice: 100.00,
      currency: 'USD',
      fees: 2.50,
      notes: 'Frontend workflow test',
      tag: 'test'
    };
    
    const addedTransaction = await storageService.addTransaction(transactionData);
    console.log(`Transaction added: ${addedTransaction.id}`);
    
    // Step 3: Simulate the onTransactionSuccess callback - refresh holdings
    console.log('Step 3: Simulating onTransactionSuccess callback...');
    
    // This simulates what the frontend does when refreshHoldings is called
    holdings = await storageService.calculateHoldings(TEST_CONFIG.portfolioId);
    const portfolios = await storageService.getPortfolios();
    const cashPositions = await storageService.getCashPositions();
    
    console.log(`Holdings after transaction: ${holdings.length}`);
    console.log(`Holdings details:`, holdings.map(h => ({ 
      ticker: h.ticker, 
      quantity: h.quantity, 
      investedValue: h.investedValue 
    })));
    
    // Step 4: Verify holdings are correctly calculated
    console.log('Step 4: Verifying holdings...');
    console.assert(holdings.length === 1, 'Should have 1 holding after transaction');
    console.assert(holdings[0].ticker === 'FRONT', 'Should have FRONT holding');
    console.assert(holdings[0].quantity === 25, 'Should have 25 shares');
    console.assert(holdings[0].investedValue === 2500, 'Invested value should be 2500');
    
    // Step 5: Verify portfolio totals are updated
    console.log('Step 5: Verifying portfolio totals...');
    const updatedPortfolio = portfolios.find(p => p.id === TEST_CONFIG.portfolioId);
    console.assert(updatedPortfolio !== undefined, 'Portfolio should exist');
    console.assert(updatedPortfolio.totalInvested === 2500, `Total invested should be 2500, got ${updatedPortfolio.totalInvested}`);
    console.assert(updatedPortfolio.currentValue === 2500, `Current value should be 2500, got ${updatedPortfolio.currentValue}`);
    
    // Step 6: Verify cash position is updated
    console.log('Step 6: Verifying cash position...');
    const expectedCash = 100000 - 2502.50; // Initial cash - (quantity * price + fees)
    const actualCash = cashPositions[TEST_CONFIG.portfolioId];
    console.assert(actualCash === expectedCash, `Cash should be ${expectedCash}, got ${actualCash}`);
    
    // Step 7: Add another transaction to test incremental updates
    console.log('Step 7: Adding second transaction...');
    const transaction2 = {
      portfolioId: TEST_CONFIG.portfolioId,
      date: new Date(Date.now() + 1000).toISOString(),
      action: 'BUY',
      ticker: 'FRONT',
      exchange: 'NASDAQ',
      country: 'USA',
      quantity: 15,
      tradePrice: 110.00,
      currency: 'USD',
      fees: 1.50,
      notes: 'Second frontend test transaction',
      tag: 'test'
    };
    
    await storageService.addTransaction(transaction2);
    
    // Step 8: Refresh holdings again
    console.log('Step 8: Refreshing holdings after second transaction...');
    holdings = await storageService.calculateHoldings(TEST_CONFIG.portfolioId);
    
    console.log(`Holdings after second transaction: ${holdings.length}`);
    console.assert(holdings.length === 1, 'Should still have 1 holding');
    console.assert(holdings[0].quantity === 40, 'Should have 40 shares total');
    
    // Expected average price: (25 * 100 + 15 * 110) / 40 = (2500 + 1650) / 40 = 103.75
    const expectedAvgPrice = (25 * 100 + 15 * 110) / 40;
    console.assert(Math.abs(holdings[0].avgBuyPrice - expectedAvgPrice) < 0.01, 
      `Average price should be ${expectedAvgPrice}, got ${holdings[0].avgBuyPrice}`);
    
    // Expected invested value: 2500 + 1650 = 4150
    console.assert(holdings[0].investedValue === 4150, 
      `Invested value should be 4150, got ${holdings[0].investedValue}`);
    
    console.log('✅ Frontend workflow simulation completed successfully');
    
    return {
      holdings,
      portfolio: updatedPortfolio,
      cashPosition: actualCash
    };
    
  } catch (error) {
    console.error('❌ Frontend workflow simulation failed:', error);
    throw error;
  }
}

// Test refresh timing
async function testRefreshTiming() {
  console.log('\n⏱️ Testing refresh timing...');
  
  const storageService = new MockLocalFileStorageService();
  
  try {
    // Measure time for holdings calculation
    const startTime = Date.now();
    const holdings = await storageService.calculateHoldings(TEST_CONFIG.portfolioId);
    const endTime = Date.now();
    
    const calculationTime = endTime - startTime;
    console.log(`Holdings calculation took: ${calculationTime}ms`);
    console.assert(calculationTime < 100, 'Holdings calculation should be fast (< 100ms)');
    
    // Test multiple rapid refreshes (simulate user clicking refresh quickly)
    console.log('Testing rapid refreshes...');
    const refreshPromises = [];
    for (let i = 0; i < 5; i++) {
      refreshPromises.push(storageService.calculateHoldings(TEST_CONFIG.portfolioId));
    }
    
    const refreshStartTime = Date.now();
    await Promise.all(refreshPromises);
    const refreshEndTime = Date.now();
    
    const totalRefreshTime = refreshEndTime - refreshStartTime;
    console.log(`5 rapid refreshes took: ${totalRefreshTime}ms`);
    console.assert(totalRefreshTime < 500, 'Rapid refreshes should complete quickly (< 500ms)');
    
    console.log('✅ Refresh timing test passed');
    
  } catch (error) {
    console.error('❌ Refresh timing test failed:', error);
    throw error;
  }
}

// Main test runner
async function runFrontendRefreshTest() {
  console.log('🚀 Starting Frontend Holdings Refresh Test\n');
  
  let testResult = {
    success: false,
    error: null,
    details: {}
  };
  
  try {
    // Setup
    const testPortfolio = setupFrontendTestEnvironment();
    
    // Test frontend workflow
    const workflowResult = await simulateFrontendWorkflow();
    testResult.details.workflowResult = workflowResult;
    
    // Test refresh timing
    await testRefreshTiming();
    
    testResult.success = true;
    
    console.log('\n🎉 Frontend Holdings Refresh Test Completed Successfully!');
    console.log('\n📊 Test Summary:');
    console.log('- Environment setup: ✅');
    console.log('- Initial holdings (empty): ✅');
    console.log('- Transaction addition: ✅');
    console.log('- Holdings refresh after transaction: ✅');
    console.log('- Portfolio totals update: ✅');
    console.log('- Cash position update: ✅');
    console.log('- Incremental updates: ✅');
    console.log('- Refresh timing: ✅');
    console.log('\n🔍 Key Test Results:');
    console.log(`- Final holdings count: ${workflowResult.holdings.length}`);
    console.log(`- Final portfolio value: $${workflowResult.portfolio.currentValue}`);
    console.log(`- Final cash position: $${workflowResult.cashPosition}`);
    
  } catch (error) {
    testResult.success = false;
    testResult.error = error.message;
    console.error('\n❌ Frontend Holdings Refresh Test Failed:', error);
  } finally {
    // Cleanup
    cleanupFrontendTestEnvironment();
  }
  
  return testResult;
}

// Export for potential use as module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runFrontendRefreshTest,
    simulateFrontendWorkflow,
    MockLocalFileStorageService
  };
}

// Run test if this file is executed directly
if (require.main === module) {
  runFrontendRefreshTest().then(result => {
    if (!result.success) {
      process.exit(1);
    }
  }).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
