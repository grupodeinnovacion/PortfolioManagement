const { RealTimeCurrencyService } = require('../src/services/realTimeCurrencyService.ts');

async function testCurrencyAPI() {
  console.log('🔍 Testing Currency API and Exchange Rates\n');
  
  const currencyService = new RealTimeCurrencyService();
  
  try {
    console.log('1. Testing USD to INR rate...');
    const usdToInr = await currencyService.getExchangeRate('USD', 'INR');
    console.log(`   USD to INR: ${usdToInr}`);
    
    console.log('\n2. Testing INR to USD rate...');
    const inrToUsd = await currencyService.getExchangeRate('INR', 'USD');
    console.log(`   INR to USD: ${inrToUsd}`);
    
    console.log('\n3. Testing full exchange rates for USD...');
    const usdRates = await currencyService.getExchangeRates('USD');
    console.log('   USD rates:', {
      INR: usdRates.INR,
      EUR: usdRates.EUR,
      GBP: usdRates.GBP
    });
    
    console.log('\n4. Testing conversion: $1000 to INR...');
    const conversion = await currencyService.convertCurrency(1000, 'USD', 'INR');
    console.log(`   $1000 = ₹${conversion}`);
    
    // Check if rate matches expected
    const expectedRate = 88.23;
    const difference = Math.abs(usdToInr - expectedRate);
    const percentageDiff = (difference / expectedRate) * 100;
    
    console.log(`\n📊 Rate Analysis:`);
    console.log(`   Current rate: ${usdToInr}`);
    console.log(`   Expected rate: ${expectedRate}`);
    console.log(`   Difference: ${difference.toFixed(2)} (${percentageDiff.toFixed(2)}%)`);
    
    if (percentageDiff > 5) {
      console.log('❌ Rate is significantly different from expected!');
      console.log('   This suggests either:');
      console.log('   - API is returning old/incorrect data');
      console.log('   - API calls are failing and using fallback rates');
      console.log('   - Fallback rates need updating');
    } else {
      console.log('✅ Rate is within acceptable range');
    }
    
  } catch (error) {
    console.error('❌ Error testing currency API:', error);
  }
}

testCurrencyAPI();
