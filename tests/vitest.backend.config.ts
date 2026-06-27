import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/dist-electron/**', 'electron/dist/**'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '../'),
        },
    },
});
