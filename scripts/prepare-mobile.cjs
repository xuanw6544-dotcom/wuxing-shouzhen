const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "www");
const excluded = new Set([".git", ".github", "android", "artifacts", "node_modules", "scripts", "www"]);
const allowedExtensions = new Set([".html", ".js", ".css", ".json", ".webmanifest", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".mp3", ".wav", ".ogg"]);

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

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const name of fs.readdirSync(root)) {
  if (excluded.has(name)) continue;
  copyEntry(path.join(root, name), path.join(output, name));
}
console.log(`Prepared mobile web assets in ${path.relative(root, output)}`);
