import { HttpMethod } from "./HttpMethod.constants.js"
import { HttpStatusCode } from "./HttpStatusCode.constants.js"
import { CONSTANTS_ROUTES } from "./routes.constants.js"

export const CONSTANTS = {
    defaultPort: 3000,
    methods: HttpMethod,
    codes: HttpStatusCode,
    routes: CONSTANTS_ROUTES
}