import { build } from "vite";
import { build as esbuild } from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

async function main() {
  console.log("Building client with Vite...");

  // Build the client (React app) using the vite.config.ts at root
  await build({
    configFile: path.join(root, "vite.config.ts"),
  });

  console.log("Building server with esbuild...");

  // Build the server
  await esbuild({
    entryPoints: [path.join(root, "server/index.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: path.join(root, "dist/index.cjs"),
    packages: "external",
    tsconfig: path.join(root, "tsconfig.json"),
  });

  console.log("Build complete!");
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
