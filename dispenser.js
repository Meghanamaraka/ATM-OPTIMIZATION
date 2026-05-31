/**
 * ATM Cash Dispenser Algorithms
 * 
 * This module contains different algorithms for dispensing cash:
 * 1. Greedy Algorithm - Fast, optimal for canonical coin systems
 * 2. Dynamic Programming - Guarantees minimum notes, slower
 * 
 * Indian Rupee denominations: ₹2000, ₹500, ₹200, ₹100, ₹50, ₹20, ₹10
 */

// Available denominations in descending order (required for greedy)
const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10];

/**
 * GREEDY ALGORITHM
 * 
 * How it works:
 * 1. Start with the largest denomination
 * 2. Use as many notes of that denomination as possible
 * 3. Move to the next smaller denomination
 * 4. Repeat until amount becomes zero
 * 
 * Why it works for Indian currency:
 * Indian Rupee denominations form a "canonical" coin system where
 * the greedy approach always yields the optimal solution.
 * 
 * Time Complexity: O(n) where n = number of denominations
 * Space Complexity: O(n) for storing the result
 * 
 * @param {number} amount - Amount to withdraw
 * @param {Object} availability - Available notes in ATM
 * @returns {Object} Result containing notes breakdown or error
 */
function greedyDispense(amount, availability) {
    // Validate input
    if (amount <= 0) {
        return { success: false, error: "Amount must be positive" };
    }
    
    if (amount % 10 !== 0) {
        return { 
            success: false, 
            error: "Amount must be a multiple of ₹10 (smallest denomination)" 
        };
    }

    const result = {};           // Stores notes to dispense
    let remaining = amount;      // Track remaining amount
    let totalNotes = 0;          // Count total notes used
    const steps = [];            // Record algorithm steps for visualization

    // Process each denomination from largest to smallest
    for (const denom of DENOMINATIONS) {
        if (remaining <= 0) break;  // Stop if amount is fulfilled
        
        if (remaining >= denom && availability[denom] > 0) {
            // Calculate how many notes we need vs how many are available
            const notesNeeded = Math.floor(remaining / denom);
            const notesAvailable = availability[denom];
            const notesToUse = Math.min(notesNeeded, notesAvailable);
            
            if (notesToUse > 0) {
                result[denom] = notesToUse;
                remaining -= denom * notesToUse;
                totalNotes += notesToUse;
                
                // Record step for educational purposes
                steps.push({
                    denomination: denom,
                    notesUsed: notesToUse,
                    amountCovered: denom * notesToUse,
                    remainingAfter: remaining
                });
            }
        }
    }

    // Check if we could dispense the exact amount
    if (remaining > 0) {
        return {
            success: false,
            error: `Cannot dispense exact amount. ₹${remaining} remaining.`,
            partial: result,
            suggestion: findNearestPossible(amount, availability)
        };
    }

    return {
        success: true,
        notes: result,
        totalNotes: totalNotes,
        amount: amount,
        steps: steps,
        algorithm: "Greedy"
    };
}

/**
 * DYNAMIC PROGRAMMING APPROACH
 * 
 * How it works:
 * 1. Build a table where dp[i] = minimum notes needed for amount i
 * 2. For each amount from 1 to target, try all denominations
 * 3. Take the minimum across all choices
 * 4. Backtrack to find which notes were used
 * 
 * Why use DP?
 * - Guarantees optimal solution for ANY coin system
 * - Useful for comparison and verification
 * - Educational: shows alternative approach
 * 
 * Time Complexity: O(amount × n) where n = number of denominations
 * Space Complexity: O(amount) for the DP table
 * 
 * @param {number} amount - Amount to withdraw
 * @param {Object} availability - Available notes in ATM
 * @returns {Object} Result containing notes breakdown or error
 */
