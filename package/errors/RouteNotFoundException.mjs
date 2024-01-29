import { CONSTANTS_ROUTES } from "../constants/routes.constants.mjs";

export class RouteNotFoundException extends Error {
  message = CONSTANTS_ROUTES.INVALID_ROUTE_MESSAGE;
  status = 404;
  constructor() {
    super();
    Error.captureStackTrace(this, this.constructor);
  }
}
