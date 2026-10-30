import sharp from 'sharp';

for (const width of [480, 800, 1200, 1448]) {
  await sharp('public/cozinha-hero.png')
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(`public/cozinha-hero-${width}.webp`);
}
