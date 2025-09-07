const https = require('https');

async function testExchangeRateAPIs() {
  console.log('🔍 Testing Exchange Rate APIs Directly\n');
  
  const apiEndpoints = [
    'https://api.exchangerate-api.com/v4/latest/USD',
    'https://open.er-api.com/v6/latest/USD',
    'https://api.fxratesapi.com/latest?base=USD'
  ];
  
  for (let i = 0; i < apiEndpoints.length; i++) {
    const endpoint = apiEndpoints[i];
    console.log(`${i + 1}. Testing: ${endpoint}`);
    
    try {
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        console.log(`   ❌ HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }
      
      const data = await response.json();
      
      // Extract INR rate from response
      let inrRate = null;
      if (data.conversion_rates && data.conversion_rates.INR) {
        inrRate = data.conversion_rates.INR;
      } else if (data.rates && data.rates.INR) {
        inrRate = data.rates.INR;
      }
      
      if (inrRate) {
        console.log(`   ✅ Success: 1 USD = ${inrRate} INR`);
        
        // Check if it's close to expected rate
        const expectedRate = 88.23;
        const difference = Math.abs(inrRate - expectedRate);
        const percentageDiff = (difference / expectedRate) * 100;
        
        if (percentageDiff > 5) {
          console.log(`   ⚠️  Rate differs from expected ${expectedRate} by ${difference.toFixed(2)} (${percentageDiff.toFixed(2)}%)`);
        } else {
          console.log(`   ✅ Rate is close to expected ${expectedRate}`);
        }
      } else {
        console.log(`   ❌ No INR rate found in response`);
        console.log(`   Response keys:`, Object.keys(data));
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log();
  }
  
  // Test what our fallback rate would be
  console.log('📋 Current Fallback Rate Analysis:');
  console.log(`   Hardcoded fallback: 1 USD = 83.15 INR`);
  console.log(`   Expected current rate: 1 USD = 88.23 INR`);
  console.log(`   Difference: ${(88.23 - 83.15).toFixed(2)} INR (${(((88.23 - 83.15) / 88.23) * 100).toFixed(1)}% error)`);
  console.log(`   Impact: Fallback rate is ${88.23 > 83.15 ? 'under' : 'over'}estimating USD value`);
}

testExchangeRateAPIs().catch(console.error);
