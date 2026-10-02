import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Polyfill structuredClone for JSDOM / fake-indexeddb
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (val: any) => JSON.parse(JSON.stringify(val));
}
if (typeof window !== 'undefined' && typeof window.structuredClone === 'undefined') {
  (window as any).structuredClone = (val: any) => JSON.parse(JSON.stringify(val));
}

// Global mock for window.matchMedia if needed in JSDOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
