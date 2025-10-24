/**
 * Vitest setup file
 * Configures test environment and global mocks
 */

import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Use Node.js WebCrypto API
import { webcrypto } from 'crypto';

Object.defineProperty(global, 'crypto', {
  value: webcrypto,
  writable: true
});

// Mock IndexedDB
class MockIDBDatabase {
  name: string;
  version: number;
  objectStoreNames: string[] = [];

  constructor(name: string, version: number) {
    this.name = name;
    this.version = version;
  }

  transaction() {
    return new MockIDBTransaction();
  }

  close() {}
}

class MockIDBTransaction {
  objectStore() {
    return new MockIDBObjectStore();
  }
}

class MockIDBObjectStore {
  put() {
    return new MockIDBRequest();
  }

  get() {
    return new MockIDBRequest();
  }

  getAll() {
    return new MockIDBRequest();
  }

  delete() {
    return new MockIDBRequest();
  }
}

class MockIDBRequest {
  onsuccess: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  result: any = null;

  constructor() {
    setTimeout(() => {
      if (this.onsuccess) {
        this.onsuccess({ target: { result: this.result } });
      }
    }, 0);
  }
}

class MockIDBFactory {
  open(name: string, version: number) {
    const request = new MockIDBRequest();
    request.result = new MockIDBDatabase(name, version);
    return request;
  }

  deleteDatabase() {
    return new MockIDBRequest();
  }
}

Object.defineProperty(global, 'indexedDB', {
  value: new MockIDBFactory(),
  writable: true
});

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true
});
