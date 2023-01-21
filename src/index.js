import PotatoApp from "./potato.js";
import constants from "./utils/constants.js";

const app = new PotatoApp();

app.createRoute(constants.methods.GET, '/teste', () => {
    app.finishRequest(constants.codes.SUCCESS, {
        message: 'teste - GET'
    });
});

app.createRoute(constants.methods.POST, '/teste', (req) => {
    const response = {
        changed: req.a,
        b: req.b
    }
    app.finishRequest(constants.codes.CREATED, response);
});

app.createRoute(constants.methods.GET, 'promise', async () => {
    const response = {
        message: 'promise route',
    };

    const promise = new Promise((resolve) => {
        setTimeout(resolve, 1000);
    });

    await promise;

    app.finishRequest(constants.codes.SUCCESS, response);
});
