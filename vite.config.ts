import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
    plugins: [vue()],
    base: '/',
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
            }
        },
        // 输出详细的构建信息，方便排查
        reportCompressedSize: true,
        chunkSizeWarningLimit: 1000
    },
});
