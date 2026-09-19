import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve('store-assets');
const specs = [
  {
    slug: '01-every-door',
    background: 'entrance',
    screenshot: '02-doors.png',
    eyebrow: 'PERSONAL BUILDING ACCESS',
    line1: 'Every door.',
    line2: 'One tap.',
    subtitle: 'Your building, beautifully simple.',
  },
  {
    slug: '02-nearby',
    background: 'nearby',
    screenshot: '02-doors.png',
    eyebrow: 'BLUETOOTH NEARBY',
    line1: 'Walk up.',
    line2: 'Tap in.',
    subtitle: 'The right entrance, right when you arrive.',
  },
  {
    slug: '03-guest-access',
    background: 'guest',
    screenshot: '03-keys.png',
    eyebrow: 'GUEST ACCESS',
    line1: 'Share access.',
    line2: 'Not passwords.',
    subtitle: 'Create a guest invite in seconds.',
  },
];

const outputs = [
  { platform: 'app-store', width: 1290, height: 2796, phoneWidth: 1000, phoneY: 450 },
  { platform: 'play-store', width: 1080, height: 1920, phoneWidth: 820, phoneY: 350 },
];

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function overlaySvg(spec, width, height, contentX) {
  const scale = width / 1290;
  const pad = contentX;
  const displaySize = Math.round(96 * scale);
  const bodySize = Math.round(37 * scale);
  const lineGap = Math.round(94 * scale);
  const firstY = Math.round(132 * scale);
  const secondY = firstY + lineGap;
  const subtitleY = secondY + Math.round(62 * scale);
  const accent = spec.slug === '02-nearby' ? '#62C5F8' : spec.slug === '03-guest-access' ? '#FF8A5B' : '#F2F1EC';
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0E0E0D" stop-opacity="0.94"/>
          <stop offset="0.24" stop-color="#0E0E0D" stop-opacity="0.78"/>
          <stop offset="0.7" stop-color="#0E0E0D" stop-opacity="0.42"/>
          <stop offset="1" stop-color="#0E0E0D" stop-opacity="0.72"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#shade)"/>
      <text x="${pad}" y="${firstY}" fill="#F2F1EC" font-family="New York, serif" font-size="${displaySize}" font-weight="600" letter-spacing="-${Math.round(2 * scale)}">${escapeXml(spec.line1)}</text>
      <text x="${pad}" y="${secondY}" fill="${accent}" font-family="New York, serif" font-size="${displaySize}" font-weight="600" letter-spacing="-${Math.round(2 * scale)}">${escapeXml(spec.line2)}</text>
      <text x="${pad}" y="${subtitleY}" fill="#D5D2CB" font-family="Avenir Next, sans-serif" font-size="${bodySize}" font-weight="400">${escapeXml(spec.subtitle)}</text>
    </svg>`);
}

async function roundedScreenshot(input, width, height, radius) {
  const mask = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" rx="${radius}" fill="white"/></svg>`);
  return sharp(input)
    .resize(width, height, { fit: 'cover', position: 'top' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function cleanGuestScreenshot(input) {
  const header = await sharp(input).extract({ left: 0, top: 0, width: 1290, height: 130 }).png().toBuffer();
  const content = await sharp(input).extract({ left: 0, top: 320, width: 1290, height: 2290 }).png().toBuffer();
  return sharp({
    create: { width: 1290, height: 2796, channels: 3, background: '#0E0E0D' },
  })
    .composite([
      { input: header, left: 0, top: 90 },
      { input: content, left: 0, top: 250 },
    ])
    .png()
    .toBuffer();
}

async function cleanDemoFooter(input) {
  const content = await sharp(input).extract({ left: 0, top: 0, width: 1290, height: 2610 }).png().toBuffer();
  return sharp({
    create: { width: 1290, height: 2796, channels: 3, background: '#0E0E0D' },
  })
    .composite([{ input: content, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

async function render(spec, output) {
  const { width, height, phoneY, platform } = output;
  const phoneWidth = Math.round(output.phoneWidth * (spec.slug === '03-guest-access' ? 0.88 : 1));
  const phoneHeight = Math.round(phoneWidth * 2796 / 1290);
  const phoneX = Math.round((width - phoneWidth) / 2);
  const radius = Math.round(width * 0.045);
  const backgroundPath = path.join(root, 'grok', 'output', `${spec.background}.png`);
  const screenshotPath = path.join(root, 'source', spec.screenshot);
  const screenshotInput = spec.slug === '03-guest-access'
    ? await cleanGuestScreenshot(screenshotPath)
    : await cleanDemoFooter(screenshotPath);
  const screen = await roundedScreenshot(screenshotInput, phoneWidth, phoneHeight, radius);
  const shadow = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="s" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="28"/></filter></defs>
      <rect x="${phoneX + 10}" y="${phoneY + 24}" width="${phoneWidth - 20}" height="${phoneHeight - 12}" rx="${radius}" fill="black" fill-opacity="0.72" filter="url(#s)"/>
      <rect x="${phoneX - 2}" y="${phoneY - 2}" width="${phoneWidth + 4}" height="${phoneHeight + 4}" rx="${radius + 2}" fill="none" stroke="#F2F1EC" stroke-opacity="0.18" stroke-width="4"/>
    </svg>`);
  const outDir = path.join(root, 'final', platform);
  await fs.mkdir(outDir, { recursive: true });
  await sharp(backgroundPath)
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: 0.8, saturation: 0.82 })
    .composite([
      { input: overlaySvg(spec, width, height, phoneX), left: 0, top: 0 },
      { input: shadow, left: 0, top: 0 },
      { input: screen, left: phoneX, top: phoneY },
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, `${spec.slug}.png`));
}

await Promise.all(outputs.flatMap((output) => specs.map((spec) => render(spec, output))));

const featureBackground = path.join(root, 'grok', 'output', 'entrance.png');
const featureOverlay = Buffer.from(`
  <svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0E0E0D" stop-opacity="0.98"/><stop offset="0.62" stop-color="#0E0E0D" stop-opacity="0.76"/><stop offset="1" stop-color="#0E0E0D" stop-opacity="0.24"/></linearGradient></defs>
    <rect width="1024" height="500" fill="url(#g)"/>
    <text x="74" y="190" fill="#F2F1EC" font-family="Georgia, serif" font-size="82" font-weight="700">LatchMX</text>
    <text x="78" y="252" fill="#D5D2CB" font-family="Arial, sans-serif" font-size="31">Personal building access.</text>
    <rect x="78" y="302" width="180" height="5" rx="3" fill="#62C5F8"/>
    <rect x="266" y="302" width="60" height="5" rx="3" fill="#F0C14A"/>
    <rect x="334" y="302" width="60" height="5" rx="3" fill="#FF8A5B"/>
    <rect x="402" y="302" width="60" height="5" rx="3" fill="#C084FC"/>
  </svg>`);
await fs.mkdir(path.join(root, 'final', 'play-store'), { recursive: true });
await sharp(featureBackground)
  .resize(1024, 500, { fit: 'cover', position: 'center' })
  .composite([{ input: featureOverlay }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, 'final', 'play-store', 'feature-graphic.png'));

console.log('Rendered App Store, Play Store, and feature graphic assets.');
