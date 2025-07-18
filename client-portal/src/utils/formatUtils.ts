/**
 * Safe formatting utilities to prevent toLocaleString errors
 */

/**
 * Safely format a timestamp to locale string
 */
export const safeFormatTimestamp = (timestamp: string | number | Date | undefined | null): string => {
  if (!timestamp) return 'N/A';
  
  try {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString();
  } catch (error) {
    console.warn('Error formatting timestamp:', timestamp, error);
    return 'Invalid Date';
  }
};

/**
 * Safely format a date to locale date string
 */
export const safeFormatDate = (date: string | number | Date | undefined | null): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = new Date(date);
    return isNaN(dateObj.getTime()) ? 'Invalid Date' : dateObj.toLocaleDateString();
  } catch (error) {
    console.warn('Error formatting date:', date, error);
    return 'Invalid Date';
  }
};

/**
 * Safely format a time to locale time string
 */
export const safeFormatTime = (time: string | number | Date | undefined | null): string => {
  if (!time) return 'N/A';
  
  try {
    const timeObj = new Date(time);
    return isNaN(timeObj.getTime()) ? 'Invalid Time' : timeObj.toLocaleTimeString();
  } catch (error) {
    console.warn('Error formatting time:', time, error);
    return 'Invalid Time';
  }
};

/**
 * Safely format a number to locale string
 */
export const safeFormatNumber = (num: number | undefined | null): string => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  
  try {
    return num.toLocaleString();
  } catch (error) {
    console.warn('Error formatting number:', num, error);
    return String(num);
  }
};

/**
 * Safely format currency
 */
export const safeFormatCurrency = (amount: number | undefined | null, currency: string = 'USD'): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } catch (error) {
    console.warn('Error formatting currency:', amount, error);
    return `$${amount}`;
  }
};

/**
 * Format time ago (e.g., "2 hours ago")
 */
export const formatTimeAgo = (timestamp: string | number | Date | undefined | null): string => {
  if (!timestamp) return 'N/A';
  
  try {
    const now = new Date();
    const time = new Date(timestamp);
    
    if (isNaN(time.getTime())) return 'Invalid Date';
    
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  } catch (error) {
    console.warn('Error formatting time ago:', timestamp, error);
    return 'N/A';
  }
};

/**
 * Format duration in minutes to human readable format
 */
export const formatDuration = (minutes: number | undefined | null): string => {
  if (!minutes || isNaN(minutes)) return '0m';
  
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

/**
 * Format file size in bytes to human readable format
 */
export const formatFileSize = (bytes: number | undefined | null): string => {
  if (!bytes || isNaN(bytes) || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Safe percentage calculation
 */
export const safeCalculatePercentage = (current: number | undefined | null, previous: number | undefined | null): number => {
  if (!current || !previous || isNaN(current) || isNaN(previous) || previous === 0) return 0;
  
  return ((current - previous) / previous) * 100;
};

/**
 * Format percentage with sign
 */
export const formatPercentage = (percentage: number | undefined | null, decimals: number = 1): string => {
  if (percentage === null || percentage === undefined || isNaN(percentage)) return '0%';
  
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(decimals)}%`;
};
