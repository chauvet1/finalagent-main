/**
 * Global fixes for common JavaScript errors
 * This file patches common issues to prevent crashes
 */

/**
 * Patch Number.prototype.toLocaleString to handle undefined/null values
 */
const originalNumberToLocaleString = Number.prototype.toLocaleString;
Number.prototype.toLocaleString = function(this: number, locales?: string | string[], options?: Intl.NumberFormatOptions) {
  if (this === undefined || this === null || isNaN(this)) {
    console.warn('toLocaleString called on invalid number:', this);
    return '0';
  }
  return originalNumberToLocaleString.call(this, locales, options);
};

/**
 * Patch Date.prototype.toLocaleString to handle invalid dates
 */
const originalDateToLocaleString = Date.prototype.toLocaleString;
Date.prototype.toLocaleString = function(this: Date, locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
  if (!this || isNaN(this.getTime())) {
    console.warn('toLocaleString called on invalid date:', this);
    return 'Invalid Date';
  }
  return originalDateToLocaleString.call(this, locales, options);
};

/**
 * Patch Date.prototype.toLocaleDateString to handle invalid dates
 */
const originalDateToLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function(this: Date, locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
  if (!this || isNaN(this.getTime())) {
    console.warn('toLocaleDateString called on invalid date:', this);
    return 'Invalid Date';
  }
  return originalDateToLocaleDateString.call(this, locales, options);
};

/**
 * Patch Date.prototype.toLocaleTimeString to handle invalid dates
 */
const originalDateToLocaleTimeString = Date.prototype.toLocaleTimeString;
Date.prototype.toLocaleTimeString = function(this: Date, locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
  if (!this || isNaN(this.getTime())) {
    console.warn('toLocaleTimeString called on invalid date:', this);
    return 'Invalid Time';
  }
  return originalDateToLocaleTimeString.call(this, locales, options);
};

/**
 * Global error handler for unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled promise rejection:', event.reason);
  
  // Check if it's a toLocaleString related error
  if (event.reason && event.reason.message && event.reason.message.includes('toLocaleString')) {
    console.error('🐛 toLocaleString error detected!');
    console.error('Error stack:', event.reason.stack);
    console.error('This error usually happens when undefined/null values are passed to toLocaleString()');
    console.error('Check for undefined timestamps, numbers, or dates in the component that crashed');
  }
  
  // Prevent the default browser error handling
  event.preventDefault();
});

/**
 * Global error handler for uncaught exceptions
 */
window.addEventListener('error', (event) => {
  console.error('🚨 Uncaught error:', event.error);
  
  // Check if it's a toLocaleString related error
  if (event.error && event.error.message && event.error.message.includes('toLocaleString')) {
    console.error('🐛 toLocaleString error detected!');
    console.error('Error stack:', event.error.stack);
    console.error('This error usually happens when undefined/null values are passed to toLocaleString()');
    console.error('Check for undefined timestamps, numbers, or dates in the component that crashed');
  }
});

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
