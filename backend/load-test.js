/**
 * Load Testing Script for LMS Backend
 * Run: node load-test.js
 * 
 * Requires running backend: npm run start:dev
 */

const autocannon = require('autocannon');

const BASE_URL = 'http://localhost:3000';

// Test scenarios
const tests = [
  {
    name: 'Health Check - Basic',
    url: `${BASE_URL}`,
    method: 'GET',
    duration: 10,
    connections: 100,
    pipelining: 10,
  },
  {
    name: 'Auth - Login (Simulated)',
    url: `${BASE_URL}/auth/profile`,
    method: 'GET',
    duration: 10,
    connections: 50,
    pipelining: 5,
    headers: {
      'Content-Type': 'application/json',
    },
  },
  {
    name: 'Classes - List (Public)',
    url: `${BASE_URL}/classes`,
    method: 'GET',
    duration: 10,
    connections: 100,
    pipelining: 10,
  },
];

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format number with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Run a single test
async function runTest(config) {
  console.log('\n' + '='.repeat(60));
  console.log(`🔄 Testing: ${config.name}`);
  console.log(`   URL: ${config.url}`);
  console.log(`   Duration: ${config.duration}s | Connections: ${config.connections} | Pipelining: ${config.pipelining}`);
  console.log('='.repeat(60));

  return new Promise((resolve) => {
    const instance = autocannon({
      url: config.url,
      method: config.method || 'GET',
      connections: config.connections,
      pipelining: config.pipelining,
      duration: config.duration,
      headers: config.headers || {},
      body: config.body || undefined,
    }, (err, result) => {
      if (err) {
        console.error('❌ Error:', err.message);
        resolve(null);
        return;
      }

      console.log('\n📊 Results:');
      console.log('─'.repeat(40));
      
      // Requests stats
      console.log(`\n🚀 Requests:`);
      console.log(`   Total:     ${formatNumber(result.requests.total)}`);
      console.log(`   Average:   ${formatNumber(result.requests.average)}/sec`);
      console.log(`   Min:       ${formatNumber(result.requests.min)}/sec`);
      console.log(`   Max:       ${formatNumber(result.requests.max)}/sec`);
      
      // Latency stats
      console.log(`\n⏱️  Latency (ms):`);
      console.log(`   Average:   ${result.latency.average.toFixed(2)}`);
      console.log(`   Min:       ${result.latency.min}`);
      console.log(`   Max:       ${result.latency.max}`);
      console.log(`   P50:       ${result.latency.p50}`);
      console.log(`   P90:       ${result.latency.p90}`);
      console.log(`   P99:       ${result.latency.p99}`);
      
      // Throughput
      console.log(`\n📈 Throughput:`);
      console.log(`   Average:   ${formatBytes(result.throughput.average)}/sec`);
      console.log(`   Total:     ${formatBytes(result.throughput.total)}`);
      
      // Errors
      if (result.errors > 0) {
        console.log(`\n❌ Errors:    ${result.errors}`);
      }
      if (result.timeouts > 0) {
        console.log(`⏰ Timeouts:  ${result.timeouts}`);
      }
      
      // Status codes
      if (result['2xx']) console.log(`\n✅ 2xx responses: ${formatNumber(result['2xx'])}`);
      if (result['4xx']) console.log(`⚠️  4xx responses: ${formatNumber(result['4xx'])}`);
      if (result['5xx']) console.log(`❌ 5xx responses: ${formatNumber(result['5xx'])}`);
      
      resolve(result);
    });

    // Progress indicator
    autocannon.track(instance, { renderProgressBar: true });
  });
}

// Stress test - gradually increase load
async function stressTest() {
  console.log('\n' + '🔥'.repeat(30));
  console.log('STRESS TEST - Gradually Increasing Load');
  console.log('🔥'.repeat(30));

  const connectionLevels = [10, 50, 100, 200, 500];
  const results = [];

  for (const connections of connectionLevels) {
    console.log(`\n>>> Testing with ${connections} concurrent connections...`);
    
    const result = await new Promise((resolve) => {
      autocannon({
        url: `${BASE_URL}`,
        connections: connections,
        pipelining: 1,
        duration: 5,
      }, (err, result) => {
        if (err) {
          console.error('Error:', err.message);
          resolve(null);
          return;
        }
        resolve(result);
      });
    });

    if (result) {
      results.push({
        connections,
        requestsPerSec: result.requests.average,
        latencyAvg: result.latency.average,
        latencyP99: result.latency.p99,
        errors: result.errors || 0,
      });
      
      console.log(`   Requests/sec: ${formatNumber(result.requests.average)}`);
      console.log(`   Latency avg:  ${result.latency.average.toFixed(2)}ms`);
      console.log(`   Latency P99:  ${result.latency.p99}ms`);
      console.log(`   Errors:       ${result.errors || 0}`);
    }
  }

  // Summary
  console.log('\n' + '📊'.repeat(30));
  console.log('STRESS TEST SUMMARY');
  console.log('─'.repeat(60));
  console.log('Connections | Req/sec    | Latency Avg | P99     | Errors');
  console.log('─'.repeat(60));
  
  for (const r of results) {
    console.log(
      `${r.connections.toString().padStart(11)} | ` +
      `${formatNumber(Math.round(r.requestsPerSec)).padStart(10)} | ` +
      `${r.latencyAvg.toFixed(2).padStart(11)}ms | ` +
      `${r.latencyP99.toString().padStart(5)}ms | ` +
      `${r.errors}`
    );
  }
  
  return results;
}

