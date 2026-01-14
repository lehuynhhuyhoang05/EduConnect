/**
 * EXTREME STRESS TEST - Find the Breaking Point
 * Môn: Lập Trình Mạng
 * 
 * Test này sẽ tăng dần số connections cho đến khi hệ thống gặp lỗi
 * để tìm ra giới hạn thực sự của WebSocket server.
 * 
 * Run: node extreme-stress-test.js
 */

const io = require('socket.io-client');
const http = require('http');

const BASE_URL = 'http://localhost:3000';
const WS_URL = `${BASE_URL}/live`;

// Test configuration - Extreme settings
const config = {
  // Start with this many connections
  startConnections: 100,
  // Add this many connections each round
  incrementStep: 100,
  // Maximum connections to try
  maxConnections: 2000,
  // Duration of each test round (ms)
  testDuration: 15000,
  // Acceptable error rate (%)
  acceptableErrorRate: 5,
  // Message interval during test (ms)
  messageInterval: 500,
};

// Metrics storage
let metrics = {
  totalConnections: 0,
  successfulConnections: 0,
  failedConnections: 0,
  messagesSent: 0,
  messagesReceived: 0,
  latencies: [],
  errors: [],
  breakingPoint: null,
  maxStableConnections: 0,
};

// All active clients
let clients = [];

// Check if server is running
async function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(BASE_URL, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Create a single WebSocket connection
function createConnection(id) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const socket = io(WS_URL, {
      transports: ['websocket'], // Force WebSocket only for stress test
      timeout: 10000,
      reconnection: false,
      forceNew: true,
      query: { 
        testId: id,
        testMode: 'true', // Enable test mode to skip authentication
      },
    });

    const client = {
      id,
      socket,
      connected: false,
      connectTime: null,
      messagesSent: 0,
      messagesReceived: 0,
      errors: [],
    };

    socket.on('connect', () => {
      client.connected = true;
      client.connectTime = Date.now() - startTime;
      metrics.successfulConnections++;
      resolve(client);
    });

    socket.on('connect_error', (err) => {
      client.errors.push(err.message);
      metrics.failedConnections++;
      metrics.errors.push(`Client ${id}: ${err.message}`);
      resolve(client);
    });

    socket.on('disconnect', (reason) => {
      if (client.connected) {
        client.connected = false;
        metrics.errors.push(`Client ${id} disconnected: ${reason}`);
      }
    });

    socket.on('error', (err) => {
      client.errors.push(err.message);
    });

    // Listen for any response
    socket.onAny(() => {
      client.messagesReceived++;
      metrics.messagesReceived++;
    });

    clients.push(client);

    // Timeout for connection
    setTimeout(() => {
      if (!client.connected) {
        socket.disconnect();
        resolve(client);
      }
    }, 10000);
  });
}

// Send messages from connected clients
async function simulateTraffic(duration) {
  const endTime = Date.now() + duration;
  const connectedClients = clients.filter(c => c.connected);
  
  console.log(`   📡 Simulating traffic with ${connectedClients.length} connected clients...`);
  
  while (Date.now() < endTime) {
    for (const client of connectedClients) {
      if (client.connected && client.socket.connected) {
        const timestamp = Date.now();
        
        // Send test message (simulating real-time activity)
        client.socket.emit('ping-test', { 
          timestamp,
          clientId: client.id,
        });
        
        client.messagesSent++;
        metrics.messagesSent++;
      }
    }
    
    // Small delay between message batches
    await sleep(config.messageInterval);
  }
}

// Clean up all connections
async function cleanupConnections() {
  for (const client of clients) {
    if (client.socket) {
      client.socket.disconnect();
    }
  }
  clients = [];
  
  // Reset per-round metrics
  metrics.successfulConnections = 0;
  metrics.failedConnections = 0;
  metrics.messagesSent = 0;
  metrics.messagesReceived = 0;
  metrics.errors = [];
  
  // Wait for cleanup
  await sleep(2000);
}

// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Format number with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Calculate statistics
function calculateStats(arr) {
  if (arr.length === 0) return { avg: 0, min: 0, max: 0, p50: 0, p99: 0 };
  
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  
  return {
    avg: sum / sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  };
}

// Run a single test round
async function runTestRound(targetConnections) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔥 TESTING: ${targetConnections} CONCURRENT CONNECTIONS`);
  console.log(`${'═'.repeat(60)}`);
  
  const startTime = Date.now();
  
  // Phase 1: Establish connections
  console.log(`\n   📡 Phase 1: Establishing ${targetConnections} connections...`);
  
  const connectionPromises = [];
  const batchSize = 50; // Create connections in batches to avoid overwhelming
  
  for (let i = 0; i < targetConnections; i += batchSize) {
    const batch = [];
    for (let j = i; j < Math.min(i + batchSize, targetConnections); j++) {
      batch.push(createConnection(j));
    }
    await Promise.all(batch);
    
    const progress = Math.min(i + batchSize, targetConnections);
    process.stdout.write(`\r   Progress: ${progress}/${targetConnections} connections`);
  }
  
  console.log('');
  
  const connectedCount = clients.filter(c => c.connected).length;
  const failedCount = clients.filter(c => !c.connected).length;
  const connectionTime = Date.now() - startTime;
  
  console.log(`\n   ✅ Connected: ${connectedCount} | ❌ Failed: ${failedCount}`);
  console.log(`   ⏱️  Connection time: ${(connectionTime / 1000).toFixed(2)}s`);
  
  // Check if too many failures
  const errorRate = (failedCount / targetConnections) * 100;
  if (errorRate > config.acceptableErrorRate) {
    console.log(`\n   ⚠️  ERROR RATE TOO HIGH: ${errorRate.toFixed(1)}%`);
    console.log(`   🔴 BREAKING POINT DETECTED at ${targetConnections} connections!`);
    
    metrics.breakingPoint = targetConnections;
    await cleanupConnections();
    return false;
  }
  
  // Phase 2: Traffic simulation
  console.log(`\n   📡 Phase 2: Simulating traffic for ${config.testDuration / 1000}s...`);
  
  const trafficStartTime = Date.now();
  await simulateTraffic(config.testDuration);
  const trafficDuration = (Date.now() - trafficStartTime) / 1000;
  
  // Collect connection times for latency stats
  const connectTimes = clients
    .filter(c => c.connected && c.connectTime)
    .map(c => c.connectTime);
  
  const stats = calculateStats(connectTimes);
  
  // Phase 3: Results
  console.log(`\n   📊 ROUND RESULTS:`);
  console.log(`   ─────────────────────────────────────`);
  console.log(`   Connections:    ${connectedCount}/${targetConnections} (${((connectedCount/targetConnections)*100).toFixed(1)}%)`);
  console.log(`   Messages sent:  ${formatNumber(metrics.messagesSent)}`);
  console.log(`   Throughput:     ${formatNumber(Math.round(metrics.messagesSent / trafficDuration))} msg/sec`);
  console.log(`   Connect time:`);
  console.log(`      Average:     ${stats.avg.toFixed(2)}ms`);
  console.log(`      P50:         ${stats.p50}ms`);
  console.log(`      P99:         ${stats.p99}ms`);
  console.log(`      Max:         ${stats.max}ms`);
  
  // Check for disconnections during test
  const stillConnected = clients.filter(c => c.connected && c.socket.connected).length;
  const disconnected = connectedCount - stillConnected;
  
  if (disconnected > 0) {
    console.log(`\n   ⚠️  Disconnections during test: ${disconnected}`);
  }
  
  // Update max stable connections
  if (stillConnected > metrics.maxStableConnections) {
    metrics.maxStableConnections = stillConnected;
  }
  
  // Cleanup
  await cleanupConnections();
  
  return true;
}

// Main function
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     EXTREME WEBSOCKET STRESS TEST - LẬP TRÌNH MẠNG            ║');
  console.log('║     Finding the Breaking Point of WebSocket Server             ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║  Target URL:       ${WS_URL.padEnd(42)}║`);
  console.log(`║  Start:            ${config.startConnections} connections`.padEnd(65) + '║');
  console.log(`║  Increment:        +${config.incrementStep} per round`.padEnd(64) + '║');
  console.log(`║  Max test:         ${config.maxConnections} connections`.padEnd(65) + '║');
  console.log(`║  Test duration:    ${config.testDuration / 1000}s per round`.padEnd(65) + '║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  // Check server
  console.log('\n🔍 Checking server availability...');
  const serverOk = await checkServer();
  
  if (!serverOk) {
    console.log('❌ Server is not running!');
    console.log('   Please start: cd backend && npm run start:dev');
    process.exit(1);
  }
  console.log('✅ Server is running\n');
  
  // Run progressive stress tests
  const results = [];
  let currentConnections = config.startConnections;
  
  while (currentConnections <= config.maxConnections) {
    const success = await runTestRound(currentConnections);
    
    if (!success) {
      // Breaking point found
      break;
    }
    
    results.push({
      connections: currentConnections,
      success: true,
    });
    
    // Increase for next round
    currentConnections += config.incrementStep;
    
    // Cooldown between rounds
    console.log('\n   ⏳ Cooldown 3 seconds before next round...');
    await sleep(3000);
  }
  
  // Final Summary
  console.log('\n\n' + '🏁'.repeat(35));
  console.log('                    FINAL RESULTS');
  console.log('🏁'.repeat(35));
  
  console.log('\n📊 TEST PROGRESSION:');
  console.log('─'.repeat(60));
  console.log('Connections | Status');
  console.log('─'.repeat(60));
  
  for (const result of results) {
    console.log(`${result.connections.toString().padStart(11)} | ✅ PASSED`);
  }
  
  if (metrics.breakingPoint) {
    console.log(`${metrics.breakingPoint.toString().padStart(11)} | ❌ BREAKING POINT`);
  }
  
  console.log('\n📈 CAPACITY SUMMARY:');
  console.log('─'.repeat(60));
  console.log(`   Maximum TESTED stable connections: ${results.length > 0 ? results[results.length - 1].connections : 0}`);
  console.log(`   Breaking point detected at:        ${metrics.breakingPoint || 'Not reached'}`);
  console.log(`   Peak concurrent connections:       ${metrics.maxStableConnections}`);
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('─'.repeat(60));
  
  const lastStable = results.length > 0 ? results[results.length - 1].connections : 0;
  
  if (metrics.breakingPoint) {
    console.log(`   • Safe operating capacity: ${Math.floor(metrics.breakingPoint * 0.8)} connections`);
    console.log(`   • Recommended max load:    ${Math.floor(metrics.breakingPoint * 0.7)} connections`);
  } else {
    console.log(`   • Tested up to ${lastStable} connections - no breaking point found!`);
    console.log(`   • Server can likely handle more connections`);
    console.log(`   • Consider testing with higher maxConnections`);
  }
  
  console.log('\n🎓 FOR PRESENTATION:');
  console.log('─'.repeat(60));
  console.log(`   "Hệ thống WebSocket đã được stress test với kết quả:`);
  console.log(`    • Stable với ${lastStable} concurrent WebSocket connections`);
  if (metrics.breakingPoint) {
    console.log(`    • Breaking point tại ${metrics.breakingPoint} connections`);
    console.log(`    • Safe capacity: ${Math.floor(metrics.breakingPoint * 0.8)} connections"`);
  } else {
    console.log(`    • Chưa tìm thấy breaking point trong test range`);
    console.log(`    • Server có khả năng chịu tải cao hơn ${lastStable} connections"`);
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('                    ✅ STRESS TEST COMPLETE');
  console.log('═'.repeat(60));
}

main().catch(console.error);
