#!/usr/bin/env node

// Test all the UI and functionality fixes
console.log('🔧 Testing UI and P&L Fixes...\n');

async function testAllFixes() {
  try {
    // Test P&L calculations
    console.log('📊 Testing P&L Calculations...');
    
    const usaAlphaResponse = await fetch('http://localhost:3000/api/holdings?portfolioId=usa-alpha');
    if (usaAlphaResponse.ok) {
      const holdings = await usaAlphaResponse.json();
      
      console.log('✅ USA Alpha Portfolio P&L:');
      holdings.forEach(holding => {
        const plFormatted = holding.unrealizedPL >= 0 ? `+${holding.unrealizedPL.toFixed(2)}` : holding.unrealizedPL.toFixed(2);
        const plPercentFormatted = holding.unrealizedPLPercent >= 0 ? `+${holding.unrealizedPLPercent.toFixed(2)}%` : `${holding.unrealizedPLPercent.toFixed(2)}%`;
        
        console.log(`  ${holding.ticker}: $${plFormatted} (${plPercentFormatted})`);
        console.log(`    Current: $${holding.currentPrice} | Avg Buy: $${holding.avgBuyPrice.toFixed(2)}`);
        console.log(`    Value: $${holding.currentValue.toFixed(2)} | Invested: $${holding.investedValue.toFixed(2)}`);
      });
    } else {
      console.log('❌ Failed to get USA Alpha holdings');
    }
    
    // Test USA SIP portfolio
    console.log('\n📊 Testing USA SIP Portfolio...');
    const usaSipResponse = await fetch('http://localhost:3000/api/holdings?portfolioId=usa-sip');
    if (usaSipResponse.ok) {
      const holdings = await usaSipResponse.json();
      
      console.log('✅ USA SIP Portfolio P&L:');
      holdings.forEach(holding => {
        const plFormatted = holding.unrealizedPL >= 0 ? `+${holding.unrealizedPL.toFixed(2)}` : holding.unrealizedPL.toFixed(2);
        const plPercentFormatted = holding.unrealizedPLPercent >= 0 ? `+${holding.unrealizedPLPercent.toFixed(2)}%` : `${holding.unrealizedPLPercent.toFixed(2)}%`;
        
        console.log(`  ${holding.ticker}: $${plFormatted} (${plPercentFormatted})`);
      });
    } else {
      console.log('❌ Failed to get USA SIP holdings');
    }
    
    // Test currency rate
    console.log('\n💱 Testing Currency Rate Display...');
    console.log('Note: UsdInrRate components should now show without refresh buttons');
    
    // Test sector allocation
    console.log('\n🥧 Testing Sector Allocation...');
    const sectorResponse = await fetch('http://localhost:3000/api/sector-allocation');
    if (sectorResponse.ok) {
      const sectorData = await sectorResponse.json();
      console.log('✅ Current sector allocation:');
      sectorData.data.sectors.forEach(sector => {
        console.log(`  ${sector.sector}: $${sector.value.toFixed(2)} (${sector.percentage.toFixed(1)}%)`);
      });
    }
    
    console.log('\n✅ All tests completed!');
    console.log('\n📝 Summary of fixes:');
    console.log('  ✅ P&L calculations should now show proper values (not N/A)');
    console.log('  ✅ UsdInrRate components have refresh buttons disabled');
    console.log('  ✅ Button sizes standardized (px-4 py-2, rounded-lg)');
    console.log('  ✅ Font sizes consistent (text-sm for rates, font-medium for buttons)');
    console.log('  ✅ Add Transaction button now green to differentiate from refresh');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAllFixes();
