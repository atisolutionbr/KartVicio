import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
const source = 'public/icons/kart-vicio-logo.jpeg';
for (const size of [32, 180, 192, 512]) {
  await sharp(source).resize(size, size).png().toFile('public/icons/kart-vicio-' + size + '.png');
}
// ICO container with the same supplied logo as a PNG image.
const png = await sharp(source).resize(48, 48).ensureAlpha().png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
header[6] = 48; header[7] = 48;
header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
await writeFile('src/app/favicon.ico', Buffer.concat([header, png]));
