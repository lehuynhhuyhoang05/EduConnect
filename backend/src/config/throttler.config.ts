import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * RATE LIMITING CONFIGURATION
 * ===========================
 * Protects API from abuse and DDoS attacks
 * 
 * Limits:
 * - SHORT: 10 requests per second (for normal endpoints)
 * - MEDIUM: 100 requests per minute (for standard API calls)
 * - LONG: 1000 requests per hour (daily quota)
 * 
 * Special limits for sensitive endpoints:
 * - Login: 5 attempts per 15 minutes
 * - Register: 3 attempts per hour
 * - Password reset: 3 attempts per hour
 * - File upload: 10 files per minute
 */

export const throttlerConfig = (): ThrottlerModuleOptions => [
  {
    name: 'short',
    ttl: 1000,  // 1 second
    limit: 10,  // 10 requests per second
  },
  {
    name: 'medium',
    ttl: 60000, // 1 minute  
    limit: 100, // 100 requests per minute
  },
  {
    name: 'long',
    ttl: 3600000, // 1 hour
    limit: 1000,  // 1000 requests per hour
  },
];

/**
 * Custom rate limit decorators for specific endpoints
 */
export const AuthRateLimit = () => {
  // Login/Register: Stricter limits to prevent brute force
  return {
    ttl: 900000, // 15 minutes
    limit: 5,    // 5 attempts
  };
};

export const FileUploadRateLimit = () => {
  return {
    ttl: 60000, // 1 minute
    limit: 10,  // 10 files
  };
};

export const LiveSessionRateLimit = () => {
  // WebSocket connections: More lenient
  return {
    ttl: 1000,  // 1 second
    limit: 50,  // 50 messages per second
  };
};
