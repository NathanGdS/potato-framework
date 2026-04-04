import { HttpStatusCode, SweetPotato } from "../../package/src/index";

export class ExternalClass {
  constructor(private app: SweetPotato) {}

  async execute({ body }: { body: { msg?: string } }) {
    return this.app.finishRequest(HttpStatusCode.SUCCESS, {
      msg: body.msg,
    });
  }
}