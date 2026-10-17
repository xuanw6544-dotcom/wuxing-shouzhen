const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "www");
const runtimeEntries = [
  "index.html", "styles.css", "home-screen.css", "manifest.webmanifest", ".nojekyll",
  "art.js", "audio.js", "world.js", "game.js", "home-art.js", "three-renderer.js",
  "element-dais.js", "environment-3d.js", "enemy-models.js", "element-boss-models.js",
  "elite-models.js", "spirit-models.js", "fire-tower-model.js", "water-tower-model.js",
  "nature-tower-models.js", "fusion-tower-models.js", "assets"
];
const allowedExtensions = new Set([".html", ".js", ".css", ".json", ".webmanifest", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".mp3", ".wav", ".ogg", ".txt"]);

function copyEntry(source, destination) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const name of fs.readdirSync(source)) copyEntry(path.join(source, name), path.join(destination, name));
    return;
  }
  if (allowedExtensions.has(path.extname(source).toLowerCase()) || path.basename(source) === ".nojekyll") {
    fs.copyFileSync(source, destination);
  }
}

if (path.dirname(output) !== root || path.basename(output) !== "www") throw new Error("Unexpected mobile output directory");
for (const name of runtimeEntries) {
  if (!fs.existsSync(path.join(root, name))) throw new Error(`Missing runtime entry: ${name}`);
}
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const name of runtimeEntries) {
  copyEntry(path.join(root, name), path.join(output, name));
}
console.log(`Prepared mobile web assets in ${path.relative(root, output)}`);
