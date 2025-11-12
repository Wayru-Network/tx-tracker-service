import { depinProgramListener } from "@services/web3/events/depin-program/depin-program-listener.service";
import { rewardSystemListener } from "@services/web3/events/reward-system/reward-system-listener.service";


/** 
 * Bootstrap the server
 * - Initialize the database
 * - Initialize the cron jobs
 * - Initialize the web3 client
 * - Initialize the logger
 * - Initialize the error handlerP
 * - Initialize the middleware
 * - Initialize the routes
 * - Initialize the server
 * - Initialize the cron jobs
 * - Initialize the web3 client
 * - Initialize the Depin Program event listener
 * - Initialize the Reward System event listener
 */
export const bootstrap = async (): Promise<void> => {
    try {
        console.log('🚀 starting bootstrap');

        // Initialize Depin Program event listener
        await depinProgramListener();

        // Initialize Reward System event listener
        await rewardSystemListener();

        console.log('✅ Bootstrap completed successfully');
    } catch (error) {
        console.error('❌ Bootstrap failed:', error);
        process.exit(1);
    }
};

