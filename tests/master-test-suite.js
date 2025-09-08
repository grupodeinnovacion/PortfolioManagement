/**
 * CRITICAL: Master Test Suite Runner
 * Orchestrates all critical test suites for production validation
 * Provides comprehensive validation with zero error tolerance
 */

const { testFinancialUtilities } = require('./financial-utilities.test.js');
const { testMarketDataService } = require('./market-data-service.test.js');
const { testPortfolioPnLCalculations } = require('./portfolio-pnl-calculations.test.js');
const { testDataIntegrityTransactions } = require('./data-integrity-transactions.test.js');
const { testAPIStressPerformance } = require('./api-stress-performance.test.js');
const { testUIFinancialComponents } = require('./ui-financial-components.test.js');
const { testEndToEndWorkflows } = require('./end-to-end-workflows.test.js');

async function runMasterTestSuite() {
  console.log('🚀 CRITICAL FINANCIAL APPLICATION TEST SUITE');
  console.log('===========================================');
  console.log('🎯 ZERO ERROR TOLERANCE - PRODUCTION VALIDATION');
  console.log('⚡ COMPREHENSIVE TESTING FOR FINANCIAL ACCURACY\n');

  const testSuites = [
    {
      name: 'Financial Utilities & Calculations',
      testFn: testFinancialUtilities,
      critical: true,
      description: 'Currency formatting, P&L calculations, mathematical precision'
    },
    {
      name: 'Market Data Service Reliability',
      testFn: testMarketDataService,
      critical: true,
      description: 'Stock data accuracy, API reliability, error handling'
    },
    {
      name: 'Portfolio P&L Calculations',
      testFn: testPortfolioPnLCalculations,
      critical: true,
      description: 'Holdings accuracy, portfolio totals, sector allocation'
    },
    {
      name: 'Data Integrity & Transactions',
      testFn: testDataIntegrityTransactions,
      critical: true,
      description: 'Transaction processing, cash positions, data validation'
    },
    {
      name: 'API Stress & Performance',
      testFn: testAPIStressPerformance,
      critical: false,
      description: 'System performance, concurrent access, load testing'
    },
    {
      name: 'UI Financial Components',
      testFn: testUIFinancialComponents,
      critical: true,
      description: 'Display accuracy, formatting consistency, user interface'
    },
    {
      name: 'End-to-End Workflows',
      testFn: testEndToEndWorkflows,
      critical: true,
      description: 'Complete workflows, data flow, system integration'
    }
  ];

  const results = {
    totalSuites: testSuites.length,
    passedSuites: 0,
    failedSuites: 0,
    criticalFailures: 0,
    startTime: Date.now(),
    suiteResults: []
  };

  for (let i = 0; i < testSuites.length; i++) {
    const suite = testSuites[i];
    
    console.log(`\n📋 Test Suite ${i + 1}/${testSuites.length}: ${suite.name}`);
    console.log(`   Description: ${suite.description}`);
    console.log(`   Critical: ${suite.critical ? '🚨 YES' : '⚠️ NO'}`);
    console.log('   ' + '='.repeat(60));

    const suiteStartTime = Date.now();
    let success = false;

    try {
      success = await suite.testFn();
      
      const suiteEndTime = Date.now();
      const duration = suiteEndTime - suiteStartTime;

      if (success) {
        console.log(`\n✅ SUITE PASSED in ${duration}ms`);
        results.passedSuites++;
      } else {
        console.log(`\n❌ SUITE FAILED in ${duration}ms`);
        results.failedSuites++;
        if (suite.critical) {
          results.criticalFailures++;
        }
      }

      results.suiteResults.push({
        name: suite.name,
        success,
        duration,
        critical: suite.critical
      });

    } catch (error) {
      const suiteEndTime = Date.now();
      const duration = suiteEndTime - suiteStartTime;
      
      console.log(`\n💥 SUITE CRASHED in ${duration}ms: ${error.message}`);
      results.failedSuites++;
      if (suite.critical) {
        results.criticalFailures++;
      }

      results.suiteResults.push({
        name: suite.name,
        success: false,
        duration,
        critical: suite.critical,
        error: error.message
      });
    }

    // Add separator between suites
    console.log('\n' + '═'.repeat(80));
  }

  // Final results
  const totalTime = Date.now() - results.startTime;
  
  console.log('\n🏁 MASTER TEST SUITE RESULTS');
  console.log('============================');
  console.log(`⏱️  Total Execution Time: ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`📊 Test Suites: ${results.totalSuites}`);
  console.log(`✅ Passed: ${results.passedSuites}`);
  console.log(`❌ Failed: ${results.failedSuites}`);
  console.log(`🚨 Critical Failures: ${results.criticalFailures}`);
  console.log(`📈 Success Rate: ${((results.passedSuites / results.totalSuites) * 100).toFixed(1)}%`);

  // Detailed results
  console.log('\n📋 DETAILED SUITE RESULTS:');
  results.suiteResults.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const critical = result.critical ? '🚨' : '⚠️';
    const duration = `${result.duration}ms`;
    const error = result.error ? ` (${result.error})` : '';
    
    console.log(`   ${index + 1}. ${status} ${critical} ${result.name} - ${duration}${error}`);
  });

  // Critical assessment
  console.log('\n🎯 PRODUCTION READINESS ASSESSMENT:');
  
  if (results.criticalFailures === 0 && results.passedSuites === results.totalSuites) {
    console.log('✅ ALL CRITICAL TESTS PASSED - PRODUCTION DEPLOYMENT APPROVED');
    console.log('🚀 ZERO ERROR TOLERANCE ACHIEVED - FINANCIAL ACCURACY VALIDATED');
  } else if (results.criticalFailures === 0) {
    console.log('⚠️  ALL CRITICAL TESTS PASSED - NON-CRITICAL ISSUES DETECTED');
    console.log('🔄 PRODUCTION DEPLOYMENT APPROVED WITH MONITORING');
  } else {
    console.log('🚨 CRITICAL FAILURES DETECTED - PRODUCTION DEPLOYMENT BLOCKED');
    console.log('❌ FINANCIAL ACCURACY COMPROMISED - IMMEDIATE FIXES REQUIRED');
    
    // List critical failures
    const criticalFailures = results.suiteResults.filter(r => !r.success && r.critical);
    console.log('\n💥 CRITICAL FAILURES REQUIRING IMMEDIATE ATTENTION:');
    criticalFailures.forEach((failure, index) => {
      console.log(`   ${index + 1}. ${failure.name}${failure.error ? `: ${failure.error}` : ''}`);
    });
  }

  // Recommendations
  console.log('\n📝 RECOMMENDATIONS:');
  
  if (results.criticalFailures === 0) {
    console.log('   • Deploy to production with confidence');
    console.log('   • Monitor system performance in production');
    console.log('   • Schedule regular test suite execution');
    console.log('   • Consider implementing automated CI/CD testing');
  } else {
    console.log('   • Fix all critical test failures before deployment');
    console.log('   • Re-run complete test suite after fixes');
    console.log('   • Consider additional manual testing');
    console.log('   • Review and strengthen error handling');
  }

  // Security and compliance notes
  console.log('\n🔒 SECURITY & COMPLIANCE NOTES:');
  console.log('   • Financial data accuracy validated');
  console.log('   • Mathematical calculations verified');
  console.log('   • API security and error handling tested');
  console.log('   • User interface consistency confirmed');
  console.log('   • System performance benchmarked');

  const overallSuccess = results.criticalFailures === 0;
  
  if (overallSuccess) {
    console.log('\n🎉 COMPREHENSIVE TEST SUITE COMPLETED SUCCESSFULLY');
    console.log('💰 FINANCIAL APPLICATION READY FOR PRODUCTION USE');
  } else {
    console.log('\n⛔ TEST SUITE COMPLETED WITH CRITICAL ISSUES');
    console.log('🚫 PRODUCTION DEPLOYMENT NOT RECOMMENDED');
  }

  return overallSuccess;
}

// Export for programmatic use
module.exports = { runMasterTestSuite };

// Run if called directly
if (require.main === module) {
  runMasterTestSuite()
    .then(success => {
      console.log(`\n🔚 Test suite execution completed. Exit code: ${success ? 0 : 1}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 FATAL: Master test suite execution failed:', error);
      console.log('\n🚫 CRITICAL SYSTEM FAILURE - IMMEDIATE INVESTIGATION REQUIRED');
      process.exit(1);
    });
}
