import { Token2022TransferListener } from "./token-2022-transfer-listener.service";

/**
 * Initialize the Token 2022 transfer listener
 */
export const token2022Listener = async (): Promise<void> => {
    try {
        const transferListener = await Token2022TransferListener.getInstance();

        // Register event handler for transfers
        transferListener.onTransfer((event) => {
            console.log('🔄 Token 2022 transfer event:', {
                signature: event.signature,
                mint: event.mint,
                from: event.from,
                to: event.to,
                slot: event.slot,
            });
            // Additional processing can be added here if needed
        });

        // Start listening
        transferListener.startListening();

        console.log('✅ Token 2022 transfer listener initialized');
    } catch (error) {
        console.error('❌ Failed to initialize Token 2022 transfer listener:', error);
        throw error;
    }
};

