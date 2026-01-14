/**
 * NETWORK PROGRAMMING LOAD TEST
 * Môn: Lập Trình Mạng - Nhóm 14
 * 
 * Test các khía cạnh networking cụ thể:
 * 1. TCP Connection handling
 * 2. WebSocket protocol efficiency
 * 3. Concurrent socket management
 * 4. Message broadcasting
 * 5. Connection pool behavior
 * 
 * Run: node network-load-test.js
 */

const io = require('socket.io-client');
const http = require('http');
const autocannon = require('autocannon');

const BASE_URL = 'http://localhost:3000';
const WS_URL = `${BASE_URL}/live`;

// Test results storage
const results = {
  http: {},
  websocket: {},
  concurrent: {},
  broadcast: {},
};

// Helpers
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// Check server
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

/**
 * TEST 1: TCP Connection Throughput
 * Đo khả năng thiết lập TCP connections
 */
async function testTcpConnections() {
  console.log('\n' + '═'.repeat(60));
  console.log('📡 TEST 1: TCP CONNECTION THROUGHPUT');
  console.log('═'.repeat(60));
  console.log('   Testing raw TCP connection establishment rate...\n');

  const connectionCounts = [10, 50, 100, 200, 500, 1000];
  const tcpResults = [];

  for (const count of connectionCounts) {
    console.log(`   Testing ${count} concurrent connections...`);
    
    const startTime = Date.now();
    const sockets = [];
    let connected = 0;
    let failed = 0;
    const connectTimes = [];

    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(new Promise((resolve) => {
        const connStart = Date.now();
        const socket = io(WS_URL, {
          transports: ['websocket'],
          timeout: 10000,
          reconnection: false,
          forceNew: true,
        });

        socket.on('connect', () => {
          connectTimes.push(Date.now() - connStart);
          connected++;
          sockets.push(socket);
          resolve('connected');
        });

        socket.on('connect_error', () => {
          failed++;
          resolve('failed');
        });

        setTimeout(() => {
          if (!socket.connected) {
            failed++;
            resolve('timeout');
          }
        }, 10000);
      }));
    }

    await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    // Calculate stats
    const avgConnectTime = connectTimes.length > 0 
      ? connectTimes.reduce((a, b) => a + b, 0) / connectTimes.length 
      : 0;
    
    const connectionsPerSec = (connected / (totalTime / 1000)).toFixed(1);

    tcpResults.push({
      target: count,
      connected,
      failed,
      totalTime,
      avgConnectTime: avgConnectTime.toFixed(2),
      connectionsPerSec,
      p99: percentile(connectTimes, 99),
    });

    console.log(`      ✓ Connected: ${connected}/${count} in ${totalTime}ms (${connectionsPerSec} conn/sec)`);

    // Cleanup
    for (const s of sockets) {
      s.disconnect();
    }
    await sleep(1000);

    // Stop if too many failures
    if (failed > count * 0.3) {
      console.log(`      ⚠️  High failure rate - stopping at ${count}`);
      break;
    }
  }

  results.tcp = tcpResults;
  
  // Find max stable
  const maxStable = tcpResults.filter(r => r.failed < r.target * 0.1);
  const bestResult = maxStable[maxStable.length - 1];

  console.log('\n   📊 TCP Connection Summary:');
  console.log('   ─────────────────────────────────────');
  if (bestResult) {
    console.log(`   Max stable connections: ${bestResult.connected}`);
    console.log(`   Connection rate:        ${bestResult.connectionsPerSec} conn/sec`);
    console.log(`   P99 connect time:       ${bestResult.p99}ms`);
  }
  
  return tcpResults;
}

/**
 * TEST 2: WebSocket Message Throughput
 * Đo khả năng xử lý messages
 */
