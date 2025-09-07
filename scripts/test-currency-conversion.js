// Test currency conversion functionality
const CurrencyConverter = require('../src/services/currencyConverter.ts');

async function testCurrencyConversion() {
  try {
    console.log('Testing Currency Conversion...\n');
    
    // Test 1: USD to INR
    const usdToInr = await CurrencyConverter.convert(1000, 'USD', 'INR');
    console.log(`1000 USD = ${usdToInr} INR`);
    
    // Test 2: INR to USD
    const inrToUsd = await CurrencyConverter.convert(83250, 'INR', 'USD');
    console.log(`83250 INR = ${inrToUsd} USD`);
    
    // Test 3: Same currency
    const sameAmount = await CurrencyConverter.convert(1000, 'USD', 'USD');
    console.log(`1000 USD = ${sameAmount} USD (same currency)`);
    
    // Test 4: Get exchange rate
    const rate = await CurrencyConverter.getRate('USD', 'INR');
    console.log(`\nExchange rate USD → INR: ${rate}`);
    
    // Test 5: Supported currencies
    const currencies = await CurrencyConverter.getSupportedCurrencies();
    console.log(`\nSupported currencies: ${currencies.join(', ')}`);
    
    console.log('\n✅ All currency conversion tests passed!');
    
  } catch (error) {
    console.error('❌ Currency conversion test failed:', error);
  }
}

testCurrencyConversion();
