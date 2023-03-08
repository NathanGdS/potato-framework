import { HttpStatusCode } from "../../constants/HttpStatusCode.constants.js";

async function promiseMiddleware() {
    const promise = new Promise((resolve) => {
        setTimeout(resolve, 1000);
    });

    await promise;
    console.log('promise middleware')
    return
}

function validateParamMiddleware({
    params
}) {
    if(params.groupId != Number(1)) {
        throw new Error('GroupId is not 1')
    }
}

function transformMiddleware({
    params
}) {
    params.testeId = String('transformed')
}

function apiKeyMiddleare({headers}) {
    console.log(headers['x-api-key'])
    if (headers['x-api-key'] != 'api-key-token') {
        throw new Error('Forbidden')
    }
}

export function testPlugin(app) {
    app.get('/teste',promiseMiddleware, apiKeyMiddleare, ({headers, queries, params}) => {
        app.finishRequest(HttpStatusCode.SUCCESS, {
            message: 'teste - GET',
            headers,
            queries,
            params
        });
    });
    
    app.get('/teste/:testeId/group/:groupId', validateParamMiddleware, transformMiddleware, ({params}) => {
        app.finishRequest(HttpStatusCode.SUCCESS, {
            message: 'teste - GET - id',
            params
        });
    });
    
    app.post('/teste', apiKeyMiddleare, ({body}) => {
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

    return app;
}