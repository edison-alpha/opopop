import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require('../node_modules/.pnpm/sharp@0.35.5_@types+node@24.19.2/node_modules/sharp');
await sharp('scratch/office-layout.png').extract({left:384,top:224,width:1120,height:448}).png().toFile('scratch/north-office-detail.png');
