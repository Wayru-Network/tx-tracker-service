/**
 * Instruction discriminators for Reward System Program
 * These are the first 8 bytes that identify each instruction type
 */
export const REWARD_SYSTEM_INSTRUCTION_DISCRIMINATORS = {
    ownerClaimRewards: [11, 92, 226, 213, 71, 223, 171, 241] as const,
} as const;

/**
 * Type for instruction names
 */
export type RewardSystemInstructionName = keyof typeof REWARD_SYSTEM_INSTRUCTION_DISCRIMINATORS;

/**
 * Helper function to compare instruction discriminators
 */
export function matchesRewardSystemDiscriminator(data: number[], discriminator: readonly number[]): boolean {
    if (data.length < discriminator.length) return false;
    return discriminator.every((byte, index) => data[index] === byte);
}

/**
 * Get instruction name from discriminator
 */
export function getRewardSystemInstructionName(discriminator: number[]): RewardSystemInstructionName | null {
    for (const [name, disc] of Object.entries(REWARD_SYSTEM_INSTRUCTION_DISCRIMINATORS)) {
        if (matchesRewardSystemDiscriminator(discriminator, disc as readonly number[])) {
            return name as RewardSystemInstructionName;
        }
    }
    return null;
}

