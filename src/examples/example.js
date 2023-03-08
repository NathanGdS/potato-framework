import { SweetPotatoApp } from "../index.js";
import { promiseRoutesTest } from "./routes/promise.routes.js";
import { testPlugin } from "./routes/test.routes.js";

async function bootstrap() {
    const app = new SweetPotatoApp();
    
    app.registerGlobalPrefix('api/v1');
    
    const testRoutes = testPlugin(app).getRoutes();
    const promiseRoutes = promiseRoutesTest(app).getRoutes();
    app.registerRoutes([...testRoutes, ...promiseRoutes]);

    app.listen(3000);
}

bootstrap();