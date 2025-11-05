import { Route } from '@interfaces/api/routes';
import Router from 'koa-router';
import { HotspotsStakesController } from '../controllers/hotspots-stakes.controller';

const router = new Router();

const routes: Route[] = [
    {
        method: 'get',
        path: '/by-wallet/:walletAddress',
        handler: HotspotsStakesController.stakesByWallet
    }
]

// Register all routes automatically
routes.forEach(route => {
    router[route.method](route.path, route.handler);
});
export default router;