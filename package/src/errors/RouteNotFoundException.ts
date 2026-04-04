import { CONSTANTS_ROUTES } from "../constants/routes.constants.js";

export class RouteNotFoundException extends Error {
  status: number = 404;

  constructor() {
    super(CONSTANTS_ROUTES.INVALID_ROUTE_MESSAGE);
    this.name = "RouteNotFoundException";
    const ErrorWithCapture = Error as typeof Error & {
      captureStackTrace?: (target: object, constructor: Function) => void;
    };
    if (ErrorWithCapture.captureStackTrace) {
      ErrorWithCapture.captureStackTrace(this, this.constructor);
    }
  }
}
