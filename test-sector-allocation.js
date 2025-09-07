// Test script to verify sector allocation calculations
const fetch = require('node-fetch');

async function testSectorAllocations() {
  console.log('🧪 Testing Sector Allocation Calculations');
  console.log('=========================================');

  const portfolios = [
    { id: 'india-investments', name: 'India Investments' },
    { id: 'usa-alpha', name: 'USA Alpha Fund' },
    { id: 'usa-sip', name: 'USA SIP' }
  ];

  for (const portfolio of portfolios) {
    console.log(`\n📊 ${portfolio.name} (${portfolio.id})`);
    console.log('─'.repeat(50));

    try {
      const response = await fetch(`http://localhost:3000/api/holdings?portfolioId=${portfolio.id}`);
      const holdings = await response.json();

      if (holdings.length === 0) {
        console.log('   No holdings found');
        continue;
      }

      // Calculate sector allocation
      const sectorMap = new Map();
      let totalValue = 0;

      holdings.forEach(holding => {
        const sector = holding.sector || 'Other';
        const current = sectorMap.get(sector) || 0;
        sectorMap.set(sector, current + holding.currentValue);
        totalValue += holding.currentValue;
      });

      console.log(`   Total Portfolio Value: ${formatCurrency(totalValue, holdings[0].currency)}`);
      console.log('   Sector Breakdown:');

      Array.from(sectorMap.entries())
        .sort((a, b) => b[1] - a[1]) // Sort by value descending
        .forEach(([sector, value]) => {
          const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
          console.log(`   • ${sector}: ${formatCurrency(value, holdings[0].currency)} (${percentage.toFixed(1)}%)`);
        });

      // Verify total adds up to 100%
      const totalPercentage = Array.from(sectorMap.values()).reduce((sum, value) => sum + value, 0);
      const calculatedPercentage = totalValue > 0 ? (totalPercentage / totalValue) * 100 : 0;
      
      if (Math.abs(calculatedPercentage - 100) < 0.01) {
        console.log('   ✅ Sector allocation calculations are correct!');
      } else {
        console.log(`   ❌ Sector allocation error: Total = ${calculatedPercentage.toFixed(2)}%`);
      }

    } catch (error) {
      console.log(`   ❌ Error fetching holdings: ${error.message}`);
    }
  }

  console.log('\n🎉 Sector allocation test completed!');
}

function formatCurrency(amount, currency) {
  const symbol = currency === 'USD' ? '$' : currency === 'INR' ? '₹' : currency;
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Run the test
testSectorAllocations().catch(console.error);
