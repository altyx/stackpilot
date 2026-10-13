// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://stackpilot.app',
  vite: {
    // The site reads data from the app's repo — the generated legal texts and
    // the store screenshots — never its code. The dev server must be allowed
    // to serve those files from outside site/.
    server: { fs: { allow: ['..'] } },
  },
});
