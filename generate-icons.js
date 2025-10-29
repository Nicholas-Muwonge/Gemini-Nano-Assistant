const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
}

sizes.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#1a73e8');
    gradient.addColorStop(1, '#764ba2');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 0.35}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = size * 0.1;
    ctx.fillText('AI', size / 2, size / 2);
    
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buffer);
    
    console.log(`Created icon${size}.png`);
});

console.log('All icons generated successfully!');