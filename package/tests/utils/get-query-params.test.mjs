import { describe, it, expect } from 'vitest';
import { getQueries } from '../../utils/get-query-params.mjs';

describe('getQueries', () => {
  it('should return null when called with null', () => {
    // Arrange / Act
    const result = getQueries(null);

    // Assert
    expect(result).toBeNull();
  });

  it('should return null when called with undefined', () => {
    // Arrange / Act
    const result = getQueries(undefined);

    // Assert
    expect(result).toBeNull();
  });

  it('should return null when called with an empty string', () => {
    // Arrange / Act
    const result = getQueries('');

    // Assert
    expect(result).toBeNull();
  });

  it('should parse a single query param', () => {
    // Arrange
    const query = '?name=john';

    // Act
    const result = getQueries(query);

    // Assert
    expect(result).toEqual({ name: 'john' });
  });

  it('should parse multiple query params', () => {
    // Arrange
    const query = '?name=john&age=30';

    // Act
    const result = getQueries(query);

    // Assert
    expect(result).toEqual({ name: 'john', age: '30' });
  });

  it('should set value to undefined for a param without a value (flag param)', () => {
    // Arrange
    const query = '?flag';

    // Act
    const result = getQueries(query);

    // Assert
    expect(result).toHaveProperty('flag');
    expect(result.flag).toBeUndefined();
  });

  it('should not throw when given a malformed query string', () => {
    // Arrange
    const query = '?=nokey&name=valid';

    // Act & Assert
    expect(() => getQueries(query)).not.toThrow();
  });
});
