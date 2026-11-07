import fs from 'node:fs/promises';
import { FileBlob, PresentationFile } from 'file:///C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const path = 'C:/Users/ASUS/Downloads/rpt ppt.pptx';
const p = await PresentationFile.importPptx(await FileBlob.load(path));
console.log('SLIDE_COUNT', p.slides.items.length);
const info = await p.inspect({kind:'slide,textbox,shape,image,table,chart,notes,thread,layout',maxChars:50000});
await fs.writeFile('pptx-build/source-inspect.ndjson', info.ndjson, 'utf8');
console.log(info.ndjson);
console.log('SIZE', JSON.stringify(p.slideSize));
for(let i=0;i<p.slides.items.length;i++){
 const slide=p.slides.items[i];
 const blob=await p.export({slide,format:'png',scale:1});
 await fs.writeFile(`pptx-build/source-render/slide-${String(i+1).padStart(2,'0')}.png`,new Uint8Array(await blob.arrayBuffer()));
}
