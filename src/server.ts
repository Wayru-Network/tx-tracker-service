import Koa from "koa";
import bodyParser from "koa-bodyparser";
import logger from "koa-logger";
import { errorHandler } from "./middlewares/auth-validator";
import { dbErrorHandler } from "@middlewares/db-error-handler";
import { ENV } from "@config/env/env";
import { bootstrap } from "./bootstrap/bootstrap";
import { shutdown } from "@bootstrap/shutdown";

// start server app and services
const app = new Koa();

// Middlewares
app.use(logger());
app.use(bodyParser());
app.use(errorHandler);
app.use(dbErrorHandler);

// Global error handling
app.on('error', async (err, ctx) => {
  console.error('Server Error:', err);
  await shutdown();
  process.exit(1);
});


// Initialize server
const PORT = Number(ENV.PORT);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


// start all the services
bootstrap().catch(async (error) => {
  console.error('Bootstrap failed:', error);
  await shutdown();
  process.exit(1);
});