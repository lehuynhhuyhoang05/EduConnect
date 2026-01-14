/**
 * REALISTIC LOAD TEST - Application Layer Testing
 * 
 * Mục đích: Test khả năng chịu tải THỰC TẾ của hệ thống
 * Bao gồm: Database queries, JWT authentication, Business logic
 * 
 * Khác biệt với extreme-stress-test.js:
 * - Không dùng testMode (authentication thật)
 * - Có database queries
 * - Có business logic processing
 * - Payload lớn hơn, phức tạp hơn
 * 
 * Expected: Capacity thấp hơn network test (300-500 users)
 */

const io = require('socket.io-client');
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';

// Test configuration
const TEST_CONFIG = {
  stages: [
    { connections: 50, duration: 15000, description: '50 users - Lớp học nhỏ' },
    { connections: 100, duration: 15000, description: '100 users - Lớp học trung bình' },
    { connections: 150, duration: 15000, description: '150 users - Nhiều lớp' },
    { connections: 200, duration: 15000, description: '200 users - Stress test' },
  ],
  messageInterval: 3000, // Gửi tin nhắn mỗi 3s
  heartbeatInterval: 30000, // Heartbeat mỗi 30s
};

// Store metrics
let metrics = {
  totalConnections: 0,
  activeConnections: 0,
  failedConnections: 0,
  messagesSent: 0,
  messagesReceived: 0,
  errors: [],
  latencies: [],
  authTime: [],
  connectionTime: [],
};

// Test users pool (will be created)
let testUsers = [];
const TEST_USER_COUNT = 200; // Create 200 test users

/**
 * Step 1: Create test users using BULK endpoint (bypasses rate limiting)
 */
async function createTestUsers() {
  console.log(`\n📝 Creating ${TEST_USER_COUNT} test users via bulk endpoint...`);
  
  try {
    const startTime = Date.now();
    
    // Use bulk creation endpoint
    const response = await axios.post(`${BASE_URL}/api/auth/test/bulk-create-users`, {
      count: TEST_USER_COUNT,
    });

    const createTime = Date.now() - startTime;
    
    if (response.data.success) {
      testUsers = response.data.users;
      console.log(`✓ Created ${response.data.created}/${TEST_USER_COUNT} users in ${createTime}ms`);
      console.log(`  Average: ${(createTime / response.data.created).toFixed(2)}ms per user`);
    } else {
      console.error('❌ Bulk creation failed');
    }
  } catch (error) {
    console.error('❌ Failed to bulk create users:', error.message);
    
    // Fallback: create users one by one with delay
    console.log('\n⚠️  Falling back to sequential creation with delays...');
    await createTestUsersSequential();
  }
}

/**
 * Fallback: Create users sequentially with delay
 */
async function createTestUsersSequential() {
  const batchSize = 10;
  const delayBetweenBatches = 2000; // 2 seconds

  for (let i = 0; i < TEST_USER_COUNT; i++) {
    try {
      const username = `loadtest_user_${Date.now()}_${i}`;
      const email = `loadtest_${Date.now()}_${i}@test.com`;
      const password = 'Test123!@#';

      const registerRes = await axios.post(`${BASE_URL}/api/auth/register`, {
        username,
        email,
        password,
        fullName: `Load Test User ${i}`,
        role: 'student',
      });

      testUsers.push({
        id: registerRes.data.user.id,
        username,
        email,
        token: registerRes.data.tokens.accessToken,
      });

      // Delay every batch to avoid rate limiting
      if ((i + 1) % batchSize === 0) {
        console.log(`   ✓ Created ${i + 1}/${TEST_USER_COUNT} users`);
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    } catch (error) {
      console.error(`   ✗ Failed to create user ${i}`);
    }
  }

  console.log(`✓ Created ${testUsers.length} test users`);
}

/**
 * Step 2: Create realistic WebSocket connection with full authentication
 */
function createRealisticConnection(user, sessionId = 'test-session-realistic') {
  return new Promise((resolve, reject) => {
    const startConnect = Date.now();
    
    // NO testMode - use real authentication
    const socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: false,
      auth: {
        token: user.token, // Real JWT token
      },
      query: {
        sessionId, // Real session ID
      },
    });

    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error('Connection timeout'));
    }, 10000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      const connectTime = Date.now() - startConnect;
      metrics.connectionTime.push(connectTime);
      metrics.totalConnections++;
      metrics.activeConnections++;
      
      // Send realistic messages
      setupRealisticMessaging(socket, user);
      
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      metrics.failedConnections++;
      metrics.errors.push({
        type: 'connection',
        message: error.message,
        user: user.username,
      });
      reject(error);
    });

    socket.on('disconnect', () => {
      metrics.activeConnections--;
    });

    socket.on('error', (error) => {
      metrics.errors.push({
        type: 'socket',
        message: error.message || error,
        user: user.username,
      });
    });
  });
}

