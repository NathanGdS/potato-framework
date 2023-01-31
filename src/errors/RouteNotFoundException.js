export class RouteNotFoundException extends Error {
    message = 'Route not found';
    status = 404;
    constructor(){
        super();
        Error.captureStackTrace(this, this.constructor);
    }
}