async function testWebSocketThroughput() {
  console.log('\n' + '═'.repeat(60));
  console.log('📨 TEST 2: WEBSOCKET MESSAGE THROUGHPUT');
  console.log('═'.repeat(60));
  console.log('   Testing message sending/receiving capacity...\n');

  const clientCount = 100;
  const testDuration = 10000; // 10 seconds
  const messageInterval = 100; // Send every 100ms

  let totalSent = 0;
  let totalReceived = 0;
  const latencies = [];
  const sockets = [];

  console.log(`   Establishing ${clientCount} connections...`);

  // Connect clients
  for (let i = 0; i < clientCount; i++) {
    const socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: false,
    });

    await new Promise(resolve => {
      socket.on('connect', resolve);
      setTimeout(resolve, 5000);
    });

    if (socket.connected) {
      sockets.push(socket);
    }
  }

  console.log(`   Connected: ${sockets.length}/${clientCount}`);
  console.log(`   Sending messages for ${testDuration / 1000}s...\n`);

  // Setup message handlers
  for (const socket of sockets) {
    socket.on('pong', (data) => {
      if (data.timestamp) {
        latencies.push(Date.now() - data.timestamp);
      }
      totalReceived++;
    });
  }

  // Send messages
  const startTime = Date.now();
  const endTime = startTime + testDuration;

  while (Date.now() < endTime) {
    for (const socket of sockets) {
      if (socket.connected) {
        socket.emit('ping', { timestamp: Date.now() });
        totalSent++;
      }
    }
    await sleep(messageInterval);
    
    const progress = Math.round(((Date.now() - startTime) / testDuration) * 100);
    process.stdout.write(`\r   Progress: ${progress}% | Sent: ${formatNumber(totalSent)} | Received: ${formatNumber(totalReceived)}`);
  }

  const actualDuration = (Date.now() - startTime) / 1000;
  console.log('\n');

  // Calculate stats
  const messagesPerSec = Math.round(totalSent / actualDuration);
  const avgLatency = latencies.length > 0 
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
    : 0;

  results.websocket = {
    clients: sockets.length,
    duration: actualDuration,
    totalSent,
    totalReceived,
    messagesPerSec,
    avgLatency: avgLatency.toFixed(2),
    p50Latency: percentile(latencies, 50),
    p99Latency: percentile(latencies, 99),
  };

  console.log('   📊 WebSocket Throughput Summary:');
  console.log('   ─────────────────────────────────────');
  console.log(`   Active connections:    ${sockets.length}`);
  console.log(`   Messages sent:         ${formatNumber(totalSent)}`);
  console.log(`   Messages received:     ${formatNumber(totalReceived)}`);
  console.log(`   Throughput:            ${formatNumber(messagesPerSec)} msg/sec`);
  console.log(`   Latency (avg):         ${avgLatency.toFixed(2)}ms`);
  console.log(`   Latency (P99):         ${percentile(latencies, 99)}ms`);

  // Cleanup
  for (const socket of sockets) {
    socket.disconnect();
  }
  await sleep(1000);

  return results.websocket;
}

/**
 * TEST 3: Concurrent Room Join/Leave
 * Đo khả năng xử lý join/leave rooms
 */
async function testRoomOperations() {
  console.log('\n' + '═'.repeat(60));
  console.log('🚪 TEST 3: SOCKET.IO ROOM OPERATIONS');
  console.log('═'.repeat(60));
  console.log('   Testing room join/leave throughput...\n');

  const clientCount = 50;
  const roomOperations = 100; // Each client joins/leaves 100 times
  const sockets = [];

  console.log(`   Establishing ${clientCount} connections...`);

  // Connect clients
  for (let i = 0; i < clientCount; i++) {
    const socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: false,
    });

    await new Promise(resolve => {
      socket.on('connect', resolve);
      setTimeout(resolve, 5000);
    });

    if (socket.connected) {
      sockets.push(socket);
    }
  }

  console.log(`   Connected: ${sockets.length}/${clientCount}`);
  
  let joinOps = 0;
  let leaveOps = 0;
  let errors = 0;
  const operationTimes = [];

  console.log(`   Performing ${roomOperations * sockets.length} room operations...\n`);

  const startTime = Date.now();

  for (let op = 0; op < roomOperations; op++) {
    const roomId = `test-room-${op % 10}`; // 10 different rooms
    
    // All clients join room
    const joinPromises = sockets.map(socket => {
      return new Promise(resolve => {
        const opStart = Date.now();
        socket.emit('join-session', { roomId }, (response) => {
          operationTimes.push(Date.now() - opStart);
          if (response?.success) {
            joinOps++;
          } else {
            errors++;
          }
          resolve();
        });
        setTimeout(resolve, 1000);
      });
    });
    await Promise.all(joinPromises);

    // All clients leave room  
    const leavePromises = sockets.map(socket => {
      return new Promise(resolve => {
        const opStart = Date.now();
        socket.emit('leave-session', { roomId }, () => {
          operationTimes.push(Date.now() - opStart);
          leaveOps++;
          resolve();
        });
        setTimeout(resolve, 1000);
      });
    });
    await Promise.all(leavePromises);

    const progress = Math.round((op / roomOperations) * 100);
    process.stdout.write(`\r   Progress: ${progress}% | Joins: ${joinOps} | Leaves: ${leaveOps} | Errors: ${errors}`);
  }

  const totalTime = Date.now() - startTime;
  console.log('\n');

  const totalOps = joinOps + leaveOps;
  const opsPerSec = Math.round(totalOps / (totalTime / 1000));
  const avgOpTime = operationTimes.length > 0 
    ? operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length 
    : 0;

  results.room = {
    clients: sockets.length,
    totalOps,
    joinOps,
    leaveOps,
    errors,
    totalTime,
    opsPerSec,
    avgOpTime: avgOpTime.toFixed(2),
  };

  console.log('   📊 Room Operations Summary:');
  console.log('   ─────────────────────────────────────');
  console.log(`   Total operations:      ${formatNumber(totalOps)}`);
  console.log(`   Operations/sec:        ${formatNumber(opsPerSec)}`);
  console.log(`   Avg operation time:    ${avgOpTime.toFixed(2)}ms`);
  console.log(`   Errors:                ${errors}`);

  // Cleanup
  for (const socket of sockets) {
    socket.disconnect();
  }
  await sleep(1000);

  return results.room;
}

