#!/usr/bin/env node

// Test both APPL and AAPL to see the difference
console.log('🔍 Testing APPL vs AAPL...\n');

async function testSymbol(symbol) {
  try {
    console.log(`Testing ${symbol}:`);
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    console.log(`URL: ${url}`);
    
    const response = await fetch(url);
    console.log(`Status: ${response.status}`);
    
    if (!response.ok) {
      console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    const chart = data.chart?.result?.[0];
    
    if (!chart) {
      console.log('❌ No chart data found');
      return;
    }
    
    const meta = chart.meta;
    console.log(`✅ Success!`);
    console.log(`- Company: ${meta.longName || 'N/A'}`);
    console.log(`- Price: $${meta.regularMarketPrice}`);
    console.log(`- Previous Close: $${meta.previousClose}`);
    console.log(`- Currency: ${meta.currency}`);
    
    if (meta.regularMarketPrice && meta.previousClose) {
      const change = meta.regularMarketPrice - meta.previousClose;
      const changePercent = (change / meta.previousClose) * 100;
      console.log(`- Change: $${change.toFixed(2)} (${changePercent.toFixed(2)}%)`);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  console.log('');
}

async function main() {
  await testSymbol('APPL');  // Wrong symbol
  await testSymbol('AAPL');  // Correct symbol
}

main().catch(console.error);
