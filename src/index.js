import PotatoApp from "./Potato.js";
import { CONSTANTS } from "./constants/index.js";
import { HttpStatusCode } from "./constants/HttpStatusCoded.constants.js";

const app = new PotatoApp();

app.get('/teste', () => {
    app.finishRequest(HttpStatusCode.SUCCESS, {
        message: 'teste - GET'
    });
});

app.post('/teste', (req) => {
    const response = {
        changed: req.a,
        b: req.b
    }
    app.finishRequest(HttpStatusCode.CREATED, response);
});

app.put('/teste', () => {
    app.finishRequest(HttpStatusCode.SUCCESS, {
        message: 'teste - PUT'
    });
});

app.patch('/teste', () => {
    app.finishRequest(HttpStatusCode.SUCCESS, {
        message: 'teste - PATCH'
    });
});

app.delete('/teste', () => {
    app.finishRequest(HttpStatusCode.SUCCESS, {
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

    app.finishRequest(HttpStatusCode.SUCCESS, response);
});
