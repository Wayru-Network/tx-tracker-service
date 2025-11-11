/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { formatTokenAmount } from "@utils/token-format";
import { RewardSystemEventListener } from "./reward-system-event-listener.service";
import { claimRewards } from "@api/hotspots-stakes/services/hotspots-stakes.queries";

/**
 * Initialize the Reward System event listener
 */
export const rewardSystemListener = async (): Promise<void> => {
    try {
        const eventListener = await RewardSystemEventListener.getInstance();

        // Register event handler for ownerClaimRewards
        // eslint-disable-next-line @typescript-eslint/require-await
        eventListener.onOwnerClaimRewards(async (event) => {
            /* console.log('💰 OwnerClaimRewards event detected:', {
                signature: event.signature,
                userWalletAddress: event.user?.toString(),
                userAdminWalletAddress: event.userAdmin?.toString(),
                nftMintAddress: event.nftMintAddress?.toString(),
                tokenMint: event.tokenMint?.toString(),
                rewardAmount: event.rewardAmount ? formatTokenAmount(event.rewardAmount) : 'N/A',
                rewardAmountRaw: event.rewardAmount?.toString(),
                slot: event.slot,
                memo: event.memo,
                memoData: event.memoData,
            }); */

            if (!event.rewardAmount) {
                return;
            }
            await claimRewards({
                walletAddress: event.user?.toString() ?? '',
                amount: formatTokenAmount(event.rewardAmount),
                nftMintAddress: event.nftMintAddress?.toString() ?? '',
                txHash: event.signature?.toString() ?? '',
            });
        });

        // Optional: Listen to all events
        eventListener.onAllEvents((event) => {
            console.log(`📡 Reward System event: ${event.instructionName} at slot ${event.slot}`);
        });

        // Start listening
        eventListener.startListening();

        console.log('✅ Reward System event listener initialized');
    } catch (error) {
        console.error('❌ Failed to initialize Reward System event listener:', error);
        throw error;
    }
}

