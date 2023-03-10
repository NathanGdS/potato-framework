import { asyncTestRoutes } from "./promise.routes.js";
import { syncTestRoutes } from "./sync-test.routes.js";

export function registerRoutes(app) {
    syncTestRoutes(app);
    asyncTestRoutes(app);
}