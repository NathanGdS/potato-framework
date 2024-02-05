import { SweetPotato } from "potato-framework/SweetPotato.mjs";
import { HttpMethod } from "potato-framework/constants/HttpMethod.constants.mjs";
import { ExternalClass } from "./exeternal-class.mjs";

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
      async ({ headers, queries, params }) => {
        app.finishRequest(HttpStatusCode.SUCCESS, {
          //default code=200
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
      (data) => new ExternalClass(app).execute(data)
    );

  app.listen();
}
bootstrap();
