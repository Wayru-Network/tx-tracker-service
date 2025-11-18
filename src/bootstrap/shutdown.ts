import { DepinProgramEventListener } from "@services/web3/events/depin-program/depin-program-event-listener.service";
import { RewardSystemEventListener } from "@services/web3/events/reward-system/reward-system-event-listener.service";
import { HeartbeatService } from "@services/heartbeat/heartbeat.service";

/**
 * Shutdown all services
 */
export const shutdown = async (): Promise<void> => {
    try {
        console.log('🛑 Shutting down services...');

        // Stop heartbeat service
        try {
            const heartbeatService = HeartbeatService.getInstance();
            heartbeatService.cleanup();
        } catch (error) {
            console.warn('⚠️ Error cleaning up heartbeat service:', error);
        }

        // Cleanup Depin Program event listener
        try {
            const eventListener = await DepinProgramEventListener.getInstance();
            const rewardSystemEventListener = await RewardSystemEventListener.getInstance();
            eventListener.cleanup();
            rewardSystemEventListener.cleanup();
        } catch (error) {
            console.warn('⚠️ Error cleaning up event listener:', error);
        }

        console.log('✅ Services shut down successfully');
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        throw error;
    }
};