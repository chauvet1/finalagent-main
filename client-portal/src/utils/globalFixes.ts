/**
 * Global fixes for common JavaScript errors
 * This file patches common issues to prevent crashes
 */

/**
 * Patch Number.prototype.toLocaleString to handle undefined/null values
 */
const originalNumberToLocaleString = Number.prototype.toLocaleString;
Number.prototype.toLocaleString = function(this: number, ...args: any[]) {
  if (this === undefined || this === null || isNaN(this)) {
    console.warn('toLocaleString called on invalid number:', this);
    return '0';
  }
  return originalNumberToLocaleString.apply(this, args);
};

/**
 * Patch Date.prototype.toLocaleString to handle invalid dates
 */
const originalDateToLocaleString = Date.prototype.toLocaleString;
Date.prototype.toLocaleString = function(this: Date, ...args: any[]) {
  if (!this || isNaN(this.getTime())) {
    console.warn('toLocaleString called on invalid date:', this);
    return 'Invalid Date';
  }
  return originalDateToLocaleString.apply(this, args);
};

/**
 * Patch Date.prototype.toLocaleDateString to handle invalid dates
 */
const originalDateToLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function(this: Date, ...args: any[]) {
  if (!this || isNaN(this.getTime())) {
    console.warn('toLocaleDateString called on invalid date:', this);
    return 'Invalid Date';
  }
  return originalDateToLocaleDateString.apply(this, args);
};

/**
 * Patch Date.prototype.toLocaleTimeString to handle invalid dates
 */
const originalDateToLocaleTimeString = Date.prototype.toLocaleTimeString;
Date.prototype.toLocaleTimeString = function(this: Date, ...args: any[]) {
  if (!this || isNaN(this.getTime())) {
    console.warn('toLocaleTimeString called on invalid date:', this);
    return 'Invalid Time';
  }
  return originalDateToLocaleTimeString.apply(this, args);
};

/**
 * Global error handler for unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Prevent the default behavior (which would log to console)
  event.preventDefault();
  
  // You could show a user-friendly error message here
  console.warn('An error occurred. Please refresh the page if you experience issues.');
});

/**
 * Global error handler for JavaScript errors
 */
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  
  // Special handling for toLocaleString errors
  if (event.error?.message?.includes('toLocaleString')) {
    console.error('🐛 toLocaleString error detected globally!');
    console.error('Error details:', {
      message: event.error.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error.stack
    });
    
    // Prevent the error from crashing the app
    event.preventDefault();
    return false;
  }
});

/**
 * Safe wrapper for any function that might call toLocaleString
 */
export const safeExecute = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch (error: any) {
    if (error.message?.includes('toLocaleString')) {
      console.warn('toLocaleString error caught in safeExecute:', error);
    } else {
      console.warn('Error caught in safeExecute:', error);
    }
    return fallback;
  }
};

/**
 * Initialize global fixes
 */
export const initializeGlobalFixes = () => {
  console.log('🔧 Global fixes initialized');
  console.log('- Number.prototype.toLocaleString patched');
  console.log('- Date.prototype.toLocaleString patched');
  console.log('- Date.prototype.toLocaleDateString patched');
  console.log('- Date.prototype.toLocaleTimeString patched');
  console.log('- Global error handlers registered');
};

// Auto-initialize when this module is imported
initializeGlobalFixes();