/**
 * Setup realistic message patterns
 */
function setupRealisticMessaging(socket, user) {
  // Simulate realistic user behavior
  
  // 1. Send chat messages periodically
  const messageTimer = setInterval(() => {
    const messageSendTime = Date.now();
    const message = {
      type: 'chat-message',
      content: `Hello from ${user.username} at ${new Date().toISOString()}`,
      timestamp: messageSendTime,
    };
    
    socket.emit('send-message', message);
    metrics.messagesSent++;
  }, TEST_CONFIG.messageInterval + Math.random() * 1000); // Random jitter

  // 2. Send heartbeat/ping
  const heartbeatTimer = setInterval(() => {
    socket.emit('heartbeat', { userId: user.userId, timestamp: Date.now() });
  }, TEST_CONFIG.heartbeatInterval);

  // 3. Listen for messages (measure latency)
  socket.on('new-message', (data) => {
    metrics.messagesReceived++;
    if (data.timestamp) {
      const latency = Date.now() - data.timestamp;
      metrics.latencies.push(latency);
    }
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    clearInterval(messageTimer);
    clearInterval(heartbeatTimer);
  });

  // Store timers for cleanup
  socket._testTimers = { messageTimer, heartbeatTimer };
}

/**
 * Run one test stage
 */
async function runStage(stage, stageIndex) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 STAGE ${stageIndex + 1}/${TEST_CONFIG.stages.length}: ${stage.description}`);
  console.log(`   Target: ${stage.connections} connections for ${stage.duration / 1000}s`);
  console.log(`${'='.repeat(70)}`);

  const sockets = [];
  const stageStartTime = Date.now();
  
  // Reset per-stage metrics
  const stageMetrics = {
    startTime: stageStartTime,
    connections: stage.connections,
    successful: 0,
    failed: 0,
    avgConnectTime: 0,
    messagesSent: 0,
    messagesReceived: 0,
  };

  // Create connections in batches
  const BATCH_SIZE = 10;
  const batches = Math.ceil(stage.connections / BATCH_SIZE);
  
  console.log(`\n🔌 Connecting ${stage.connections} users...`);
  
  for (let batch = 0; batch < batches; batch++) {
    const batchStart = batch * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, stage.connections);
    const batchUsers = testUsers.slice(batchStart, batchEnd);
    
    const promises = batchUsers.map(user => 
      createRealisticConnection(user, `session-${stageIndex}`)
        .then(socket => {
          sockets.push(socket);
          stageMetrics.successful++;
          return socket;
        })
        .catch(error => {
          stageMetrics.failed++;
          return null;
        })
    );

    await Promise.all(promises);
    
    // Progress update
    const progress = ((batch + 1) / batches * 100).toFixed(0);
    const successRate = (stageMetrics.successful / (stageMetrics.successful + stageMetrics.failed) * 100).toFixed(1);
    process.stdout.write(`\r   Progress: ${progress}% | Connected: ${stageMetrics.successful}/${stage.connections} | Success rate: ${successRate}%`);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n');
  
  const connectPhaseTime = Date.now() - stageStartTime;
  const avgConnectTime = metrics.connectionTime.slice(-stage.connections).reduce((a, b) => a + b, 0) / stage.connections;
  
  console.log(`✓ Connection phase complete in ${connectPhaseTime}ms`);
  console.log(`  Successful: ${stageMetrics.successful}/${stage.connections}`);
  console.log(`  Failed: ${stageMetrics.failed}`);
  console.log(`  Average connect time: ${avgConnectTime.toFixed(2)}ms`);

  // Wait for test duration while measuring
  console.log(`\n⏱️  Running test for ${stage.duration / 1000}s...`);
  const messagesBefore = metrics.messagesSent;
  
  await new Promise(resolve => setTimeout(resolve, stage.duration));
  
  const messagesAfter = metrics.messagesSent;
  const messageRate = ((messagesAfter - messagesBefore) / (stage.duration / 1000)).toFixed(2);
  
  // Calculate stage results
  const recentLatencies = metrics.latencies.slice(-100); // Last 100 messages
  const avgLatency = recentLatencies.length > 0 
    ? recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length 
    : 0;
  
  const sortedLatencies = [...recentLatencies].sort((a, b) => a - b);
  const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0;
  const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
  const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0;

  console.log(`\n📈 Stage Results:`);
  console.log(`  Active connections: ${metrics.activeConnections}`);
  console.log(`  Message rate: ${messageRate} msg/s`);
  console.log(`  Average latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`  Latency P50/P95/P99: ${p50}ms / ${p95}ms / ${p99}ms`);
  console.log(`  Total errors: ${metrics.errors.length}`);

  // Cleanup connections
  console.log(`\n🧹 Cleaning up connections...`);
  sockets.forEach(socket => {
    if (socket && socket.connected) {
      if (socket._testTimers) {
        clearInterval(socket._testTimers.messageTimer);
        clearInterval(socket._testTimers.heartbeatTimer);
      }
      socket.close();
    }
  });

  // Wait for cleanup
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    connections: stage.connections,
    successful: stageMetrics.successful,
    failed: stageMetrics.failed,
    avgConnectTime: avgConnectTime.toFixed(2),
    messageRate: parseFloat(messageRate),
    avgLatency: avgLatency.toFixed(2),
    p50, p95, p99,
    errors: metrics.errors.length,
  };
}

