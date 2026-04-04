import { HttpStatusCode } from "../../package/dist/index.js";

export class ExternalClass {
  constructor(app) {
    this.app = app;
  }

  async execute({ body }) {
    return this.app.finishRequest(HttpStatusCode.SUCCESS, {
      msg: body.msg,
    });
  }
}
