import {
  format,
  formatDistanceToNow,
  formatRelative,
  isToday,
  isTomorrow,
  isYesterday,
  isThisWeek,
  isThisYear,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  parseISO,
} from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Format date to Vietnamese locale
 */
export function formatDate(date: string | Date, formatStr = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: vi });
}

/**
 * Format datetime
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy HH:mm', { locale: vi });
}

/**
 * Format time only
 */
export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'HH:mm', { locale: vi });
}

/**
 * Format relative time (e.g., "5 phút trước")
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: vi });
}

/**
 * Format smart date (Today, Yesterday, etc.)
 */
export function formatSmartDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(d)) {
    return `Hôm nay, ${format(d, 'HH:mm', { locale: vi })}`;
  }
  
  if (isYesterday(d)) {
    return `Hôm qua, ${format(d, 'HH:mm', { locale: vi })}`;
  }
  
  if (isTomorrow(d)) {
    return `Ngày mai, ${format(d, 'HH:mm', { locale: vi })}`;
  }
  
  if (isThisWeek(d)) {
    return format(d, 'EEEE, HH:mm', { locale: vi });
  }
  
  if (isThisYear(d)) {
    return format(d, 'dd/MM, HH:mm', { locale: vi });
  }
  
  return format(d, 'dd/MM/yyyy HH:mm', { locale: vi });
}

/**
 * Format relative date for chat/notifications
 */
export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatRelative(d, new Date(), { locale: vi });
}

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format duration to Vietnamese
 */
export function formatDurationVi(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours} giờ ${minutes > 0 ? `${minutes} phút` : ''}`.trim();
  }
  if (minutes > 0) {
    return `${minutes} phút`;
  }
  return `${seconds} giây`;
}

/**
 * Get countdown string
 */
export function getCountdown(targetDate: string | Date): string {
  const target = typeof targetDate === 'string' ? parseISO(targetDate) : targetDate;
  const now = new Date();
  
  const diffMinutes = differenceInMinutes(target, now);
  const diffHours = differenceInHours(target, now);
  const diffDays = differenceInDays(target, now);
  
  if (diffMinutes < 0) {
    return 'Đã hết hạn';
  }
  
  if (diffMinutes < 60) {
    return `Còn ${diffMinutes} phút`;
  }
  
  if (diffHours < 24) {
    return `Còn ${diffHours} giờ`;
  }
  
  return `Còn ${diffDays} ngày`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format number with Vietnamese locale
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('vi-VN').format(num);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format score (e.g., 8.5/10)
 */
export function formatScore(score: number, maxScore: number): string {
  return `${score}/${maxScore}`;
}

/**
 * Format score as grade letter
 */
export function getGradeLetter(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 85) return 'A';
  if (percentage >= 80) return 'B+';
  if (percentage >= 70) return 'B';
  if (percentage >= 65) return 'C+';
  if (percentage >= 55) return 'C';
  if (percentage >= 50) return 'D+';
  if (percentage >= 40) return 'D';
  return 'F';
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Mask email address
 */
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (name.length <= 2) {
    return `${name[0]}*@${domain}`;
  }
  const maskedName = `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`;
  return `${maskedName}@${domain}`;
}

/**
 * Format class code for display
 */
export function formatClassCode(code: string): string {
  return code.toUpperCase();
}

/**
 * Format participant count
 */
export function formatParticipantCount(count: number, max?: number): string {
  if (max) {
    return `${count}/${max}`;
  }
  return `${count} người tham gia`;
}
