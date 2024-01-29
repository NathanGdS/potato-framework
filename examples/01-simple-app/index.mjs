import { SweetPotatoApp } from "potato-framework";
import { CONSTANTS } from "potato-framework/constants/index.mjs";
import { loggerMiddleware } from "./middlewares/logger.middleware.mjs";
import { registerRoutes } from "./routes/index.mjs";

async function bootstrap() {
  const app = new SweetPotatoApp(); //loading app instance

  app.registerGlobalPrefix("api/v1"); //registering global prefix

  registerRoutes(app); //loading routes from other files

  //creating a simple route and adding a logger middleware (you can add as many as you want)
  app.get("example", loggerMiddleware, async ({ headers, queries, params }) => {
    // you can get the headers, body, query params and route params from request
    app.finishRequest(CONSTANTS.codes.SUCCESS, {
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
