import { SweetPotato, HttpStatusCode } from "../../package/src/index";
import { loggerMiddleware } from "./middlewares/logger.middleware";
import { registerRoutes } from "./routes/index";

async function bootstrap() {
  const app = new SweetPotato();

  app.registerGlobalPrefix("api/v1");

  registerRoutes(app);

  app.get("example", loggerMiddleware, async ({ headers, queries, params }) => {
    app.finishRequest(HttpStatusCode.SUCCESS, {
      received: {
        headers,
        queries,
        params,
      },
    });
  });
  app.listen();
}
bootstrap();