import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const htmlEntries = Object.fromEntries(
    readdirSync(process.cwd())
        .filter((file) => file.endsWith(".html"))
        .map((file) => [
            file.replace(/\.html$/, ""),
            resolve(process.cwd(), file)
        ])
);

export default defineConfig({
    build: {
        rollupOptions: {
            input: htmlEntries
        }
    }
});