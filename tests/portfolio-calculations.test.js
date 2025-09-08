/**
 * Portfolio Calculations Tests
 * Tests portfolio P&L calculations, holdings, and sector allocations
 */

async function testPortfolioCalculations() {
  console.log('🧪 Portfolio Calculations Tests');
  console.log('===============================\n');

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Holdings calculation for India Investments
  totalTests++;
  console.log('Test 1: India Investments holdings calculation');
  try {
    const response = await fetch('http://localhost:3000/api/holdings?portfolioId=india-investments');
    if (response.ok) {
      const holdings = await response.json();
      if (holdings.length > 0 && holdings[0].unrealizedPL > 0) {
        console.log(`   ✅ TCS P&L: ₹${holdings[0].unrealizedPL} (${holdings[0].unrealizedPLPercent.toFixed(2)}%)`);
        passedTests++;
      } else {
        console.log(`   ❌ Invalid holdings data or zero P&L`);
      }
    } else {
      console.log(`   ❌ API request failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 2: Portfolio totals match holdings
  totalTests++;
  console.log('\nTest 2: Portfolio totals consistency');
  try {
    const portfoliosResponse = await fetch('http://localhost:3000/api/portfolios');
    const holdingsResponse = await fetch('http://localhost:3000/api/holdings?portfolioId=india-investments');
    
    if (portfoliosResponse.ok && holdingsResponse.ok) {
      const portfolios = await portfoliosResponse.json();
      const holdings = await holdingsResponse.json();
      
      const portfolio = portfolios.find(p => p.id === 'india-investments');
      const holdingsTotalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
      
      if (portfolio && Math.abs(portfolio.currentValue - holdingsTotalValue) < 1) {
        console.log(`   ✅ Portfolio value matches holdings: ₹${portfolio.currentValue}`);
        passedTests++;
      } else {
        console.log(`   ❌ Portfolio value mismatch: ₹${portfolio?.currentValue} vs ₹${holdingsTotalValue}`);
      }
    } else {
      console.log(`   ❌ API request failed`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 3: Sector allocation calculation
  totalTests++;
  console.log('\nTest 3: Sector allocation for India Investments');
  try {
    const response = await fetch('http://localhost:3000/api/holdings?portfolioId=india-investments');
    if (response.ok) {
      const holdings = await response.json();
      if (holdings.length === 1 && holdings[0].sector === 'Information Technology') {
        console.log(`   ✅ 100% Information Technology sector allocation`);
        passedTests++;
      } else {
        console.log(`   ❌ Incorrect sector allocation`);
      }
    } else {
      console.log(`   ❌ API request failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 4: Currency consistency
  totalTests++;
  console.log('\nTest 4: Currency consistency for Indian portfolio');
  try {
    const response = await fetch('http://localhost:3000/api/holdings?portfolioId=india-investments');
    if (response.ok) {
      const holdings = await response.json();
      if (holdings.length > 0 && holdings[0].currency === 'INR') {
        console.log(`   ✅ Currency is correctly set to INR`);
        passedTests++;
      } else {
        console.log(`   ❌ Currency should be INR, got: ${holdings[0]?.currency}`);
      }
    } else {
      console.log(`   ❌ API request failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 5: P&L calculation accuracy
  totalTests++;
  console.log('\nTest 5: P&L calculation accuracy');
  try {
    const response = await fetch('http://localhost:3000/api/holdings?portfolioId=india-investments');
    if (response.ok) {
      const holdings = await response.json();
      if (holdings.length > 0) {
        const holding = holdings[0];
        const expectedPL = holding.currentValue - holding.investedValue;
        const expectedPercent = (expectedPL / holding.investedValue) * 100;
        
        if (Math.abs(holding.unrealizedPL - expectedPL) < 0.01 && 
            Math.abs(holding.unrealizedPLPercent - expectedPercent) < 0.01) {
          console.log(`   ✅ P&L calculation is accurate`);
          passedTests++;
        } else {
          console.log(`   ❌ P&L calculation mismatch`);
        }
      }
    } else {
      console.log(`   ❌ API request failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Results
  console.log('\n📊 Test Results:');
  console.log(`   Passed: ${passedTests}/${totalTests}`);
  console.log(`   Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);
  
  return passedTests === totalTests;
}

// Run tests if called directly
if (require.main === module) {
  testPortfolioCalculations()
    .then(success => {
      console.log(success ? '\n🎉 All tests passed!' : '\n⚠️  Some tests failed');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testPortfolioCalculations };
