import { depinProgramListener } from "@services/web3/events/depin-program-listener.service";


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
 */
export const bootstrap = async (): Promise<void> => {
    try {
        console.log('🚀 starting bootstrap');


        // Initialize Depin Program event listener
        await depinProgramListener();

        console.log('✅ Bootstrap completed successfully');
    } catch (error) {
        console.error('❌ Bootstrap failed:', error);
        process.exit(1);
    }
};

