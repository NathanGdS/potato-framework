import colours from './colours.js';

let instance: Logger | undefined;

export const LoggerInstance = (): Logger => {
  if (!instance) {
    instance = new Logger();
  }
  return instance.buildMessage();
};

class Logger {
  private message = '';
  private color: string | undefined;

  buildMessage(): this {
    this.resetColor();
    this.message += this.getDefaultName();
    this.message += this.getDate();
    return this;
  }

  info(message: string, name?: string): void {
    this.color = colours.fg.green;
    if (name) {
      this.message += this.turnYellow(`[${name}]\t`);
    }
    this.message += this.turnGreen(message);
    this.show();
  }

  warn(): this {
    this.color = colours.fg.red;
    return this;
  }

  registerRoute(method: string, sufix: string, funcName: string): void {
    this.message += this.turnYellow(`[${funcName}]`);
    this.message += this.turnGreen(`Mapped {${sufix}, ${method}}`);
    this.show();
  }

  registerPrefix(prefix: string, funcName: string): void {
    this.message += this.turnYellow(`[${funcName}]`);
    this.message += this.turnGreen(`Global prefix {${prefix}} registered`);
    this.show();
  }

  private getDate(): string {
    return ` - ${colours.fg.gray}${new Date().toISOString()}${colours.reset} - `;
  }

  private getDefaultName(): string {
    return this.turnGreen('[Sweet-Potato]');
  }

  private show(): void {
    console.log(
      this.color ?? this.resetColor(),
      this.message,
      this.resetColor()
    );
    this.resetMessage();
  }

  private turnGreen(message: string): string {
    return `${colours.fg.green}${message}${this.resetColor()}`;
  }

  private turnYellow(message: string): string {
    return `${colours.fg.yellow}${message}${this.resetColor()}\t`;
  }

  private resetMessage(): void {
    this.message = '';
  }

  private resetColor(): string {
    return colours.reset;
  }
}
