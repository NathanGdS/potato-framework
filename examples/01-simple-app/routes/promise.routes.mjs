import { HttpStatusCode } from "../../../package/constants/HttpStatusCode.constants.mjs";

export function asyncTestRoutes(app) {
  app.get("promise", async () => {
    const response = {
      message: "promise route",
    };

    const promise = new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });

    await promise;

    app.finishRequest(HttpStatusCode.SUCCESS, response);
  });
}
