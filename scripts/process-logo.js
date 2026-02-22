const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function processLogo() {
    try {
        const inputPath = path.join(process.cwd(), 'app/favicon.ico');
        const outputPath = path.join(process.cwd(), 'public/logo.png');

        console.log(`Processing logo from ${inputPath}...`);

        // Check if input exists
        if (!fs.existsSync(inputPath)) {
            console.error('Input file not found!');
            process.exit(1);
        }

        // Convert to PNG (resize if needed, but favicon usually small)
        // Resize to width 200 for crisp PDF logo
        await sharp(inputPath)
            .resize(200)
            .png()
            .toFile(outputPath);

        console.log(`Logo saved to ${outputPath}`);
    } catch (error) {
        console.error('Error processing logo:', error);
        process.exit(1);
    }
}

processLogo();
