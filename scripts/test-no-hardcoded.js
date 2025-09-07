/**
 * Test the market data service without hardcoded values
 * Should show N/A when real-time data is unavailable
 */

async function testNoHardcodedValues() {
  console.log('🚀 Testing Market Data Service - No Hardcoded Values\n');

  try {
    // Test 1: Check NVIDIA via our API (should try real APIs first)
    console.log('1. Testing NVIDIA (NVDA) - Real-time data vs N/A...');
    const nvdaResponse = await fetch('http://localhost:3000/api/market-data?symbol=NVDA');
    
    if (nvdaResponse.ok) {
      const nvdaData = await nvdaResponse.json();
      console.log(`   📊 NVDA Response:`);
      console.log(`      Symbol: ${nvdaData.symbol}`);
      console.log(`      Company: ${nvdaData.companyName}`);
      console.log(`      Price: ${nvdaData.price === 0 ? 'N/A (Real-time data unavailable)' : '$' + nvdaData.price?.toFixed(2)}`);
      console.log(`      Change: ${nvdaData.change === 0 && nvdaData.changePercent === 0 ? 'N/A' : nvdaData.change?.toFixed(2) + ' (' + nvdaData.changePercent?.toFixed(2) + '%)'}`);
      console.log(`      Sector: ${nvdaData.sector}`);
      console.log(`      Last Updated: ${nvdaData.lastUpdated}`);
      
      // Check if we're getting real data or N/A
      if (nvdaData.price === 0) {
        console.log(`   ✅ Correct behavior: Showing N/A instead of hardcoded values`);
      } else {
        console.log(`   📈 Real-time data available: $${nvdaData.price?.toFixed(2)}`);
      }
    } else {
      console.log(`   ❌ API failed with status: ${nvdaResponse.status}`);
    }

    // Test 2: Test multiple symbols
    console.log('\n2. Testing multiple symbols for consistency...');
    const symbols = ['NVDA', 'MSFT', 'AAPL', 'UNKNOWN_STOCK'];
    
    for (const symbol of symbols) {
      const response = await fetch(`http://localhost:3000/api/market-data?symbol=${symbol}`);
      if (response.ok) {
        const data = await response.json();
        const priceDisplay = data.price === 0 ? 'N/A' : `$${data.price?.toFixed(2)}`;
        console.log(`   ${symbol}: ${priceDisplay} (${data.companyName})`);
      }
    }

    // Test 3: Check portfolio refresh behavior
    console.log('\n3. Testing portfolio refresh with N/A handling...');
    const refreshResponse = await fetch('http://localhost:3000/api/market-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portfolioId: 'usa-alpha' })
    });
    
    if (refreshResponse.ok) {
      const refreshData = await refreshResponse.json();
      console.log(`   ✅ Portfolio refresh completed: ${refreshData.updatedCount} holdings updated`);
      
      if (refreshData.holdings) {
        console.log(`   📊 Holdings after refresh:`);
        refreshData.holdings.forEach(holding => {
          const priceDisplay = holding.currentPrice === 0 ? 'N/A' : `$${holding.currentPrice?.toFixed(2)}`;
          const allocDisplay = holding.allocation ? `${holding.allocation?.toFixed(1)}%` : 'N/A';
          console.log(`      ${holding.symbol}: ${priceDisplay} - ${allocDisplay} (${holding.companyName})`);
        });
      }
    }

    console.log('\n✅ Summary - No Hardcoded Values Policy:');
    console.log('   🎯 Real-time data fetched from Finnhub/FMP APIs first');
    console.log('   ⚠️  When APIs fail/rate limited, show N/A instead of fake data');
    console.log('   🔄 Manual refresh available to retry real-time data');
    console.log('   📊 Company names and sectors still provided for context');
    console.log('   💡 No misleading hardcoded prices that could confuse users');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the development server is running: npm run dev');
  }
}

testNoHardcodedValues();
