import { describe, it, expect, expectTypeOf, beforeEach } from 'vitest';
import { SweetPotatoApp } from '../src/SweetPotatoApp.js';
import { SweetPotato } from '../src/SweetPotato.js';

describe('SweetPotatoApp', () => {
  beforeEach(() => {
    const app = SweetPotatoApp();
    (app as unknown as { [key: string]: unknown }).constructor.prototype;
  });

  describe('singleton behavior', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = SweetPotatoApp();
      const instance2 = SweetPotatoApp();

      expect(instance1).toBe(instance2);
    });

    it('should return a SweetPotato instance', () => {
      const app = SweetPotatoApp();

      expect(app).toBeInstanceOf(SweetPotato);
      expectTypeOf(app).toBeObject();
    });

    it('should have registerGlobalPrefix method from SweetPotato', () => {
      const app = SweetPotatoApp();

      expectTypeOf(app.registerGlobalPrefix).toBeFunction();
      app.registerGlobalPrefix('api');
    });

    it('should have get method from SweetPotato', () => {
      const app = SweetPotatoApp();

      expectTypeOf(app.get).toBeFunction();
    });

    it('should have post method from SweetPotato', () => {
      const app = SweetPotatoApp();

      expectTypeOf(app.post).toBeFunction();
    });

    it('should have listen method from SweetPotato', () => {
      const app = SweetPotatoApp();

      expectTypeOf(app.listen).toBeFunction();
    });

    it('should have finishRequest method from SweetPotato', () => {
      const app = SweetPotatoApp();

      expectTypeOf(app.finishRequest).toBeFunction();
    });
  });
});
