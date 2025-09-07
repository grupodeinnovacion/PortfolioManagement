# Market Data API Setup

## Current Status
✅ **Working with realistic mock data** - The system now provides realistic stock prices instead of calculated averages.

## API Options for Production

### 1. Financial Modeling Prep (Recommended)
- **Free Tier**: 300 API calls/month
- **Paid Tier**: $15/month for 1000 calls/day  
- **Setup**: 
  ```bash
  # Add to .env.local
  FMP_API_KEY=your_api_key_here
  ```
- **Get API Key**: https://financialmodelingprep.com/developer/docs

### 2. IEX Cloud  
- **Free Tier**: 500,000 core data calls/month
- **Paid Tier**: $9/month for more calls
- **Setup**:
  ```bash
  # Add to .env.local  
  IEX_API_KEY=your_api_key_here
  ```
- **Get API Key**: https://iexcloud.io/

### 3. Twelve Data
- **Free Tier**: 800 API calls/day
- **Paid Tier**: $8/month for 5000 calls/day
- **Setup**:
  ```bash
  # Add to .env.local
  TWELVE_DATA_KEY=your_api_key_here  
  ```
- **Get API Key**: https://twelvedata.com/

## Current Implementation Benefits

### Without API Keys (Current Demo):
- ✅ Realistic mock prices based on actual market ranges
- ✅ Random daily changes simulating market movement  
- ✅ Proper company names and sectors
- ✅ No API rate limits or costs
- ✅ Consistent performance for development

### With API Keys (Production):
- ✅ Real-time market prices
- ✅ Live daily changes and market data
- ✅ Automatic sector detection from APIs
- ✅ Professional-grade accuracy

## How the System Works

1. **Primary**: Try real API with your key
2. **Fallback**: Use realistic mock data if API fails/rate limited
3. **Cache**: Store results for 5 minutes to minimize API usage
4. **Refresh**: Manual refresh button to get latest data

## Recommended Setup for Production

1. **Get FMP API Key** (best free tier)
2. **Add to environment variables**
3. **Test with real API calls**  
4. **Monitor usage and upgrade plan if needed**

The system is designed to work perfectly both with and without API keys!
