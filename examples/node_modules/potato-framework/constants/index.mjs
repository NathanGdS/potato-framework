import { HttpMethod } from "./HttpMethod.constants.mjs";
import { HttpStatusCode } from "./HttpStatusCode.constants.mjs";
import { CONSTANTS_ROUTES } from "./routes.constants.mjs";

export const CONSTANTS = {
  defaultPort: 8000,
  methods: HttpMethod,
  codes: HttpStatusCode,
  routes: CONSTANTS_ROUTES,
};
