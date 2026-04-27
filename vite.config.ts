import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { manifest } from './manifest';
import pack from './package.json' with { type: 'json' };

const DEFAULT_NODE_VERSION = 'v22.10.0';
const nodeVersion = process.version ?? DEFAULT_NODE_VERSION;
const homepage = pack.homepage?.trim();

/* eslint-disable-next-line no-restricted-exports */
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
    strategies: 'injectManifest',
    srcDir: './src',
    filename: 'service-worker.ts',
    injectRegister: false,
    manifestFilename: 'manifest.json',
    manifest,
  })],

  build: {
    outDir: 'build',
  },

  // We post-process @shlinkio/shlink-web-component's bundle to translate
  // user-facing strings into Korean (see scripts/patch-shlink-i18n.mjs).
  // Vite caches optimized deps in node_modules/.vite by hashing the package,
  // not its contents, so we force-rebuild that cache on every start to make
  // sure the patched output is what actually ships to the browser.
  optimizeDeps: {
    force: true,
  },

  server: {
    port: 3000,
    watch: {
      // Do not watch test files or generated files, avoiding the dev server to constantly reload when not needed
      ignored: ['**/.idea/**', '**/.git/**', '**/build/**', '**/coverage/**', '**/test/**'],
    },
  },

  base: !homepage ? undefined : homepage, // Not using just homepage because empty string should be discarded

  // Vitest config
  test: {
    // Run tests in an actual browser
    browser: {
      provider: playwright(),
      enabled: true,
      headless: true,
      screenshotFailures: false,
      instances: [{ browser: 'chromium' }],
    },
    globals: true,
    setupFiles: './config/test/setupTests.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'clover'],
      include: [
        'src/**/*.{ts,tsx}',
        '!src/*.{ts,tsx}',
        '!src/reducers/index.ts',
        '!src/**/provideServices.ts',
        '!src/container/*.ts',
        '!src/utils/helpers/sw.ts',
      ],

      // Required code coverage. Lower than this will make the check fail
      thresholds: {
        statements: 75,
        branches: 60,
        functions: 70,
        lines: 75,
      },
    },

    // Silent warnings triggered by reactstrap components, as it's getting removed
    onConsoleLog: (log) => !log.includes('`transition.timeout` is marked as required'),

    // Workaround for bug in react-router (or vitest module resolution) which causes different react-router versions to
    // be resolved for the main package and dependencies who have a peer dependency in react-router.
    // This ensures always the same version is resolved.
    // See https://github.com/remix-run/react-router/issues/12785 for details
    alias: nodeVersion > DEFAULT_NODE_VERSION
      ? {
        'react-router': resolve(__dirname, 'node_modules/react-router/dist/development/index.mjs'),
      }
      : undefined,
  },
});
