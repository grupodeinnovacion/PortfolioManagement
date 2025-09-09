// Portfolio Types
export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  country: string; // Country determines currency automatically
  currency: string;
  cashPosition: number;
  targetCashPercent?: number;
  totalInvested?: number;
  currentValue?: number;
  realizedPL?: number;
  unrealizedPL?: number;
  dailyChange?: number;
  dailyChangePercent?: number;
  totalReturn?: number;
  totalReturnPercent?: number;
  xirr?: number;
  createdAt: Date;
  updatedAt?: Date;
  lastUpdated?: string;
}

// Transaction Types
export interface Transaction {
  id: string;
  portfolioId: string;
  date: Date;
  action: 'BUY' | 'SELL';
  ticker: string;
  exchange: string;
  country: string;
  quantity: number;
  tradePrice: number;
  currency: string;
  fees: number;
  notes?: string;
  tag?: string;
  lotId?: string;
}

// Holding Types
export interface Holding {
  ticker: string;
  name: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  currentValue: number;
  investedValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  dailyChange: number;
  dailyChangePercent: number;
  allocation: number;
  sector?: string;
  country: string;
  currency: string;
  exchange: string;
}

// Allocation Types
export interface AllocationItem {
  name: string;
  value: number;
  percentage: number;
  color?: string;
  target?: number;
  drift?: number;
}

// Dashboard Data
export interface DashboardData {
  totalInvested: number;
  totalCurrentValue: number;
  totalRealizedPL: number;
  totalUnrealizedPL: number;
  totalPL: number;
  totalPLPercent: number;
  dailyChange: number;
  dailyChangePercent: number;
  xirr: number;
  totalCashPosition: number;
  availableCashPosition: number;
  allocations: AllocationItem[];
  sectorAllocations: AllocationItem[];
  countryAllocations: AllocationItem[];
  currencyAllocations: AllocationItem[];
  topHoldings: Holding[];
  topGainers: Holding[];
  topLosers: Holding[];
  lastUpdated: string;
}

// Settings Types
export interface PortfolioSettings {
  portfolioId: string;
  baseCurrency: string;
  targetAllocations: Record<string, number>;
  benchmarkTicker?: string;
  riskFreeRate: number;
  rebalanceThreshold: number;
}

export interface DashboardSettings {
  baseCurrency: string;
  portfolioWeights: Record<string, number>;
  refreshInterval: number;
  dataSource: string;
}

// Market Data Types
export interface MarketData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  lastUpdated: Date;
  currency: string;
}

export interface CurrencyRate {
  from: string;
  to: string;
  rate: number;
  lastUpdated: Date;
}

// Google Sheets Types
export interface SheetsConfig {
  spreadsheetId: string;
  transactionsSheet: string;
  settingsSheet: string;
  portfoliosSheet: string;
  credentialsPath: string;
}

// Lot Tracking for FIFO
export interface Lot {
  id: string;
  transactionId: string;
  ticker: string;
  quantity: number;
  price: number;
  date: Date;
  remaining: number;
}

// Performance Analytics
export interface PerformanceMetrics {
  returns: number[];
  dates: Date[];
  benchmark?: number[];
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  alpha?: number;
  beta?: number;
  correlation?: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// Form Types
export interface TransactionFormData {
  portfolioId: string;
  date: string;
  action: 'BUY' | 'SELL';
  ticker: string;
  quantity: number;
  tradePrice: number;
  currency: string;
  fees: number;
  notes?: string;
  tag?: string;
}

export interface PortfolioFormData {
  name: string;
  description?: string;
  currency: string;
  initialCash: number;
}

// Chart Data Types
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface PieChartData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

// Error Types
export interface ValidationError {
  field: string;
  message: string;
}

export interface DataValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  portfolioId?: string;
  transactionId?: string;
}

// Audit Trail
export interface AuditLog {
  id: string;
  action: string;
  entityType: 'portfolio' | 'transaction' | 'setting';
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  userId: string;
  timestamp: Date;
  ip?: string;
}

// Filter and Sort Types
export interface TableFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between';
  value: string | number | boolean;
  value2?: string | number | boolean; // for between operator
}

export interface TableSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface TableQuery {
  page: number;
  pageSize: number;
  filters: TableFilter[];
  sorts: TableSort[];
  search?: string;
}

// Cash Management
export interface CashTransaction {
  id: string;
  portfolioId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND' | 'INTEREST' | 'FEE';
  amount: number;
  currency: string;
  date: Date;
  description: string;
  reference?: string;
}

// Rebalancing
export interface RebalanceRecommendation {
  ticker: string;
  currentAllocation: number;
  targetAllocation: number;
  drift: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  suggestedQuantity: number;
  suggestedValue: number;
}

export interface RebalanceReport {
  portfolioId: string;
  totalValue: number;
  cashAvailable: number;
  recommendations: RebalanceRecommendation[];
  estimatedCost: number;
  generatedAt: Date;
}
