/**
 * Custom Socket.IO Adapter with Network Optimizations
 * 
 * Tối ưu cho môn Lập Trình Mạng:
 * - High concurrency WebSocket handling
 * - Connection pooling
 * - Memory-efficient event handling
 */

import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions, Server } from 'socket.io';
import { INestApplicationContext } from '@nestjs/common';

export class HighPerformanceIoAdapter extends IoAdapter {
  constructor(private app: INestApplicationContext) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const serverOptions: ServerOptions = {
      ...options,
      
      // ===== TRANSPORT CONFIGURATION =====
      // Prefer WebSocket for lower latency
      transports: ['websocket', 'polling'],
      
      // Allow upgrade from polling to websocket
      allowUpgrades: true,
      upgradeTimeout: 30000,
      
      // ===== CONNECTION SETTINGS =====
      // Ping configuration for connection health
      pingTimeout: 60000,      // Wait 60s for pong response
      pingInterval: 25000,     // Send ping every 25s
      
      // ===== BUFFER & PAYLOAD =====
      // Increase buffer for video/audio streaming
      maxHttpBufferSize: 10 * 1024 * 1024, // 10MB
      
      // ===== COMPRESSION =====
      // HTTP compression for polling
      httpCompression: {
        threshold: 1024, // Compress payloads > 1KB
      },
      
      // Per-message deflate for WebSocket
      perMessageDeflate: {
        threshold: 1024,
        zlibDeflateOptions: {
          chunkSize: 16 * 1024,
        },
        zlibInflateOptions: {
          chunkSize: 16 * 1024,
        },
        clientNoContextTakeover: true,  // Reduce memory per connection
        serverNoContextTakeover: true,  // Reduce server memory
      },
      
      // ===== CONNECTION STATE RECOVERY =====
      // Allow reconnection with state
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true,
      },
      
      // ===== CORS =====
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      
      // ===== SERVE CLIENT =====
      serveClient: false, // Don't serve client file (we use npm package)
      
      // ===== ADAPTER OPTIONS =====
      // Clean up disconnected sockets
      cleanupEmptyChildNamespaces: true,
    };

    const server = super.createIOServer(port, serverOptions);
    
    // ===== ENGINE OPTIONS (lower level) =====
    // These are applied to the underlying engine.io server
    if (server.engine) {
      // Maximum number of packets in send buffer
      server.engine.opts.maxPayload = 10 * 1024 * 1024;
    }
    
    return server;
  }
}

/**
 * Configuration constants for network optimization
 */
export const SOCKET_CONFIG = {
  // Connection limits
  MAX_CONNECTIONS_PER_NAMESPACE: 10000,
  
  // Rate limiting for messages
  MESSAGE_RATE_LIMIT: 100,  // messages per second per client
  MESSAGE_RATE_WINDOW: 1000, // 1 second window
  
  // Buffer sizes
  SEND_BUFFER_SIZE: 1000,   // Number of events to buffer
  
  // Timeout values (ms)
  CONNECTION_TIMEOUT: 10000,
  HANDSHAKE_TIMEOUT: 5000,
  
  // Room limits
  MAX_ROOMS_PER_CLIENT: 20,
  MAX_CLIENTS_PER_ROOM: 1000,
};

/**
 * Helper function to create optimized server options
 */
export function getOptimizedSocketOptions(): Partial<ServerOptions> {
  return {
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 10 * 1024 * 1024,
    cors: {
      origin: '*',
      credentials: true,
    },
    allowUpgrades: true,
    perMessageDeflate: {
      threshold: 1024,
      clientNoContextTakeover: true,
      serverNoContextTakeover: true,
    },
  };
}
