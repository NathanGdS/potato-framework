/**
 * @typedef {Object} HttpMethodType
 * @readonly
 * @enum {string}
 * @property {string} GET
 * @property {string} POST
 * @property {string} PATCH
 * @property {string} PUT
 * @property {string} DELETE
 * @description Enum for HTTP methods
 *
 */
export const HttpMethod = Object.freeze({
  GET: "GET",
  POST: "POST",
  PATCH: "PATCH",
  PUT: "PUT",
  DELETE: "DELETE",
});
