#!/usr/bin/env node

// Test script to debug AAPL showing N/A values
console.log('🍎 Debugging AAPL N/A Values...\n');

async function testAAPL() {
  try {
    console.log('Testing AAPL directly with Yahoo Finance:');
    
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL';
    console.log(`URL: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`❌ HTTP Error: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    console.log('Raw response structure:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
    
    const chart = data.chart?.result?.[0];
    if (!chart) {
      console.log('❌ No chart data found');
      return;
    }
    
    const meta = chart.meta;
    console.log('\nMeta data:');
    console.log('- regularMarketPrice:', meta.regularMarketPrice, typeof meta.regularMarketPrice);
    console.log('- previousClose:', meta.previousClose, typeof meta.previousClose);
    console.log('- longName:', meta.longName);
    console.log('- currency:', meta.currency);
    
    if (meta.regularMarketPrice && meta.previousClose) {
      const change = meta.regularMarketPrice - meta.previousClose;
      const changePercent = (change / meta.previousClose) * 100;
      
      console.log('\nCalculated values:');
      console.log('- price:', meta.regularMarketPrice);
      console.log('- change:', change);
      console.log('- changePercent:', changePercent);
      console.log('- change (fixed 2):', change.toFixed(2));
      console.log('- changePercent (fixed 2):', changePercent.toFixed(2));
    } else {
      console.log('❌ Missing price data');
      console.log('- regularMarketPrice is:', meta.regularMarketPrice);
      console.log('- previousClose is:', meta.previousClose);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Test our utility functions
function testUtilityFunctions() {
  console.log('\n📊 Testing Utility Functions:');
  
  // Test cases that might cause N/A
  const testValues = [
    239.69,
    null,
    undefined,
    NaN,
    0,
    -2.5,
    'invalid'
  ];
  
  // Simulate our utility functions
  function formatPrice(value) {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }
    return `$${Number(value).toFixed(2)}`;
  }
  
  function formatPercentage(value) {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }
    return `${Number(value).toFixed(2)}%`;
  }
  
  function formatChange(value) {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }
    const num = Number(value);
    return num >= 0 ? `+$${num.toFixed(2)}` : `-$${Math.abs(num).toFixed(2)}`;
  }
  
  testValues.forEach(value => {
    console.log(`Value: ${value} (${typeof value})`);
    console.log(`  formatPrice: ${formatPrice(value)}`);
    console.log(`  formatPercentage: ${formatPercentage(value)}`);
    console.log(`  formatChange: ${formatChange(value)}`);
    console.log('');
  });
}

async function main() {
  await testAAPL();
  testUtilityFunctions();
}

main().catch(console.error);
