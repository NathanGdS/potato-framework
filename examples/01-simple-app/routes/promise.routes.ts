import { HttpStatusCode } from "../../../package/src/index";

export function asyncTestRoutes(app: any) {
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