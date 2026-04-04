import { describe, it, expect } from 'vitest';
import { isPromise } from '../../src/utils/isPromise.js';

describe('isPromise', () => {
  it('should return false for a regular named function', () => {
    function syncFn() {}

    const result = isPromise(syncFn);

    expect(result).toBe(false);
  });

  it('should return false for a regular arrow function', () => {
    const syncArrow = () => {};

    const result = isPromise(syncArrow);

    expect(result).toBe(false);
  });

  it('should return true for an async arrow function', () => {
    const asyncArrow = async () => {};

    const result = isPromise(asyncArrow);

    expect(result).toBe(true);
  });

  it('should return true for an async named function', () => {
    async function asyncFn() {}

    const result = isPromise(asyncFn);

    expect(result).toBe(true);
  });

  it('should return true for a resolved Promise instance', () => {
    const promise = Promise.resolve();

    const result = isPromise(promise);

    expect(result).toBe(true);
  });

  it('should return true for a pending Promise instance', () => {
    const promise = new Promise(() => {});

    const result = isPromise(promise);

    expect(result).toBe(true);
  });
});
