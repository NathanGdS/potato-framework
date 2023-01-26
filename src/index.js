import PotatoApp from "./potato.js";
import { CONSTANTS } from "./constants/index.js";

const app = new PotatoApp(4001);

app.createRoute(CONSTANTS.methods.GET, '/teste', () => {
    app.finishRequest(constants.codes.SUCCESS, {
        message: 'teste - GET'
    });
});

app.createRoute(CONSTANTS.methods.POST, '/teste', (req) => {
    const response = {
        changed: req.a,
        b: req.b
    }
    app.finishRequest(CONSTANTS.codes.CREATED, response);
});

app.createRoute(CONSTANTS.methods.GET, 'promise', async () => {
    const response = {
        message: 'promise route',
    };

    const promise = new Promise((resolve) => {
        setTimeout(resolve, 1000);
    });

    await promise;

    app.finishRequest(CONSTANTS.codes.SUCCESS, response);
});
