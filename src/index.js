import PotatoApp from "./Potato.js";
import { CONSTANTS } from "./constants/index.js";

const app = new PotatoApp();

app.get('/teste', () => {
    app.finishRequest(CONSTANTS.codes.SUCCESS, {
        message: 'teste - GET'
    });
});

app.post('/teste', (req) => {
    const response = {
        changed: req.a,
        b: req.b
    }
    app.finishRequest(CONSTANTS.codes.CREATED, response);
});

app.put('/teste', () => {
    app.finishRequest(CONSTANTS.codes.SUCCESS, {
        message: 'teste - PUT'
    });
});

app.patch('/teste', () => {
    app.finishRequest(CONSTANTS.codes.SUCCESS, {
        message: 'teste - PATCH'
    });
});

app.delete('/teste', () => {
    app.finishRequest(CONSTANTS.codes.SUCCESS, {
        message: 'teste - DELETE'
    });
});

app.get('promise', async () => {
    const response = {
        message: 'promise route',
    };

    const promise = new Promise((resolve) => {
        setTimeout(resolve, 1000);
    });

    await promise;

    app.finishRequest(CONSTANTS.codes.SUCCESS, response);
});
