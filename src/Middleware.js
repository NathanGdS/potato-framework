export class Middleware {
    #middlewares;
    constructor(middlewares) {
        this.#middlewares = middlewares ?? [];
     }
    
    add(func) {
        this.#middlewares.push(func);
    }

    addMultiples(funcs){
        this.#middlewares.push(...funcs);
    }

    executeMiddlewares() {
        for(let i = 0; i <this.middlewares.length + 1; i ++) {
           const handler = this.middlewares.shift();
           handler()
        }
    }

    reset(){
        this.#middlewares = [];
    }

    getAllMiddlewares(){
        return this.#middlewares;
    }
}