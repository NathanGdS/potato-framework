import PotatoApp from "./potato.js";
import methods from "./utils/constants.js";

const PORT = 3000;

const app = new PotatoApp(PORT);

app.createRoute(methods.GET, '/teste', () => {
    app.finishRequest(200, {
        message: 'teste - GET'
    });
})

app.createRoute(methods.POST, '/teste', (req) => {
    const response = {
        changed: req.a,
        b: req.b
    }
    app.finishRequest(201, response);
})

app.createRoute(methods.GET, 'promise', async () => {
    const response = {
        message: 'promise route',
    }

    const promise = new Promise((resolve) => {
        setTimeout(resolve, 1000);
    });

    await promise;

    app.finishRequest(200, response);
})