// WebSocket load test simulation
async function websocketTest() {
  console.log('\n' + '🔌'.repeat(30));
  console.log('WebSocket Load Test (Socket.IO endpoint)');
  console.log('🔌'.repeat(30));
  
  // Test Socket.IO polling endpoint
  const result = await new Promise((resolve) => {
    autocannon({
      url: `${BASE_URL}/socket.io/?EIO=4&transport=polling`,
      connections: 50,
      duration: 10,
    }, (err, result) => {
      if (err) {
        console.error('Error:', err.message);
        resolve(null);
        return;
      }
      resolve(result);
    });
  });

  if (result) {
    console.log(`\n📊 Socket.IO Polling Results:`);
    console.log(`   Requests/sec: ${formatNumber(result.requests.average)}`);
    console.log(`   Latency avg:  ${result.latency.average.toFixed(2)}ms`);
    console.log(`   2xx:          ${formatNumber(result['2xx'] || 0)}`);
    console.log(`   Errors:       ${result.errors || 0}`);
  }
  
  return result;
}

// Main function
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          LMS BACKEND LOAD TESTING SUITE                    ║');
  console.log('║          Online Learning Platform - Nhom14                 ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Target: http://localhost:3000                             ║');
  console.log('║  Tools:  autocannon (high-performance HTTP benchmarking)   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Check if server is running
  console.log('\n🔍 Checking server availability...');
  
  try {
    const http = require('http');
    await new Promise((resolve, reject) => {
      const req = http.get(BASE_URL, (res) => {
        console.log(`✅ Server is running (Status: ${res.statusCode})`);
        resolve();
      });
      req.on('error', (err) => {
        reject(err);
      });
      req.setTimeout(5000, () => {
        reject(new Error('Connection timeout'));
      });
    });
  } catch (err) {
    console.log('❌ Server is not running!');
    console.log('   Please start the backend server first:');
    console.log('   cd backend && npm run start:dev');
    process.exit(1);
  }

  const allResults = {};
  
  // Run individual endpoint tests
  console.log('\n\n' + '🧪'.repeat(30));
  console.log('ENDPOINT PERFORMANCE TESTS');
  console.log('🧪'.repeat(30));
  
  for (const test of tests) {
    allResults[test.name] = await runTest(test);
    // Small delay between tests
    await new Promise(r => setTimeout(r, 2000));
  }

  // Run stress test
  allResults['stress'] = await stressTest();
  
  // Run WebSocket test
  allResults['websocket'] = await websocketTest();

  // Final summary
  console.log('\n\n' + '🏁'.repeat(30));
  console.log('FINAL SUMMARY');
  console.log('🏁'.repeat(30));
  
  console.log('\n📌 Key Metrics:');
  
  // Find max throughput
  let maxThroughput = 0;
  let maxThroughputTest = '';
  
  for (const [name, result] of Object.entries(allResults)) {
    if (result && result.requests && result.requests.average > maxThroughput) {
      maxThroughput = result.requests.average;
      maxThroughputTest = name;
    }
  }
  
  console.log(`\n   🏆 Highest Throughput: ${formatNumber(Math.round(maxThroughput))} req/sec (${maxThroughputTest})`);
  
  // Stress test insights
  if (allResults.stress && allResults.stress.length > 0) {
    const stressResults = allResults.stress;
    const lastStress = stressResults[stressResults.length - 1];
    const firstStress = stressResults[0];
    
    console.log(`\n   📈 Stress Test Insights:`);
    console.log(`      • At ${firstStress.connections} connections: ${formatNumber(Math.round(firstStress.requestsPerSec))} req/sec`);
    console.log(`      • At ${lastStress.connections} connections: ${formatNumber(Math.round(lastStress.requestsPerSec))} req/sec`);
    console.log(`      • Latency increase: ${firstStress.latencyAvg.toFixed(2)}ms → ${lastStress.latencyAvg.toFixed(2)}ms`);
  }

  console.log('\n✅ Load testing completed!');
  console.log('\n💡 Recommendations based on results:');
  console.log('   • If P99 latency > 500ms under load: Consider adding caching');
  console.log('   • If errors occur at high connections: Review rate limiting config');
  console.log('   • For production: Use Redis for session storage and caching');
  console.log('   • Consider adding horizontal scaling with PM2 cluster mode');
}

main().catch(console.error);
