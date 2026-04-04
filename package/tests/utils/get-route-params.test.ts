import { describe, it, expect } from 'vitest';
import { getRouteParams } from '../../src/utils/get-route-params.js';

describe('getRouteParams', () => {
  it('should return an object without the "query" field', () => {
    const groups = { id: '42', query: '?foo=bar' };

    const result = getRouteParams(groups);

    expect(result).not.toHaveProperty('query');
  });

  it('should extract a single param correctly', () => {
    const groups = { id: '42', query: undefined };

    const result = getRouteParams(groups);

    expect(result).toEqual({ id: '42' });
  });

  it('should extract multiple params correctly', () => {
    const groups = { userId: '10', postId: '99', query: '?sort=asc' };

    const result = getRouteParams(groups);

    expect(result).toEqual({ userId: '10', postId: '99' });
  });

  it('should return an empty object when groups only contains "query"', () => {
    const groups = { query: '?foo=bar' };

    const result = getRouteParams(groups);

    expect(result).toEqual({});
  });

  it('should return all fields except "query" when query is undefined', () => {
    const groups = { slug: 'hello-world', query: undefined };

    const result = getRouteParams(groups);

    expect(result).toEqual({ slug: 'hello-world' });
    expect(result).not.toHaveProperty('query');
  });
});
