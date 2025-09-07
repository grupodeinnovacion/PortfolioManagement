# Portfolio Management Dashboard

A comprehensive, modern portfolio management dashboard designed for retail stock market investors. This application provides real-time portfolio tracking, performance analytics, and seamless Google Sheets integration for transaction management.

![Portfolio Dashboard](https://img.shields.io/badge/Next.js-15.5.2-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC)

## ✨ Features

### 📊 **Consolidated Dashboard**
- **Multi-Portfolio Overview**: Track multiple portfolios (USA Alpha, USA SIP, India Investments) in one unified view
- **Real-time Metrics**: Total equity value, invested capital, P&L, daily changes, and XIRR calculations
- **Currency Support**: Multi-currency support with automatic conversion for consolidated views
- **Cash Position Tracking**: Visual cash vs. investment allocation bars for each portfolio

### 🎯 **Portfolio Management**
- **Individual Portfolio Pages**: Detailed views for each portfolio with sector allocations and performance metrics
- **Holdings Management**: Complete stock holdings table with search, sort, and real-time price updates
- **Transaction History**: Comprehensive transaction logs with filtering and export capabilities
- **Cash Position Updates**: Inline editing of cash positions for each portfolio

### 📈 **Analytics & Visualizations**
- **Interactive Charts**: Pie charts for portfolio, sector, country, and currency allocations
- **Performance Metrics**: XIRR, total returns, daily changes, and trend indicators
- **Holdings Analysis**: Top gainers/losers, allocation drift from targets
- **Responsive Design**: Mobile-first design that works on all device sizes

### 🔗 **Google Sheets Integration**
- **Live Data Sync**: Direct integration with Google Sheets for transaction management
- **Bulk Import**: Copy-paste transactions from broker statements
- **Schema Validation**: Built-in validation for transaction data
- **Auto-calculations**: Holdings and P&L auto-recalculate from transaction history

### ⚙️ **Configuration & Settings**
- **Multi-Currency Settings**: Configure base currency for dashboard and individual portfolios
- **Target Allocations**: Set and track target allocations with drift monitoring
- **Notification Preferences**: Customizable alerts for transactions and rebalancing
- **Google Sheets Setup**: Easy configuration for spreadsheet integration

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Sheets account (for data integration)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd PortfolioManagement
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 📋 Google Sheets Setup

### 1. Create Your Portfolio Sheet
Create a Google Sheet with the following tabs:

#### **Transactions Tab**
| Portfolio | Date | Action | Ticker | Exchange | Quantity | Trade Price | Currency | Fees | Notes | Tag |
|-----------|------|--------|--------|----------|----------|-------------|----------|------|-------|-----|
| usa-alpha | 2024-09-05 | BUY | AAPL | NASDAQ | 100 | 150.00 | USD | 5.00 | Initial purchase | Growth |

#### **Settings Tab**
| Portfolio | Base Currency | Target Cash % | Rebalance Threshold % |
|-----------|---------------|---------------|----------------------|
| usa-alpha | USD | 10 | 5 |
| usa-sip | USD | 15 | 3 |
| india-investments | INR | 12 | 5 |

#### **Portfolios Tab**
| Portfolio ID | Name | Description | Currency | Cash Position |
|--------------|------|-------------|----------|---------------|
| usa-alpha | USA Alpha Fund | High-growth US investments | USD | 103689.97 |
| usa-sip | USA SIP | Systematic Investment Plan | USD | 45000.00 |
| india-investments | India Investments | Indian equity investments | INR | 250000.00 |

### 2. Configure Integration
1. Go to Settings → Google Sheets
2. Enter your Spreadsheet ID (from the Google Sheets URL)
3. Configure sheet names (default: Transactions, Settings, Portfolios)
4. Set up Google Sheets API access (requires service account)

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15 with App Router
- **Styling**: Tailwind CSS with dark mode support
- **Charts**: Recharts for interactive visualizations
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation
- **Data Integration**: Google Sheets API

### Key Components

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Dashboard home page
│   ├── portfolio/         # Portfolio detail pages
│   ├── settings/          # Settings configuration
│   └── transaction/       # Transaction management
├── components/            # Reusable UI components
│   ├── DashboardLayout.tsx
│   ├── PortfolioOverview.tsx
│   ├── AllocationChart.tsx
│   ├── HoldingsTable.tsx
│   └── CashPositionBar.tsx
├── services/              # Data services and API integration
├── types/                 # TypeScript type definitions
└── lib/                  # Utility functions and helpers
```

## 📊 Features Breakdown

### Dashboard Overview
- **Top Metrics Strip**: Total equity, invested capital, P&L, daily change, XIRR
- **Cash vs Investment Bars**: Visual representation of cash allocation across portfolios
- **Allocation Charts**: Portfolio, sector, and geographic distribution
- **Holdings Table**: Top holdings with search, sort, and performance metrics

### Portfolio Details
- **Performance Metrics**: Scoped to individual portfolio
- **Sector Analysis**: Detailed breakdown with target vs actual allocations
- **Transaction History**: Complete audit trail with filtering options
- **Cash Management**: Inline cash position editing

### Transaction Management
- **Smart Forms**: Auto-validation and calculation of totals
- **Multi-Exchange Support**: NASDAQ, NYSE, NSE, BSE, LSE
- **Currency Handling**: Multi-currency transaction support
- **Bulk Operations**: Support for copy-paste from broker statements

## 🎨 Design Philosophy

### User Experience
- **Glanceable Insights**: Important metrics prominently displayed
- **Progressive Disclosure**: Detailed views accessible when needed
- **Keyboard Navigation**: Full keyboard accessibility
- **Mobile Responsive**: Optimized for all screen sizes

### Visual Design
- **Clean Typography**: Readable fonts with proper hierarchy
- **Consistent Spacing**: 6px grid system throughout
- **Color Coding**: Intuitive color scheme for gains/losses
- **Dark Mode**: Complete dark mode support

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file:

```env
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account-email
GOOGLE_SHEETS_PRIVATE_KEY=your-private-key
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
```

### Customization
- **Portfolios**: Configure in `src/services/portfolioService.ts`
- **Colors**: Modify theme in `tailwind.config.js`
- **Currencies**: Add support in `src/lib/utils.ts`

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Other Platforms
- **Netlify**: Configure build command as `npm run build`
- **AWS Amplify**: Use default Next.js configuration
- **Railway**: Deploy with zero configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Design inspiration from professional portfolio management tools
- Icons by [Lucide](https://lucide.dev/)
- Charts powered by [Recharts](https://recharts.org/)
- UI components inspired by modern design systems

---

**Built with ❤️ for retail investors who want professional-grade portfolio management tools.**
