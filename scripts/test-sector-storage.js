#!/usr/bin/env node

// Test script to verify sector data storage
console.log('📊 Testing Sector Data Storage...\n');

async function testSectorStorage() {
  try {
    // Test our portfolio API to see if sector data gets stored
    console.log('Testing sector data storage via portfolio API...');
    
    const symbols = ['AAPL', 'NVDA', 'MSFT', 'TCS'];
    
    for (const symbol of symbols) {
      console.log(`\nFetching ${symbol}...`);
      
      const response = await fetch('http://localhost:3000/api/market-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${symbol}: ${data.data.companyName} - ${data.data.sector}`);
        console.log(`   Price: $${data.data.price} (${data.data.changePercent.toFixed(2)}%)`);
      } else {
        console.log(`❌ ${symbol}: Failed to fetch`);
      }
    }
    
    // Check if stocks.json was populated
    console.log('\n📁 Checking stocks.json file...');
    
    try {
      const fs = require('fs');
      const stocksData = JSON.parse(fs.readFileSync('./data/stocks.json', 'utf-8'));
      
      console.log(`Found ${Object.keys(stocksData.stocks).length} stocks in database:`);
      
      Object.entries(stocksData.stocks).forEach(([symbol, info]) => {
        console.log(`  ${symbol}: ${info.companyName} (${info.sector}) - $${info.lastPrice} ${info.currency}`);
      });
      
      console.log(`\nLast updated: ${stocksData.lastUpdated}`);
      
    } catch (error) {
      console.log('❌ Could not read stocks.json:', error.message);
    }
    
    // Test sector allocation API
    console.log('\n🥧 Testing Sector Allocation API...');
    
    const sectorResponse = await fetch('http://localhost:3000/api/sector-allocation');
    if (sectorResponse.ok) {
      const sectorData = await sectorResponse.json();
      console.log('✅ Sector allocation data:');
      sectorData.data.sectors.forEach(sector => {
        console.log(`  ${sector.sector}: $${sector.value.toFixed(2)} (${sector.percentage.toFixed(1)}%)`);
      });
    } else {
      console.log('❌ Sector allocation API failed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSectorStorage();
