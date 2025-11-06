/**
 * Instruction discriminators for Depin Program
 * These are the first 8 bytes that identify each instruction type
 */
export const DEPIN_INSTRUCTION_DISCRIMINATORS = {
    stake: [206, 176, 202, 18, 200, 209, 179, 108] as const,
    unstake: [90, 95, 107, 42, 205, 124, 50, 225] as const,
    initStakeNft: [115, 4, 17, 174, 29, 68, 80, 50] as const,
    initializeNfnode: [51, 110, 148, 151, 182, 151, 64, 104] as const,
    acceptAdminRequest: [81, 254, 219, 141, 109, 117, 12, 67] as const,
    addMintAuthority: [41, 254, 251, 123, 155, 68, 213, 8] as const,
    initializeSystem: [50, 173, 248, 140, 202, 35, 141, 150] as const,
    removeMintAuthority: [33, 207, 52, 111, 106, 97, 9, 63] as const,
    updateAdminRequest: [58, 118, 170, 225, 117, 36, 203, 167] as const,
    updateFeeAmount: [42, 132, 206, 131, 241, 110, 113, 96] as const,
    updateFeeWallet: [236, 164, 201, 6, 176, 37, 80, 17] as const,
} as const;

/**
 * Type for instruction names
 */
export type InstructionName = keyof typeof DEPIN_INSTRUCTION_DISCRIMINATORS;

/**
 * Helper function to compare instruction discriminators
 */
export function matchesDiscriminator(data: number[], discriminator: readonly number[]): boolean {
    if (data.length < discriminator.length) return false;
    return discriminator.every((byte, index) => data[index] === byte);
}

/**
 * Get instruction name from discriminator
 */
export function getInstructionName(discriminator: number[]): InstructionName | null {
    for (const [name, disc] of Object.entries(DEPIN_INSTRUCTION_DISCRIMINATORS)) {
        if (matchesDiscriminator(discriminator, disc as readonly number[])) {
            return name as InstructionName;
        }
    }
    return null;
}

