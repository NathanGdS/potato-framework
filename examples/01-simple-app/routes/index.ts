import { asyncTestRoutes } from "./promise.routes";
import { syncTestRoutes } from "./sync-test.routes";

export function registerRoutes(app: any) {
  syncTestRoutes(app);
  asyncTestRoutes(app);
}