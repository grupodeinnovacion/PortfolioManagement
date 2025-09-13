#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Portfolio Management System
 * Executes all test files and provides a summary report
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_TIMEOUT = 30000; // 30 seconds per test
const PARALLEL_TESTS = false; // Set to true for parallel execution

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class TestRunner {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      skipped: [],
      total: 0,
      duration: 0
    };
    this.startTime = Date.now();
  }

  // Get all test files in the tests directory
  getTestFiles() {
    const testsDir = __dirname;
    const testFiles = fs.readdirSync(testsDir)
      .filter(file => file.endsWith('.test.js') && file !== 'run-all-tests.js')
      .map(file => path.join(testsDir, file));

    console.log(`${colors.blue}🔍 Found ${testFiles.length} test files:${colors.reset}`);
    testFiles.forEach(file => {
      console.log(`   📄 ${path.basename(file)}`);
    });
    console.log();

    return testFiles;
  }

  // Run a single test file
  async runTest(testFile) {
    return new Promise((resolve) => {
      const testName = path.basename(testFile, '.test.js');
      console.log(`${colors.cyan}🧪 Running ${testName}...${colors.reset}`);

      const startTime = Date.now();
      const child = spawn('node', [testFile], {
        stdio: 'pipe',
        timeout: TEST_TIMEOUT
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        const result = {
          name: testName,
          file: testFile,
          code,
          duration,
          stdout,
          stderr,
          success: code === 0
        };

        if (code === 0) {
          console.log(`${colors.green}✅ ${testName} passed (${duration}ms)${colors.reset}`);
          this.results.passed.push(result);
        } else {
          console.log(`${colors.red}❌ ${testName} failed (${duration}ms)${colors.reset}`);
          if (stderr) {
            console.log(`${colors.yellow}   Error output: ${stderr.trim()}${colors.reset}`);
          }
          this.results.failed.push(result);
        }

        resolve(result);
      });

      child.on('error', (error) => {
        console.log(`${colors.red}💥 ${testName} crashed: ${error.message}${colors.reset}`);
        this.results.failed.push({
          name: testName,
          file: testFile,
          error: error.message,
          success: false
        });
        resolve();
      });
    });
  }

  // Run all tests
  async runAllTests() {
    console.log(`${colors.bright}${colors.magenta}🚀 Portfolio Management System - Test Suite${colors.reset}\n`);

    const testFiles = this.getTestFiles();
    this.results.total = testFiles.length;

    if (PARALLEL_TESTS) {
      // Run tests in parallel
      console.log(`${colors.yellow}⚡ Running tests in parallel...${colors.reset}\n`);
      const promises = testFiles.map(file => this.runTest(file));
      await Promise.allSettled(promises);
    } else {
      // Run tests sequentially
      console.log(`${colors.yellow}🔄 Running tests sequentially...${colors.reset}\n`);
      for (const testFile of testFiles) {
        await this.runTest(testFile);
        console.log(); // Add spacing between tests
      }
    }

    this.results.duration = Date.now() - this.startTime;
    this.printSummary();
  }

  // Print detailed test summary
  printSummary() {
    console.log(`${colors.bright}${colors.blue}📊 Test Suite Summary${colors.reset}`);
    console.log('='.repeat(50));

    // Overall stats
    const passRate = ((this.results.passed.length / this.results.total) * 100).toFixed(1);
    console.log(`${colors.bright}Total Tests:${colors.reset} ${this.results.total}`);
    console.log(`${colors.green}✅ Passed:${colors.reset} ${this.results.passed.length}`);
    console.log(`${colors.red}❌ Failed:${colors.reset} ${this.results.failed.length}`);
    console.log(`${colors.yellow}⏭️ Skipped:${colors.reset} ${this.results.skipped.length}`);
    console.log(`${colors.bright}📈 Pass Rate:${colors.reset} ${passRate}%`);
    console.log(`${colors.bright}⏱️ Total Duration:${colors.reset} ${this.results.duration}ms\n`);

    // Passed tests
    if (this.results.passed.length > 0) {
      console.log(`${colors.green}${colors.bright}✅ Passed Tests:${colors.reset}`);
      this.results.passed.forEach(test => {
        console.log(`   ${colors.green}✓${colors.reset} ${test.name} (${test.duration}ms)`);
      });
      console.log();
    }

    // Failed tests with details
    if (this.results.failed.length > 0) {
      console.log(`${colors.red}${colors.bright}❌ Failed Tests:${colors.reset}`);
      this.results.failed.forEach(test => {
        console.log(`   ${colors.red}✗${colors.reset} ${test.name}`);
        if (test.stderr) {
          console.log(`     ${colors.yellow}Error:${colors.reset} ${test.stderr.split('\n')[0]}`);
        }
        if (test.error) {
          console.log(`     ${colors.yellow}Error:${colors.reset} ${test.error}`);
        }
      });
      console.log();
    }

    // Performance insights
    if (this.results.passed.length > 0) {
      const durations = this.results.passed.map(t => t.duration);
      const avgDuration = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(0);
      const maxDuration = Math.max(...durations);
      const slowestTest = this.results.passed.find(t => t.duration === maxDuration);

      console.log(`${colors.blue}⚡ Performance Insights:${colors.reset}`);
      console.log(`   Average test duration: ${avgDuration}ms`);
      console.log(`   Slowest test: ${slowestTest.name} (${maxDuration}ms)`);
      console.log();
    }

    // Final result
    if (this.results.failed.length === 0) {
      console.log(`${colors.green}${colors.bright}🎉 All tests passed! System is healthy.${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`${colors.red}${colors.bright}🚨 ${this.results.failed.length} test(s) failed. Please review and fix.${colors.reset}`);
      process.exit(1);
    }
  }
}

// Check if development server is running
async function checkDevServer() {
  try {
    const response = await fetch('http://localhost:3000/api/portfolios');
    if (response.ok) {
      console.log(`${colors.green}✅ Development server is running${colors.reset}\n`);
      return true;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Development server is not running on localhost:3000${colors.reset}`);
    console.log(`${colors.yellow}💡 Please start the server with: npm run dev${colors.reset}\n`);
    return false;
  }
}

// Main execution
async function main() {
  // Check for required Node.js version
  const nodeVersion = process.version;
  console.log(`${colors.blue}🔧 Node.js version: ${nodeVersion}${colors.reset}`);

  // Check if development server is running
  if (process.argv.includes('--skip-server-check')) {
    console.log(`${colors.yellow}⚠️ Skipping server check as requested${colors.reset}\n`);
  } else {
    const serverRunning = await checkDevServer();
    if (!serverRunning) {
      process.exit(1);
    }
  }

  // Create and run test runner
  const runner = new TestRunner();
  await runner.runAllTests();
}

// Handle CLI arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
${colors.bright}Portfolio Management System Test Runner${colors.reset}

Usage: node run-all-tests.js [options]

Options:
  --help, -h          Show this help message
  --skip-server-check Skip checking if development server is running
  --parallel          Run tests in parallel (experimental)

Examples:
  node run-all-tests.js
  node run-all-tests.js --skip-server-check
  node run-all-tests.js --parallel
`);
  process.exit(0);
}

if (process.argv.includes('--parallel')) {
  PARALLEL_TESTS = true;
}

// Run the test suite
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}💥 Test runner crashed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = { TestRunner };