/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { formatTokenAmount } from "@utils/token-format";
import { DepinProgramEventListener } from "./depin-program-event-listener.service";

/**
 * Initialize the Depin Program event listener
 */
export const initializeDepinProgramEventListener = async (): Promise<void> => {
    try {
        const eventListener = await DepinProgramEventListener.getInstance();

        // Register event handlers
        eventListener.onStake((event) => {
            console.log('📊 Stake event detected:', {
                signature: event.signature,
                userWalletAddress: event.user?.toString(),
                externalNftMint: event.externalNftMint?.toString(),
                stakeNftMint: event.stakeNftMint?.toString(), // This IS the mint address (PDA)
                amount: event.amount ? formatTokenAmount(event.amount) : 'N/A',
                amountRaw: event.amount?.toString(),
                wayruFeeAmount: event.wayruFeeAmount ? formatTokenAmount(event.wayruFeeAmount) : 'N/A',
                wayruFeeAmountRaw: event.wayruFeeAmount?.toString(),
                slot: event.slot,
            });
            // TODO: Add your logic here (e.g., update database, send notifications, etc.)
        });

        eventListener.onUnstake((event) => {
            console.log('📤 Unstake event detected:', {
                signature: event.signature,
                userWalletAddress: event.user?.toString(),
                externalNftMint: event.externalNftMint?.toString(),
                stakeNftMint: event.stakeNftMint?.toString(), // This IS the mint address (PDA)
                amount: event.amount ? formatTokenAmount(event.amount) : 'N/A',
                amountRaw: event.amount?.toString(),
                wayruFeeAmount: event.wayruFeeAmount ? formatTokenAmount(event.wayruFeeAmount) : 'N/A',
                wayruFeeAmountRaw: event.wayruFeeAmount?.toString(),
                slot: event.slot,
            });
            // TODO: Add your logic here
        });

        eventListener.onInitStakeNft((event) => {
            console.log('🎨 InitStakeNft event detected:', {
                signature: event.signature,
                userWalletAddress: event.user?.toString(),
                externalNftMint: event.externalNftMint?.toString(),
                stakeNftMint: event.stakeNftMint?.toString(), // This IS the mint address (PDA)
                amount: event.amount ? formatTokenAmount(event.amount) : 'N/A',
                amountRaw: event.amount?.toString(),
                wayruFeeAmount: event.wayruFeeAmount ? formatTokenAmount(event.wayruFeeAmount) : 'N/A',
                wayruFeeAmountRaw: event.wayruFeeAmount?.toString(),
                slot: event.slot,
            });
            // TODO: Add your logic here
        });

        eventListener.onInitializeNfnode((event) => {
            console.log('🌐 InitializeNfnode event detected:', {
                signature: event.signature,
                user: event.user?.toString(),
                externalNftMint: event.externalNftMint?.toString(),
                slot: event.slot,
            });
            // TODO: Add your logic here
        });

        // Optional: Listen to all events
        eventListener.onAllEvents((event) => {
            console.log(`📡 Program event: ${event.instructionName} at slot ${event.slot}`);
        });

        // Start listening
        await eventListener.startListening();

        console.log('✅ Depin Program event listener initialized');
    } catch (error) {
        console.error('❌ Failed to initialize Depin Program event listener:', error);
        throw error;
    }
}