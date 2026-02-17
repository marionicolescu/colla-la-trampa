import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Generates a unique 4-character alphanumeric string (uppercase)
 * Verifies uniqueness against existing transaction IDs in Firestore
 * @param {Object} db - Firestore database instance
 * @returns {Promise<string>} - Unique 4-character string
 */
async function generateUniqueRand4(db) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let rand4, exists;

    do {
        // Generate random 4-character string
        rand4 = Array.from({ length: 4 }, () =>
            chars[Math.floor(Math.random() * chars.length)]
        ).join('');

        // Check if this RAND4 already exists in any transaction ID
        const snapshot = await getDocs(
            query(
                collection(db, "transactions"),
                where("transactionId", ">=", `-${rand4}`),
                where("transactionId", "<=", `-${rand4}\uf8ff`)
            )
        );
        exists = !snapshot.empty;
    } while (exists);

    return rand4;
}

/**
 * Generates a complete transaction ID with format: [Type][Alias][DDMMYY]-[RAND4]
 * @param {Object} params - Parameters for ID generation
 * @param {string} params.type - Transaction type: 'CONSUMPTION', 'PAYMENT', 'ADVANCE', 'PURCHASE_BOTE'
 * @param {string} params.memberAlias - 2-letter member alias (use 'BO' for bote)
 * @param {Date} params.date - Transaction date
 * @param {Object} params.db - Firestore database instance
 * @returns {Promise<string>} - Complete transaction ID (e.g., 'PMA170226-H89K')
 */
export async function generateTransactionId({ type, memberAlias, date, db }) {
    // Map transaction type to letter code
    const typeMap = {
        'CONSUMPTION': 'C',
        'PAYMENT': 'P',
        'ADVANCE': 'A',
        'PURCHASE_BOTE': 'B'
    };

    const typeLetter = typeMap[type] || 'X';

    // Format date as DDMMYY
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const dateStr = `${day}${month}${year}`;

    // Generate unique RAND4
    const rand4 = await generateUniqueRand4(db);

    // Combine all parts
    return `${typeLetter}${memberAlias}${dateStr}-${rand4}`;
}
