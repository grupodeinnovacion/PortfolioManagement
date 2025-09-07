// Debug script to check holdings API response
const fetch = require('node-fetch');

async function debugHoldings() {
  console.log('🔍 Debugging Holdings API Responses\n');
  
  try {
    // Test holdings for India Investments portfolio
    console.log('📊 India Investments Holdings (should be in INR):');
    const indiaResponse = await fetch('http://localhost:3000/api/holdings?portfolioId=india-investments');
    if (indiaResponse.ok) {
      const indiaHoldings = await indiaResponse.json();
      console.log(JSON.stringify(indiaHoldings, null, 2));
    } else {
      console.log('Failed to fetch India holdings');
    }
    
    console.log('\n📊 USA Alpha Holdings (should be in USD):');
    const usaResponse = await fetch('http://localhost:3000/api/holdings?portfolioId=usa-alpha');
    if (usaResponse.ok) {
      const usaHoldings = await usaResponse.json();
      console.log(JSON.stringify(usaHoldings, null, 2));
    } else {
      console.log('Failed to fetch USA holdings');
    }
    
    console.log('\n⚙️ Current Settings:');
    const settingsResponse = await fetch('http://localhost:3000/api/settings');
    if (settingsResponse.ok) {
      const settings = await settingsResponse.json();
      console.log(`Dashboard Base Currency: ${settings.general?.baseCurrency}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Wait a moment for server to start
setTimeout(debugHoldings, 2000);
