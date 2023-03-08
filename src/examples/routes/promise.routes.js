import { HttpStatusCode } from "../../constants/HttpStatusCode.constants.js";

export function promiseRoutesTest(app)  {
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
    return app;
}