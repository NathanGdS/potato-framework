import { HttpStatusCode } from "../constants/HttpStatusCode.constants.js";
import { SweetPotatoApp } from "../index.js";
import { registerRoutes } from "./routes/index.js";

async function bootstrap() {
    const app = SweetPotatoApp(); //loading app instance

    app.registerGlobalPrefix('api/v1'); //registering global prefix
    
    registerRoutes(app); //loading routes from other files

    app.get('example', async ({headers, queries, params}) => {
        // you can get the headers, body, query params and route params from request
        app.finishRequest(HttpStatusCode.SUCCESS,{ //default code=200
            received: {
                headers,
                queries,
                params
            }
        })
    });
    app.listen(3000);
}

bootstrap();