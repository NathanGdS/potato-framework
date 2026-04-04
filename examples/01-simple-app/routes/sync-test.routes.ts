import { HttpStatusCode } from "../../../package/src/index";

async function promiseMiddleware() {
  const promise = new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });

  await promise;
  console.log("promise middleware");
  return;
}

function validateParamMiddleware({ params }: { params: any }) {
  if (params.userId != Number(1)) {
    throw new Error("UserId is not 1");
  }
}

function transformMiddleware({ params }: { params: any }) {
  params.testeId = String("transformed");
}

function apiKeyMiddleare({ headers }: { headers: any }) {
  console.log(headers["x-api-key"]);
  if (headers["x-api-key"] != "api-key-token") {
    throw new Error("Forbidden");
  }
}

export function syncTestRoutes(app: any) {
  app.get(
    "/teste",
    promiseMiddleware,
    apiKeyMiddleare,
    ({ headers, queries, params }: { headers: any; queries: any; params: any }) => {
      app.finishRequest(HttpStatusCode.SUCCESS, {
        message: "teste - GET",
        headers,
        queries,
        params,
      });
    }
  );

  app.get(
    "/teste/:testeId/user/:userId",
    validateParamMiddleware,
    transformMiddleware,
    ({ params }: { params: any }) => {
      app.finishRequest(HttpStatusCode.SUCCESS, {
        message: "teste - GET - id",
        params,
      });
    }
  );

  app.post("/teste", apiKeyMiddleare, ({ body }: { body: any }) => {
    const response = {
      changed: body.a,
      b: body.b,
    };
    app.finishRequest(HttpStatusCode.CREATED, response);
  });

  app.put("/teste", () => {
    app.finishRequest(HttpStatusCode.SUCCESS, {
      message: "teste - PUT",
    });
  });

  app.patch("/teste", () => {
    app.finishRequest(HttpStatusCode.SUCCESS, {
      message: "teste - PATCH",
    });
  });

  app.delete("/teste", () => {
    app.finishRequest(HttpStatusCode.SUCCESS, {
      message: "teste - DELETE",
    });
  });
}