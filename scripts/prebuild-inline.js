/**
 * Pre-build script: inline JS into static/index.html before the build tool runs.
 * This way the build tool produces a zip with correct hashes (no post-processing needed).
 */
const fs = require('fs');
const path = require('path');

const staticDir = path.join(__dirname, '..', 'static');
const htmlPath = path.join(staticDir, 'index.html');
const jsPath = path.join(staticDir, 'js', 'app.js');

if (!fs.existsSync(htmlPath) || !fs.existsSync(jsPath)) {
  console.log('index.html or app.js not found, skipping pre-build inline.');
  process.exit(0);
}

let html = fs.readFileSync(htmlPath, 'utf8');
const jsCode = fs.readFileSync(jsPath, 'utf8');

// Check if already inlined (no external script tag)
if (/<script\s+src=["']js\/app\.js["']>\s*<\/script>/.test(html)) {
  html = html.replace(
    /<script\s+src=["']js\/app\.js["']>\s*<\/script>/,
    `<script>\n${jsCode}\n</script>`
  );
  fs.writeFileSync(htmlPath, html);
  console.log(`Pre-build: inlined app.js (${jsCode.length} bytes) into index.html`);
} else {
  console.log('Pre-build: JS already inlined or no external script tag found.');
}
