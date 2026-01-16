
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const PUBLIC_DIR = path.resolve('public');
const SOURCE_ICON = path.join(PUBLIC_DIR, 'pwa-192x192.png'); // This is the 1024x1024 one

async function resizeIcons() {
    console.log('Resizing icons...');

    // 192x192
    await sharp(SOURCE_ICON)
        .resize(192, 192)
        .toFile(path.join(PUBLIC_DIR, 'pwa-192x192-new.png'));

    // 512x512
    await sharp(SOURCE_ICON)
        .resize(512, 512)
        .toFile(path.join(PUBLIC_DIR, 'pwa-512x512-new.png'));

    // Move new files to overwrite old ones
    fs.renameSync(path.join(PUBLIC_DIR, 'pwa-192x192-new.png'), path.join(PUBLIC_DIR, 'pwa-192x192.png'));
    fs.renameSync(path.join(PUBLIC_DIR, 'pwa-512x512-new.png'), path.join(PUBLIC_DIR, 'pwa-512x512.png'));

    // Also update masked-icon.png to be 512x512 just in case
    await sharp(SOURCE_ICON)
        .resize(512, 512)
        .toFile(path.join(PUBLIC_DIR, 'masked-icon-new.png'));
    fs.renameSync(path.join(PUBLIC_DIR, 'masked-icon-new.png'), path.join(PUBLIC_DIR, 'masked-icon.png'));

    console.log('Icons resized.');
}

async function generateScreenshots() {
    console.log('Generating screenshots...');

    // Mobile Screenshot 1080x1920
    await sharp({
        create: {
            width: 1080,
            height: 1920,
            channels: 4,
            background: { r: 243, g: 244, b: 246, alpha: 1 } // #F3F4F6
        }
    })
        .composite([{
            input: Buffer.from(`
            <svg width="1080" height="1920">
                <text x="50%" y="50%" font-family="Arial" font-size="100" fill="#2563EB" text-anchor="middle" dominant-baseline="middle">Mobile Preview</text>
            </svg>
        `),
            gravity: 'center'
        }])
        .png()
        .toFile(path.join(PUBLIC_DIR, 'screenshot-mobile.png'));

    // Desktop Screenshot 1920x1080
    await sharp({
        create: {
            width: 1920,
            height: 1080,
            channels: 4,
            background: { r: 243, g: 244, b: 246, alpha: 1 } // #F3F4F6
        }
    })
        .composite([{
            input: Buffer.from(`
            <svg width="1920" height="1080">
                <text x="50%" y="50%" font-family="Arial" font-size="100" fill="#2563EB" text-anchor="middle" dominant-baseline="middle">Desktop Preview</text>
            </svg>
        `),
            gravity: 'center'
        }])
        .png()
        .toFile(path.join(PUBLIC_DIR, 'screenshot-wide.png'));

    console.log('Screenshots generated.');
}

async function main() {
    try {
        await resizeIcons();
        await generateScreenshots();
        console.log('Done!');
    } catch (err) {
        console.error('Error:', err);
    }
}

main();
