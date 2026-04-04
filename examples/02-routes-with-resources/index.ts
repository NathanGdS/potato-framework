import { SweetPotato, HttpMethod, HttpStatusCode, HandlerContext } from "../../package/src/index";
import { ExternalClass } from "./exeternal-class";

async function bootstrap() {
  const app = new SweetPotato();

  app.registerGlobalPrefix("api/v1");

  app
    .resource("message")
    .defineHandler(
      {
        method: HttpMethod.GET,
        sufix: ":id",
      },
      async ({ headers, queries, params }: HandlerContext) => {
        app.finishRequest(HttpStatusCode.SUCCESS, {
          received: {
            headers,
            queries,
            params,
          },
        });
      }
    )
    .defineHandler(
      {
        method: HttpMethod.POST,
      },
      (data: HandlerContext) => new ExternalClass(app).execute(data)
    );

  app.listen();
}
bootstrap();