import { DepinProgramEventListener } from "@services/web3/events/depin-program-event-listener.service";

/**
 * Shutdown all services
 */
export const shutdown = async () => {
    try {
        console.log('🛑 Shutting down services...');

        // Cleanup Depin Program event listener
        try {
            const eventListener = await DepinProgramEventListener.getInstance();
            eventListener.cleanup();
        } catch (error) {
            console.warn('⚠️ Error cleaning up event listener:', error);
        }

        console.log('✅ Services shut down successfully');
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        throw error;
    }
};