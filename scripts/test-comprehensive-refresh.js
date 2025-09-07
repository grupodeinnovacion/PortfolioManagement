#!/usr/bin/env node

// Test comprehensive refresh functionality
console.log('🔄 Testing Comprehensive Refresh System...\n');

async function testRefreshSystem() {
  try {
    console.log('📊 Before refresh - checking current data...');
    
    // Check current stocks
    const fs = require('fs');
    const currentStocks = JSON.parse(fs.readFileSync('./data/stocks.json', 'utf-8'));
    console.log(`Current stocks in database: ${Object.keys(currentStocks.stocks).length}`);
    console.log('Last updated:', currentStocks.lastUpdated);
    
    // Test the comprehensive refresh API
    console.log('\n🚀 Triggering comprehensive refresh...');
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:3000/api/refresh', {
      method: 'POST'
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log(`\n✅ Refresh completed in ${duration}ms`);
    console.log('📈 Results:');
    console.log(`  - Stocks updated: ${result.results.stocksUpdated}`);
    console.log(`  - Currency rates updated: ${result.results.currencyRatesUpdated}`);
    console.log(`  - Portfolios refreshed: ${result.results.portfoliosRefreshed}`);
    console.log(`  - API duration: ${result.results.summary.duration}`);
    
    if (result.results.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      result.results.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    // Check updated stocks
    console.log('\n💰 Updated stock prices:');
    Object.entries(result.results.summary.stockPrices).forEach(([symbol, data]) => {
      console.log(`  ${symbol}: $${data.price} (${data.change}) - ${data.company} [${data.sector}]`);
    });
    
    // Verify stocks.json was updated
    console.log('\n📁 Checking updated stocks.json...');
    const updatedStocks = JSON.parse(fs.readFileSync('./data/stocks.json', 'utf-8'));
    console.log(`Stocks in database after refresh: ${Object.keys(updatedStocks.stocks).length}`);
    console.log('New last updated:', updatedStocks.lastUpdated);
    
    // Test sector allocation to verify calculations are updated
    console.log('\n🥧 Testing sector allocation with fresh data...');
    const sectorResponse = await fetch('http://localhost:3000/api/sector-allocation');
    if (sectorResponse.ok) {
      const sectorData = await sectorResponse.json();
      console.log('✅ Sector allocation with fresh data:');
      sectorData.data.sectors.forEach(sector => {
        console.log(`  ${sector.sector}: $${sector.value.toFixed(2)} (${sector.percentage.toFixed(1)}%)`);
      });
      console.log(`Total portfolio value: $${sectorData.data.totalValue.toFixed(2)}`);
    } else {
      console.log('❌ Failed to get sector allocation');
    }
    
    console.log('\n🎉 Comprehensive refresh system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRefreshSystem();
