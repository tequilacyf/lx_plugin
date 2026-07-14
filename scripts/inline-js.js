/**
 * Post-build script: inline JS into index.html inside the built zip
 * so the plugin has zero external resource requests (no auth needed).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, '..', 'dist');
const zipPath = path.join(distDir, 'lxmusic.jsplugin.zip');
const tmpDir = path.join(distDir, '_inline_tmp');

if (!fs.existsSync(zipPath)) {
  console.log('No zip found, skipping inline.');
  process.exit(0);
}

// Clean tmp
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });

// Extract zip
execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tmpDir}' -Force"`);

// Find index.html
function findFile(dir, name) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFile(full, name);
      if (found) return found;
    } else if (entry.name === name) return full;
  }
  return null;
}

const htmlPath = findFile(tmpDir, 'index.html');
if (!htmlPath) {
  console.log('index.html not found in zip.');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  process.exit(0);
}

let html = fs.readFileSync(htmlPath, 'utf8');

// Find <script src="...js">
const scriptMatch = html.match(/<script\s+src=["']([^"']+\.js)["']>\s*<\/script>/);
if (!scriptMatch) {
  console.log('No external script tag found, skipping.');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  process.exit(0);
}

const scriptRel = scriptMatch[1];
// Script src is relative to zip root, not HTML directory
const scriptPath = path.join(tmpDir, scriptRel);

if (!fs.existsSync(scriptPath)) {
  console.warn(`Script not found: ${scriptPath}`);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  process.exit(0);
}

const jsCode = fs.readFileSync(scriptPath, 'utf8');
html = html.replace(scriptMatch[0], `<script>\n${jsCode}\n</script>`);
fs.writeFileSync(htmlPath, html);

// Also remove CSS file if present (already inlined in HTML)
const cssDir = path.join(path.dirname(htmlPath), '..', 'css');
if (fs.existsSync(cssDir)) {
  fs.rmSync(cssDir, { recursive: true, force: true });
}

// Remove the external JS file
try { fs.unlinkSync(scriptPath); } catch {}

// Remove empty js dir
const jsDir = path.dirname(scriptPath);
try { if (fs.readdirSync(jsDir).length === 0) fs.rmdirSync(jsDir); } catch {}

// Remove old zip
fs.unlinkSync(zipPath);

// Rebuild zip
execSync(`powershell -Command "Compress-Archive -Path '${tmpDir}\\*' -DestinationPath '${zipPath}' -Force"`);

// Clean tmp
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`Inlined JS (${jsCode.length} bytes) and CSS into index.html, rebuilt zip.`);
