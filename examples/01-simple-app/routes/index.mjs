import { asyncTestRoutes } from "./promise.routes.mjs";
import { syncTestRoutes } from "./sync-test.routes.mjs";

export function registerRoutes(app) {
  syncTestRoutes(app);
  asyncTestRoutes(app);
}
