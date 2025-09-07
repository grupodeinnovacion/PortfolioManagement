#!/usr/bin/env node

// Test script for Indian stocks with enhanced Google Finance integration
console.log('🇮🇳 Testing Indian Stock Data with Google Finance Integration...\n');

// Test TCS specifically
async function testIndianStock(symbol) {
  try {
    console.log(`Testing ${symbol}:`);
    
    // Test direct Yahoo with NSE suffix
    const nseUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS`;
    console.log(`  Trying NSE: ${nseUrl}`);
    
    const nseResponse = await fetch(nseUrl);
    if (nseResponse.ok) {
      const nseData = await nseResponse.json();
      const chart = nseData.chart?.result?.[0];
      if (chart) {
        const meta = chart.meta;
        console.log(`  ✅ NSE Success: ${symbol} = ₹${meta.regularMarketPrice} (${meta.currency})`);
        console.log(`    Change: ${(meta.regularMarketPrice - meta.previousClose).toFixed(2)}`);
        console.log(`    Company: ${meta.longName || 'N/A'}`);
        return true;
      }
    }
    
    // Test BSE suffix
    const bseUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.BO`;
    console.log(`  Trying BSE: ${bseUrl}`);
    
    const bseResponse = await fetch(bseUrl);
    if (bseResponse.ok) {
      const bseData = await bseResponse.json();
      const chart = bseData.chart?.result?.[0];
      if (chart) {
        const meta = chart.meta;
        console.log(`  ✅ BSE Success: ${symbol} = ₹${meta.regularMarketPrice} (${meta.currency})`);
        console.log(`    Change: ${(meta.regularMarketPrice - meta.previousClose).toFixed(2)}`);
        console.log(`    Company: ${meta.longName || 'N/A'}`);
        return true;
      }
    }
    
    console.log(`  ❌ No data found for ${symbol}`);
    return false;
    
  } catch (error) {
    console.log(`  ❌ Error testing ${symbol}:`, error.message);
    return false;
  }
}

async function main() {
  const indianStocks = ['TCS', 'INFY', 'RELIANCE', 'HDFCBANK', 'ICICIBANK'];
  
  for (const stock of indianStocks) {
    await testIndianStock(stock);
    console.log('');
  }
  
  // Test our portfolio API
  console.log('Testing Portfolio API with Indian stocks...');
  try {
    const response = await fetch('http://localhost:3000/api/market-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: 'TCS' })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Portfolio API response for TCS:', data);
    } else {
      console.log('❌ Portfolio API failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Portfolio API error:', error.message);
  }
}

main().catch(console.error);
