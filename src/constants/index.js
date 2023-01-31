import { CONSTANTS_METHODS } from "./methods.constants.js"
import { HttpStatusCode } from "./HttpStatusCoded.constants.js"
import { CONSTANTS_ROUTES } from "./routes.constants.js"

export const CONSTANTS = {
    defaultPort: 3000,
    methods: CONSTANTS_METHODS,
    codes: HttpStatusCode,
    routes: CONSTANTS_ROUTES
}