/**
 * WebRTC Configuration
 * 
 * ICE Servers configuration for WebRTC connections.
 * In production, you should use your own TURN server for reliable NAT traversal.
 * 
 * Free TURN server options:
 * - Twilio (free tier)
 * - Xirsys (free tier)
 * - Self-hosted coturn
 */

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface WebRTCConfig {
  iceServers: IceServer[];
  iceTransportPolicy?: 'all' | 'relay';
}

/**
 * Get ICE servers configuration
 * Uses environment variables for TURN server credentials
 */
export const getIceServers = (): IceServer[] => {
  const iceServers: IceServer[] = [
    // Public STUN servers (free, but STUN only - no relay)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ];

  // Add TURN server if configured (required for symmetric NAT)
  const turnUrl = process.env.TURN_SERVER_URL;
  const turnUsername = process.env.TURN_USERNAME;
  const turnCredential = process.env.TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });

    // Also add TURNS (TURN over TLS) if available
    const turnsUrl = process.env.TURNS_SERVER_URL;
    if (turnsUrl) {
      iceServers.push({
        urls: turnsUrl,
        username: turnUsername,
        credential: turnCredential,
      });
    }
  }

  // Fallback: Free public TURN servers (for development/testing only)
  // These may have rate limits and should NOT be used in production
  if (!turnUrl && process.env.NODE_ENV !== 'production') {
    // OpenRelay TURN (free, limited)
    iceServers.push({
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    });
    iceServers.push({
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    });
    iceServers.push({
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    });
  }

  return iceServers;
};

/**
 * Get full WebRTC configuration
 */
export const getWebRTCConfig = (): WebRTCConfig => {
  return {
    iceServers: getIceServers(),
    // Use 'relay' only if you want to force TURN (hide IP addresses)
    iceTransportPolicy: process.env.WEBRTC_FORCE_RELAY === 'true' ? 'relay' : 'all',
  };
};

/**
 * Generate time-limited TURN credentials (for production with coturn)
 * This uses TURN REST API (RFC 5766)
 */
export const generateTurnCredentials = (userId: number): { username: string; credential: string; ttl: number } | null => {
  const secret = process.env.TURN_STATIC_SECRET;
  if (!secret) return null;

  const ttl = 86400; // 24 hours
  const timestamp = Math.floor(Date.now() / 1000) + ttl;
  const username = `${timestamp}:${userId}`;
  
  // HMAC-SHA1 for coturn REST API
  const crypto = require('crypto');
  const credential = crypto
    .createHmac('sha1', secret)
    .update(username)
    .digest('base64');

  return { username, credential, ttl };
};
