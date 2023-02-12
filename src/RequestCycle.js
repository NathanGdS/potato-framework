import { isPromise } from "./utils/isPromise.js"

export class RequestCycle {
    #handlers;
    constructor(handlers) {
        this.#handlers = handlers ?? [];
     }
    
    add(func) {
        this.#handlers.push(func);
    }

    addMultiples(funcs){
        this.#handlers.push(...funcs);
    }

    async executeRequestCycle(data) {
        for (let i=0; i < this.#handlers.length; i ++) {
            const actualHandler = this.#handlers[i];
            if(!isPromise(actualHandler)) {
                actualHandler(data);
            }else {
                await actualHandler(data);
            }
        }
    }

    reset(){
        this.#handlers = [];
    }

    getAllMiddlewares(){
        return this.#handlers;
    }
}