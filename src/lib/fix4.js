const fs=require('fs');
let p='sections.js'; let s=fs.readFileSync(p,'utf8');
s=s.replace("import { roundedPerimeter } from './rings.js';\n\n","");
s=s.replace("export { roundedPerimeter };\n","");
fs.writeFileSync(p,s,'utf8');
console.log('ok');
