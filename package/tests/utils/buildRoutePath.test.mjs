import { describe, it, expect } from 'vitest';
import { buildRoutePath } from '../../utils/buildRoutePath.mjs';

describe('buildRoutePath', () => {
  it('should match a static path exactly', () => {
    // Arrange
    const regex = buildRoutePath('/users');

    // Act
    const match = regex.exec('/users');

    // Assert
    expect(match).not.toBeNull();
  });

  it('should NOT match a static path with extra segments', () => {
    // Arrange
    const regex = buildRoutePath('/users');

    // Act
    const match = regex.exec('/users/extra');

    // Assert
    expect(match).toBeNull();
  });

  it('should capture a single named param :id', () => {
    // Arrange
    const regex = buildRoutePath('/users/:id');

    // Act
    const match = regex.exec('/users/42');

    // Assert
    expect(match).not.toBeNull();
    expect(match.groups.id).toBe('42');
  });

  it('should capture multiple named params', () => {
    // Arrange
    const regex = buildRoutePath('/users/:userId/posts/:postId');

    // Act
    const match = regex.exec('/users/10/posts/99');

    // Assert
    expect(match).not.toBeNull();
    expect(match.groups.userId).toBe('10');
    expect(match.groups.postId).toBe('99');
  });

  it('should capture the query string in the named group "query"', () => {
    // Arrange
    const regex = buildRoutePath('/users');

    // Act
    const match = regex.exec('/users?name=john&age=30');

    // Assert
    expect(match).not.toBeNull();
    expect(match.groups.query).toBe('?name=john&age=30');
  });

  it('should capture both a param and a query string', () => {
    // Arrange
    const regex = buildRoutePath('/users/:id');

    // Act
    const match = regex.exec('/users/5?active=true');

    // Assert
    expect(match).not.toBeNull();
    expect(match.groups.id).toBe('5');
    expect(match.groups.query).toBe('?active=true');
  });

  it('should return null when the path does not match the pattern', () => {
    // Arrange
    const regex = buildRoutePath('/users/:id');

    // Act
    const match = regex.exec('/products/42');

    // Assert
    expect(match).toBeNull();
  });
});
