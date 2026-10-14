// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://getstackpilot.app',
  vite: {
    // The site reads data from the app's repo — the generated legal texts and
    // the store screenshots — never its code. The dev server must be allowed
    // to serve those files from outside site/.
    server: { fs: { allow: ['..'] } },
    // Vite otherwise reads the tsconfig nearest to each file: for those
    // outside site/, the app's, which extends expo/tsconfig.base — not
    // installed when only site/ is (CI, Netlify).
    tsconfig: 'tsconfig.json',
  },
});
