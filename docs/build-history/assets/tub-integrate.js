// Splice the new clawfoot-tub art from _tub-art.js into spatmap-v3.html and
// refresh the _tub-*.svg mirror files. Run: node _tub-integrate.js
const fs = require('fs');
const path = require('path');
const dir = __dirname;

// load the readable art
const win = {};
global.window = win;
require('./_tub-art.js');

// minify: drop indentation/newlines and inter-tag whitespace (all real content is inside quotes)
function mini(svg){
  return svg.replace(/\n\s*/g, '').replace(/>\s+</g, '><').trim();
}
const loaded = mini(win.__LOADED__);
const empty  = mini(win.__EMPTY__);
const hero   = mini(win.__HERO__);

// sanity: no single quotes (so they embed cleanly in single-quoted JS literals)
for (const [n, s] of [['loaded',loaded],['empty',empty],['hero',hero]]){
  if (s.includes("'")) throw new Error('single quote in '+n);
  if (!s.startsWith('<svg') || !s.endsWith('</svg>')) throw new Error('bad svg bounds in '+n);
}
// pile contract still present in the widget loaded art
for (const tok of ['id="oysterPile"','class="pileBack"','class="pileMid"','class="pileFront"','class="bargeSvg"'])
  if (!loaded.includes(tok)) throw new Error('LOADED missing '+tok);
if (!hero.includes('class="harvestHeroSvg"')) throw new Error('HERO missing class');

// splice into spatmap-v3.html
const htmlPath = path.join(dir, 'spatmap-v3.html');
let html = fs.readFileSync(htmlPath, 'utf8');
function replaceConst(name, value){
  const re = new RegExp('(var ' + name + " =\\s*)'[\\s\\S]*?';");
  if (!re.test(html)) throw new Error('const not found: ' + name);
  html = html.replace(re, "$1'" + value + "';");
}
replaceConst('BARGE_LOADED_SVG', loaded);
replaceConst('BARGE_EMPTY_SVG',  empty);
replaceConst('HARVEST_HERO_SVG', hero);

// refresh the comment lines so they describe the new art (best-effort, harmless if absent)
html = html.replace(
  '// The LOADED barge art body (verbatim from _barge-design.svg), pile group wrapped in <g id="oysterPile">.',
  '// LOADED tub art (clawfoot tub on a hint of gold cloth, natural-shell pile). Mirror: _tub-loaded.svg. Pile in <g id="oysterPile">.');
html = html.replace(
  '// The EMPTY barge art body (verbatim from _barge-empty.svg) — relaxed fishermen, no pile.',
  '// EMPTY tub art (clawfoot tub, no pile, faint water sheen). Mirror: _tub-empty.svg.');
html = html.replace(
  '// The harvest-menu HERO banner (verbatim from _tub-hero.svg) — the four-around-the-tub pop-up scene.',
  '// Harvest HERO banner — clawfoot tub on a draped fringed tablecloth, oysters heaped in it. Mirror: _tub-hero.svg.');

fs.writeFileSync(htmlPath, html);

// refresh mirror .svg files (pretty, with header)
function writeMirror(file, body, note){
  const out = '<?xml version="1.0" encoding="UTF-8"?>\n<!-- SpatMap tub art — ' + note +
    '. SOURCE OF TRUTH is the inline copy in spatmap-v3.html; this file mirrors it. -->\n' +
    body.trim() + '\n';
  fs.writeFileSync(path.join(dir, file), out);
}
writeMirror('_tub-loaded.svg', win.__LOADED__, 'LOADED (clawfoot tub + natural-shell pile)');
writeMirror('_tub-empty.svg',  win.__EMPTY__,  'EMPTY (clawfoot tub, no pile)');
writeMirror('_tub-hero.svg',   win.__HERO__,   'HERO banner (clawfoot tub on draped cloth)');

console.log('OK  loaded=' + loaded.length + 'b  empty=' + empty.length + 'b  hero=' + hero.length + 'b');
