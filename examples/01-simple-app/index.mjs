import { SweetPotato, HttpStatusCode } from "../../package/dist/index.js";
import { loggerMiddleware } from "./middlewares/logger.middleware.mjs";
import { registerRoutes } from "./routes/index.mjs";

async function bootstrap() {
  const app = new SweetPotato();

  app.registerGlobalPrefix("api/v1");

  registerRoutes(app);

  app.get("example", loggerMiddleware, async ({ headers, queries, params }) => {
    app.finishRequest(HttpStatusCode.SUCCESS, {
      //default code=200
      received: {
        headers,
        queries,
        params,
      },
    });
  });
  app.listen(); //default port is 8000
}
bootstrap();
