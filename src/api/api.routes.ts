import Router from "koa-router";
import { ROUTES } from "@constants/router";
import { authValidator } from "@middlewares/auth-validator";

const mainRouter = new Router({
    prefix: ROUTES.API, // Define the base prefix /api here
});

// Public routes (no authentication required)


// Group protected routes
const protectedRoutes = new Router({
    prefix: ROUTES.API,
});

// Configure routes in mainRouter
mainRouter.use(authValidator);  // Apply authentication middleware first
mainRouter.use(protectedRoutes.routes());  // Then add protected routes

export default mainRouter;