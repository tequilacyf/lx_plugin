/**
 * Post-build script: inline JS into index.html inside the built zip
 * so the plugin has zero external resource requests (no auth needed).
 *
 * zipHash in plugin.json is set to empty because the zip is rebuilt
 * after the build tool, making the hash self-referential.
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

// Find a file by name recursively
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

// --- Inline JS into HTML ---
const htmlPath = findFile(tmpDir, 'index.html');
if (htmlPath) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  const scriptMatch = html.match(/<script\s+src=["']([^"']+\.js)["']>\s*<\/script>/);
  if (scriptMatch) {
    const scriptPath = path.join(tmpDir, scriptMatch[1]);
    if (fs.existsSync(scriptPath)) {
      const jsCode = fs.readFileSync(scriptPath, 'utf8');
      html = html.replace(scriptMatch[0], `<script>\n${jsCode}\n</script>`);
      fs.writeFileSync(htmlPath, html);
      fs.unlinkSync(scriptPath);
      // Remove empty js dir
      const jsDir = path.dirname(scriptPath);
      try { if (fs.readdirSync(jsDir).length === 0) fs.rmdirSync(jsDir); } catch {}
      console.log(`Inlined JS (${jsCode.length} bytes) into index.html`);
    }
  }
}

// --- Remove unused CSS file ---
const cssDir = findFile(tmpDir, 'style.css');
if (cssDir) {
  const cssDirParent = path.dirname(path.dirname(cssDir));
  fs.rmSync(path.join(cssDirParent, 'css'), { recursive: true, force: true });
  console.log('Removed unused CSS file');
}

// --- Set zipHash to "" in zip's plugin.json ---
const zipPluginJson = findFile(tmpDir, 'plugin.json');
if (zipPluginJson) {
  const pkg = JSON.parse(fs.readFileSync(zipPluginJson, 'utf8'));
  pkg.zipHash = '';
  fs.writeFileSync(zipPluginJson, JSON.stringify(pkg, null, 2) + '\n');
}

// --- Rebuild zip ---
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
execSync(`powershell -Command "Compress-Archive -Path '${tmpDir}\\*' -DestinationPath '${zipPath}' -Force"`);

// --- Update repo plugin.json with empty zipHash too ---
const repoPluginJson = path.join(__dirname, '..', 'plugin.json');
if (fs.existsSync(repoPluginJson)) {
  const pkg = JSON.parse(fs.readFileSync(repoPluginJson, 'utf8'));
  pkg.zipHash = '';
  fs.writeFileSync(repoPluginJson, JSON.stringify(pkg, null, 2) + '\n');
}

// Clean tmp
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log('Done. zipHash set to "" (rebuilt zip).');
