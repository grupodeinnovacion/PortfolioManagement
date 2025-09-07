/**
 * Test allocation calculation fix
 */

async function testAllocationFix() {
  console.log('🧮 Testing Allocation Calculation Fix\n');
  
  try {
    // Test each portfolio
    const portfolios = ['usa-alpha', 'usa-sip', 'india-investments'];
    
    for (const portfolioId of portfolios) {
      console.log(`📊 Testing ${portfolioId} portfolio:`);
      
      const response = await fetch(`http://localhost:3000/api/holdings?portfolioId=${portfolioId}`);
      
      if (!response.ok) {
        console.log(`   ❌ API Error: ${response.status}`);
        continue;
      }
      
      const holdings = await response.json();
      
      if (!holdings || holdings.length === 0) {
        console.log(`   ⚠️  No holdings found`);
        continue;
      }
      
      console.log(`   Holdings found: ${holdings.length}`);
      
      let totalAllocation = 0;
      let totalValue = 0;
      
      holdings.forEach((holding, index) => {
        const allocation = holding.allocation || 0;
        const value = holding.currentValue || 0;
        
        console.log(`   ${index + 1}. ${holding.ticker}:`);
        console.log(`      Value: ${holding.currency}${value.toLocaleString()}`);
        console.log(`      Allocation: ${allocation.toFixed(2)}%`);
        
        totalAllocation += allocation;
        totalValue += value;
      });
      
      console.log(`   Total Portfolio Value: ${holdings[0]?.currency || 'USD'}${totalValue.toLocaleString()}`);
      console.log(`   Total Allocation: ${totalAllocation.toFixed(2)}%`);
      
      // Check if allocation calculation is correct
      if (Math.abs(totalAllocation - 100) < 0.01) {
        console.log(`   ✅ Allocation calculation is correct!`);
      } else if (totalAllocation === 0) {
        console.log(`   ❌ Allocation is still zero - fix didn't work`);
      } else {
        console.log(`   ⚠️  Allocation total is ${totalAllocation.toFixed(2)}%, should be 100%`);
      }
      
      console.log();
    }
    
    console.log('📋 Summary:');
    console.log('   - Fixed allocation calculation in localFileStorageService.ts');
    console.log('   - Added logic to calculate allocation as percentage of total portfolio value');
    console.log('   - Each holding\'s allocation = (holding value / total portfolio value) × 100');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the development server is running on localhost:3000');
  }
}

// Wait a moment for server to start, then run test
setTimeout(testAllocationFix, 2000);
