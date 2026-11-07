import path from 'node:path';
import { pathToFileURL } from 'node:url';
process.env.RUNTIME_NODE_MODULES='C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const W='C:/Users/ASUS/Documents/Retail Market Basket Analysis';
const S='C:/Users/ASUS/.codex/plugins/cache/openai-primary-runtime/presentations/26.1020.11127/skills/presentations';
const candidatePath=`${W}/pptx-build/candidate.pptx`;
const finalPath=`${W}/pptx-output/Retail_Market_Basket_Analyzer.pptx`;
const {finalizePresentation}=await import(pathToFileURL(path.join(S,'container_tools/artifact_tool_utils.mjs')).href);
const result=await finalizePresentation({
 workspaceDir:W,candidatePath,finalPath,
 pythonExecutable:'C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',
 integrityValidatorPath:path.join(S,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(S,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','5','--require-native-table-slide','10','--require-native-table-slide','11'],
 requiredNativeTableOwnerSlides:[5,10,11],
 explicitTotalSlideCount:18,
 fontPolicy:{basis:'reference',families:['Calibri'],referencePath:'C:/Users/ASUS/Downloads/rpt ppt.pptx',referenceSha256:'b2e21064999937b4ea72e23d30ada0cc832433f6e67c1d378daeeaa1e31456e3'},
 verifyArtifactToolImport:true,
 receiptPath:`${W}/pptx-build/Retail_Market_Basket_Analyzer.validation.json`,
});
console.log(JSON.stringify(result,null,2));
