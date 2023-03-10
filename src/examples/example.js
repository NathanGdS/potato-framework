import { SweetPotatoApp } from "../index.js";
import { asyncTestRoutes } from "./routes/async-test.routes.js";
import { syncTestRoutes } from "./routes/sync-test.routes.js";

async function bootstrap() {
    const app = SweetPotatoApp();
    
    app.registerGlobalPrefix('api/v1');
    
    syncTestRoutes(app);
    asyncTestRoutes(app);

    app.listen(3000);
}

bootstrap();