import { describe, it, expect } from 'vitest';
import { buildRoutePath } from '../../src/utils/buildRoutePath.js';

describe('buildRoutePath', () => {
  it('should match a static path exactly', () => {
    const regex = buildRoutePath('/users');

    const match = regex.exec('/users');

    expect(match).not.toBeNull();
  });

  it('should NOT match a static path with extra segments', () => {
    const regex = buildRoutePath('/users');

    const match = regex.exec('/users/extra');

    expect(match).toBeNull();
  });

  it('should capture a single named param :id', () => {
    const regex = buildRoutePath('/users/:id');

    const match = regex.exec('/users/42');

    expect(match).not.toBeNull();
    expect(match!.groups!.id).toBe('42');
  });

  it('should capture multiple named params', () => {
    const regex = buildRoutePath('/users/:userId/posts/:postId');

    const match = regex.exec('/users/10/posts/99');

    expect(match).not.toBeNull();
    expect(match!.groups!.userId).toBe('10');
    expect(match!.groups!.postId).toBe('99');
  });

  it('should capture the query string in the named group "query"', () => {
    const regex = buildRoutePath('/users');

    const match = regex.exec('/users?name=john&age=30');

    expect(match).not.toBeNull();
    expect(match!.groups!.query).toBe('?name=john&age=30');
  });

  it('should capture both a param and a query string', () => {
    const regex = buildRoutePath('/users/:id');

    const match = regex.exec('/users/5?active=true');

    expect(match).not.toBeNull();
    expect(match!.groups!.id).toBe('5');
    expect(match!.groups!.query).toBe('?active=true');
  });

  it('should return null when the path does not match the pattern', () => {
    const regex = buildRoutePath('/users/:id');

    const match = regex.exec('/products/42');

    expect(match).toBeNull();
  });

  it('should return a RegExp instance', () => {
    const result = buildRoutePath('/users/:id');

    expect(result).toBeInstanceOf(RegExp);
  });

  it('should have named capture groups for route params', () => {
    const regex = buildRoutePath('/posts/:postId/comments/:commentId');

    const match = regex.exec('/posts/1/comments/2');
    expect(match).not.toBeNull();
    expect(match!.groups).toHaveProperty('postId');
    expect(match!.groups).toHaveProperty('commentId');
    expect(match!.groups).toHaveProperty('query');
  });
});
