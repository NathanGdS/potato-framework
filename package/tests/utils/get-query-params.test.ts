import { describe, it, expect } from 'vitest';
import { getQueries } from '../../src/utils/get-query-params.js';

describe('getQueries', () => {
  it('should return null when called with null', () => {
    const result = getQueries(null);

    expect(result).toBeNull();
  });

  it('should return null when called with undefined', () => {
    const result = getQueries(undefined);

    expect(result).toBeNull();
  });

  it('should return null when called with an empty string', () => {
    const result = getQueries('');

    expect(result).toBeNull();
  });

  it('should parse a single query param', () => {
    const query = '?name=john';

    const result = getQueries(query);

    expect(result).toEqual({ name: 'john' });
  });

  it('should parse multiple query params', () => {
    const query = '?name=john&age=30';

    const result = getQueries(query);

    expect(result).toEqual({ name: 'john', age: '30' });
  });

  it('should set value to undefined for a param without a value (flag param)', () => {
    const query = '?flag';

    const result = getQueries(query);

    expect(result).toHaveProperty('flag');
    expect(result.flag).toBeUndefined();
  });

  it('should not throw when given a malformed query string', () => {
    const query = '?=nokey&name=valid';

    expect(() => getQueries(query)).not.toThrow();
  });
});
