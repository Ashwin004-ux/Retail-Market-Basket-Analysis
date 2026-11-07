import {FileBlob,PresentationFile} from 'file:///C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const f='C:/Users/ASUS/Documents/Retail Market Basket Analysis/pptx-output/Retail_Market_Basket_Analyzer.pptx';
const p=await PresentationFile.importPptx(await FileBlob.load(f));
if(p.slides.items.length!==18) throw new Error(`Unexpected slide count ${p.slides.items.length}`);
console.log(`Imported final PPTX successfully: ${p.slides.items.length} slides`);
