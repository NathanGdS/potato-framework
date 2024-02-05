import { Routes } from "./Routes.mjs";
import { HttpMethod } from "./constants/HttpMethod.constants.mjs";

export class Resource extends Routes {
  #sufix;
  #defaultMiddlewares = [];
  #handlers = [];
  constructor() {
    super();
  }

  /**
   *
   * @param {string} sufix
   * @returns {Resource}
   */
  resource(sufix) {
    this.#sufix = sufix;
    return this;
  }

  /**
   * @typedef {object} HandlerInput
   * @property {HttpMethod} method
   * @property {string} sufix
   */

  /**
   * @param {HandlerInput} input
   * @param {Array<Function>} args
   * @returns {Resource}
   */
  defineHandler(input, ...args) {
    const parsedMethod = HttpMethod[input.method];
    if (!parsedMethod) {
      throw new Error("Invalid method");
    }

    let sufix = this.#sufix;

    if (input.sufix) {
      sufix += "/" + input.sufix;
    }
    const middlewares = [...args, ...this.#defaultMiddlewares];
    this[input.method.toLowerCase()](sufix, ...middlewares);
    return this;
  }

  defaultMiddlewares(...args) {
    this.#defaultMiddlewares.push(...args);
    return this;
  }
}
