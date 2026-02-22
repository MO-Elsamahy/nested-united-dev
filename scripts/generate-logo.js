const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateLogo() {
    try {
        const outputPath = path.join(process.cwd(), 'public/logo.png');

        // Create an SVG with initials "NU" (Nested United)
        // Green background matching the theme
        const svgImage = `
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="200" rx="40" ry="40" fill="#10B981" />
            <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="white" text-anchor="middle" dy=".35em">NU</text>
        </svg>
        `;

        const svgBuffer = Buffer.from(svgImage);

        await sharp(svgBuffer)
            .png()
            .toFile(outputPath);

        console.log(`Generated placeholder logo at ${outputPath}`);
    } catch (error) {
        console.error('Error generating logo:', error);
        process.exit(1);
    }
}

generateLogo();
