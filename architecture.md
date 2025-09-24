# Portfolio Management System - Business Logic Architecture

## System Overview

The Portfolio Management System is a Next.js 15-based application that enables users to track and manage multiple investment portfolios across different currencies and markets.

## Core Business Logic

### 1. Portfolio Management

#### Multi-Portfolio Support
- **Portfolio Structure**: Each portfolio has an ID, name, country, currency, and cash position
- **Currency Support**: USD, INR, EUR, GBP with automatic country-to-currency mapping
- **Cash Position Tracking**: Real-time cash positions per portfolio with currency conversion
- **Portfolio Aggregation**: Dashboard aggregates all portfolios with currency conversion to selected base currency

#### Key Business Rules
- **Country-Currency Mapping**: Automatic currency assignment based on portfolio country
  - USA/US → USD
  - India/IN → INR
  - UK/GB → GBP
  - Germany/France/EU → EUR
- **Cash Position Management**: Independent cash tracking per portfolio with cross-currency conversion
- **Target Allocations**: Optional target cash percentages and allocation targets per portfolio

### 2. Transaction Processing

#### Transaction Types
- **BUY/SELL Transactions**: Stock purchases and sales with quantity, price, fees
- **Currency Handling**: Each transaction records in its native currency
- **Lot Tracking**: FIFO (First In, First Out) system for cost basis calculation
- **Fee Management**: Transaction fees tracked separately for accurate P&L

#### P&L Calculation Logic
- **Realized P&L**: Calculated from completed buy/sell pairs using FIFO methodology
- **Unrealized P&L**: Current market value minus cost basis for open positions
- **Currency Conversion**: All P&L converted to dashboard currency for aggregation
- **Daily Change**: Tracks daily price movements separate from overall P&L

### 3. Market Data & Valuation

#### Data Sources
- **Primary Sources**: Yahoo Finance, Finnhub, Alpha Vantage
- **Fallback Chain**: Multiple API sources with automatic failover
- **Caching Strategy**: 5-minute cache for market data to reduce API calls
- **Batching**: Concurrent requests with rate limiting (currently 3 symbols per batch)

#### Valuation Logic
- **Current Value**: Quantity × Current Market Price
- **Cost Basis**: FIFO-calculated average purchase price
- **Performance Metrics**:
  - Unrealized P&L = Current Value - Cost Basis
  - Daily Change = Current Price Change × Quantity
  - Percentage Returns = (Current Value - Cost Basis) / Cost Basis × 100

### 4. Currency Conversion

#### Exchange Rate Management
- **Real-time Rates**: Primary source via realTimeCurrencyService
- **Fallback Rates**: Hardcoded rates when real-time service fails
- **Rate Caching**: Exchange rates cached to avoid excessive API calls
- **Cross-Currency Logic**: Handles all major currency pairs (USD, INR, EUR, GBP)

#### Conversion Rules
- **Portfolio Aggregation**: All portfolio values converted to selected dashboard currency
- **Holdings Display**: Holdings shown in original currency or converted based on user preference
- **P&L Calculation**: Realized/unrealized P&L converted for accurate totals

### 5. Allocation Calculations

#### Portfolio Allocation
- **Weight Calculation**: Each portfolio's percentage of total portfolio value
- **Currency Normalization**: All values converted to common currency before percentage calculation
- **Cash vs Investment**: Separate tracking of cash positions vs invested amounts

#### Sector/Country/Currency Allocations
- **Sector Mapping**: Holdings categorized by business sector
- **Geographic Allocation**: Holdings grouped by company country/exchange
- **Currency Exposure**: Allocation by underlying currency exposure
- **Percentage Calculation**: (Category Value / Total Portfolio Value) × 100

### 6. Performance Analytics

#### Return Calculations
- **Total Return**: Unrealized P&L + Realized P&L
- **Percentage Return**: Total Return / Total Invested × 100
- **Daily Performance**: Daily change in portfolio value
- **XIRR**: Time-weighted return calculation (currently mocked)

#### Benchmarking
- **Portfolio Comparison**: Side-by-side performance analysis
- **Risk Metrics**: Volatility, Sharpe ratio, maximum drawdown calculations
- **Time Periods**: Performance tracking across multiple time horizons

## Data Flow Architecture

### 1. Data Storage Layer
- **Local File Storage**: JSON files for portfolios, transactions, settings
- **File Structure**:
  - `data/portfolios.json` - Portfolio definitions
  - `data/transactions.json` - All transaction records
  - `data/stocks.json` - Cached market data
  - `data/cash-positions.json` - Cash balances per portfolio

### 2. API Layer
- **REST Endpoints**: Next.js API routes for all data operations
- **CRUD Operations**: Create, read, update operations for portfolios and transactions
- **Data Aggregation**: API endpoints for dashboard data, holdings calculations
- **Cache Management**: API-level caching with appropriate headers

### 3. Service Layer
- **PortfolioService**: Core business logic for portfolio calculations
- **MarketDataService**: Market data fetching, caching, and processing
- **CurrencyService**: Exchange rate management and conversion logic
- **StorageService**: Abstraction layer for data persistence

### 4. UI Layer
- **Dashboard View**: Aggregated portfolio overview with charts and metrics
- **Portfolio Detail**: Individual portfolio holdings and performance
- **Transaction Management**: Add/edit transactions with validation
- **Settings**: Currency preferences and system configuration

## Key Business Rules

### Investment Tracking
1. **Multi-Currency Support**: Portfolios can have different base currencies
2. **Automatic Currency Detection**: Country determines default currency
3. **Real-time Valuation**: Market prices updated every 5 minutes
4. **Accurate P&L**: FIFO lot tracking ensures precise cost basis

### Data Integrity
1. **Transaction Immutability**: Transactions create audit trail
2. **Currency Consistency**: All calculations use appropriate exchange rates
3. **Error Handling**: Graceful degradation when market data unavailable
4. **Cache Management**: Intelligent caching balances performance with freshness

### User Experience
1. **Flexible Currency Display**: Users can switch dashboard currency
2. **Real-time Updates**: Data refreshes automatically on page focus
3. **Performance Optimization**: Batched requests and caching minimize load times
4. **Responsive Design**: Works across desktop and mobile devices

## Performance Characteristics

### Current Bottlenecks
1. **Serial API Calls**: Sequential data fetching slows initial load
2. **Small Batch Sizes**: Market data fetched in small batches (3 symbols)
3. **No Request Deduplication**: Potential duplicate requests for same data
4. **Heavy DOM Re-renders**: Full refresh on currency changes

### Optimization Opportunities
1. **Parallel Data Fetching**: Concurrent API calls for different data types
2. **Larger Batch Sizes**: Increase market data batch size to 10+ symbols
3. **Request Memoization**: Cache expensive calculations for short periods
4. **Client-side Caching**: Implement React Query for intelligent data caching

This architecture provides a solid foundation for portfolio management while maintaining flexibility for future enhancements and optimizations.