/**
 * Test Yahoo Finance API directly to see if it's working
 */

async function testYahooFinanceAPI() {
  console.log('🔍 Testing Yahoo Finance API Directly\n');
  
  const testSymbols = ['NVDA', 'MSFT', 'AAPL', 'TCS.NS'];
  
  for (const symbol of testSymbols) {
    console.log(`📊 Testing ${symbol}:`);
    
    try {
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
      
      console.log(`   URL: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        console.log(`   ❌ HTTP Error: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`   Response keys: ${Object.keys(data)}`);
      
      if (data.quoteResponse && data.quoteResponse.result) {
        const quote = data.quoteResponse.result[0];
        if (quote) {
          console.log(`   ✅ Quote received:`);
          console.log(`      Symbol: ${quote.symbol}`);
          console.log(`      Name: ${quote.shortName || quote.longName || 'N/A'}`);
          console.log(`      Price: $${quote.regularMarketPrice || 'N/A'}`);
          console.log(`      Previous Close: $${quote.regularMarketPreviousClose || 'N/A'}`);
          console.log(`      Change: ${quote.regularMarketChangePercent?.toFixed(2) || 'N/A'}%`);
          console.log(`      Sector: ${quote.sector || 'N/A'}`);
          console.log(`      Exchange: ${quote.fullExchangeName || 'N/A'}`);
        } else {
          console.log(`   ⚠️  No quote data in result`);
        }
      } else {
        console.log(`   ❌ Invalid response structure`);
        console.log(`   Raw response:`, JSON.stringify(data, null, 2));
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log();
  }
  
  console.log('🔍 Testing Google Finance Alternative...\n');
  
  // Test Google Finance (though it's not a public API)
  try {
    // Google Finance doesn't have a public API, but we can try other alternatives
    console.log('📊 Google Finance doesn\'t have a public API');
    console.log('   Alternatives to consider:');
    console.log('   1. Financial Modeling Prep API (freemium)');
    console.log('   2. IEX Cloud (freemium)');
    console.log('   3. Twelve Data API (freemium)');
    console.log('   4. Polygon.io (freemium)');
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

testYahooFinanceAPI().catch(console.error);
