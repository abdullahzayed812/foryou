import sharp from "sharp";

/**
 * Renders a small "FOR YOU" wordmark as a semi-transparent PNG overlay sized
 * relative to the target image, for compositing onto product images (BRD
 * Rule 6 "FOR YOU Watermark"). SVG→PNG via sharp/libvips, not a static asset,
 * so it scales cleanly to any product photo dimensions.
 */
export async function buildWatermarkOverlay(targetWidth: number): Promise<Buffer> {
  const fontSize = Math.max(14, Math.round(targetWidth * 0.035));
  const paddingX = Math.round(fontSize * 0.8);
  const paddingY = Math.round(fontSize * 0.5);
  const text = "FOR YOU";
  const boxWidth = Math.round(text.length * fontSize * 0.62) + paddingX * 2;
  const boxHeight = fontSize + paddingY * 2;

  const svg = `
    <svg width="${boxWidth}" height="${boxHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${boxWidth}" height="${boxHeight}" rx="6" fill="black" fill-opacity="0.35" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="700"
        font-size="${fontSize}" fill="white" fill-opacity="0.85">${text}</text>
    </svg>
  `.trim();

  return sharp(Buffer.from(svg)).png().toBuffer();
}
