import { SweetPotatoApp } from "../index.js";
import { promiseRoutesTest } from "./routes/promise.routes.js";
import { testPlugin } from "./routes/test.routes.js";

async function bootstrap() {
    const app = new SweetPotatoApp();
    
    app.registerGlobalPrefix('api/v1');
    
    testPlugin(app);
    promiseRoutesTest(app);

    app.listen(3000);
}

bootstrap();