/**
 * TEST 4: Broadcast Performance
 * Đo khả năng broadcast messages đến nhiều clients
 */
async function testBroadcast() {
  console.log('\n' + '═'.repeat(60));
  console.log('📢 TEST 4: BROADCAST PERFORMANCE');
  console.log('═'.repeat(60));
  console.log('   Testing message broadcasting to many clients...\n');

  const clientCounts = [10, 50, 100, 200];
  const broadcastResults = [];

  for (const count of clientCounts) {
    console.log(`   Testing broadcast to ${count} clients...`);
    
    const sockets = [];
    let received = 0;
    const receiveTimes = [];

    // Connect clients
    for (let i = 0; i < count; i++) {
      const socket = io(WS_URL, {
        transports: ['websocket'],
        reconnection: false,
      });

      await new Promise(resolve => {
        socket.on('connect', resolve);
        setTimeout(resolve, 5000);
      });

      if (socket.connected) {
        socket.on('test-broadcast', (data) => {
          receiveTimes.push(Date.now() - data.timestamp);
          received++;
        });
        sockets.push(socket);
      }
    }

    // Wait for all to connect
    await sleep(500);

    // Send broadcast (if first client can trigger it)
    const broadcastCount = 10;
    const startTime = Date.now();

    for (let b = 0; b < broadcastCount; b++) {
      if (sockets[0]?.connected) {
        sockets[0].emit('test-broadcast-request', { 
          timestamp: Date.now(),
          broadcastId: b,
        });
      }
      await sleep(100);
    }

    // Wait for messages
    await sleep(2000);
    
    const totalTime = Date.now() - startTime;
    const expectedMessages = broadcastCount * sockets.length;
    const deliveryRate = (received / expectedMessages * 100).toFixed(1);
    const avgReceiveTime = receiveTimes.length > 0
      ? receiveTimes.reduce((a, b) => a + b, 0) / receiveTimes.length
      : 0;

    broadcastResults.push({
      clients: sockets.length,
      broadcasts: broadcastCount,
      expected: expectedMessages,
      received,
      deliveryRate,
      avgReceiveTime: avgReceiveTime.toFixed(2),
    });

    console.log(`      Received: ${received}/${expectedMessages} (${deliveryRate}%)`);

    // Cleanup
    for (const socket of sockets) {
      socket.disconnect();
    }
    await sleep(1000);
  }

  results.broadcast = broadcastResults;

  console.log('\n   📊 Broadcast Summary:');
  console.log('   ─────────────────────────────────────');
  console.log('   Clients | Delivery Rate | Avg Time');
  console.log('   ─────────────────────────────────────');
  for (const r of broadcastResults) {
    console.log(`   ${r.clients.toString().padStart(7)} | ${r.deliveryRate.padStart(12)}% | ${r.avgReceiveTime}ms`);
  }

  return broadcastResults;
}

/**
 * TEST 5: HTTP vs WebSocket Comparison
 */
