// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2025-05-15',
    devtools: { enabled: true },
    vite: {
        css: {
            preprocessorOptions: {
                scss: {
                    api: 'modern',
                },
            },
        },
    },
    css: ['vuetify/styles', '@mdi/font/css/materialdesignicons.min.css'],
    build: {
        transpile: ['vuetify'],
    },
    runtimeConfig: {
        public: {
            API_BASE_URL: process.env.API_BASE_URL,
            SITE_BASE_URL: process.env.SITE_BASE_URL,
        },
    },
});
