import { Injectable, Logger } from '@nestjs/common';
import { getIceServers } from '@config/webrtc.config';

/**
 * Network Diagnostics Service
 * 
 * Cung cấp công cụ kiểm tra chất lượng mạng trước khi tham gia phiên học.
 * Đây là tính năng QUAN TRỌNG cho production - giúp user biết trước
 * kết nối có đủ tốt để video call không.
 * 
 * Các khái niệm Lập trình mạng:
 * - STUN/TURN connectivity test
 * - RTT (Round-Trip Time) measurement
 * - Bandwidth estimation
 * - NAT type detection
 */

export interface NetworkTestResult {
  // Connectivity
  stunReachable: boolean;
  turnReachable: boolean;
  
  // Performance metrics
  latency: number;           // ms - Round-trip time to server
  jitter: number;            // ms - Variance in latency
  packetLoss: number;        // % - Estimated packet loss
  
  // Bandwidth estimation
  downloadSpeed: number;     // Mbps
  uploadSpeed: number;       // Mbps
  
  // NAT info
  natType: 'open' | 'full-cone' | 'symmetric' | 'unknown';
  publicIp?: string;
  
  // Recommendations
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  canJoinVideo: boolean;
  canJoinAudio: boolean;
  recommendations: string[];
}

export interface SpeedTestResult {
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
}

@Injectable()
export class NetworkDiagnosticsService {
  private readonly logger = new Logger(NetworkDiagnosticsService.name);

  /**
   * Get ICE servers for client-side testing
   */
  getIceServersForTesting() {
    const iceServers = getIceServers();
    return {
      iceServers,
      testEndpoints: {
        // Endpoints for client to test connectivity
        stun: iceServers.filter(s => s.urls.toString().startsWith('stun:')),
        turn: iceServers.filter(s => s.urls.toString().startsWith('turn:')),
      },
      // Requirements for video call
      requirements: {
        minDownloadMbps: 1.5,
        minUploadMbps: 1.5,
        maxLatencyMs: 150,
        maxPacketLoss: 3,
      },
    };
  }

  /**
   * Analyze network metrics and provide recommendations
   * Client gửi metrics lên, server phân tích và trả về đánh giá
   */
  analyzeNetworkQuality(metrics: {
    latencyMs: number;
    jitterMs: number;
    packetLossPercent: number;
    downloadMbps: number;
    uploadMbps: number;
    stunSuccess: boolean;
    turnSuccess: boolean;
  }): NetworkTestResult {
    const recommendations: string[] = [];
    let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';

    // Analyze latency
    if (metrics.latencyMs > 300) {
      quality = 'poor';
      recommendations.push('Độ trễ mạng quá cao (>300ms). Hãy kiểm tra kết nối internet.');
    } else if (metrics.latencyMs > 150) {
      if (quality === 'excellent') quality = 'fair';
      recommendations.push('Độ trễ mạng khá cao. Video call có thể bị delay nhẹ.');
    } else if (metrics.latencyMs > 50) {
      if (quality === 'excellent') quality = 'good';
    }

    // Analyze jitter
    if (metrics.jitterMs > 50) {
      if (quality === 'excellent' || quality === 'good') quality = 'fair';
      recommendations.push('Jitter cao có thể gây giật video. Hãy tránh tải file khi đang họp.');
    }

    // Analyze packet loss
    if (metrics.packetLossPercent > 5) {
      quality = 'poor';
      recommendations.push('Mất gói tin cao (>5%). Kết nối không ổn định.');
    } else if (metrics.packetLossPercent > 2) {
      if (quality === 'excellent' || quality === 'good') quality = 'fair';
      recommendations.push('Có mất gói tin. Chất lượng video có thể bị ảnh hưởng.');
    }

    // Analyze bandwidth
    if (metrics.downloadMbps < 0.5 || metrics.uploadMbps < 0.5) {
      quality = 'poor';
      recommendations.push('Băng thông quá thấp cho video call. Chỉ nên dùng audio.');
    } else if (metrics.downloadMbps < 1.5 || metrics.uploadMbps < 1.5) {
      if (quality === 'excellent' || quality === 'good') quality = 'fair';
      recommendations.push('Băng thông hạn chế. Nên tắt video HD.');
    }

    // Check STUN/TURN
    if (!metrics.stunSuccess && !metrics.turnSuccess) {
      quality = 'poor';
      recommendations.push('Không thể kết nối STUN/TURN. Firewall có thể đang chặn WebRTC.');
    } else if (!metrics.turnSuccess) {
      recommendations.push('TURN server không khả dụng. Có thể gặp vấn đề khi kết nối P2P.');
    }

    // Determine capabilities
    const canJoinVideo = quality !== 'poor' && (metrics.downloadMbps >= 1 && metrics.uploadMbps >= 1);
    const canJoinAudio = metrics.downloadMbps >= 0.1 && metrics.uploadMbps >= 0.1 && 
                         (metrics.stunSuccess || metrics.turnSuccess);

    // Add positive recommendations
    if (quality === 'excellent') {
      recommendations.push('Kết nối tuyệt vời! Bạn có thể sử dụng video HD.');
    } else if (quality === 'good') {
      recommendations.push('Kết nối tốt. Video call sẽ hoạt động mượt mà.');
    }

    this.logger.log(`Network analysis: quality=${quality}, canVideo=${canJoinVideo}, canAudio=${canJoinAudio}`);

    return {
      stunReachable: metrics.stunSuccess,
      turnReachable: metrics.turnSuccess,
      latency: metrics.latencyMs,
      jitter: metrics.jitterMs,
      packetLoss: metrics.packetLossPercent,
      downloadSpeed: metrics.downloadMbps,
      uploadSpeed: metrics.uploadMbps,
      natType: 'unknown', // Client sẽ detect
      quality,
      canJoinVideo,
      canJoinAudio,
      recommendations,
    };
  }

  /**
   * Get recommended video settings based on bandwidth
   * Adaptive bitrate configuration
   */
  getRecommendedVideoSettings(uploadMbps: number): {
    resolution: string;
    frameRate: number;
    bitrate: number;
    codec: string;
  } {
    if (uploadMbps >= 4) {
      return {
        resolution: '1080p',
        frameRate: 30,
        bitrate: 2500000, // 2.5 Mbps
        codec: 'VP9',
      };
    } else if (uploadMbps >= 2) {
      return {
        resolution: '720p',
        frameRate: 30,
        bitrate: 1500000, // 1.5 Mbps
        codec: 'VP8',
      };
    } else if (uploadMbps >= 1) {
      return {
        resolution: '480p',
        frameRate: 24,
        bitrate: 800000, // 800 Kbps
        codec: 'VP8',
      };
    } else if (uploadMbps >= 0.5) {
      return {
        resolution: '360p',
        frameRate: 15,
        bitrate: 400000, // 400 Kbps
        codec: 'VP8',
      };
    } else {
      return {
        resolution: '240p',
        frameRate: 10,
        bitrate: 200000, // 200 Kbps
        codec: 'VP8',
      };
    }
  }

  /**
   * Generate test data for bandwidth estimation
   * Client sẽ download/upload data này để đo tốc độ
   */
  generateTestPayload(sizeKB: number): Buffer {
    // Generate random data for bandwidth test
    return Buffer.alloc(sizeKB * 1024, Math.random() * 256);
  }
}
