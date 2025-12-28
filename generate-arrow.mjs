import fs from 'fs';
import path from 'path';

// SVG arrow pointing up
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .arrow { fill: white; stroke: #cccccc; stroke-width: 2; stroke-linejoin: round; }
    </style>
  </defs>
  <polygon class="arrow" points="128,20 200,140 160,140 160,240 96,240 96,140 56,140" />
</svg>`;

// Convert SVG to base64
const svgBase64 = Buffer.from(svg).toString('base64');
const dataUri = `data:image/svg+xml;base64,${svgBase64}`;

console.log('SVG Data URI created');
console.log('Save this as arrow.png with a tool that supports SVG conversion');

// For now, write SVG file
const outputDir = path.resolve('./public/ui');
const svgPath = path.join(outputDir, 'arrow.svg');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(svgPath, svg);
console.log('Arrow SVG saved to:', svgPath);
console.log('Please convert arrow.svg to arrow.png using an online tool or ImageMagick');
