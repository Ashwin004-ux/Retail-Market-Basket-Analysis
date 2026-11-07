import fs from 'node:fs/promises';
import { FileBlob, PresentationFile } from 'file:///C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';

const W='C:/Users/ASUS/Documents/Retail Market Basket Analysis';
const SRC='C:/Users/ASUS/Downloads/rpt ppt.pptx';
const OUT=`${W}/pptx-build/candidate.pptx`;
const p=await PresentationFile.importPptx(await FileBlob.load(SRC));
if(p.slides.items.length!==18) throw new Error(`Expected 18 source slides; got ${p.slides.items.length}`);
// Retain the institution mark on the cover only. Replace all project-specific content.
const info=await p.inspect({kind:'textbox,shape,image,table,chart',maxChars:200000});
const remove=[];
for(const line of info.ndjson.split(/\r?\n/)){
 if(!line.trim()) continue;
 const item=JSON.parse(line);
 if(item.id==='im/pgr2tcf2') continue;
 if(['textbox','shape','image','table','chart'].includes(item.kind)) remove.push(item.id);
}
p.delete(remove);
const C={navy:'#17365D',blue:'#2F75B5',teal:'#2B7A78',ink:'#263445',muted:'#63748B',pale:'#EAF1F8',line:'#C9D6E4',white:'#FFFFFF',green:'#E6F3EE'};
function shape(slide,geom,x,y,w,h,fill='none',stroke='none',sw=0,name=''){
 return slide.shapes.add({geometry:geom,name:name||undefined,position:{left:x,top:y,width:w,height:h},fill,line:{style:'solid',fill:stroke,width:sw}});
}
function text(slide,txt,x,y,w,h,opt={}){
 const s=shape(slide,'textbox',x,y,w,h,'none','none',0,opt.name||''); s.text=txt;
 s.text.style={fontSize:opt.size||22,typeface:'Calibri',color:opt.color||C.ink,bold:!!opt.bold,alignment:opt.align||'left',verticalAlignment:opt.valign||'middle',autoFit:'shrinkText',wrap:'square',insets:0,lineSpacing:1.04};
 return s;
}
function rect(slide,x,y,w,h,txt,opt={}){
 const s=shape(slide,opt.geom||'roundRect',x,y,w,h,opt.fill||C.pale,opt.stroke||C.line,opt.sw??1,opt.name||'');
 if(txt){s.text=txt;s.text.style={fontSize:opt.size||20,typeface:'Calibri',color:opt.color||C.navy,bold:!!opt.bold,alignment:opt.align||'center',verticalAlignment:'middle',autoFit:'shrinkText',wrap:'square',insets:opt.insets??12};}
 return s;
}
function base(i,title,tag='RETAIL MARKET BASKET ANALYZER'){
 const s=p.slides.items[i]; s.background.fill=C.white;
 text(s,tag,70,26,1140,18,{size:12,bold:true,color:C.teal});
 text(s,title,70,48,1140,58,{size:36,bold:true,color:C.navy});
 shape(s,'rect',70,119,1140,3,C.blue,'none',0);
 text(s,'Retail Market Basket Analyzer',70,681,660,18,{size:12,color:C.muted});
 text(s,'ADA23IN101  |  22 October 2026',760,681,400,18,{size:12,color:C.muted,align:'right'});
 text(s,String(i+1).padStart(2,'0'),1170,677,40,22,{size:13,bold:true,color:C.teal,align:'right'});
 return s;
}
function body(s,heading,copy,x=80,y=154,w=1100,h=95){
 text(s,heading,x,y,w,28,{size:22,bold:true,color:C.teal});
 text(s,copy,x,y+35,w,h-35,{size:20,color:C.ink,valign:'top'});
}
function notes(i,txt){p.slides.items[i].speakerNotes.text=txt;}
function table(slide,values,x,y,w,h,widths,fs=17){
 const t=slide.tables.add({rows:values.length,columns:values[0].length,left:x,top:y,width:w,height:h,columnWidths:widths,values});
 t.borders.assign({style:'solid',fill:C.line,width:1});
 for(let r=0;r<values.length;r++) for(let c=0;c<values[r].length;c++){
  const cell=t.getCell(r,c); cell.fill=r===0?C.blue:(r%2? '#F3F6FA':C.white);
  cell.text.style={fontSize:r===0?fs:fs-1,typeface:'Calibri',color:r===0?C.white:C.ink,bold:r===0,verticalAlignment:'middle',autoFit:'shrinkText',wrap:'square'};
 }
 return t;
}