/**
 * Main test runner
 */
async function runRealisticLoadTest() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 REALISTIC LOAD TEST - Application Layer Testing');
  console.log('='.repeat(70));
  console.log('📋 Test includes:');
  console.log('   ✓ Real JWT authentication');
  console.log('   ✓ Database queries');
  console.log('   ✓ Business logic processing');
  console.log('   ✓ Realistic message payloads');
  console.log('='.repeat(70));

  // Step 1: Create test users
  await createTestUsers();

  if (testUsers.length < 10) {
    console.error('\n❌ Not enough test users created. Aborting test.');
    process.exit(1);
  }

  // Step 2: Run stages
  const results = [];
  
  for (let i = 0; i < TEST_CONFIG.stages.length; i++) {
    const result = await runStage(TEST_CONFIG.stages[i], i);
    results.push(result);
    
    // Check if we should stop (too many failures)
    const failureRate = result.failed / result.connections;
    if (failureRate > 0.2) { // More than 20% failures
      console.log('\n⚠️  High failure rate detected. Stopping test.');
      break;
    }
    
    // Wait between stages
    if (i < TEST_CONFIG.stages.length - 1) {
      console.log('\n⏸️  Cooling down for 5s before next stage...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Final summary
  printFinalSummary(results);
}

/**
 * Print final test summary
 */
function printFinalSummary(results) {
  console.log('\n' + '='.repeat(70));
  console.log('📊 REALISTIC LOAD TEST - FINAL RESULTS');
  console.log('='.repeat(70));
  
  console.log('\n📈 Performance by Stage:\n');
  console.log('┌────────┬─────────┬────────┬─────────────┬──────────┬──────────┐');
  console.log('│ Users  │ Success │ Failed │ Connect(ms) │ Msg/s    │ Latency  │');
  console.log('├────────┼─────────┼────────┼─────────────┼──────────┼──────────┤');
  
  results.forEach(r => {
    const users = r.connections.toString().padEnd(6);
    const success = r.successful.toString().padEnd(7);
    const failed = r.failed.toString().padEnd(6);
    const connect = r.avgConnectTime.toString().padEnd(11);
    const msgRate = r.messageRate.toFixed(1).padEnd(8);
    const latency = `${r.avgLatency}ms`.padEnd(8);
    
    console.log(`│ ${users} │ ${success} │ ${failed} │ ${connect} │ ${msgRate} │ ${latency} │`);
  });
  
  console.log('└────────┴─────────┴────────┴─────────────┴──────────┴──────────┘');

  // Find maximum capacity
  const successfulTests = results.filter(r => r.failed / r.connections < 0.1);
  const maxCapacity = successfulTests.length > 0 
    ? Math.max(...successfulTests.map(r => r.connections))
    : 0;

  console.log('\n🎯 Key Findings:\n');
  console.log(`  ✓ Maximum realistic capacity: ${maxCapacity} concurrent users`);
  console.log(`  ✓ Total connections tested: ${metrics.totalConnections}`);
  console.log(`  ✓ Total messages sent: ${metrics.messagesSent}`);
  console.log(`  ✓ Total messages received: ${metrics.messagesReceived}`);
  console.log(`  ✓ Success rate: ${((1 - metrics.failedConnections / metrics.totalConnections) * 100).toFixed(1)}%`);
  
  if (metrics.authTime.length > 0) {
    const avgAuth = metrics.authTime.reduce((a, b) => a + b, 0) / metrics.authTime.length;
    console.log(`  ✓ Average auth time: ${avgAuth.toFixed(2)}ms`);
  }

  if (metrics.errors.length > 0) {
    console.log(`\n⚠️  Total errors: ${metrics.errors.length}`);
    console.log('   Recent errors:');
    metrics.errors.slice(-5).forEach(err => {
      console.log(`   - [${err.type}] ${err.message}`);
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log('💡 So sánh với Network Test:');
  console.log('   Network test (extreme-stress-test.js): 1,500 connections');
  console.log(`   Realistic test (với DB + Auth): ${maxCapacity} concurrent users`);
  console.log(`   Overhead: ~${((1 - maxCapacity / 1500) * 100).toFixed(0)}% capacity loss`);
  console.log('='.repeat(70));
}

// Run the test
if (require.main === module) {
  runRealisticLoadTest()
    .then(() => {
      console.log('\n✅ Realistic load test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { runRealisticLoadTest };