async function testHttpVsWebSocket() {
  console.log('\n' + '═'.repeat(60));
  console.log('⚡ TEST 5: HTTP vs WEBSOCKET COMPARISON');
  console.log('═'.repeat(60));
  console.log('   Comparing latency: REST API vs WebSocket...\n');

  // HTTP Test
  console.log('   Testing HTTP endpoint...');
  const httpResult = await new Promise(resolve => {
    autocannon({
      url: `${BASE_URL}/api/auth/profile`,
      connections: 50,
      duration: 5,
    }, (err, result) => {
      resolve(result);
    });
  });

  // WebSocket Test
  console.log('   Testing WebSocket...');
  const socket = io(WS_URL, {
    transports: ['websocket'],
  });

  await new Promise(resolve => {
    socket.on('connect', resolve);
    setTimeout(resolve, 5000);
  });

  const wsLatencies = [];
  const wsMsgCount = 100;

  for (let i = 0; i < wsMsgCount; i++) {
    const start = Date.now();
    await new Promise(resolve => {
      socket.emit('ping', { timestamp: start }, () => {
        wsLatencies.push(Date.now() - start);
        resolve();
      });
      setTimeout(resolve, 1000);
    });
  }

  socket.disconnect();

  const wsAvgLatency = wsLatencies.length > 0
    ? wsLatencies.reduce((a, b) => a + b, 0) / wsLatencies.length
    : 0;

  results.comparison = {
    http: {
      latencyAvg: httpResult.latency.average.toFixed(2),
      latencyP99: httpResult.latency.p99,
      reqPerSec: httpResult.requests.average,
    },
    websocket: {
      latencyAvg: wsAvgLatency.toFixed(2),
      latencyP99: percentile(wsLatencies, 99),
      messages: wsMsgCount,
    },
  };

  console.log('\n   📊 Comparison Results:');
  console.log('   ─────────────────────────────────────');
  console.log('   Protocol  | Latency Avg | P99');
  console.log('   ─────────────────────────────────────');
  console.log(`   HTTP      | ${results.comparison.http.latencyAvg.padStart(11)}ms | ${results.comparison.http.latencyP99}ms`);
  console.log(`   WebSocket | ${results.comparison.websocket.latencyAvg.padStart(11)}ms | ${results.comparison.websocket.latencyP99}ms`);
  
  const improvement = ((httpResult.latency.average - wsAvgLatency) / httpResult.latency.average * 100).toFixed(1);
  console.log(`\n   ⚡ WebSocket is ${improvement}% faster than HTTP!`);

  return results.comparison;
}

/**
 * Main function
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     NETWORK PROGRAMMING LOAD TEST - LẬP TRÌNH MẠNG            ║');
  console.log('║     Testing Socket/TCP/WebSocket Performance                   ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║  Nhóm 14 - Online Learning Platform LMS                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  // Check server
  console.log('\n🔍 Checking server...');
  const serverOk = await checkServer();
  
  if (!serverOk) {
    console.log('❌ Server not running! Please start: npm run start:dev');
    process.exit(1);
  }
  console.log('✅ Server is ready\n');

  // Run all tests
  await testTcpConnections();
  await testWebSocketThroughput();
  await testRoomOperations();
  await testBroadcast();
  await testHttpVsWebSocket();

  // Final Summary
  console.log('\n\n' + '🏆'.repeat(35));
  console.log('                 FINAL SUMMARY - LẬP TRÌNH MẠNG');
  console.log('🏆'.repeat(35));

  console.log('\n📡 TCP CONNECTION CAPACITY:');
  if (results.tcp && results.tcp.length > 0) {
    const bestTcp = results.tcp.filter(r => r.failed < r.target * 0.1).pop();
    if (bestTcp) {
      console.log(`   • Max stable connections: ${bestTcp.connected}`);
      console.log(`   • Connection rate: ${bestTcp.connectionsPerSec} conn/sec`);
    }
  }

  console.log('\n📨 WEBSOCKET THROUGHPUT:');
  if (results.websocket) {
    console.log(`   • Message throughput: ${formatNumber(results.websocket.messagesPerSec)} msg/sec`);
    console.log(`   • Average latency: ${results.websocket.avgLatency}ms`);
    console.log(`   • P99 latency: ${results.websocket.p99Latency}ms`);
  }

  console.log('\n🚪 ROOM OPERATIONS:');
  if (results.room) {
    console.log(`   • Operations/sec: ${formatNumber(results.room.opsPerSec)}`);
    console.log(`   • Avg operation time: ${results.room.avgOpTime}ms`);
  }

  console.log('\n⚡ PROTOCOL COMPARISON:');
  if (results.comparison) {
    console.log(`   • HTTP avg latency: ${results.comparison.http.latencyAvg}ms`);
    console.log(`   • WebSocket avg latency: ${results.comparison.websocket.latencyAvg}ms`);
    const diff = (parseFloat(results.comparison.http.latencyAvg) - parseFloat(results.comparison.websocket.latencyAvg)).toFixed(2);
    console.log(`   • WebSocket faster by: ${diff}ms per request`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅ ALL NETWORK TESTS COMPLETED');
  console.log('═'.repeat(60));
}

main().catch(console.error);
