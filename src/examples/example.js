import { HttpStatusCode } from "../constants/HttpStatusCode.constants.js";
import { SweetPotatoApp } from "../index.js";
import { testPlugin } from "./routes/test.routes.js";

async function bootstrap() {
    const app = new SweetPotatoApp();
    const test = testPlugin(app).getRoutes();
    app.registerRoutes(test);
    
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
    
    app.listen(3000);
}

bootstrap();