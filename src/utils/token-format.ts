import * as anchor from "@coral-xyz/anchor";

/**
 * Token decimals constant - all tokens use 6 decimals
 */
export const TOKEN_DECIMALS = 6;

/**
 * Format token amount from raw value (with decimals) to human-readable format
 * @param amount - Raw token amount as BN or string
 * @param decimals - Number of decimals (default: 6)
 * @param includeCommas - Whether to include thousands separators (default: true)
 * @returns Formatted amount as string
 * 
 * @example
 * formatTokenAmount(new anchor.BN(25000000000)) // "25,000"
 * formatTokenAmount("25000000000") // "25,000"
 * formatTokenAmount("25000000000", 6, false) // "25000"
 */
export function formatTokenAmount(
    amount: anchor.BN | string | number | undefined | null,
    decimals: number = TOKEN_DECIMALS,
    includeCommas: boolean = true
): string {
    if (amount === null || amount === undefined) {
        return "0";
    }

    // Convert to BN if it's a string or number
    let amountBN: anchor.BN;
    if (typeof amount === "string") {
        amountBN = new anchor.BN(amount);
    } else if (typeof amount === "number") {
        amountBN = new anchor.BN(amount);
    } else {
        amountBN = amount;
    }

    // Convert to string with proper decimal places
    const divisor = new anchor.BN(10).pow(new anchor.BN(decimals));
    const quotient = amountBN.div(divisor);
    const remainder = amountBN.mod(divisor);

    // Format the integer part
    let formatted = quotient.toString();

    // Add decimal part if there's a remainder
    if (!remainder.isZero()) {
        const decimalPart = remainder.toString().padStart(decimals, "0");
        // Remove trailing zeros
        const trimmedDecimal = decimalPart.replace(/0+$/, "");
        if (trimmedDecimal) {
            formatted += "." + trimmedDecimal;
        }
    }

    // Add thousands separators if requested
    if (includeCommas) {
        const parts = formatted.split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        formatted = parts.join(".");
    }

    return formatted;
}

/**
 * Parse human-readable token amount to raw value (with decimals)
 * @param amount - Human-readable amount as string (e.g., "25,000" or "25000")
 * @param decimals - Number of decimals (default: 6)
 * @returns Raw amount as BN
 * 
 * @example
 * parseTokenAmount("25,000") // BN(25000000000)
 * parseTokenAmount("25.5") // BN(25500000)
 */
export function parseTokenAmount(
    amount: string,
    decimals: number = TOKEN_DECIMALS
): anchor.BN {
    // Remove commas and parse
    const cleaned = amount.replace(/,/g, "");
    const parts = cleaned.split(".");

    const integerPart = parts[0] || "0";
    const decimalPart = parts[1] || "";

    // Pad or truncate decimal part to match decimals
    const paddedDecimal = decimalPart.padEnd(decimals, "0").slice(0, decimals);

    // Combine integer and decimal parts
    const rawValue = integerPart + paddedDecimal;

    return new anchor.BN(rawValue);
}