function dpDispense(amount, availability) {
    if (amount <= 0) {
        return { success: false, error: "Amount must be positive" };
    }
    
    if (amount % 10 !== 0) {
        return { 
            success: false, 
            error: "Amount must be a multiple of ₹10" 
        };
    }

    // Create a copy of availability to track usage
    const availableCopy = { ...availability };
    
    // dp[i] = minimum notes needed to make amount i
    // Initialize with Infinity (impossible state)
    const dp = new Array(amount + 1).fill(Infinity);
    dp[0] = 0;  // Base case: 0 notes needed for amount 0
    
    // parent[i] = which denomination was used to reach amount i
    const parent = new Array(amount + 1).fill(-1);
    
    // noteUsed[i][denom] = how many of each denom used to reach amount i
    const noteUsed = Array.from({ length: amount + 1 }, () => ({}));
    DENOMINATIONS.forEach(d => noteUsed[0][d] = 0);

    // Fill the DP table
    for (let i = 1; i <= amount; i++) {
        for (const denom of DENOMINATIONS) {
            if (denom <= i && dp[i - denom] !== Infinity) {
                // Check if we have this denomination available
                const usedSoFar = noteUsed[i - denom][denom] || 0;
                if (usedSoFar < availableCopy[denom]) {
                    // Using this denomination gives us fewer notes
                    if (dp[i - denom] + 1 < dp[i]) {
                        dp[i] = dp[i - denom] + 1;
                        parent[i] = denom;
                        // Copy previous usage and add one more of this denom
                        noteUsed[i] = { ...noteUsed[i - denom] };
                        noteUsed[i][denom] = (noteUsed[i][denom] || 0) + 1;
                    }
                }
            }
        }
    }

    // Check if solution exists
    if (dp[amount] === Infinity) {
        return {
            success: false,
            error: "Cannot dispense this amount with available notes",
            suggestion: findNearestPossible(amount, availability)
        };
    }

    // Backtrack to find the notes used
    const result = {};
    let totalNotes = 0;
    
    for (const denom of DENOMINATIONS) {
        if (noteUsed[amount][denom] > 0) {
            result[denom] = noteUsed[amount][denom];
            totalNotes += noteUsed[amount][denom];
        }
    }

    return {
        success: true,
        notes: result,
        totalNotes: totalNotes,
        amount: amount,
        algorithm: "Dynamic Programming",
        dpTableSize: amount + 1
    };
}

/**
 * Find nearest amounts that CAN be dispensed
 * Searches both above and below the requested amount
 * 
 * @param {number} targetAmount - Requested amount
 * @param {Object} availability - Available notes
 * @returns {Object} Lower and upper nearest possible amounts
 */
function findNearestPossible(targetAmount, availability) {
    let lower = null;
    let upper = null;
    
    // Search for lower nearest (decrement by 10)
    for (let amt = targetAmount - 10; amt >= 10; amt -= 10) {
        const result = greedyDispenseCheck(amt, availability);
        if (result.success) {
            lower = amt;
            break;
        }
    }
    
    // Search for upper nearest (increment by 10)
    // Calculate maximum possible amount from ATM
    const maxPossible = DENOMINATIONS.reduce(
        (sum, denom) => sum + (denom * availability[denom]), 0
    );
    
    for (let amt = targetAmount + 10; amt <= maxPossible; amt += 10) {
        const result = greedyDispenseCheck(amt, availability);
        if (result.success) {
            upper = amt;
            break;
        }
    }
    
    return { lower, upper };
}

/**
 * Quick check if an amount can be dispensed (without modifying state)
 */
function greedyDispenseCheck(amount, availability) {
    let remaining = amount;
    
    for (const denom of DENOMINATIONS) {
        if (remaining <= 0) break;
        if (remaining >= denom && availability[denom] > 0) {
            const notesToUse = Math.min(
                Math.floor(remaining / denom),
                availability[denom]
            );
            remaining -= denom * notesToUse;
        }
    }
    
    return { success: remaining === 0 };
}

/**
 * Compare Greedy vs DP approaches
 * Useful for demonstrating algorithm differences
 */
function compareAlgorithms(amount, availability) {
    const startGreedy = Date.now();
    const greedyResult = greedyDispense(amount, { ...availability });
    const greedyTime = Date.now() - startGreedy;
    
    const startDP = Date.now();
    const dpResult = dpDispense(amount, { ...availability });
    const dpTime = Date.now() - startDP;
    
    return {
        greedy: {
            ...greedyResult,
            executionTime: `${greedyTime}ms`
        },
        dp: {
            ...dpResult,
            executionTime: `${dpTime}ms`
        },
        comparison: {
            sameResult: JSON.stringify(greedyResult.notes) === JSON.stringify(dpResult.notes),
            greedyFaster: greedyTime <= dpTime,
            note: "For Indian Rupee (canonical system), Greedy is optimal and faster"
        }
    };
}

module.exports = {
    DENOMINATIONS,
    greedyDispense,
    dpDispense,
    compareAlgorithms,
    findNearestPossible
};
