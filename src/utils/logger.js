import colours from "./colours.js";

const handle = (message) => {
    return new Logger(`${message}`);
}

class Logger {
    #message = "";
    #color;
    constructor (message) {
        this.#message+= colours.fg.green + "[Sweet-Potato] "+colours.reset;
        this.#message+= message;
        this.#message+= ` ${colours.fg.gray}${new Date().toISOString('DD-MM-yyyy')}${colours.reset}`
    }

    info() {
        this.#color = colours.fg.green;
        this.#log();
    }

    warn () {
        this.#color = colours.fg.red;
        return this;
    }

    #log() {
        console.log(this.#color, this.#message, this.#reset());
    }

    #reset() {
        return colours.reset;
    }
}

export default handle