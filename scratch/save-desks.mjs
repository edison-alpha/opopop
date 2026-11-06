import fs from 'node:fs';
fs.writeFileSync('apps/web/public/assets/office/source-desks.png',Buffer.from(fs.readFileSync('scratch/office-desks.b64','utf8').trim(),'base64'));
let p='scratch/render-office.mjs',s=fs.readFileSync(p,'utf8').replace('height="1536"','height="2048"');fs.writeFileSync(p,s);
p='apps/web/public/assets/office/README.md';s=fs.readFileSync(p,'utf8').replace('48 original','64 original').replace('512 × 1536','512 × 2048').replace('three original','four original');fs.writeFileSync(p,s);