// 1. Cover: original university mark and presenter/course identity retained.
{
 const s=p.slides.items[0]; s.background.fill=C.white;
 text(s,'RESEARCH PRODUCTIVITY TOOLS',90,112,1100,24,{size:16,bold:true,color:C.teal,align:'center'});
 text(s,'Retail Market Basket\nAnalyzer',130,156,1020,142,{size:48,bold:true,color:C.navy,align:'center'});
 shape(s,'rect',415,317,450,4,C.blue);
 text(s,'Finding product associations in transaction data',170,342,940,42,{size:24,color:C.muted,align:'center'});
 text(s,'Final project presentation  |  ADA23IN101',170,432,940,30,{size:18,bold:true,color:C.ink,align:'center'});
 text(s,'Ashwin A  ·  E0324097     |     Nikilesh J R  ·  E0324098',145,480,990,34,{size:19,color:C.navy,align:'center'});
 text(s,'Sri Ramachandra Institute of Higher Education and Research',180,547,920,27,{size:16,color:C.muted,align:'center'});
 text(s,'22 October 2026',180,588,920,26,{size:16,color:C.muted,align:'center'});
 notes(0,'Project presentation for ADA23IN101. The application analyzes transaction baskets and surfaces association rules.');
}
// 2. Contents
{
 const s=base(1,'Presentation overview','PROJECT GUIDE');
 const left=['01  Introduction','02  Problem statement','03  Literature review','04  Objectives and scope','05  End-to-end workflow','06  Methodology'];
 const right=['07  Technology stack','08  Data and implementation','09  Results analysis','10  Application modules','11  Conclusion and future scope','12  References'];
 left.forEach((v,i)=>{rect(s,90,155+i*75,510,54,v,{fill:i%2?C.white:C.pale,stroke:C.line,size:20,bold:true,align:'left',insets:18});});
 right.forEach((v,i)=>{rect(s,665,155+i*75,510,54,v,{fill:i%2?C.white:C.pale,stroke:C.line,size:20,bold:true,align:'left',insets:18});});
}
// 3. Introduction
{
 const s=base(2,'Introduction');
 text(s,'A transaction is a set of products purchased together in one basket.',90,160,1070,70,{size:28,bold:true,color:C.navy});
 body(s,'The analysis task', 'Find recurring product combinations and express them as readable rules, such as {A, B} → {C}.',90,260,1040,105);
 body(s,'Why it helps', 'Merchants can use associations to explore merchandising, cross-sell ideas, and promotion hypotheses.',90,390,1040,100);
 rect(s,90,535,1040,76,'Output: frequent itemsets, association rules, and standard strength measures',{fill:C.green,stroke:'#B9DCCB',size:21,bold:true,color:C.teal});
 notes(2,'Association mining describes co-occurrence in historical baskets. It does not establish why a customer bought a product.');
}
// 4. Problem
{
 const s=base(3,'Problem statement');
 const cards=[['Scale','Retail transaction logs can contain many baskets and distinct products.'],['Hidden patterns','Product relationships are difficult to inspect in raw rows.'],['Misleading counts','Frequent pairs may be common simply because each product sells often.'],['Configurable evidence','Analysts need support, confidence, and lift thresholds to rank candidate rules.']];
 cards.forEach((d,i)=>{const x=85+(i%2)*560,y=160+Math.floor(i/2)*205;rect(s,x,y,520,160,'',{fill:i===3?C.green:C.pale,stroke:C.line});text(s,d[0],x+22,y+18,475,32,{size:23,bold:true,color:C.teal});text(s,d[1],x+22,y+60,475,82,{size:19,color:C.ink,valign:'top'});});
}
// 5. Literature review
{
 const s=base(4,'Literature review');
 const vals=[['Study','Contribution','Project relevance'],['Agrawal et al. (1993) [1]','Introduced association-rule mining for item sets.','Defines the rule-mining problem.'],['Agrawal & Srikant (1994) [2]','Presented Apriori and scalable rule-mining methods.','Apriori baseline in the analyzer.'],['Han, Pei & Yin (2000) [3]','FP-growth mines patterns without candidate generation.','Alternative mining method in the analyzer.'],['Tan et al. (2004) [5]','Compared objective measures for association analysis.','Supports careful measure selection and interpretation.']];
 table(s,vals,70,154,1140,440,[260,430,450],18);
 text(s,'The application reports measures as filters and ranking signals, not causal evidence.',90,610,1100,34,{size:18,bold:true,color:C.muted,align:'center'});
 notes(4,'References [1], [2], [3], and [5] are listed on slide 17.');
}
// 6. Objectives and scope
{
 const s=base(5,'Objectives and scope');
 const obj=['Ingest and inspect transaction data from CSV or Excel.','Clean records and form transaction-level baskets.','Mine frequent itemsets with Apriori or FP-Growth.','Generate, filter, save, review, and export association rules.'];
 text(s,'Objectives',90,155,500,35,{size:25,bold:true,color:C.teal});
 obj.forEach((v,i)=>{rect(s,90,205+i*76,510,58,v,{fill:i%2?C.white:C.pale,stroke:C.line,size:18,align:'left',insets:16});});
 rect(s,660,155,530,375,'',{fill:'#F5F7FA',stroke:C.line});
 text(s,'Project boundaries',690,180,470,40,{size:25,bold:true,color:C.teal});
 text(s,'The application describes co-occurrence in supplied transaction history. It does not perform sales forecasting, customer segmentation, causal inference, or measure actual revenue impact.',690,235,460,200,{size:21,color:C.ink,valign:'top'});
 text(s,'Results depend on data quality, basket definitions, and thresholds.',690,455,460,52,{size:18,bold:true,color:C.navy});
}
// 7. Workflow: native editable shapes
{
 const s=base(6,'End-to-end workflow');
 const labels=[['01','Upload data'],['02','Validate & clean'],['03','Build baskets'],['04','Mine itemsets'],['05','Generate rules'],['06','Review & export']];
 labels.forEach((d,i)=>{const col=i%3,row=Math.floor(i/3),x=82+col*390,y=175+row*215;rect(s,x,y,330,125,`${d[0]}\n${d[1]}`,{fill:row?C.green:C.pale,stroke:C.blue,sw:1.5,size:24,bold:true});
  if(col<2) shape(s,'rightArrow',x+340,y+43,38,35,C.blue,'none',0);
 });
 text(s,'Saved analysis results support later review and CSV export.',90,625,1100,28,{size:18,color:C.muted,align:'center'});
}
// 8. Methodology
{
 const s=base(7,'Methodology and rule measures');
 rect(s,80,160,520,175,'Basket representation\nEach transaction becomes a set of present products. Duplicate transaction-product pairs are removed during cleaning.',{fill:C.pale,stroke:C.line,size:20,bold:false});
 rect(s,650,160,550,175,'Mining choices\nApriori expands candidate itemsets. FP-Growth compresses baskets into a frequent-pattern tree.',{fill:C.green,stroke:C.line,size:20});
 const metrics=[['Support','P(A ∪ B)','Share of all baskets containing both sides'],['Confidence','Support(A ∪ B) / Support(A)','Share of A baskets that also contain B'],['Lift','Confidence(A → B) / Support(B)','Association strength relative to baseline B frequency']];
 metrics.forEach((d,i)=>{const y=375+i*78;text(s,d[0],90,y,160,30,{size:20,bold:true,color:C.teal});text(s,d[1],260,y,390,30,{size:19,bold:true,color:C.navy});text(s,d[2],650,y,520,42,{size:17,color:C.ink});});
 notes(7,'Measure definitions follow association-analysis literature [1,5,6]. The measures describe observed co-occurrence, not causality.');
}
// 9. Tools
{
 const s=base(8,'Tools and techniques');
 const items=[['Web interface','React 19 · TypeScript · Vite\nAxios · Recharts · Lucide'],['API service','Python · FastAPI · Pydantic\nREST endpoints under /api'],['Data analysis','pandas · NumPy\nmlxtend Apriori and FP-Growth'],['Persistence','MongoDB via PyMongo\nDatasets and saved analysis runs']];
 items.forEach((d,i)=>{const x=85+(i%2)*565,y=160+Math.floor(i/2)*215;rect(s,x,y,520,170,'',{fill:i%2?C.white:C.pale,stroke:C.line});text(s,d[0],x+25,y+24,465,38,{size:24,bold:true,color:C.teal});text(s,d[1],x+25,y+78,465,65,{size:20,color:C.ink,valign:'top'});});
 notes(8,'Technology references: React [10], FastAPI [9], pandas [11], MongoDB PyMongo [12], and mlxtend [8].');
}
// 10. Implementation and data
{
 const s=base(9,'Implementation and input data');
 const vals=[['Area','Implementation detail'],['Accepted files','CSV and Excel; upload cap 25 MB'],['Long format','Transaction ID, product, optional quantity'],['Wide format','Binary product columns; each nonzero value indicates presence'],['Cleaning','Remove invalid rows and duplicate transaction-product pairs; quantities must be positive when supplied'],['Bundled example','Synthetic sample: 100 baskets and 9 products']];
 table(s,vals,95,158,1090,380,[260,830],18);
 text(s,'The bundled sample is demonstration data. It does not represent a retailer or actual sales.',105,575,1070,50,{size:20,bold:true,color:C.teal,align:'center'});
 notes(9,'Input format and cleaning details reflect the application implementation. The sample data is synthetic.');
}
// 11. Results analysis: values computed with app pipeline on bundled synthetic sample.
{
 const s=base(10,'Results analysis');
 text(s,'Synthetic demonstration data  |  FP-Growth',80,143,1120,30,{size:18,bold:true,color:C.teal});
 const vals=[['Run measure','Observed value','Rule / consequent','Support','Confidence','Lift'],['Transactions / products','100 / 9','Beer, Bread, Eggs → Milk','0.10','0.909','2.841'],['Frequent itemsets / rules','53 / 103','Milk → Beer, Bread, Eggs','0.10','0.313','2.841'],['Thresholds','Support 0.10 · confidence 0.30 · lift 1.00','Beer, Eggs → Bread, Milk','0.10','0.526','2.770'],['Maximum itemset size','5','Bread, Milk → Beer, Eggs','0.10','0.526','2.770']];
 table(s,vals,65,190,1150,320,[220,255,300,115,135,125],15);
 text(s,'Top rules sorted by lift. Rounded to three decimals. Results vary with the sample file and parameters.',85,545,1100,40,{size:17,color:C.muted,align:'center'});
 text(s,'Association does not prove causation or guarantee sales impact.',85,594,1100,32,{size:18,bold:true,color:C.navy,align:'center'});
 notes(10,'Reproducible example run on the repository sample_dataset.csv using the project pipeline: FP-Growth, min_support 0.10, min_confidence 0.30, min_lift 1.0, max_itemset_size 5. Sample is synthetic. Rules shown with rounded metrics.');
}
// 12. Product interface / modules
{
 const s=base(11,'Application modules');
 const modules=[['Overview','Dataset and analysis summaries; quick view of high-lift rules.'],['Datasets','Upload, preview, inspect, and remove transaction files.'],['New analysis','Choose dataset, Apriori or FP-Growth, and rule thresholds.'],['Analysis history','Open saved runs, inspect rules, and export rule results to CSV.']];
 modules.forEach((d,i)=>{const y=155+i*112;rect(s,85,y,1110,88,'',{fill:i%2?C.white:C.pale,stroke:C.line});text(s,String(i+1).padStart(2,'0'),108,y+18,56,48,{size:21,bold:true,color:C.teal,align:'center'});text(s,d[0],185,y+12,250,28,{size:21,bold:true,color:C.navy});text(s,d[1],185,y+43,970,30,{size:18,color:C.ink});});
 text(s,'The API also exposes recommendation and one-run benchmark endpoints.',95,620,1090,26,{size:16,color:C.muted,align:'center'});
}
// 13. Technical architecture
{
 const s=base(12,'Technical architecture');
 rect(s,85,190,285,265,'Browser UI\nReact + TypeScript\nVite development server\n\nDashboard, datasets, analysis, history',{fill:C.pale,stroke:C.blue,size:20,bold:false});
 shape(s,'rightArrow',390,290,55,45,C.blue);
 rect(s,465,190,300,265,'API layer\nFastAPI + Pydantic\n\nDataset and analysis routes\nInput validation\nPersistence coordination',{fill:C.green,stroke:C.teal,size:20});
 shape(s,'rightArrow',785,290,55,45,C.blue);
 rect(s,860,160,330,150,'Mining service\npandas / NumPy\nmlxtend Apriori and FP-Growth',{fill:C.pale,stroke:C.blue,size:19});
 rect(s,860,350,330,150,'Database\nMongoDB via PyMongo\nDatasets and saved runs',{fill:'#F5F7FA',stroke:C.line,size:19});
 text(s,'Local development defaults: UI http://localhost:5173  |  API http://localhost:8000/api',90,568,1100,42,{size:18,bold:true,color:C.navy,align:'center'});
}
// 14. Delivery sequence
{
 const s=base(13,'Implementation sequence');
 const phases=[['01','Data foundations','Upload, preview, validation, and basket cleaning'],['02','Mining core','Apriori and FP-Growth itemsets and rule metrics'],['03','Service and storage','FastAPI endpoints with MongoDB persistence'],['04','User interface','Dashboard, dataset library, analysis form, and history'],['05','Validation and handoff','Algorithm/cleaning tests, run analysis, and CSV export']];
 phases.forEach((d,i)=>{const y=152+i*94;shape(s,'ellipse',95,y+10,52,52,C.teal,'none',0);text(s,d[0],95,y+10,52,52,{size:17,bold:true,color:C.white,align:'center'});text(s,d[1],175,y,320,32,{size:21,bold:true,color:C.navy});text(s,d[2],495,y,650,45,{size:18,color:C.ink});if(i<4)shape(s,'rect',120,y+62,2,27,C.line);});
 text(s,'Phases describe the implemented system structure, not dated project milestones.',100,635,1080,24,{size:15,color:C.muted,align:'center'});
}
// 15. Conclusion
{
 const s=base(14,'Conclusion');
 text(s,'The analyzer turns transaction records into reviewable association rules.',95,165,1090,62,{size:28,bold:true,color:C.navy,align:'center'});
 const cards=[['Prepare','Upload, inspect, and clean baskets.'],['Discover','Mine frequent itemsets with two algorithms.'],['Evaluate','Compare rules with support, confidence, and lift.'],['Use carefully','Treat patterns as evidence for exploration, not proof of cause.']];
 cards.forEach((d,i)=>{const x=75+i*295;rect(s,x,285,270,195,'',{fill:i===3?C.green:C.pale,stroke:C.line});text(s,d[0],x+18,310,235,34,{size:21,bold:true,color:C.teal,align:'center'});text(s,d[1],x+22,360,225,85,{size:18,color:C.ink,align:'center'});});
 text(s,'The example output in this presentation comes from synthetic sample data.',100,550,1080,38,{size:19,bold:true,color:C.muted,align:'center'});
}
// 16. Future scope
{
 const s=base(15,'Future scope');
 const next=['Improve support for real-world transaction identifiers and data-quality reporting.','Add richer filters and pagination to the rule-review interface.','Measure runtime and memory across repeated benchmark datasets.','Strengthen deployment configuration, authentication, and operational monitoring.','Evaluate association stability across time periods and store segments.'];
 next.forEach((v,i)=>{const y=160+i*87;shape(s,'ellipse',100,y+8,38,38,i===0?C.teal:C.blue);text(s,String(i+1),100,y+8,38,38,{size:15,bold:true,color:C.white,align:'center'});text(s,v,165,y,990,58,{size:20,color:C.ink});});
}
// 17. References
{
 const s=base(16,'References');
 const left='[1] Agrawal, Imieliński & Swami. “Mining Association Rules between Sets of Items in Large Databases.” SIGMOD, 1993. doi:10.1145/170035.170072.\n\n[2] Agrawal & Srikant. “Fast Algorithms for Mining Association Rules in Large Databases.” VLDB, 1994, pp. 487–499.\n\n[3] Han, Pei & Yin. “Mining Frequent Patterns without Candidate Generation.” SIGMOD Record, 29(2), 2000. doi:10.1145/335191.335372.\n\n[4] Han, Pei & Yin. “Mining Frequent Patterns without Candidate Generation: A Frequent-Pattern Tree Approach.” Data Mining and Knowledge Discovery, 8, 2004.\n\n[5] Tan, Kumar & Srivastava. “Selecting the Right Objective Measure for Association Analysis.” Information Systems, 29(4), 2004.\n\n[6] Geng & Hamilton. “Interestingness Measures for Data Mining: A Survey.” ACM Computing Surveys, 38(3), 2006.';
 const right='[7] Hahsler & Hornik. “New Probabilistic Interest Measures for Association Rules.” Intelligent Data Analysis, 11(5), 2007.\n\n[8] mlxtend. Association Rules user guide. rasbt.github.io/mlxtend/user_guide/frequent_patterns/association_rules/\n\n[9] FastAPI. Tutorial documentation. fastapi.tiangolo.com/tutorial/\n\n[10] React. Reference documentation. react.dev/reference/react\n\n[11] pandas. User Guide. pandas.pydata.org/docs/user_guide/\n\n[12] MongoDB. PyMongo Driver documentation. mongodb.com/docs/languages/python/pymongo-driver/current/';
 text(s,left,75,150,550,490,{size:15,color:C.ink,valign:'top'});
 text(s,right,660,150,550,490,{size:15,color:C.ink,valign:'top'});
}
// 18. Thank you
{
 const s=p.slides.items[17];s.background.fill=C.white;
 text(s,'Thank you',100,196,1080,90,{size:52,bold:true,color:C.navy,align:'center'});
 shape(s,'rect',455,309,370,4,C.blue);
 text(s,'Questions and discussion',180,350,920,50,{size:26,color:C.teal,align:'center'});
 text(s,'Retail Market Basket Analyzer',180,465,920,34,{size:20,bold:true,color:C.navy,align:'center'});
 text(s,'ADA23IN101  |  Ashwin A and Nikilesh J R',180,509,920,30,{size:18,color:C.muted,align:'center'});
}
const pptx=await PresentationFile.exportPptx(p); await pptx.save(OUT);
await fs.mkdir(`${W}/pptx-build/final-render`,{recursive:true});
for(let i=0;i<p.slides.items.length;i++){
 const blob=await p.export({slide:p.slides.items[i],format:'png',scale:1});
 await fs.writeFile(`${W}/pptx-build/final-render/slide-${String(i+1).padStart(2,'0')}.png`,new Uint8Array(await blob.arrayBuffer()));
}
const montage=await p.export({format:'png',scale:0.25,montage:true});
await fs.writeFile(`${W}/pptx-build/final-render/montage.png`,new Uint8Array(await montage.arrayBuffer()));
console.log('SAVED',OUT,'slides',p.slides.items.length,'deleted',remove.length);

