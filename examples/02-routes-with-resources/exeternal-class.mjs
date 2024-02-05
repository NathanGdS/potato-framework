import { HttpStatusCode } from "potato-framework/constants/HttpStatusCode.constants.mjs";

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
