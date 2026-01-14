/**
 * WebSocket/Socket.IO Load Testing Script
 * Tests real-time features: Live Sessions, Chat, Whiteboard
 * 
 * Run: node websocket-load-test.js
 */

const io = require('socket.io-client');

const BASE_URL = 'http://localhost:3000';
const TEST_DURATION = 30000; // 30 seconds
const RAMP_UP_TIME = 5000;   // 5 seconds to ramp up all connections

// Test configuration - INCREASED FOR STRESS TEST
const config = {
  totalClients: 500,      // Tăng lên 500 clients để test giới hạn
  messagesPerClient: 10,  // Messages each client sends
  messageInterval: 500,   // Interval between messages (ms) - faster
};

// Metrics
const metrics = {
  connected: 0,
  disconnected: 0,
  connectionErrors: 0,
  messagesSent: 0,
  messagesReceived: 0,
  latencies: [],
  errors: [],
  startTime: null,
  endTime: null,
};

// Store all socket clients
const clients = [];

// Create a single socket client
function createClient(clientId) {
  return new Promise((resolve) => {
    const socket = io(BASE_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: false,
      query: {
        clientId: clientId,
        testMode: 'true', // Enable test mode
      },
    });

    const clientMetrics = {
      connected: false,
      connectionTime: null,
      messagesSent: 0,
      messagesReceived: 0,
      latencies: [],
    };

    const connectStart = Date.now();

    socket.on('connect', () => {
      clientMetrics.connectionTime = Date.now() - connectStart;
      clientMetrics.connected = true;
      metrics.connected++;
      
      if (metrics.connected % 10 === 0) {
        console.log(`   ✅ ${metrics.connected} clients connected`);
      }
    });

    socket.on('connect_error', (err) => {
      metrics.connectionErrors++;
      metrics.errors.push(`Client ${clientId}: ${err.message}`);
    });

    socket.on('disconnect', () => {
      metrics.disconnected++;
      clientMetrics.connected = false;
    });

    // Handle echo responses (for latency measurement)
    socket.on('echo-response', (data) => {
      const latency = Date.now() - data.timestamp;
      clientMetrics.latencies.push(latency);
      metrics.latencies.push(latency);
      clientMetrics.messagesReceived++;
      metrics.messagesReceived++;
    });

    // Handle any message
    socket.onAny((event, ...args) => {
      if (event !== 'echo-response') {
        clientMetrics.messagesReceived++;
        metrics.messagesReceived++;
      }
    });

    // Store reference
    clients.push({
      id: clientId,
      socket,
      metrics: clientMetrics,
    });

    // Give time for connection
    setTimeout(() => {
      resolve({ socket, metrics: clientMetrics });
    }, 100);
  });
}

// Simulate user activity
async function simulateActivity(client, duration) {
  const { socket, metrics: clientMetrics } = client;
  const endTime = Date.now() + duration;
  
  while (Date.now() < endTime && socket.connected) {
    // Send echo message for latency measurement
    socket.emit('echo', { 
      timestamp: Date.now(),
      clientId: client.id,
    });
    clientMetrics.messagesSent++;
    metrics.messagesSent++;

    // Random delay
    await sleep(config.messageInterval + Math.random() * 500);
  }
}

// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Calculate percentile
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// Format number
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Main test function
async function runTest() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        WEBSOCKET LOAD TESTING - LMS Platform               ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Clients:     ${config.totalClients.toString().padEnd(37)}║`);
  console.log(`║  Test Duration:     ${(TEST_DURATION/1000) + 's'.padEnd(36)}║`);
  console.log(`║  Message Interval:  ${config.messageInterval + 'ms'.padEnd(35)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  metrics.startTime = Date.now();

  // Phase 1: Connection ramp-up
  console.log('\n📡 Phase 1: Establishing connections...');
  console.log(`   Ramping up ${config.totalClients} clients over ${RAMP_UP_TIME/1000}s`);
  
  const connectionDelay = RAMP_UP_TIME / config.totalClients;
  const connectionPromises = [];

  for (let i = 0; i < config.totalClients; i++) {
    connectionPromises.push(
      (async () => {
        await sleep(i * connectionDelay);
        return createClient(`user_${i}`);
      })()
    );
  }

  await Promise.all(connectionPromises);
  
  console.log(`\n   ✅ Connection phase complete:`);
  console.log(`      Connected:    ${metrics.connected}`);
  console.log(`      Errors:       ${metrics.connectionErrors}`);

  // Phase 2: Activity simulation
  console.log('\n🔄 Phase 2: Simulating user activity...');
  console.log(`   Duration: ${TEST_DURATION/1000}s`);
  
  const activityDuration = TEST_DURATION - RAMP_UP_TIME;
  const activityPromises = clients
    .filter(c => c.socket.connected)
    .map(c => simulateActivity(c, activityDuration));

  // Progress indicator
  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - metrics.startTime;
    const progress = Math.min(100, Math.round((elapsed / TEST_DURATION) * 100));
    process.stdout.write(`\r   Progress: ${progress}% | Messages sent: ${formatNumber(metrics.messagesSent)} | Received: ${formatNumber(metrics.messagesReceived)}`);
  }, 1000);

  await Promise.all(activityPromises);
  clearInterval(progressInterval);
  
  console.log('\n');

  // Phase 3: Cleanup
  console.log('🧹 Phase 3: Cleaning up...');
  for (const client of clients) {
    client.socket.disconnect();
  }

  metrics.endTime = Date.now();

  // Calculate final metrics
  const totalTime = (metrics.endTime - metrics.startTime) / 1000;
  const avgLatency = metrics.latencies.length > 0 
    ? metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length 
    : 0;

  // Print results
  console.log('\n' + '═'.repeat(60));
  console.log('                    📊 TEST RESULTS');
  console.log('═'.repeat(60));

  console.log('\n🔌 Connection Metrics:');
  console.log('─'.repeat(40));
  console.log(`   Total Clients:        ${config.totalClients}`);
  console.log(`   Successfully Connected: ${metrics.connected}`);
  console.log(`   Connection Errors:    ${metrics.connectionErrors}`);
  console.log(`   Success Rate:         ${((metrics.connected / config.totalClients) * 100).toFixed(1)}%`);

  console.log('\n📨 Message Metrics:');
  console.log('─'.repeat(40));
  console.log(`   Messages Sent:        ${formatNumber(metrics.messagesSent)}`);
  console.log(`   Messages Received:    ${formatNumber(metrics.messagesReceived)}`);
  console.log(`   Messages/Second:      ${formatNumber(Math.round(metrics.messagesSent / totalTime))}`);

  console.log('\n⏱️  Latency (ms):');
  console.log('─'.repeat(40));
  if (metrics.latencies.length > 0) {
    console.log(`   Min:                  ${Math.min(...metrics.latencies)}`);
    console.log(`   Max:                  ${Math.max(...metrics.latencies)}`);
    console.log(`   Average:              ${avgLatency.toFixed(2)}`);
    console.log(`   P50 (median):         ${percentile(metrics.latencies, 50)}`);
    console.log(`   P90:                  ${percentile(metrics.latencies, 90)}`);
    console.log(`   P99:                  ${percentile(metrics.latencies, 99)}`);
  } else {
    console.log(`   No latency data (echo handler not implemented on server)`);
  }

  console.log('\n📈 Performance Summary:');
  console.log('─'.repeat(40));
  console.log(`   Test Duration:        ${totalTime.toFixed(2)}s`);
  console.log(`   Peak Connections:     ${metrics.connected}`);
  console.log(`   Throughput:           ${formatNumber(Math.round((metrics.messagesSent + metrics.messagesReceived) / totalTime))} events/sec`);

  // Recommendations
  console.log('\n💡 Analysis:');
  console.log('─'.repeat(40));
  
  if (metrics.connectionErrors > 0) {
    console.log(`   ⚠️  ${metrics.connectionErrors} connection errors occurred`);
    console.log(`      Consider increasing server capacity or connection limits`);
  }
  
  if (avgLatency > 100) {
    console.log(`   ⚠️  Average latency (${avgLatency.toFixed(0)}ms) is higher than ideal`);
    console.log(`      Consider optimizing WebSocket handlers`);
  } else if (avgLatency > 0) {
    console.log(`   ✅ Latency is within acceptable range (${avgLatency.toFixed(0)}ms avg)`);
  }
  
  if (metrics.connected >= config.totalClients * 0.95) {
    console.log(`   ✅ Excellent connection success rate (${((metrics.connected / config.totalClients) * 100).toFixed(1)}%)`);
  }

  // Capacity estimation
  console.log('\n🎯 Capacity Estimation:');
  console.log('─'.repeat(40));
  const successRate = metrics.connected / config.totalClients;
  if (successRate >= 0.99 && avgLatency < 100) {
    console.log(`   Server can likely handle ${config.totalClients * 2}+ concurrent WebSocket connections`);
  } else if (successRate >= 0.90) {
    console.log(`   Server is near capacity at ${config.totalClients} connections`);
  } else {
    console.log(`   Server may be overloaded at ${config.totalClients} connections`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('                    ✅ Test Complete');
  console.log('═'.repeat(60));

  return metrics;
}

// Run the test
runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
