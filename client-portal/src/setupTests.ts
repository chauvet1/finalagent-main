// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// NO MOCKS - Using real implementations only
// Configure Jest to handle ES modules properly by setting up the environment

// Polyfill for btoa/atob if not available in test environment
if (typeof global.btoa === 'undefined') {
  global.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
}

if (typeof global.atob === 'undefined') {
  global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
}

// Ensure localStorage works in test environment
if (typeof Storage === 'undefined') {
  class LocalStorageMock {
    private store: { [key: string]: string } = {};

    getItem(key: string): string | null {
      return this.store[key] || null;
    }

    setItem(key: string, value: string): void {
      this.store[key] = value;
    }

    removeItem(key: string): void {
      delete this.store[key];
    }

    clear(): void {
      this.store = {};
    }

    get length(): number {
      return Object.keys(this.store).length;
    }

    key(index: number): string | null {
      const keys = Object.keys(this.store);
      return keys[index] || null;
    }
  }

  Object.defineProperty(window, 'localStorage', {
    value: new LocalStorageMock(),
    writable: true
  });
}

// Ensure window.location exists for tests
if (typeof window !== 'undefined' && !window.location) {
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000',
      assign: () => {},
      reload: () => {}
    },
    writable: true
  });
}