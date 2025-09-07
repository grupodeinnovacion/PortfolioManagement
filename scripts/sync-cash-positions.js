// Sync script to update portfolios.json with correct cash positions
const fs = require('fs').promises;
const path = require('path');

async function syncCashPositions() {
  try {
    const dataDir = path.join(__dirname, '../data');
    
    // Read current files
    const cashPositionsData = await fs.readFile(path.join(dataDir, 'cash-positions.json'), 'utf8');
    const portfoliosData = await fs.readFile(path.join(dataDir, 'portfolios.json'), 'utf8');
    
    const cashPositions = JSON.parse(cashPositionsData);
    const portfolios = JSON.parse(portfoliosData);
    
    console.log('Current cash positions:', cashPositions);
    console.log('Current portfolios cash positions:', portfolios.map(p => ({ id: p.id, cashPosition: p.cashPosition })));
    
    // Update portfolios with correct cash positions
    let hasChanges = false;
    const updatedPortfolios = portfolios.map(portfolio => {
      const realCashPosition = cashPositions[portfolio.id];
      if (realCashPosition !== undefined && portfolio.cashPosition !== realCashPosition) {
        hasChanges = true;
        console.log(`Updating ${portfolio.id}: ${portfolio.cashPosition} → ${realCashPosition}`);
        return {
          ...portfolio,
          cashPosition: realCashPosition,
          updatedAt: new Date().toISOString()
        };
      }
      return portfolio;
    });
    
    if (hasChanges) {
      await fs.writeFile(
        path.join(dataDir, 'portfolios.json'),
        JSON.stringify(updatedPortfolios, null, 2)
      );
      console.log('✅ Cash positions synchronized successfully!');
    } else {
      console.log('✅ Cash positions are already in sync');
    }
    
  } catch (error) {
    console.error('❌ Error syncing cash positions:', error);
  }
}

syncCashPositions();
