

/**
 * Shutdown all services
 */
export const shutdown = async () => {
    try {
        console.log('Shutting down services...');
        // Add other services to close here
        console.log('Services shut down successfully');
    } catch (error) {
        console.error('Error during shutdown:', error);
        throw error;
    }
}