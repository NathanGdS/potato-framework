import colours from "./colours.mjs";

let instance;
export const LoggerInstance = () => {
  if (!instance) {
    instance = new Logger();
  }
  return instance.buildMessage();
};

class Logger {
  #message = "";
  #color;

  constructor() {}

  buildMessage() {
    this.#resetColor();
    this.#message += this.#getDefaultName();
    this.#message += this.#getDate();
    return this;
  }

  info(message, name) {
    this.#color = colours.fg.green;
    if (name) {
      this.#message += this.#turnYellow(`[${name}]\t`);
    }
    this.#message += this.#turnGreen(message);
    this.#show();
  }

  warn() {
    this.#color = colours.fg.red;
    return this;
  }

  registerRoute(method, sufix, funcName) {
    this.#message += this.#turnYellow(`[${funcName}]`);
    this.#message += this.#turnGreen(`Mapped {${sufix}, ${method}}`);
    this.#show();
  }

  #getDate() {
    return ` - ${colours.fg.gray}${new Date().toISOString("DD-MM-yyyy")}${
      colours.reset
    } - `;
  }

  #getDefaultName() {
    return this.#turnGreen("[Sweet-Potato]");
  }

  #show() {
    console.log(
      this.#color ?? this.#resetColor(),
      this.#message,
      this.#resetColor()
    );
    this.#resetMessage();
  }

  #turnGreen(message) {
    return `${colours.fg.green}${message}${this.#resetColor()}`;
  }

  #turnYellow(message) {
    return `${colours.fg.yellow}${message}${this.#resetColor()}\t`;
  }

  #resetMessage() {
    this.#message = "";
  }

  #resetColor() {
    return colours.reset;
  }
}
