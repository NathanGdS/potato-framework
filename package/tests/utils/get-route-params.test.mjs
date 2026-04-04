import { describe, it, expect } from 'vitest';
import { getRouteParams } from '../../utils/get-route-params.mjs';

describe('getRouteParams', () => {
  it('should return an object without the "query" field', () => {
    // Arrange
    const groups = { id: '42', query: '?foo=bar' };

    // Act
    const result = getRouteParams(groups);

    // Assert
    expect(result).not.toHaveProperty('query');
  });

  it('should extract a single param correctly', () => {
    // Arrange
    const groups = { id: '42', query: undefined };

    // Act
    const result = getRouteParams(groups);

    // Assert
    expect(result).toEqual({ id: '42' });
  });

  it('should extract multiple params correctly', () => {
    // Arrange
    const groups = { userId: '10', postId: '99', query: '?sort=asc' };

    // Act
    const result = getRouteParams(groups);

    // Assert
    expect(result).toEqual({ userId: '10', postId: '99' });
  });

  it('should return an empty object when groups only contains "query"', () => {
    // Arrange
    const groups = { query: '?foo=bar' };

    // Act
    const result = getRouteParams(groups);

    // Assert
    expect(result).toEqual({});
  });

  it('should return all fields except "query" when query is undefined', () => {
    // Arrange
    const groups = { slug: 'hello-world', query: undefined };

    // Act
    const result = getRouteParams(groups);

    // Assert
    expect(result).toEqual({ slug: 'hello-world' });
    expect(result).not.toHaveProperty('query');
  });
});
