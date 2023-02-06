import PotatoApp from "./Potato.js";
import { HttpStatusCode } from "./constants/HttpStatusCode.constants.js";

const app = new PotatoApp();

app.get('/teste', () => {
    app.finishRequest(HttpStatusCode.SUCCESS, {
        message: 'teste - GET'
    });
});

app.get('/teste/:testeId/group/:groupId', ({params}) => {
    app.finishRequest(HttpStatusCode.SUCCESS, {
        message: 'teste - GET - id',
        params
    });
});

app.post('/teste', ({body}) => {
    const response = {
        changed: body.a,
        b: body.b
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
