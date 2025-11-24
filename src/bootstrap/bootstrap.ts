import { depinProgramListener } from "@services/web3/events/depin-program/depin-program-listener.service";
import { rewardSystemListener } from "@services/web3/events/reward-system/reward-system-listener.service";
//import { token2022Listener } from "@services/web3/events/token-2022-listener.service";
import { ensureIndices } from "@database/ensure-indices";
import { HeartbeatService } from "@services/heartbeat/heartbeat.service";


/** 
 * Bootstrap the server
 * - Initialize the database indices
 * - Initialize the Depin Program event listener
 * - Initialize the Reward System event listener
 * - Initialize the Token 2022 transfer listener
 * - Start the heartbeat service
 */
export const bootstrap = async (): Promise<void> => {
    try {
        console.log('🚀 starting bootstrap');

        // Ensure database indices exist (performance optimization)
        await ensureIndices();

        // Initialize Depin Program event listener
        await depinProgramListener();

        // Initialize Reward System event listener
        await rewardSystemListener();

        // Initialize Token 2022 transfer listener
        // await token2022Listener();

        // Start heartbeat service (updates every 15 seconds)
        const heartbeatService = HeartbeatService.getInstance();
        heartbeatService.start();

        console.log('✅ Bootstrap completed successfully');
    } catch (error) {
        console.error('❌ Bootstrap failed:', error);
        process.exit(1);
    }
};

