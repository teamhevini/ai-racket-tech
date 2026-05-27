import { build } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

console.log("[build] Building client with Vite...");
await build({ configFile: path.resolve(root, "vite.config.ts") });

console.log("[build] Building server with esbuild...");
await esbuild.build({
  entryPoints: [path.resolve(root, "server/index.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: path.resolve(root, "dist/index.cjs"),
  packages: "external",
  tsconfig: path.resolve(root, "tsconfig.json"),
  alias: {
    "@shared": path.resolve(root, "shared"),
  },
});

console.log("[build] Done.");
