
/**
 * Logic Stress Test for Colla La Trampa
 * This script isolates the balance calculation logic and runs simulations
 * to verify correctness under various scenarios.
 */

// --- CORE LOGIC (Extracted from AppContext.jsx) ---

function getMemberBalance(memberId, transactions) {
    let balance = 0;
    const targetId = Number(memberId);
    transactions.forEach(t => {
        const amount = Number(t.amount) || 0;
        if (Number(t.memberId) === targetId) {
            if (t.type === 'CONSUMPTION') balance -= amount;
            if (t.type === 'PAYMENT' && t.verified === true) balance += amount;
            if (t.type === 'ADVANCE' && t.verified === true) balance += amount;
            // PURCHASE_BOTE ignored
        }
    });
    return balance;
}

function getPotBalance(transactions) {
    let pot = 0;
    transactions.forEach(t => {
        const amount = Number(t.amount) || 0;
        if ((t.type === 'PAYMENT' || t.type === 'ADVANCE') && t.verified === true) {
            pot += amount;
        }
        if (t.type === 'PURCHASE_BOTE') pot -= amount;
    });
    return pot;
}

function getSystemPendingBalance(transactions) {
    let total = 0;
    transactions.forEach(t => {
        if (t.verified === false && (t.type === 'PAYMENT' || t.type === 'ADVANCE')) {
            total += (Number(t.amount) || 0);
        }
    });
    return total;
}

// --- TEST UTILS ---

function assert(condition, message) {
    if (!condition) {
        throw new Error(`[FAILED] ${message}`);
    }
    console.log(`[PASSED] ${message}`);
}

// --- TEST SCENARIOS ---

function runTests() {
    console.log("Starting Logic Stress Test...\n");

    // Scenario 1: Basic movements
    let txs = [
        { type: 'CONSUMPTION', amount: 10, memberId: 1, verified: true },
        { type: 'PAYMENT', amount: 5, memberId: 1, verified: true },
        { type: 'ADVANCE', amount: 15, memberId: 1, verified: true },
        { type: 'PURCHASE_BOTE', amount: 8, memberId: 2, verified: true },
        { type: 'PAYMENT', amount: 50, memberId: 2, verified: false }, // Unverified
    ];

    assert(getMemberBalance(1, txs) === 10, "Member 1 balance should be 10 (-10 + 5 + 15)");
    assert(getMemberBalance(2, txs) === 0, "Member 2 balance should be 0 (Purchase doesn't affect member, Payment is unverified)");
    assert(getPotBalance(txs) === 12, "Pot balance should be 12 (5 [P1] + 15 [A1] - 8 [PB2])");
    assert(getSystemPendingBalance(txs) === 50, "Pending balance should be 50");

    // Scenario 2: Mass Random Test (1000 transactions)
    console.log("\nRunning mass simulation (1000 transactions)...");
    let massTxs = [];
    let expectedMember1 = 0;
    let expectedPot = 0;
    let expectedPending = 0;

    for (let i = 0; i < 1000; i++) {
        const typeRand = Math.random();
        const amount = Math.floor(Math.random() * 100) + 1;
        const verified = Math.random() > 0.3;

        if (typeRand < 0.25) { // CONSUMPTION
            massTxs.push({ type: 'CONSUMPTION', amount, memberId: 1, verified: true });
            expectedMember1 -= amount;
        } else if (typeRand < 0.5) { // PAYMENT
            massTxs.push({ type: 'PAYMENT', amount, memberId: 1, verified });
            if (verified) {
                expectedMember1 += amount;
                expectedPot += amount;
            } else {
                expectedPending += amount;
            }
        } else if (typeRand < 0.75) { // ADVANCE
            massTxs.push({ type: 'ADVANCE', amount, memberId: 1, verified });
            if (verified) {
                expectedMember1 += amount;
                expectedPot += amount;
            } else {
                expectedPending += amount;
            }
        } else { // PURCHASE_BOTE
            massTxs.push({ type: 'PURCHASE_BOTE', amount, memberId: 2, verified: true });
            expectedPot -= amount;
        }
    }

    assert(Math.abs(getMemberBalance(1, massTxs) - expectedMember1) < 0.001, "Mass test: Member balance accuracy");
    assert(Math.abs(getPotBalance(massTxs) - expectedPot) < 0.001, "Mass test: Pot balance accuracy");
    assert(Math.abs(getSystemPendingBalance(massTxs) - expectedPending) < 0.001, "Mass test: Pending balance accuracy");

    console.log("\nAll tests completed successfully! 🚀");
}

runTests();
