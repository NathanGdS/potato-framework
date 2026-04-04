import { describe, it, expect } from 'vitest';
import { isPromise } from '../../utils/isPromise.mjs';

describe('isPromise', () => {
  it('should return false for a regular named function', () => {
    // Arrange
    function syncFn() {}

    // Act
    const result = isPromise(syncFn);

    // Assert
    expect(result).toBe(false);
  });

  it('should return false for a regular arrow function', () => {
    // Arrange
    const syncArrow = () => {};

    // Act
    const result = isPromise(syncArrow);

    // Assert
    expect(result).toBe(false);
  });

  it('should return true for an async arrow function', () => {
    // Arrange
    const asyncArrow = async () => {};

    // Act
    const result = isPromise(asyncArrow);

    // Assert
    expect(result).toBe(true);
  });

  it('should return true for an async named function', () => {
    // Arrange
    async function asyncFn() {}

    // Act
    const result = isPromise(asyncFn);

    // Assert
    expect(result).toBe(true);
  });

  it('should return true for a resolved Promise instance', () => {
    // Arrange
    const promise = Promise.resolve();

    // Act
    const result = isPromise(promise);

    // Assert
    expect(result).toBe(true);
  });

  it('should return true for a pending Promise instance', () => {
    // Arrange
    const promise = new Promise(() => {});

    // Act
    const result = isPromise(promise);

    // Assert
    expect(result).toBe(true);
  });
});
