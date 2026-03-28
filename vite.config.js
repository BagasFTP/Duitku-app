import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        laravel({ input: 'resources/js/app.tsx', refresh: true }),
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'DuitKu - Money Manager',
                short_name: 'DuitKu',
                description: 'Kelola keuangan dengan AI',
                theme_color: '#6366f1',
                background_color: '#ffffff',
                display: 'standalone',
                icons: [
                    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                    },
                ],
            },
        }),
    ],
});
