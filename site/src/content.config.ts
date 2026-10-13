import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

// Generated from the app's src/legal by `npm run legal` at the repo root, so
// the site publishes exactly what the app displays.
const legal = defineCollection({
  loader: glob({ pattern: '*.md', base: '../docs/legal' }),
});

export const collections = { legal };
