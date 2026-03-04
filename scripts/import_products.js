/**
 * Script de Importación de Productos para Bote-App
 * 
 * Uso:
 * 1. Descarga tu archivo de credenciales de Firebase (JSON de cuenta de servicio).
 * 2. Renómbralo a 'serviceAccount.json' y ponlo en la carpeta 'scripts/'.
 * 3. Crea un archivo 'productos.json' con tus datos.
 * 4. Ejecuta: node scripts/import_products.js
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccount.json');
const DATA_PATH = path.join(__dirname, 'productos.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error('❌ Error: No se encuentra el archivo scripts/serviceAccount.json');
    console.log('Ve a Firebase Console > Project Settings > Service Accounts y genera una nueva clave privada.');
    process.exit(1);
}

if (!fs.existsSync(DATA_PATH)) {
    console.error('❌ Error: No se encuentra el archivo scripts/productos.json');
    process.exit(1);
}

// Inicializar Admin SDK
const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function importProducts() {
    try {
        const products = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
        console.log(`🚀 Iniciando importación de ${products.length} productos...`);

        const batch = db.batch();
        const collectionRef = db.collection('products');

        products.forEach((product, index) => {
            // Asegurar campos por defecto si no existen
            const cleanProduct = {
                name: product.name || 'Sin nombre',
                order: product.order || (index + 1),
                disabled: product.disabled || false,

                // Nuevos campos de precios
                precioLitro: product.precioLitro || null,
                precioBase: product.precioBase || null,

                // Booleanos de categoría
                esCubata: !!product.esCubata,
                esChupito: !!product.esChupito,
                esCopa: !!product.esCopa,
                esVino: !!product.esVino,
                esCerveza: !!product.esCerveza,
                esOtros: !!product.esOtros,

                // Booleanos de servicio
                usaMezcla: !!product.usaMezcla
            };

            // SOLO actualizar imageUrl si viene explícitamente en el JSON
            // Esto evita borrar imágenes añadidas manualmente en Firebase
            if (product.imageUrl) {
                cleanProduct.imageUrl = product.imageUrl;
            }

            const docId = product.id;
            const docRef = docId ? collectionRef.doc(String(docId)) : collectionRef.doc(); // Use manual ID or generate one
            batch.set(docRef, cleanProduct, { merge: true });
            console.log(`✅ Preparado [${docId || 'AUTO_ID'}]: ${cleanProduct.name}`);
        });

        await batch.commit();
        console.log('\n✨ ¡Importación completada con éxito!');
        process.exit(0);
    } catch (error) {
        console.error('💥 Error durante la importación:', error);
        process.exit(1);
    }
}

importProducts();
