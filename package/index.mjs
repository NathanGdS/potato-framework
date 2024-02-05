import { SweetPotato } from "./SweetPotato.mjs";

/**
 * @class SweetPotatoApp
 * @returns {SweetPotato}
 */
export class SweetPotatoApp {
  #instance;
  constructor() {
    if (!this.#instance) {
      this.#instance = new SweetPotato();
    }
    return this.#getInstance();
  }

  /**
   *
   * @returns {SweetPotato}
   */
  #getInstance() {
    return this.#instance;
  }
}
