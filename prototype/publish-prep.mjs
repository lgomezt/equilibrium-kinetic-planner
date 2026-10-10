import {cpSync,copyFileSync,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

const prototype=dirname(fileURLToPath(import.meta.url)),root=resolve(prototype,'..'),dist=resolve(root,'dist');
const legacy=resolve(dist,'legacy');
if(!existsSync(resolve(legacy,'index.html')))throw new Error('Preserve the original SVG page in dist/legacy before promoting the 3D planner.');
if(!existsSync(resolve(dist,'prototype/index.html')))throw new Error('Run npm run build in prototype first.');
copyFileSync(resolve(dist,'prototype/index.html'),resolve(dist,'index.html'));
mkdirSync(resolve(dist,'prototype/data'),{recursive:true});
cpSync(resolve(prototype,'src/data'),resolve(dist,'prototype/data'),{recursive:true});
console.log('Prepared the same 3D planner at / and /prototype/; original preserved at /legacy/.');
