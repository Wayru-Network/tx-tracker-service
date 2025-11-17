import { HealthCheckService } from '@services/health/health-check.service';
import { updateHeartbeat } from './heartbeat.queries';

/**
 * Heartbeat service
 * Updates the heartbeat in the database every 15 seconds
 */
export class HeartbeatService {
    private static instance: HeartbeatService | null = null;
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;
    private readonly INTERVAL_MS = 15000; // 15 seconds

    private constructor() {
        // Private constructor for singleton pattern
    }

    /**
     * Get singleton instance
     */
    static getInstance(): HeartbeatService {
        HeartbeatService.instance ??= new HeartbeatService();
        return HeartbeatService.instance;
    }

    /**
     * Start the heartbeat service
     * Performs health check and updates heartbeat every 15 seconds
     */
    start(): void {
        if (this.isRunning) {
            console.warn('⚠️ Heartbeat service is already running');
            return;
        }

        console.log('💓 Starting heartbeat service (updates every 15s)...');

        // Perform initial heartbeat immediately
        void this.performHeartbeat();

        // Set up interval for periodic heartbeats
        this.intervalId = setInterval(() => {
            void this.performHeartbeat();
        }, this.INTERVAL_MS);

        this.isRunning = true;
        console.log('✅ Heartbeat service started');
    }

    /**
     * Stop the heartbeat service
     */
    stop(): void {
        if (!this.isRunning) {
            return;
        }

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.isRunning = false;
        console.log('🛑 Heartbeat service stopped');
    }

    /**
     * Perform a single heartbeat update
     * Performs health check and updates the database
     */
    private async performHeartbeat(): Promise<void> {
        try {
            // Perform health check
            const healthStatus = await HealthCheckService.performHealthCheck();

            // Update heartbeat in database
            await updateHeartbeat(healthStatus);

            // Log only if status is degraded (to avoid spam)
            if (healthStatus.status === 'degraded') {
                console.warn('⚠️ Heartbeat updated with degraded status:', healthStatus);
            }
        } catch (error) {
            // Log error but don't throw - heartbeat failure shouldn't crash the service
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error performing heartbeat:', errorMessage);
        }
    }

    /**
     * Get current running status
     */
    isActive(): boolean {
        return this.isRunning;
    }

    /**
     * Cleanup and reset instance
     */
    cleanup(): void {
        this.stop();
        HeartbeatService.instance = null;
        console.log('🧹 Heartbeat service cleaned up');
    }
}

