// Quick structural sanity check for JSX files: brace/paren balance outside
// strings and comments. Not a parser - `next dev` compiles the real thing -
// but it catches gross truncation after big edits.
const fs = require('fs');
const files = process.argv.slice(2);
let bad = 0;
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const stack = [];
  const pairs = { '}': '{', ')': '(', ']': '[' };
  let mode = null; // null | '"' | "'" | '`' | '//' | '/*'
  let prev = '';
  let line = 1;
  let error = null;
  for (let i = 0; i < src.length && !error; i += 1) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '\n') line += 1;
    if (mode === '//') { if (c === '\n') mode = null; prev = c; continue; }
    if (mode === '/*') { if (prev === '*' && c === '/') mode = null; prev = c; continue; }
    if (mode === '"' || mode === "'" || mode === '`') {
      if (c === '\\') { prev = c; i += 1; continue; }
      if (c === mode) mode = null;
      prev = c;
      continue;
    }
    if (c === '/' && next === '/') { mode = '//'; prev = c; continue; }
    if (c === '/' && next === '*') { mode = '/*'; prev = c; i += 1; continue; }
    if (c === '"' || c === "'" || c === '`') { mode = c; prev = c; continue; }
    if (c === '{' || c === '(' || c === '[') stack.push({ c, line });
    else if (c === '}' || c === ')' || c === ']') {
      const open = stack.pop();
      if (!open || open.c !== pairs[c]) { error = `line ${line}: unmatched '${c}' (open was ${open ? `'${open.c}' from line ${open.line}` : 'nothing'})`; break; }
    }
    prev = c;
  }
  if (!error && stack.length) error = `unclosed '${stack[stack.length - 1].c}' from line ${stack[stack.length - 1].line}`;
  if (!error && mode && mode !== '//') error = `unterminated ${mode} string/comment`;
  if (error) { bad += 1; console.log(`FAIL ${file}: ${error}`); }
  else console.log(`OK   ${file}`);
}
process.exit(bad ? 1 : 0);
