/* YemAkıl Rasyon — öz-denetim (her yayından önce çalıştır)
   node test/selftest.js [dosya]   → varsayılan ../index.html veya argüman
   Çıkış kodu 0 = geçti, 1 = en az bir kontrol başarısız.
   Kural: düzeltilen her hata buraya bir "altın örnek" olarak eklenir. */
const fs=require('fs'),path=require('path');
const FILE=process.argv[2]||path.join(__dirname,'..','index.html');
const html0=fs.readFileSync(FILE,'utf8');
/* bölünmüş dosyalar (veri.js, saglik.js …): yerel <script src> içerikleri de denetime katılır */
const SRCS=[...html0.matchAll(/<script src="([^":]+\.js)"><\/script>/g)].map(m=>m[1]);const srcTxt=SRCS.map(f=>{try{return fs.readFileSync(path.join(path.dirname(FILE),f),'utf8')}catch(e){return null}});
const html=html0+'\n'+srcTxt.filter(Boolean).join('\n');
const R=[];function ok(name,cond,info){R.push({name,ok:!!cond,info:info||''});}
function approx(v,lo,hi){return typeof v==='number'&&isFinite(v)&&v>=lo&&v<=hi}

/* ---------- 1. Sözdizimi ---------- */
let synErr=null;[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{try{new Function(m[1])}catch(e){synErr=i+': '+e.message}});
ok('JS sözdizimi',!synErr,synErr);
SRCS.forEach((f,i)=>{let er=null;if(srcTxt[i]===null)er='dosya yok';else try{new Function(srcTxt[i])}catch(e){er=e.message}ok('Ayrı dosya yüklenebilir ve sözdizimi doğru: '+f,!er,er)});

/* ---------- 2. Statik tutarlılık ---------- */
ok('Eski sekme adı "Yem yap" kalmamış',!/Yem yap\b/.test(html));
ok('"N katkıdan M\'si" kalıbı yok',!/katkıdan '\+|ölçütten '\+/.test(html));
ok('"abomasum" yazımı yok',!/abomasum/.test(html));
const ver=(html.match(/opacity:\.75">v(\d+)</)||[])[1];ok('Sürüm etiketi var',!!ver,'v'+ver);
const sw=fs.existsSync(path.join(__dirname,'..','sw.js'))?fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8'):'';
ok('SW önbellek adı sürüm formatında',/yemakil-v\d+/.test(sw)||!sw);

/* ---------- 3. Tarayıcı testleri ---------- */
(async()=>{
 let chromium;try{chromium=require('playwright').chromium}catch(e){ok('playwright yüklü',false,'npm i playwright');return done()}
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+path.resolve(FILE));await p.waitForTimeout(600);
 const E=(fn,...a)=>p.evaluate(fn,...a);
 /* veri tutarlılığı (uygulama içi tablolar) */
 const st=await E(()=>{const out={};
  out.mkKeys=MKP.flatMap(P=>[...(P.items||[]),...(P.koyun||[]),...(P.besi||[]),...(P.buzagi||[])].map(i=>i[0])).filter(k=>!MKA[k]||!MKR[k]);
  out.mkx=MKP.filter(P=>!P.eff||!P.info||!P.mgmt).map(P=>P.k);
  out.types=TYPES.filter(k=>!PANEL[k]||!SEGN[k]||!PRE[k]||!document.getElementById(PANEL[k]));
  out.ylim=[];Object.keys(YLIM).forEach(g=>YLIM[g].forEach(r=>{if(!S.feeds.some(x=>r[0].test(x.fam||x.n)))out.ylim.push(g+':'+r[0])}));
  out.info=Object.keys(INFO).filter(k=>!EXP[k]);
  out.xr=Object.keys(XR).filter(k=>['k','mg','s','na','cu','zn','se'].some(q=>!XR[k][q]));
  out.feeds=S.feeds.filter(x=>!(x.dm>0)||!(x.me>=0)||!(x.cp>=0)||!(x.ndf>=0)).map(x=>x.n);
  out.premSe=(MX['Premiks süt']||{}).se;out.premRecipe=PMXT['Premiks süt'].t.se/(PMXT['Premiks süt'].r/100);
  return out});
 ok('Premiks sorun listesi: her katkının MKA ve MKR kaydı var',!st.mkKeys.length,st.mkKeys.join(','));
 ok('Premiks kartları: Sonuç/Yönetim/Bilgi dolu',!st.mkx.length,st.mkx.join(','));
 ok('Sekme/panel/ön ayar eşleşmesi',!st.types.length,st.types.join(','));
 ok('YLIM kuralları en az bir hammaddeyle eşleşiyor',!st.ylim.length,st.ylim.join(' | '));
 ok('INFO ⊆ EXP (öğretici notlar gerçek parametrelere bağlı)',!st.info.length,st.info.join(','));
 ok('XR mineral profilleri tam',!st.xr.length,st.xr.join(','));
 ok('Kütüphanede eksik KM/ME/HP/NDF yok',!st.feeds.length,st.feeds.slice(0,5).join(','));
 ok('Kütüphane premiks Se = premiks reçetesi Se',Math.abs(st.premSe-st.premRecipe)<1,st.premSe+' vs '+st.premRecipe);

 /* SÜT: 650 kg Holstein, 35 kg süt, %3,8 yağ — NASEM 2021 tablo: KMA 22–25 kg, NEL 1,55–1,75 */
 const d=await E(()=>{S.type="sut";S.breed="hol";S.b={bw:650,milk:35,fat:3.8,pr:3.2,wk:12,price:0,par:2,bcs:3,dp:60,mode:"lak"};save();var r=REQ();return {dmi:r.dmi,nel:r.req/r.dmi,cp:r.cp}});
 ok('Süt KMA (650 kg/35 kg) 22–25 kg',approx(d.dmi,22,25),JSON.stringify(d));
 ok('Süt NEL yoğunluğu 1,55–1,8',approx(d.nel,1.55,1.8),JSON.stringify(d));
 /* BESİ: 400 kg, NEma 1,55 → KMA %2,2–2,6 CA (NASEM 2016) */
 const bf=await E(()=>{S.type="besi";S.bb=Object.assign(S.bb||{},{bw:400,adg:1400,sex:"b",breed:"sim",temp:20,bcs:3});save();return {dmi:bDMI(nemF(2.7)),pct:bDMI(nemF(2.7))/400*100,cal:CALv()}});
 ok('Besi KMA %2,2–2,6 CA',approx(bf.pct,2.2,2.6),JSON.stringify(bf));
 ok('Besi kalibrasyon 1,0 (tartım yoksa)',bf.cal===1,String(bf.cal));
 /* KUZU: 30 kg, 300 g/gün → ME 3,5–4,5 Mcal, KMA 1,1–1,5 (NRC 2007) */
 const k=await E(()=>{S.type="koyun";S.k=Object.assign(S.k||{},{mode:"kuzu",bw:30,adg:300,sex:"e",temp:15});save();var R=KREQ();return {me:R.me,dmi:R.dmi,cp:R.cp}});
 ok('Kuzu ME 3,0–3,6 Mcal (30 kg erkek, 300 g/gün; AFRC 1993 ≈ 3,2, NRC 1985 ≈ 3,4)',approx(k.me,3.0,3.6),JSON.stringify(k));
 ok('Kuzu KMA 1,1–1,5 kg',approx(k.dmi,1.1,1.5),JSON.stringify(k));
 ok('Kuzu faz ME tavanı ≥ 3,0 (NRC bitiş yemi)',await E(()=>KPH[0].me[1]>=3.0));
 /* BUZAĞI: 45 kg, 21 gün, 6 L süt + 0,3 kg starter → 0,5–0,9 kg/gün artış */
 const c=await E(()=>{S.type="buzagi";S.c=Object.assign(S.c||{},{bw:45,age:21,bwb:40,adg:700,temp:18,meals:2});save();var R=CREQ();return {nem:R.nem,lct:R.lct}});
 ok('Buzağı >3 hafta alt kritik sıcaklık 5 °C',await E(()=>{S.c.age=30;return CREQ().lct===5}));
 ok('Buzağı <3 hafta alt kritik sıcaklık 15 °C',await E(()=>{S.c.age=10;return CREQ().lct===15}));
 /* Kuzu/buzağı yem sınırları: PTK ve üre %0 */
 const yl=await E(()=>{var x=yFeed("Pamuk tohumu küspesi"),u=yFeed("Üre");return [yLimOf(x,"kuzu").mx,yLimOf(x,"buzagi").mx,yLimOf(u,"kuzu").mx,yLimOf(u,"buzagi").mx,yLimOf(x,"sut").mx]});
 ok('PTK/üre kuzu ve buzağıda %0',yl[0]===0&&yl[1]===0&&yl[2]===0&&yl[3]===0,JSON.stringify(yl));
 /* Koyun çözücüsü sığır premiksi almaz */
 ok('NOTK sığır premiksini dışlar',/NOTK=\/\^\([^/]*Premiks \(süt\|besi\|buzağı\)/.test(html));
 ok('NOTC buzağıda PTK ve üreyi dışlar',/NOTC=\/\^\([^/]*\|PTK\|Üre\|/.test(html));

 /* ÇİFTLİK YEMİ: Süt 19 LP çözümü 14/14 */
 await E(()=>{S.type="yem";save();renderSeg();showPanels()});await p.waitForTimeout(300);
 await E(()=>{var pr={"Arpa":12,"Mısır":13,"Buğday":11,"Buğday kepeği":9,"Mısır kepeği":9,"Ayçiçeği küspesi":11,"Soya küspesi":22,"Pamuk tohumu küspesi":12,"DDGS":14,"Kuru pancar posası":9,"Melas":8,"Kireç taşı":3,"Dikalsiyum fosfat":25,"Tuz":3,"Üre":20};S.ym.ing.forEach(r=>{var x=yFeed(r.n);r.kg="";Object.keys(pr).forEach(k=>{if(x.n.indexOf(k)===0&&x.n.indexOf(k+" kepeği")!==0)x.p=pr[k]})});S.ym.premKg=5;save();renderYem()});
 await p.selectOption('#ymPre','Süt 19');await p.waitForTimeout(200);
 /* kg girilmeden "Asistan düzeltsin": parti 5 kg olmamalı */
 await p.click('#ymCalc');await p.waitForTimeout(4000);
 const t1=await E(()=>({batch:S.ym.batch,txt:(document.getElementById('ymOut').innerText.match(/\d+ hedeften \d+/)||[''])[0]}));
 ok('Kg girilmeden LP: parti 1000 kg ve çözüm var',t1.batch>=1000&&/14 hedeften 14/.test(t1.txt),JSON.stringify(t1));
 /* elle karışım + asistan + uygula: 2 turda ≥ 12/14 */
 await E(()=>{var kg={"Arpa":350,"Mısır":250,"Buğday kepeği":200,"Ayçiçeği küspesi":150,"Kireç taşı":15,"Tuz":7,"Melas":60};S.ym.ing.forEach(r=>{var x=yFeed(r.n);r.kg="";Object.keys(kg).forEach(k=>{if(x.n.indexOf(k)===0&&x.n.indexOf(k+" kepeği")!==0)r.kg=kg[k]})});save();renderYem()});
 await p.click('#ymManual');await p.waitForTimeout(1500);
 const a0=await E(()=>(document.getElementById('ymOut').innerText.match(/(\d+) hedeften (\d+)/)||[]).slice(1).map(Number));
 ok('Elle karışım değerlendirildi',a0.length===2,JSON.stringify(a0));
 const hasPlan=await p.$('#ymApplyAdv');ok('Asistan örnek rasyon üretti',!!hasPlan);
 if(hasPlan){await p.click('#ymApplyAdv');await p.waitForTimeout(2000);const a1=await E(()=>(document.getElementById('ymOut').innerText.match(/(\d+) hedeften (\d+)/)||[]).slice(1).map(Number));ok('Öneri uygulanınca hedef sayısı artıyor',a1[1]>a0[1],a0[1]+'→'+a1[1]);
  const tuz=await E(()=>document.getElementById('ymOut').innerText.match(/Tuz\s+\d+\s+\d+ \(−/));ok('Na normalken tuz azaltılmıyor',!tuz);}
 /* Enerji takası çalışıyor (kcal) */
 ok('ME takası kcal ile hesaplanıyor',/\(T\.me-me\),"me"/.test(html));
 /* Simplex negatif sağ taraf */
 const sx=await E(()=>{var x=simplex([1,2],[{a:[1,1],op:"=",b:1},{a:[-1,0],op:">=",b:-0.3}]);return x});
 ok('Simplex negatif b doğru çözüyor',sx&&Math.abs(sx[0]-0.3)<1e-6,JSON.stringify(sx));

 /* PREMİKS: tüm sorun × hayvan kombinasyonları NaN üretmez */
 await E(()=>{S.type="mikro";save();renderSeg();showPanels()});await p.waitForTimeout(300);
 const mk=await E(()=>{var bad=[];["sut","besi","koyun","buzagi"].forEach(an=>{S.mk.an=an;S.mk.n=10;S.mk.conc=an==="koyun"?0.6:an==="buzagi"?1.5:8;S.mk.days=30;MKP.filter(P=>P.a.indexOf(an)>=0).forEach(P=>{S.mk.sel=[P.k];try{mikroSolve();var t=document.getElementById('mkOut').innerText;if(/NaN|undefined/.test(t))bad.push(an+':'+P.k);if(an==="koyun"&&/Bakır sülfat/.test(t))bad.push('koyun-cu:'+P.k)}catch(e){bad.push(an+':'+P.k+':'+e.message)}})});return bad});
 ok('Premiks reçeteleri: NaN yok, koyunda bakır yok',!mk.length,mk.join(','));
 /* Etiket ayrıştırma altın örnekleri */
 const lb=await E(()=>{var L=LB_def();L.v={};lbParse("SÜT PREMİKSİ\nVitamin A (3a672) 1.000.000 IU\nVitamin D3 (E671) 200.000 IU\nVitamin E (3a700) 4.000 mg\nBakır (Bakır sülfat) 1.500 mg\nSelenyum (Sodyum selenit) 40 mg\nİyot (Kalsiyum iyodat) 100 mg\nMagnezyum % 5\nSodyum % 6\nKalsiyum % 16\nTavsiye edilen günlük doz: 120 g/baş/gün");return {v:L.v,dose:L.dose,ton:L.ton}});
 ok('Premiks etiketi: A/D/E/Cu/Se/I/Mg/Na/Ca/doz doğru',lb.v.vitA===1e6&&lb.v.vitD===2e5&&lb.v.vitE===4000&&lb.v.cu===1500&&lb.v.se===40&&lb.v.i===100&&lb.v.mg===5&&lb.v.na===6&&lb.v.ca===16&&lb.dose===120&&!lb.ton,JSON.stringify(lb));
 ok('lbNum: 1.000.000→1e6, 0,3→0.3, 1 000→1000, 1.000,5→1000.5',await E(()=>lbNum('1.000.000 IU')===1e6&&lbNum('0,3 mg')===0.3&&lbNum('1 000 mg')===1000&&lbNum('1.000,5')===1000.5));
 const fl=await E(()=>{var L=FL_def();L.v={};flParse("SÜT YEMİ 19\nKullanım: günde 8 kg\nÖnemli: serin yerde saklayın\nAnalitik bileşenler: Ham protein %19, Ham yağ %3,5, Ham selüloz %11, Ham kül %9, Nem %12, Kalsiyum %1,1, Fosfor %0,55, Sodyum %0,3\nSelenyum (Sodyum selenit) 0,3 mg");return {v:L.v,t:L.t}});
 ok('Yem etiketi: kullanım/önemli satırları kül/nem sanılmıyor; selenit→Se',fl.v.kul===9&&fl.v.nem===12&&fl.v.se===0.3&&fl.v.na===0.3&&fl.t==="sut19",JSON.stringify(fl));
 const gb=await E(()=>{var L=FL_def();L.v={};flParse("Ham protein ©: 19,00| e672 vitamina :90001u\nham yag :%383 | 27490 vitamine :28mg | es çinko 40 mg\nsodyum i x 50 * 17 mg e2 iyot 0,8 mg");return {v:L.v,flag:L.flag}});
 ok('Karışık OCR metni: sütun ayracı aşılmıyor, eksik virgül ve şüpheli değer ⚠ işaretli',gb.v.hp===19&&gb.v.hy===3.83&&gb.flag.hy&&gb.flag.na&&gb.v.zn===undefined&&(gb.v.i===undefined||gb.v.i===0.8)/* V108: aynı satırdaki 'iyot 0,8 mg' gerçek etikette de var; ayraç ötesi (zn) hâlâ okunmaz */,JSON.stringify(gb));
 const cw=require('fs').readFileSync(__dirname+'/fixtures/cemre-ocr-words.json','utf8');
 const seg=await E((cw)=>{var txt=ocrSegment(JSON.parse(cw));var L=FL_def();L.v={};S.mk.fl=L;var r=flParse(txt);return {n:r.n,v:S.mk.fl.v,t:S.mk.fl.t,flag:S.mk.fl.flag}},cw);
 ok('Gerçek etiket (Cemre, Tesseract kelime kutuları): sütunlar anahtar kelimeye göre ayrılıyor, ≥12 alan; A 9000, yağ 3,83, Na 0,36, Zn 40, kül 6,92, tür süt yemi; hatalı HP ⚠',seg.n>=12&&seg.v.vitA===9000&&seg.v.hy===3.83&&seg.v.na===0.36&&seg.v.zn===40&&seg.v.kul===6.92&&seg.v.co===0.15&&seg.t==="sut19"&&seg.flag.hp,JSON.stringify(seg));
 ok('ocrNormTxt: 90001U→9000 iu, "9% 0,36"→"% 0,36", "19,00% 3" korunur',await E(()=>ocrNormTxt('A :90001U')==='a :9000 iu'&&ocrNormTxt('SODYUM 9% 0,36')==='sodyum % 0,36'&&ocrNormTxt('x 19,00% 3')==='x 19,00% 3'));
 ok('"Temel besin değerleri" yazısı besi yemi sanılmıyor',await E(()=>{var L=FL_def();L.v={};S.mk.fl=L;flParse("CEMRE PLUS SÜT YEMİ\nTEMEL BESİN DEĞERLERİ\nHam protein %19");return S.mk.fl.t==="sut19"}));
 const ai=await E(()=>new Promise(res=>{AI_def().key="sk-test";AI_def().model="m";window.fetch=function(u,o){var body=o&&o.body?JSON.parse(o.body):null;var j={content:[{type:"text",text:'```json\n{"name":"Test Süt","type":"sut19","v":{"hp":19,"hy":"3,83","na":0.36,"zn":40},"unsure":["hp"],"ingredients":"mısır, arpa"}\n```'}]};if(body&&body.messages&&body.messages[0].content[0].type!=="image")j={error:{message:"no image"}};return Promise.resolve({ok:true,status:200,json:function(){return Promise.resolve(j)}})};var c=document.createElement('canvas');c.width=40;c.height=40;c.toBlob(function(bl){var L=FL_def();L.v={};S.mk.fl=L;document.querySelector('#seg button[data-t="mikro"]').click();setTimeout(function(){var el=document.getElementById('flAiFile');var dt=new DataTransfer();dt.items.add(new File([bl],'a.jpg',{type:'image/jpeg'}));el.files=dt.files;el.onchange.call(el);setTimeout(function(){var F=FL_def();res({v:F.v,flag:F.flag,t:F.t,name:F.name,st:document.getElementById('flStat').textContent,out:(document.getElementById('flOut').innerText||'').length})},800)},300)},'image/jpeg')}));
 ok('Yapay zekâ ile etiket okuma (sahte API): JSON çözülüyor, alanlar/tür/ad doluyor, şüpheli ⚠, değerlendirme çalışıyor',ai.v.hp===19&&ai.v.hy===3.83&&ai.v.zn===40&&ai.flag.hp&&ai.t==="sut19"&&ai.name==="Test Süt"&&/4 alan/.test(ai.st)&&ai.out>100,JSON.stringify(ai));
 const cm=await E(()=>{var L=FL_def();L.saved=[];L.name="A yem";L.t="sut19";L.price=14;L.v={hp:19,hy:3.83,hs:7.47,kul:6.92,zn:40,se:0.3};save();feedLabelEval();window.prompt=function(){return "A yem"};document.getElementById('flSave').click();L.name="B yem";L.price=11.5;L.v={hp:19,hy:2.5,hs:12,kul:9.5,zn:30};save();feedLabelEval();document.getElementById('flCmpGo').click();var t=document.getElementById('flCmpOut').innerText;var A=L.saved[0],B=window.flLast;var vd=flCmpVerdict(A,B).join(' ');L.saved=[];save();return {t:t,vd:vd,w:document.documentElement.scrollWidth,rows:flCmpRows(A,B).length}});
 ok('Etiket karşılaştırma: tablo + çözüm asistanı (enerji farkı, dolgu, TL/Mcal, günlük hesap, sonuç), 390 px',/A yem yaklaşık 3\d\d kcal/.test(cm.vd)&&/Dolgu/.test(cm.vd)&&/TL\/Mcal/.test(cm.vd)&&/Günlük hesap/.test(cm.vd)&&/Sonuç/.test(cm.vd)&&cm.rows>=8&&cm.w<=390&&/Karşılaştırmayı paylaş/.test(cm.t),JSON.stringify({w:cm.w,rows:cm.rows,vd:cm.vd.slice(0,120)}));
 const kd=await E(()=>{var t=S.feeds.filter(function(x){return /Tahıl Kardeşliği/.test(x.n)})[0],pr=S.feeds.filter(function(x){return /Protein Kardeşliği/.test(x.n)})[0];return {t:t&&[t.dm,t.cp,t.me,staOf(t)],p:pr&&[pr.dm,pr.cp,pr.me,staOf(pr)]}});
 ok('Yemci Bey yaş analizi kütüphanede: Tahıl Kardeşliği KM 88,59 / HP 15,2 KM / nişasta 57; Protein Kardeşliği KM 88,18 / HP 41,7 KM / nişasta 11',kd.t&&kd.p&&kd.t[0]===88.59&&Math.abs(kd.t[1]-15.19)<0.05&&kd.t[3]===57&&kd.p[0]===88.18&&Math.abs(kd.p[1]-41.71)<0.05&&kd.p[3]===11,JSON.stringify(kd));
 const cem=await E(()=>flCalc({hp:18.03,hy:3.95,hs:7.52,kul:6.6,nem:12.02}).sta);
 ok('Nişasta tahmini: Cemre Plus NIR %29,4 (etiket HP18/HY3,95/HS7,5/kül6,6) → 25–33',approx(cem,25,33),String(cem));
 const fc=await E(()=>flCalc({hp:19,hy:3.5,hs:11,kul:9,nem:12}));
 ok('Yem etiketi ME tahmini 2.550–2.900 kcal/kg KM',approx(fc.meKM,2550,2900),JSON.stringify({me:fc.meKM,sta:fc.sta}));
 /* ===== V100 bağımsız denetim altın örnekleri ===== */
 const g=await E(()=>{const o={};
  lbParse("Vitamin A 1.000.000 IU\nKolin 20.000 mg\nNiasin 6.000 mg");lbParse("Vitamin A 500.000 IU\nÇinko 6.000 mg");o.lb2=Object.assign({},LB_def().v);
  lbParse("VİTAMİN AD3E PREMİKSİ - Net 25 kg\nVitamin A 1.000.000 IU");o.ad3e=LB_def().v.vitA;
  lbParse("Kalsiyum 160 g/kg\nFosfor 40 g/kg\nSodyum 60 g/kg");o.lbg=Object.assign({},LB_def().v);
  lbParse("Vitamin A 1,000,000 IU/kg\nVitamin D3 200,000 IU/kg\nVitamin E 3,000 mg/kg");o.thou=Object.assign({},LB_def().v);
  lbParse("Vitamin A 1000 KIU/kg");o.kiu=LB_def().v.vitA;
  flParse("Yem maddeleri: Mısır, Arpa, Bitkisel yağ %2, Kalsiyum karbonat %1,5, Sodyum bikarbonat %1, Magnezyum oksit %0,3\nHam protein %19\nHam yağ %3,5\nHam selüloz %9\nHam kül %8\nKalsiyum %1,0\nSodyum %0,3\nMagnezyum %0,25");o.ing=Object.assign({},FL_def().v);
  flParse("Ham protein 180 g/kg\nHam yağ 35 g/kg\nHam selüloz 90 g/kg");o.gkg=Object.assign({},FL_def().v);
  flParse("HP:18,5 HY:3 HS:9 HK:8 Nem:12");o.abbr=Object.assign({},FL_def().v);
  flParse("Ham protein %19 Ham yağ %3,5 Ham selüloz %9 Ham kül %8 Nem %12");o.one=Object.assign({},FL_def().v);
  flParse("Crude protein 18% / Fat 4% / Fibre 8% / Ash 7%");o.en=Object.assign({},FL_def().v);
  o.st=[flCalc({hp:19,hy:3.5,hs:8.9,kul:8,nem:12}).sta,flCalc({hp:19,hy:3.5,hs:9,kul:8,nem:12}).sta];
  var L=FL_def();L.t="sut19";L.v={hp:19};feedLabelEval();o.miss=document.getElementById('flOut').innerText;
  L.v={hp:19,hy:3.5,hs:9,kul:8,nem:12,vitA:20000};feedLabelEval();o.vitA=(document.getElementById('flOut').innerText.match(/A vitamini[^\n]*/)||[''])[0];
  var P=MKP.filter(x=>x.k==="beyazkas")[0];o.bk=[mkItems(P,"sut")[0][1],mkItems(P,"koyun")[0][1]];
  o.ysh=[ySheep({grp:"kuzu",premN:"Premiks süt"}),ySheep({grp:"sut",premN:"Premiks süt"})];
  S.type="besi";var bb=B_def();Object.assign(bb,{bw:350,adg:1300,temp:20,bcs:3,ion:0,breed:"hol",sex:"b",hf:0});var G=()=>bGain(8.8,8.8*2.7,8.8*130).adg;o.g20=G();bb.temp=30;o.g30=G();o.d30=bDMI(nemF(2.7));bb.temp=20;o.d20=bDMI(nemF(2.7));bb.ion=1;o.gi=G();bb.ion=0;bb.bcs=9;B_def();o.bcs=bb.bcs;bb.bcs=3;
  S.b.bcs=8;bDef();o.bcsS=S.b.bcs;S.b.bcs=3;
  o.sx=simplex([1e6,2e6],[{a:[1,1],op:"=",b:1},{a:[-1,0],op:">=",b:-0.3}]);o.urea=FAM["Üre"][0][3];
  S.type="koyun";S.k=Object.assign(S.k||{},{mode:"gebe",bw:15,nl:3,dg:147,temp:15});o.gebe=KREQ().me;
  S.k=Object.assign(S.k,{mode:"kuzu",bw:10,adg:250,sex:"e"});var R=KREQ();o.lamb=R.me/R.dmi;
  return o});
 ok('Etiket: yeni çözümleme önceki etiketin değerlerini taşımıyor',JSON.stringify(g.lb2)==='{"vitA":500000,"zn":6000}',JSON.stringify(g.lb2));
 ok('Etiket: "Vitamin AD3E premiksi" başlığı A vitamini sanılmıyor',g.ad3e===1e6,String(g.ad3e));
 ok('Etiket: g/kg değerleri % alanlarına çevriliyor (premiks Ca 16/P 4/Na 6, yem HP 18/HY 3,5/HS 9)',g.lbg.ca===16&&g.lbg.p===4&&g.lbg.na===6&&g.gkg.hp===18&&g.gkg.hy===3.5&&g.gkg.hs===9,JSON.stringify([g.lbg,g.gkg]));
 ok('Etiket: İngilizce binlik virgül ve KIU (1,000,000 IU→1e6; 3,000 mg→3000; 1000 KIU→1e6)',g.thou.vitA===1e6&&g.thou.vitD===2e5&&g.thou.vitE===3000&&g.kiu===1e6,JSON.stringify([g.thou,g.kiu]));
 ok('Etiket: hammadde listesi (kalsiyum karbonat %1,5, bitkisel yağ %2) analiz değerini kapmıyor',g.ing.hy===3.5&&g.ing.ca===1&&g.ing.na===0.3&&g.ing.mg===0.25,JSON.stringify(g.ing));
 ok('Etiket: HP/HY/HS/HK kısaltmaları, tek satır ve "Fat/Fibre/Ash" okunuyor',g.abbr.hp===18.5&&g.abbr.kul===8&&g.one.hy===3.5&&g.one.nem===12&&g.en.hy===4&&g.en.hs===8&&g.en.kul===7,JSON.stringify([g.abbr,g.one,g.en]));
 ok('Nişasta tahmini HS 8,9→9,0 sıçramıyor (<1 puan)',Math.abs(g.st[0]-g.st[1])<1,JSON.stringify(g.st));
 ok('Eksik HY/HS/kül 0 sayılmıyor: değerlendirme eksikleri söylüyor',/Eksik etiket değeri/.test(g.miss)&&!/ME tahmini/.test(g.miss),g.miss.slice(0,120));
 ok('A vitamini 20.000 IU: referans "8.000–15.000 yüksek" (kendisiyle çelişen "≥" yok)',/8\.000–15\.000/.test(g.vitA)&&!/≥/.test(g.vitA),g.vitA);
 ok('Beyaz kas: inek 3 g Se maya, koyun 0,15 g (≤0,5 mg/kg KM)',g.bk[0]===3&&g.bk[1]===0.15,JSON.stringify(g.bk));
 ok('Koyun bakır sınırı premiks adına değil hayvan grubuna bağlı',g.ysh[0]===true&&g.ysh[1]===false,JSON.stringify(g.ysh));
 ok('Kuzuya pamuk tohumu/PTK/üre önerilmiyor (NOTKL)',/NOTKL=new RegExp\(NOTK\.source\.slice\(0,-1\)\+"\|Pamuk tohumu\|PTK\|Üre\)"\)/.test(html)&&/kuzu\(\)\?NOTKL:NOTK/.test(html));
 ok('Besi: sıcakta (30 °C) artış ve KMA 20 °C\'den yüksek değil',g.g30<=g.g20&&g.d30<g.d20,JSON.stringify([g.g20,g.g30,g.d20,g.d30]));
 ok('Besi: iyonofor aynı yemde artışı yükseltiyor (NEm +%12)',g.gi>g.g20,JSON.stringify([g.g20,g.gi]));
 ok('VKS 1–5 ile sınırlı (besi 9→5, süt 8→5)',g.bcs===5&&g.bcsS===5,JSON.stringify([g.bcs,g.bcsS]));
 ok('Simplex büyük maliyetlerde de çözüyor (Big-M ölçekli)',g.sx&&Math.abs(g.sx[0]-0.3)<1e-6,JSON.stringify(g.sx));
 ok('Üre HP %290 (KM)',g.urea===290,String(g.urea));
 ok('Gebe hafif koyunda NaN yok',isFinite(g.gebe)&&g.gebe>0,String(g.gebe));
 ok('Kuzu 10 kg/250 g: ME yoğunluğu ≤ 4 Mcal/kg KM (CSIRO L≤3)',g.lamb<=4,String(g.lamb));
 ok('Kuru dönem anyonik rasyon: Ca hedefi 1,0–1,5 ve DCAD sınırı çözücüde',/\["ca",AN\?1\.0:s\.ca,AN\?1\.5:/.test(html)&&/dc\(x\)-XD\[0\]/.test(html));
 ok('Gebe düve MP hedefi gebelik MP\'sini içeriyor',/mp:mpm\+mpg\+\(b\.hf&&b\.dp>=190\?pregMP\(b\.dp\):0\)/.test(html));
 ok('Protein ekle/azalt önerisi KM seyrelmesini hesaba katıyor',/gap\*dm\/\(pf\.cp-R\.cp\)/.test(html)&&/-gap\*dm\/\(pr\.cp-R\.cp\)/.test(html));
 ok('Süt çözücüsü koyun/buzağı premiksi önermez',/var NOTS=\/\^\(Premiks \(koyun\|buzağı\)\|/.test(html));
 ok('API anahtarı alanı gizli (password)',/type="password" id="'\+kind\+'AiKey"/.test(html));
 ok('SW hatalı yanıtı önbelleğe yazmıyor',/if\(!r\.ok\)return caches\.match/.test(sw));
 /* Mikro: türe göre kesif yem varsayılanı */
 await E(()=>{S.type="mikro";S.mk.an="sut";S.mk.conc=8;save();renderSeg();showPanels();renderMikro()});await p.waitForTimeout(200);
 await p.selectOption('#mkAn','koyun');await p.waitForTimeout(200);
 ok('Mikro: koyuna geçince kesif yem 0,6 kg/baş/gün',await E(()=>S.mk.conc===0.6),String(await E(()=>S.mk.conc)));
 /* Premiks reçetesi düşük katımda uyarı */
 const pm=await E(()=>{var d=document.getElementById('pmxR');if(!d)return 'yok';d.value='0.04';d.dispatchEvent(new Event('input',{bubbles:true}));return 1});await p.waitForTimeout(1000);const pm2=await E(()=>{var t=document.getElementById('pmxDet')?document.getElementById('pmxDet').textContent:'';var d=document.getElementById('pmxR');d.value='0.4';d.dispatchEvent(new Event('input',{bubbles:true}));return t});await p.waitForTimeout(1000);
 ok('Premiks reçetesi %0,04 katımda "1 ton premikse sığmıyor" uyarısı',pm!=='yok'&&/sığmıyor/.test(pm2),String(pm2).slice(0,80));
 /* Paylaşım metninde HTML kaçışı yok */
 const rt=await E(()=>{S.type="sut";save();renderSeg();showPanels();var x=S.feeds.filter(y=>y.n==="Arpa")[0]||S.feeds[0];var old=x.n;x.n="Arpa & Buğday <ezme>";x.on=true;x.kg=3;var t=reportText();x.n=old;return t});
 ok('Paylaşım metni ham metin (&amp; yok)',/Arpa & Buğday <ezme>/.test(rt)&&!/&amp;/.test(rt));
 /* Negatif kg kabul edilmiyor */
 ok('Negatif kg/fiyat 0\'a çekiliyor',/S\.feeds\[i\]\[k\]=Math\.max\(0,num\(el\.value\)\)/.test(html)&&/x\[k\]=Math\.max\(0,num\(el\.value\)\)/.test(html));
 /* V103: çözüm önerisi ↔ alt tablo tutarlılığı, çiftlik rasyonuna dönüş, referans düzeltmeleri */
 const setR=async(feeds,milk)=>{await E(([feeds,milk])=>{S.type="sut";Object.assign(S.b,{bw:650,milk:milk,fat:3.7,pr:3.2,wk:10,mode:"lak",dp:0});S.fsnap=null;S.undo=null;S.feeds.forEach(x=>{x.on=false;x.kg=0});feeds.forEach(([n,kg])=>{var x=S.feeds.filter(y=>y.n.indexOf(n)===0)[0];x.on=true;x.kg=kg});save();renderSeg();showPanels();renderFarm();renderCmp()},[feeds,milk]);await p.click('#tabs button[data-t="3"]');await p.waitForTimeout(300)};
 const solve=async()=>{await E(()=>{document.getElementById('solOut').innerHTML='';document.getElementById('solBtn').click()});await p.waitForFunction(()=>/Parametre karşılaştırması/.test(document.getElementById('solOut').innerText),null,{timeout:15000}).catch(()=>{});return E(()=>document.getElementById('solOut').innerText)};
 await setR([["Mısır silajı",30],["Kuru yonca",3],["Mısır tane",7],["Soya küspesi",3.5],["Bypass yağ",0.6]],30);
 const lys0=await E(()=>MPsut(metrics(curItems())).lys);const so=await solve();
 ok('Çözüm önerisinde "Ek parametreler" tablosu (ham yağ, lizin, mineral)',/Ek parametreler/.test(so)&&/Lizin, % MP/.test(so)&&/Ham yağ, %/.test(so),so.slice(0,80));
 ok('Çözücü lizini düşürmüyor ve çelişki uyarısı yok (soya çıkarılıp lizin notu soya önermesin)',!/Lizin (daha da uzaklaşıyor|hedef dışına)/.test(so),(so.match(/Dikkat — ek[\s\S]{0,200}/)||[''])[0]);
 await p.click('#solApply');await p.waitForTimeout(400);
 const ap=await E(()=>({ee:metrics(curItems()).ee,lys:MPsut(metrics(curItems())).lys,bar:document.getElementById('farmSnap').innerText}));
 ok('Uygulanan öneride ham yağ referansta (3–7) ve lizin düşmemiş',ap.ee>=3&&ap.ee<=7&&ap.lys>=lys0-0.01,JSON.stringify({ee:ap.ee,lys:ap.lys,lys0}));
 ok('Öneri uygulanınca "Çiftlik rasyonu kayıtlı" çubuğu: şu an uygulanan öneri',/Çiftlik rasyonu kayıtlı/.test(ap.bar)&&/uygulanan öneri/.test(ap.bar),ap.bar.slice(0,120));
 await p.click('#fsFarm');await p.waitForTimeout(300);
 const fb=await E(()=>({kg:S.feeds.filter(x=>x.on).map(x=>x.kg).join(','),st:document.getElementById('farmSnap').innerText}));
 ok('"Çiftlik rasyonuna dön" eski miktarları birebir geri getiriyor',fb.kg==="30,3,7,3.5,0.6"&&/Şu an ekrandaki: çiftlik rasyonu/.test(fb.st),JSON.stringify(fb).slice(0,160));
 await p.click('#fsProp');await p.waitForTimeout(300);await p.click('#fsCmp');await p.waitForTimeout(300);
 const fsc=await E(()=>({st:document.getElementById('farmSnap').innerText,w:document.documentElement.scrollWidth}));
 ok('"Uygulanan öneriye dön" ve "Karşılaştır" (maliyet, ME, HP, ham yağ), 390 px',/uygulanan öneri/.test(fsc.st)&&/Maliyet, TL\/baş\/gün/.test(fsc.st)&&/Ham yağ/.test(fsc.st)&&fsc.w<=390,fsc.st.slice(0,100)+' w='+fsc.w);
 const fp=await E(()=>{S.type="besi";save();renderSeg();showPanels();renderCmp();var a=document.getElementById('farmSnap').innerText;S.type="sut";save();renderSeg();showPanels();renderCmp();return {besi:a,sut:document.getElementById('farmSnap').innerText}});
 ok('Kayıt hayvan türüne özel (besi sekmesinde görünmez, süte dönünce durur)',fp.besi===''&&/Çiftlik rasyonu kayıtlı/.test(fp.sut),JSON.stringify(fp).slice(0,120));
 await setR([["Mısır silajı",28],["Buğday samanı",3],["Arpa",8],["Soya küspesi",3]],28);
 const ee0=await E(()=>metrics(curItems()).ee);const so2=await solve();const ee2=(so2.match(/Ham yağ, %\t[\d,]+\t([\d,]+)/)||[])[1];
 ok('Yağı düşük rasyonda öneri ham yağı en az %3\'e getiriyor (çözücü kısıtı)',ee2&&parseFloat(ee2.replace(',','.'))>=2.95,'şimdi '+ee0.toFixed(2)+' öneri '+ee2);
 /* V104: tek tuşla tam çözüm (ek tablo + katkı planı), sıfırdan karışımda fabrika yemleri */
 await setR([["Mısır silajı",25],["Kuru yonca",5],["Mısır tane",6],["Soya küspesi",3],["Ayçiçeği küspesi",1.5]],32);const so3=await solve();
 ok('Çözüm önerisi katkı planını da veriyor (öneri rasyonu için) ve aktarma düğmesi var',/Öneri rasyonu için katkı \(mineral\/vitamin\) planı/.test(so3)&&!!(await p.$('#mmToMkSol')),so3.slice(0,60));
 ok('Çözücüde ek tablo kısıtları: yağ, peNDF, mineral üst sınırı, MP, RDP, Lys/Met',/keep\("pendf"/.test(html)&&/\["k","mg","s","na","cu","zn","se"\]/.test(html)&&/T1=Math\.min\(0\.95\*Q\.req/.test(html)&&/Rq=Math\.min\(0\.95\*Q\.rdpReq/.test(html));
 ok('Bu rasyonda öneri hiçbir ek parametreyi bozmuyor (çelişki uyarısı yok)',!/Dikkat — ek parametreler/.test(so3),(so3.match(/Dikkat — ek[\s\S]{0,160}/)||[''])[0]);
 const solIt=await E(()=>JSON.stringify(window._mmStore.sol.items));await p.click('#mmToMkSol');await p.waitForTimeout(600);
 ok('Öneri katkı planı Premiks sekmesine aktarılıyor (öneri rasyonunun eksikleri)',await E(s=>S.type==="mikro"&&JSON.stringify(S.mk.rx.items)===s,solIt));
 await E(()=>{S.mk.rx=null;save();document.querySelector('#seg button[data-t="sut"]').click()});await p.waitForTimeout(300);
 const cmx=await E(()=>{S.feeds.forEach(x=>{x.on=false;x.kg=0});[["Kuru yonca",6],["Buğday samanı",4],["Arpa",14],["Soya küspesi",24]].forEach(([n,pr])=>{var x=S.feeds.filter(y=>y.n.indexOf(n)===0)[0];x.on=true;x.p=pr});var r={};[true,false].forEach(o=>{document.getElementById('calcOwn').checked=o;document.getElementById('calc').click();r[o]=document.getElementById('out').textContent});return r});
 ok('Sıfırdan karışım fabrika yemlerimizi öncelikli dahil ediyor; kutu kapalıyken etmiyor',/bizim/.test(cmx.true)&&/Fabrika yemlerimiz karışımın/.test(cmx.true)&&!/bizim/.test(cmx.false),cmx.true.slice(0,140));
 const cz=await E(()=>{S.type="buzagi";save();renderSeg();showPanels();var it=curItems(),m=metrics(it);m.lqd=m.lqd||1;var rows=xTable(m,1).map(r=>r[0]);S.type="sut";save();renderSeg();showPanels();return rows});
 ok('Sütle beslenen buzağıda ek tabloda süt yağını içeren "Ham yağ" satırı yok',!cz.includes("Ham yağ, %"),cz.join(','));
 /* V105: sağmal inek sağlık ve döl riskleri (kaynaklı) ve risk odaklı çözüm */
 const rkSet=async(bb,fs)=>{await E(([bb,fs])=>{S.type="sut";Object.assign(S.b,{bw:650,mode:"lak",mun:0,bcsc:0,temp:""},bb);S.fsnap=null;S.feeds.forEach(x=>{x.on=false;x.kg=0});fs.forEach(([n,kg])=>{var x=S.feeds.filter(y=>y.n.indexOf(n)===0)[0];if(!x){window._rkMiss=(window._rkMiss||[]).concat(n);return}x.on=true;x.kg=kg});save();renderSeg();showPanels();renderBin();applyRef();renderFarm();renderCmp()},[bb,fs]);await p.click('#tabs button[data-t="3"]');await p.waitForTimeout(300)};
 await rkSet({milk:38,fat:3.0,pr:3.25,wk:10,bcs:2.75,bcsc:3.25,dp:0,par:2,temp:24},[["Mısır silajı",24],["Buğday samanı",0.5],["Arpa",5],["Buğday, ",3],["Mısır tane",3],["Soya küspesi",3.5],["Soya tanesi",1]]);
 const ra1=await E(()=>{var r=sutRisk(),t=document.getElementById("cmp").textContent;return {a:r.a,ra:r.ra,rfs:r.rfs,txt:t,btn:!!document.querySelector('[data-rf="acid"]'),fld:BLs().map(x=>x[0]).join(',')}});
 ok('Risk senaryosu yemleri kütüphanede',await E(()=>!(window._rkMiss||[]).length),await E(()=>(window._rkMiss||[]).join(',')));
 ok('Süt girişlerinde doğumdaki kondisyon, MUN ve hava sıcaklığı alanları var',/bcsc/.test(ra1.fld)&&/mun/.test(ra1.fld)&&/temp/.test(ra1.fld),ra1.fld);
 ok('Asidoz kartı: NRC 2001 Tablo 4-3, rumende yıkılan nişasta, DCAD, peNDF; yüksek risk ve çözüm tuşu',ra1.a>=4&&/Tablo 4-3/.test(ra1.txt)&&/Rumende yıkılan nişasta/.test(ra1.txt)&&/DCAD/.test(ra1.txt)&&/peNDF/.test(ra1.txt)&&ra1.btn,JSON.stringify({a:ra1.a,btn:ra1.btn}));
 ok('Risk kartında kaynaklı, dozlu öneriler (Zebeli 2012, Iwaniuk ve Erdman 2015)',/Zebeli 2012/.test(ra1.txt)&&/Iwaniuk ve Erdman 2015/.test(ra1.txt)&&/sodyum bikarbonat/.test(ra1.txt));
 await p.click('[data-rf="acid"]');await p.waitForTimeout(2500);
 const fa=await E(()=>document.getElementById('solOut').innerText);const am=fa.match(/Asidoz \/ süt yağı\t\S+ \((\d+)\)\t\S+ \((\d+)\)/);
 ok('"Asidoz riskine göre çöz": rasyondan gelen asidoz puanı belirgin düşüyor (≤ 3)',/Odak: asidoz/.test(fa)&&am&&+am[2]<=3&&+am[1]>=10,am?am[0]:fa.slice(0,120));
 await rkSet({milk:36,fat:4.7,pr:3.0,wk:2,bcs:3.75,bcsc:4.0,dp:0,par:3,temp:18},[["Mısır silajı",22],["Buğday samanı",3],["Arpa",2],["Mısır tane",2],["Soya küspesi",2]]);
 const kt=await E(()=>{var r=sutRisk();return {k:r.k,txt:document.getElementById("cmp").textContent}});
 ok('Ketozis kartı: yağ/protein 1,5 üstü, yağlı inek, korunmuş kolin 12,9 g ve monensin (RR 0,75 ≈ %25)',kt.k>=4&&/1,5 üstü/.test(kt.txt)&&/12,9 g kolin/.test(kt.txt)&&/≈ %25 azaltır/.test(kt.txt),String(kt.k));
 await p.click('[data-rf="keto"]');await p.waitForTimeout(2500);
 const fk=await E(()=>document.getElementById('solOut').innerText);const km=fk.match(/Ketozis\t\S+ \((\d+)\)\t\S+ \((\d+)\)/),akm=fk.match(/Asidoz \/ süt yağı\t\S+ \((\d+)\)\t\S+ \((\d+)\)/);
 ok('"Ketozis riskine göre çöz": ketozis puanı düşüyor, asidoz artmıyor',km&&+km[2]<+km[1]&&akm&&+akm[2]<=+akm[1],(km?km[0]:'')+' | '+(akm?akm[0]:''));
 await rkSet({milk:40,fat:3.6,pr:3.1,wk:9,bcs:2.5,bcsc:3.5,dp:0,par:2,mun:21,temp:30},[["Mısır silajı",26],["Kuru yonca",5],["Mısır tane",5],["Soya küspesi",5],["Ayçiçeği küspesi",2]]);
 const ft=await E(()=>{var r=sutRisk();return {d:r.d,thi:r.thi,txt:document.getElementById("cmp").textContent}});
 ok('Döl kartı: MUN 21 (Butler), 1,0 puan kondisyon kaybı (Santos 2009), THI ≈ 80 (Schüller 2014)',ft.d>=4&&/Butler/.test(ft.txt)&&/Santos 2009/.test(ft.txt)&&ft.thi>78&&ft.thi<82&&/THI/.test(ft.txt),JSON.stringify({d:ft.d,thi:ft.thi}));
 await p.click('[data-rf="fert"]');await p.waitForTimeout(2500);
 const ff=await E(()=>({t:document.getElementById('solOut').innerText,w:document.documentElement.scrollWidth}));const dm=ff.t.match(/Döl tutma\t\S+ \((\d+)\)\t\S+ \((\d+)\)/);
 ok('"Döl tutma riskine göre çöz": rasyondan gelen döl riski düşüyor; 390 px',dm&&+dm[2]<+dm[1]&&ff.w<=390,dm?dm[0]:ff.t.slice(0,100));
 ok('Gebe inekte döl kartı değerlendirilmiyor',await E(()=>{S.b.dp=120;var r=sutRisk(),h=rkRender(r);S.b.dp=0;return r.preg&&/Gebe/.test(h)}));
 /* V106: besi sağlık riskleri (kaynaklı) ve risk odaklı çözüm */
 await E(()=>{document.querySelector('#seg button[data-t="besi"]').click()});await p.waitForTimeout(300);
 const bSet=async(bb,fs)=>{await E(([bb,fs])=>{Object.assign(S.bb,{so4:"",dof:"",ion:0},bb);S.fsnap=null;S.feeds.forEach(x=>{x.on=false;x.kg=0});fs.forEach(([n,kg])=>{var x=S.feeds.filter(y=>y.n.indexOf(n)===0)[0];if(!x){window._rkMiss=(window._rkMiss||[]).concat(n);return}x.on=true;x.kg=kg});save();renderSeg();showPanels();renderFarm();renderCmp()},[bb,fs]);await p.click('#tabs button[data-t="3"]');await p.waitForTimeout(300)};
 const bRow=(t,lab)=>{var m=t.match(new RegExp(lab+'\\t\\S+ \\((\\d+)\\)\\t\\S+ \\((\\d+)\\)'));return m?[+m[1],+m[2]]:null};
 const bSolve=async(k)=>{await p.click('[data-rf="'+k+'"]');await p.waitForTimeout(2500);return E(()=>document.getElementById('solOut').innerText)};
 await bSet({breed:"hol",sex:"b",bw:500,adg:1400,temp:22,dof:120},[["Buğday samanı",0.4],["Buğday, ",4],["Arpa",3.5],["Mısır tane",2],["Soya küspesi",0.8],["Ayçiçeği küspesi",0.6]]);
 const ba=await E(()=>{var r=besiRisk();return {a:r.a,u:r.u,txt:document.getElementById('cmp').textContent,fld:BLB.map(x=>x[0]).join(',')}});
 ok('Besi girişlerinde besideki gün ve su sülfatı alanları var',/dof/.test(ba.fld)&&/so4/.test(ba.fld),ba.fld);
 ok('Besi asidoz kartı: kaba %4 (Samuelson 2016), Holstein apse, rumende yıkılan nişasta; tylosin yasağı notu',ba.a>=4&&/Samuelson 2016/.test(ba.txt)&&/Holstein: karaciğer apsesi/.test(ba.txt)&&/Rumende yıkılan nişasta/.test(ba.txt)&&/tylosin Türkiye\/AB’de büyütme amaçlı yasak/.test(ba.txt),String(ba.a));
 const bt1=await bSolve('bacid'),r1=bRow(bt1,'Asidoz \\/ karaciğer apsesi'),r1u=bRow(bt1,'İdrar taşı');
 ok('"Asidoz/apse riskine göre çöz": asidoz yüksek → düşük, idrar taşı artmıyor',r1&&r1[0]>=4&&r1[1]<=1&&r1u&&r1u[1]<=r1u[0],JSON.stringify([r1,r1u]));
 await bSet({breed:"sim",sex:"b",bw:350,adg:1200,temp:20,dof:40},[["Kuru yonca",7],["Arpa",2],["Mısır tane",1]]);
 const bb2=await E(()=>besiRisk().bl);const bt2=await bSolve('bloat'),r2=bRow(bt2,'Şişme'),r2u=bRow(bt2,'İdrar taşı');
 ok('Şişme: yonca %71 yüksek risk; çözüm şişmeyi düşürüyor, idrar taşını artırmıyor',bb2>=4&&r2&&r2[1]<=1&&r2u&&r2u[1]<=r2u[0],JSON.stringify([bb2,r2,r2u]));
 await bSet({breed:"hol",sex:"b",bw:420,adg:1300,temp:30,dof:80,ion:1},[["Mısır silajı",8],["Buğday samanı",1],["Buğday kepeği",3],["DDGS",2],["Arpa",2.5]]);
 const bu=await E(()=>{var r=besiRisk();return {u:r.u,h:r.h,cpr:r.cpr,txt:document.getElementById('cmp').textContent}});const bt3=await bSolve('uro'),r3=bRow(bt3,'İdrar taşı');
 ok('İdrar taşı: Ca:P 0,3 ve fosfor %0,6 yüksek risk; amonyum klorür dozu; çözüm düşürüyor; sıcak stresi kartı (30 °C)',bu.u>=4&&/Amonyum klorür/.test(bu.txt)&&/Sıcak stresi/.test(bu.txt)&&r3&&r3[1]<=1,JSON.stringify([bu.u,bu.h,r3]));
 await bSet({breed:"hol",sex:"b",bw:450,adg:1300,temp:24,dof:90,ion:1,so4:1200},[["Mısır silajı",7],["Buğday samanı",1],["DDGS",3.5],["Mısır gluteni",1],["Arpa",2]]);
 const bp=await E(()=>{var r=besiRisk();return {pe:r.pe,s:r.sTot,ms:r.m.s}});const bt4=await bSolve('pem'),r4=bRow(bt4,'Kükürt \\(PEM\\)');
 ok('PEM: su sülfatı 1.200 mg/L toplam kükürde ekleniyor (yem+su > yem); yüksek risk; çözüm düşürüyor',bp.pe>=4&&bp.s>bp.ms+0.1&&r4&&r4[1]<r4[0]&&r4[1]<=2,JSON.stringify([bp,r4]));
 ok('Besi risk senaryosu yemleri kütüphanede',await E(()=>!(window._rkMiss||[]).length),await E(()=>(window._rkMiss||[]).join(',')));
 ok('Besi risk çözümleri 390 px',await E(()=>document.documentElement.scrollWidth<=390));
 await E(()=>{document.querySelector('#seg button[data-t="sut"]').click()});await p.waitForTimeout(300);
 /* V107: çiftlik yemi (karma yem) sağlık ve yem güvenliği riskleri */
 await E(()=>{S.type="yem";save();renderSeg();showPanels()});await p.waitForTimeout(300);
 const ySet=async(pre,kg)=>{await p.selectOption('#ymPre',pre);await p.waitForTimeout(200);await E(([kg])=>{var y=Y_def();var pr={"Arpa":12,"Buğday, ":11,"Mısır":13,"Soya küspesi":22,"Ayçiçeği küspesi":11,"Buğday kepeği":9,"Kireç taşı":3,"Tuz":5,"Pamuk tohumu küspesi":12,"DDGS":14,"Üre":25,"Dikalsiyum fosfat":25,"Kuru pancar posası":9,"Mısır gluteni":18};Object.keys(pr).forEach(k=>{var x=S.feeds.filter(z=>z.n.indexOf(k)===0)[0];if(x&&!(x.p>0))x.p=pr[k]});
  y.ing=[];var g=y.grp||yGrp(y.pre);Object.keys(kg).forEach(k=>{var fe=yFeed(k);if(!fe){window._rkMiss=(window._rkMiss||[]).concat(k);return}var L=yLimOf(fe,g);y.ing.push({n:fe.n,mn:L.mn,mx:L.mx,why:L.why,kg:kg[k]})});["Kuru pancar posası","Mısır gluteni","Dikalsiyum fosfat","Ayçiçeği küspesi"].forEach(k=>{if(!y.ing.some(r=>r.n.indexOf(k)===0)){var fe=yFeed(k);if(fe){var L=yLimOf(fe,g);y.ing.push({n:fe.n,mn:L.mn,mx:L.mx,why:L.why,kg:0})}}});save();renderYem()},[kg]);await p.click('#ymManual');await p.waitForTimeout(1200)};
 const yRow=(t,lab)=>{var m=t.match(new RegExp(lab+'[^\\t]*\\t\\S+ \\((\\d+)\\)\\t\\S+ \\((\\d+)\\)'));return m?[+m[1],+m[2]]:null};
 const yFix=async(k)=>{await p.click('[data-yf="'+k+'"]');await p.waitForTimeout(2500);return E(()=>document.getElementById('ymOut').innerText)};
 await ySet("Süt 19",{"Buğday, ":330,"Arpa":300,"Soya küspesi":220,"Buğday kepeği":110,"Kireç taşı":15,"Tuz":7});
 const y1=await E(()=>document.getElementById('ymOut').textContent);
 ok('Çiftlik yemi: "Sağlık ve yem güvenliği riskleri" ve buğday/arpa asidoz kartı (Owens 1998), düzelt tuşu',/Sağlık ve yem güvenliği riskleri/.test(y1)&&/Buğday\/arpa yemin %6\d/.test(y1)&&/Owens 1998/.test(y1)&&!!(await p.$('[data-yf="yacid"]')),y1.slice(0,80));
 const y1f=await yFix('yacid'),q1=yRow(y1f,'Asidoz');
 ok('Çiftlik yemi asidoz odağı: Yüksek → Düşük',/Odak: Asidoz/.test(y1f)&&q1&&q1[0]>=4&&q1[1]<=1,JSON.stringify(q1));
 await ySet("Kuzu büyütme 17",{"Arpa":450,"Mısır":200,"Pamuk tohumu küspesi":150,"Buğday kepeği":160,"Üre":12,"Kireç taşı":15,"Tuz":8});
 const y2=await E(()=>document.getElementById('ymOut').textContent);
 ok('Kuzu yeminde üre yasak (TR Yönetmelik 2025) ve serbest gossipol yasal sınır (60 mg/kg; Tebliğ 2014/11)',/rumeni gelişmemiş hayvanda yasak/.test(y2)&&/serbest gossipol ≈ 180 mg\/kg/.test(y2)&&/yasal üst sınır 60/.test(y2),'');
 const y2f=await yFix('ynpn'),q2=yRow(y2f,'Üre'),q2g=yRow(y2f,'Gossipol');
 ok('Üre odağı: üre ve gossipol yüksek → düşük',q2&&q2[1]===0&&q2[0]>=4&&q2g&&q2g[1]<=q2g[0],JSON.stringify([q2,q2g]));
 await ySet("Besi geliştirme 15",{"Arpa":350,"Buğday kepeği":300,"DDGS":150,"Mısır":180,"Tuz":2});
 const y3f=await yFix('yuro'),q3=yRow(y3f,'İdrar taşı');
 ok('İdrar taşı odağı: kireç taşı listede yoksa ekleniyor, Ca:P düzeliyor (Yüksek → Düşük)',q3&&q3[0]>=4&&q3[1]<=1&&await E(()=>Y_def().ing.some(r=>/^Kireç taşı/.test(r.n))),JSON.stringify(q3));
 await ySet("Süt 21",{"Mısır":450,"Pamuk tohumu küspesi":200,"DDGS":150,"Soya küspesi":120,"Buğday kepeği":60,"Kireç taşı":15,"Tuz":7});
 const y4=await E(()=>document.getElementById('ymOut').textContent);
 ok('Süt yeminde aflatoksin: süte M1 geçişi notu (0,05 µg/kg), yasal 5 µg/kg, düzelt',/M1/.test(y4)&&/0,05 µg\/kg/.test(y4)&&/5 µg\/kg/.test(y4)&&!!(await p.$('[data-yf="ymyco"]')),'');
 const y4f=await yFix('ymyco'),q4=yRow(y4f,'Küf ve mikotoksin');
 ok('Mikotoksin odağı: riskli hammadde payı düşüyor; 390 px',q4&&q4[1]<q4[0]&&await E(()=>document.documentElement.scrollWidth<=390),JSON.stringify(q4));
 ok('Çiftlik yemi risk senaryosu hammaddeleri kütüphanede',await E(()=>!(window._rkMiss||[]).length),await E(()=>(window._rkMiss||[]).join(',')));
 await E(()=>{S.type="sut";save();renderSeg();showPanels()});await p.waitForTimeout(300);
 /* V108: etiket okuma derlemi (42 gerçekçi premiks/yem etiketi) ve etiket değerlendirmesi */
 const corp=JSON.parse(require('fs').readFileSync(__dirname+'/fixtures/label-corpus.json','utf8'));
 const cr=await E((corp)=>{var tot=0,okc=0,bad=[];corp.forEach(function(c){var v;if(c.kind==='lb'){var L=LB_def();L.v={};lbParse(c.text);v=LB_def().v}else{var F=FL_def();F.t="sut19";F.v={};flParse(c.text);v=FL_def().v}
  Object.keys(c.exp).forEach(function(k){tot++;var e=[].concat(c.exp[k]),a=v[k];if(a!==undefined&&e.some(function(x){return Math.abs(a-x)<=Math.abs(x)*0.005+1e-9}))okc++;else bad.push(c.id+':'+k)})});return {tot:tot,okc:okc,bad:bad}},corp);
 ok('Etiket okuma derlemi: 42 gerçekçi etiket, alanların ≥ %98’i doğru (AB kodları, OCR harf hataları, tek satırda çok değer, ad/değer blokları, "96"=%, g/kg)',cr.okc/cr.tot>=0.98,cr.okc+'/'+cr.tot+' '+cr.bad.slice(0,6).join(','));
 const dz=await E(()=>{var L=LB_def(),o={};[["Kullanım: 1 ton yeme 2,5 kg katılır","ton",2.5],["Karma yeme %0,25 oranında katılır","ton",2.5],["Süt ineklerine günde 100-150 g verilir","dose",125]].forEach(function(c){L.dose=77;L.ton="";lbParse("Çinko 10.000 mg\n"+c[0]);o[c[0]]=LB_def()[c[1]]});L.dose=77;var r=lbParse("Çinko 10.000 mg");o.log=r.log.join('|');return o});
 ok('Premiks dozu: "1 ton yeme 2,5 kg", "%0,25 oranında", "günde 100-150 g" okunuyor; doz yoksa uyarı',dz["Kullanım: 1 ton yeme 2,5 kg katılır"]===2.5&&dz["Karma yeme %0,25 oranında katılır"]===2.5&&dz["Süt ineklerine günde 100-150 g verilir"]===125&&/Doz etikette bulunamadı/.test(dz.log),JSON.stringify(dz).slice(0,200));
 ok('Okunamayan satırlar kullanıcıya listeleniyor',await E(()=>{var r=flParse("Ham protein %19\nHam yağ %3,5\nGlüten içeriği 4 birim");return r.log.some(function(t){return /Okunamayan satır/.test(t)})}));
 const ev=await E(()=>{var o={},L=LB_def();S.rat=S.rat||{};var keep=JSON.stringify(S.rat);L.an="koyun";L.dose=100;L.ton="";L.conc="";L.dmi="";L.v={se:14};labelEval();o.se=document.getElementById('lbOut').textContent;
  L.v={zn:3000};L.ton=2.5;labelEval();o.ton=document.getElementById('lbOut').textContent.match(/günlük ([\d,]+) g\/baş/)[1];L.ton="";
  L.an="sut";L.dose=100;L.v={se:100,cu:3000,zn:12000};var nm=S.feeds.filter(x=>/^Süt 19/.test(x.n))[0].n,sil=S.feeds.filter(x=>/^Mısır silajı/.test(x.n))[0].n;S.rat.sut={};S.rat.sut[nm]={on:true,kg:9};S.rat.sut[sil]={on:true,kg:30};labelEval();o.dairy=document.getElementById('lbOut').textContent;
  document.getElementById('lbRAn').value='sut';document.getElementById('lbRKg').value='';document.getElementById('lbRGo').click();o.ban=!!window._lblBan&&S.type==='sut';o.rat=Object.keys(S.rat.sut).filter(k=>/^Premiks \(etiket\)/.test(k)).map(k=>S.rat.sut[k].kg);o.fe=S.feeds.filter(x=>/^Premiks \(etiket\)/.test(x.n)).map(x=>x.ext.se)[0];
  window._lblBan=null;S.rat=JSON.parse(keep);S.type='mikro';save();renderSeg();showPanels();renderMikro();return o});
 ok('Premiks: koyunda Se 14 mg/kg × 100 g → rasyon toplamı yasal sınır (0,5 mg/kg yem) üstü',/Selenyum0,70 \+ 0,12 = 0,82/.test(ev.se)&&/Yasal sınır üstü/.test(ev.se),ev.se.slice(0,80));
 ok('Premiks kg/ton: kesif yem etiketin hayvanına göre (koyun 0,6 kg → 2,5 kg/ton = 1,5 g/baş)',ev.ton==="1,5",ev.ton);
 ok('Premiks + Süt 19 fabrika yemi: çift premiksleme yakalanıyor (rasyondan temel Cu/Zn/Se; Se yasal üstü)',/Süt sekmesindeki|süt rasyonundan/.test(ev.dairy)&&/Selenyum0,6\d \+ 0,\d+ = 0,\d+/.test(ev.dairy)&&/Yasal sınır üstü/.test(ev.dairy),ev.dairy.slice(0,120));
 ok('"Rasyona ekle ve değerlendir" (premiks): yem olarak eklenir, süt rasyonuna 0,1 kg (100 g) konur, Süt sekmesine geçer',JSON.stringify(ev.rat)==="[0.1]"&&ev.fe>100&&ev.ban,JSON.stringify([ev.rat,ev.fe,ev.ban]));
 const fe2=await E(()=>{var o={},F=FL_def();F.t="sut19";F.price="";F.v={hp:17.5,hy:3.5,hs:9,kul:8,nem:12,p:0.38,zn:20};feedLabelEval();o.t=document.getElementById('flOut').textContent;o.me=Math.round(flCalc({hp:19,hy:3.5,hs:9,kul:8,nem:12}).meKM);
  var A={name:"A",t:"sut21",price:14,v:{hp:21,hy:6,hs:7,kul:9.5,nem:12}},B={name:"B",t:"sut21",price:13.5,v:{hp:21,hy:3,hs:8,kul:8,nem:12}};A.C=flCalc(A.v);B.C=flCalc(B.v);o.ab=flCmpVerdict(A,B).join(' ').replace(/<[^>]+>/g,'');
  var C1={name:"X",t:"besi",price:12,v:{hp:14,hy:4,hs:8,kul:7,nem:12}},C2={name:"Y",t:"besi",price:11.5,v:{hp:14,hy:2.5,hs:11,kul:8,nem:12}};C1.C=flCalc(C1.v);C2.C=flCalc(C2.v);o.bs=flCmpVerdict(C1,C2).join(' ').replace(/<[^>]+>/g,'');return o});
 ok('Yem etiketi: kırmızı satır varken "uygun" denmiyor, referans dışılar listeleniyor',/Referans dışı: Ham protein 17,5 \(düşük\)/.test(fe2.t)&&!/uygun görünüyor/.test(fe2.t),'');
 ok('Yem etiketi ME = TSE 9610 (resmî yöntem; Süt 19 ≈ 2.789 kcal/kg KM)',fe2.me>=2770&&fe2.me<=2810,String(fe2.me));
 ok('A–B: sonuç enerji/kâr satırlarıyla tutarlı (A daha enerjili ve kârlı → A)',/A günde ≈ \d+ TL daha kârlı/.test(fe2.ab)&&/Sonuç[^:]*: A yüksek verimli/.test(fe2.ab),fe2.ab.slice(-200));
 ok('A–B besi: süt/inek ifadesi yok, "fiyat girin" hatası yok, artış (g/gün) ile',!/inekte|L süt|ketozis/.test(fe2.bs)&&!/fiyatını girin/.test(fe2.bs)&&/canlı ağırlık artışı/.test(fe2.bs),fe2.bs.slice(0,200));
 /* V109: yem etiketini çiftlik rasyonuna ekle (fabrika yeminin yerine) ve rasyonla birlikte değerlendir */
 const fr=await E(()=>{var keep=JSON.stringify(S.rat||{});S.type="sut";S.feeds.forEach(x=>{x.on=false;x.kg=0});var set=(re,kg)=>{var x=S.feeds.filter(y=>re.test(y.n))[0];x.on=true;x.kg=kg};set(/^Mısır silajı/,28);set(/^Kuru yonca/,4);set(/^Süt 19/,8);set(/^Buğday samanı/,1);save();renderFarm();renderCmp();
  document.querySelector('#seg button[data-t="mikro"]').click();var F=FL_def();F.t="sut21";F.name="Rakip Süt 21";F.price=15;F.v={hp:21,hy:4,hs:7,kul:8,nem:12,ca:1,p:0.5,na:0.3};feedLabelEval();
  var o={an:document.getElementById('flRAn').value};document.getElementById('flRKg').value='';document.getElementById('flRRep').checked=true;document.getElementById('flRGo').click();
  o.type=S.type;o.items=curItems().map(x=>x.x.n.replace(/,.*$/,'')+':'+x.x.kg);o.cmp=document.getElementById('cmp').innerText;return o});
 await p.waitForTimeout(200);const fbn=await E(()=>{var b=document.getElementById("lblBan");var o={ban:b?b.innerText:''};document.getElementById('lblBanUndo').click();o.undo=curItems().map(x=>x.x.n.replace(/,.*$/,'')+':'+x.x.kg);o.gone=!document.getElementById('lblBan');return o});
 ok('Yem etiketi → "Rasyona ekle ve değerlendir": Süt sekmesine geçer, Süt 19 yerine aynı miktarla (8 kg) konur, sağlık riskleri rasyonla birlikte',fr.an==="sut"&&fr.type==="sut"&&fr.items.includes("Yem (etiket): Rakip Süt 21:8")&&!fr.items.some(x=>/^Süt 19/.test(x))&&/Sağlık ve döl riskleri/.test(fr.cmp),JSON.stringify(fr.items));
 ok('Analiz üstünde bilgi kutusu (yerine kondu: Süt 19 …) ve "Geri al" eski rasyonu geri getirir',/Etiketten eklendi: Rakip Süt 21/.test(fbn.ban)&&/yerine kondu: Süt 19/.test(fbn.ban)&&fbn.undo.some(x=>/^Süt 19/.test(x))&&!fbn.undo.some(x=>/Rakip/.test(x))&&fbn.gone,JSON.stringify(fbn.undo));
 /* V110: NASEM 2021 rumen modeli (rumende sindirilen nişasta/NDF, mikrobiyal protein, MP ihtiyacı) */
 const nr=await E(()=>{var o={};S.type="sut";Object.assign(S.b,{bw:650,milk:40,fat:3.7,pr:3.2,wk:12,mode:"lak",dp:0});var setR=function(L){S.feeds.forEach(x=>{x.on=false;x.kg=0});L.forEach(([re,kg])=>{var x=S.feeds.filter(y=>re.test(y.n))[0];x.on=true;x.kg=kg})};
  setR([[/^Mısır silajı/,30],[/^Kuru yonca/,4],[/^Mısır tane/,6],[/^Arpa/,2],[/^Soya küspesi/,3.5],[/^Ayçiçeği küspesi/,1]]);var m=metrics(curItems()),Q=MPsut(m);o.a={dcSt:Q.dcSt,dcNDF:Q.dcNDF,mcp:Q.mcp,mp:Q.mp,req:Q.req,model:Q.model};
  var m2=Object.assign({},m,{rdp:m.rdp*0.6});o.lowRdp=MPsut(m2);var m3=Object.assign({},m,{sta:m.sta+6});o.moreSt=MPsut(m3).rdSt>Q.rdSt;var m4=Object.assign({},m,{dm_:m.dm_+4});o.moreDmi=MPsut(m4).dcSt<Q.dcSt;
  renderCmp();o.txt=document.getElementById('cmp').textContent;return o});
 ok('NASEM 2021 rumen: sindirilen nişasta %55–80, NDF %35–55; bakteri proteini 1,5–2,2 kg/gün (23 kg KM)',nr.a.model==="NASEM 2021"&&nr.a.dcSt>=55&&nr.a.dcSt<=80&&nr.a.dcNDF>=35&&nr.a.dcNDF<=55&&nr.a.mcp>=1500&&nr.a.mcp<=2200,JSON.stringify(nr.a));
 ok('Mikrobiyal protein rumende yıkılan proteine bağlı (RDP %40 azalınca Vm düşer, MiCP belirgin azalır)',nr.lowRdp.mcp<nr.a.mcp*0.85,JSON.stringify({mcp:nr.lowRdp.mcp,lim:nr.lowRdp.rdpLim}));
 ok('Dinamik: daha çok nişasta → rumende sindirilen nişasta artar; daha çok KM tüketimi → sindirim oranı düşer',nr.moreSt&&nr.moreDmi);
 ok('Analizde "Rumen (NASEM 2021)" özeti: sindirilen nişasta/NDF, bakteri proteini, MP dengesi',/Rumen \(NASEM 2021\)/.test(nr.txt)&&/Metabolik protein = bakteri/.test(nr.txt),'');
 /* V111: yem protein parçaları (A/B/C, kd, RUP sindirimi) → yem başına bypass protein */
 const pf=await E(()=>{var o={},kp={f:4.87,c:5.28},R=function(n){var x=S.feeds.filter(y=>y.n.indexOf(n)===0)[0];return rupOf(x,mx(x),kp)};o.sbm=R("Soya küspesi");o.corn=R("Mısır tane");o.barley=R("Arpa");o.cgm=R("Mısır gluteni");
  var x=S.feeds.filter(y=>y.n.indexOf("Soya küspesi")===0)[0],keep=JSON.stringify(x.ext||{});x.ext=Object.assign({},x.ext,{pA:15,pB:80,kd:4});o.user=rupOf(x,mx(x),kp);x.ext=JSON.parse(keep);o.ed=XL.map(a=>a[0]).join(',');
  o.pfr=Object.keys(PFR).length;return o});
 ok('Protein parçaları tablosu (≥ 40 yem; açık literatür tipik değerleri, NASEM kütüphanesi değil)',pf.pfr>=40,String(pf.pfr));
 ok('Yem başına RUP = B·kp/(kd+kp) + C: soya küspesi ≈ %35, mısır ≈ %52, arpa ≈ %28, mısır gluteni ≈ %76 (Feedipedia a/b/c ile)',Math.abs(pf.sbm.r-35)<3&&Math.abs(pf.corn.r-52)<3&&Math.abs(pf.barley.r-28)<3&&Math.abs(pf.cgm.r-76)<3&&pf.sbm.src==="parça",JSON.stringify([pf.sbm.r,pf.corn.r,pf.barley.r,pf.cgm.r].map(v=>Math.round(v))));
 ok('Protein parçaları Feedipedia ölçümlerinden: soya küspesi a 13 / b 85 / kd 8,5, kaynak gösterilmiş; NASEM kütüphanesi yok',/"Soya küspesi":\{"A":13\.0,"B":85\.0,"C":2\.0,"kd":8\.5[^}]*Feedipedia: Soybean meal/.test(html)&&/feedipedia\.org/.test(html)&&/NASEM kütüphanesi kullanılmadı/.test(html));
 /* V113: karbonhidrat parçaları ve nişasta yıkılımı (INRA 2018 tabloları) */
 const cb=await E(()=>{var o={},F=n=>S.feeds.filter(y=>(y.fam||y.n).indexOf(n)===0)[0],D=n=>stDeg(F(n),5.28);o.bar=D("Arpa");o.corn=D("Mısır tane");o.wh=stDeg(S.feeds.filter(y=>(y.fam||y.n)==="Buğday")[0],5.28);o.sil=stDeg(F("Mısır silajı"),4.87);o.cfr=Object.keys(CFR).length;
  var x=F("Arpa"),keep=JSON.stringify(x.ext||{});x.ext=Object.assign({},x.ext,{sa:20,sb:80,sc:5});o.user=stDeg(x,5.28);x.ext=JSON.parse(keep);o.ed=XL.map(a=>a[0]).join(',');o.rk=rkDeg(F("Arpa"));o.cbS=carbOf(F("Soya küspesi"));o.cbSil=carbOf(F("Mısır silajı"));
  S.type="sut";S.feeds.forEach(y=>{y.on=false;y.kg=0});var set=(n,kg)=>{var y=F(n);y.on=true;y.kg=kg};set("Mısır silajı",30);set("Kuru yonca",4);set("Arpa",6);set("Mısır tane",3);set("Soya küspesi",3);save();renderSeg();showPanels();renderCmp();o.txt=document.getElementById('cmp').textContent;return o});
 ok('Nişasta rumen yıkılımı INRA 2018 a/b/c ile: arpa ≈ %90, mısır ≈ %62, buğday ≈ %95; tabloda olmayan mısır silajı tipik %72',Math.abs(cb.bar.d*100-90)<2&&Math.abs(cb.corn.d*100-62)<2&&Math.abs(cb.wh.d*100-95)<2&&cb.bar.src==="INRA"&&cb.sil.src==="tipik"&&Math.abs(cb.sil.d-0.72)<0.01&&Math.abs(cb.rk-cb.bar.d)<1e-9,JSON.stringify([cb.bar,cb.corn,cb.wh,cb.sil]));
 ok('Kendi nişasta analiziniz öncelikli (a 20, b 80, c 5 → %59); düzenleyicide şeker, lignin, nişasta a/b/c alanları',Math.abs(cb.user.d*100-58.9)<0.5&&cb.user.src==="girilen"&&/sug/.test(cb.ed)&&/lig/.test(cb.ed)&&/sa,sb,sc/.test(cb.ed),JSON.stringify(cb.user));
 ok('Karbonhidrat tablosu ≥ 40 yem, şeker/lignin kaynaklı (soya küspesi şeker %10,6; silaj lignin %2,7 Feedipedia)',cb.cfr>=40&&cb.cbS.sug===10.6&&cb.cbSil.lig===2.7&&/feedtables\.com/.test(html),JSON.stringify([cb.cfr,cb.cbS,cb.cbSil]));
 ok('Rumen kartında karbonhidrat tablosu: şeker, nişasta, by-pass nişasta, çözünür lif, sindirilebilir/sindirilemeyen NDF',/By-pass nişasta/.test(cb.txt)&&/Çözünür lif/.test(cb.txt)&&/Sindirilemeyen NDF/.test(cb.txt)&&/Hızlı yıkılan karbonhidrat/.test(cb.txt)&&/INRA 2018 yem tabloları/.test(cb.txt),'');
 ok('Açıklama metni güncel: metabolik protein NASEM 2021 yöntemiyle (eski NRC 2001 metni yok)',/Metabolik protein NASEM 2021 yöntemiyle/.test(html)&&!/Metabolik protein NRC 2001 yöntemiyle/.test(html));
 /* V114: bölüm bazlı bağımsız denetim (6 ajan) düzeltmeleri — altın örnekler */
 const au=await E(()=>{var o={},F=n=>S.feeds.filter(y=>(y.fam||y.n)===n||y.n.indexOf(n)===0)[0],off=()=>S.feeds.forEach(y=>{y.on=false;y.kg=0}),set=(n,kg)=>{var y=F(n);if(y){y.on=true;y.kg=kg}};
  /* buzağı: sıcak ≠ soğuk */
  S.type="buzagi";S.c=Object.assign(S.c||{},{bw:60,age:30,bwb:40,adg:700,temp:32,meals:2});off();set("Tam yağlı süt",6);set("Buzağı Plus",0.8);save();var Rc=CREQ(metrics(cItems()));o.heat=Rc.heat;o.cold=Rc.cold;renderCmp();o.ctxt=document.getElementById('cmp').textContent;
  /* buzağı: 10 günlük, süt girilmemiş → sütten kesilmiş sayılmaz */
  S.c=Object.assign(S.c,{bw:45,age:10,temp:18});off();set("Buzağı Plus",0.2);save();o.wean=cWeaned();o.W=CREQ(metrics(cItems())).W;renderCmp();o.ctxt2=document.getElementById('cmp').textContent;
  /* besi: üreli düşük enerjili rasyonda MP NASEM 2016 (RDP ve TDN sınırlı) */
  S.type="besi";S.bb=Object.assign(S.bb||{},{breed:"hol",sex:"b",bw:400,fin:600,adg:1300,dof:""});off();set("Buğday samanı",3);set("Arpa",4);set("Üre",0.2);save();var m=metrics(curItems());o.g0=bGain(m.dm_,m.meT,m.cp*m.dm_*10).adgp;o.g1=bGain(m.dm_,m.meT,m.cp*m.dm_*10,m).adgp;
  /* süt: doğum haftası 0 ketozis kontrollerini kapatmaz */
  S.type="sut";Object.assign(S.b,{bw:650,milk:35,fat:3.7,pr:3.2,mode:"lak",dp:0,bcs:4,bcsc:4,par:3});off();set("Mısır silajı",25);set("Kuru yonca",3);set("Arpa",4);set("Soya küspesi",2);save();S.b.wk=0;var r0=sutRisk();S.b.wk=1;var r1=sutRisk();o.k0=r0&&r0.kraw;o.k1=r1&&r1.kraw;
  /* premiks etiketi: 0 ile başlayan ondalık ve gram başına birimler */
  lbParse("Selenyum 0.150 mg\nKobalt 0,500 mg\nVitamin A 1.000 IU/g\nBakır 10 mg/g");o.lb=JSON.parse(JSON.stringify(LB_def().v));
  return o});
 ok('Buzağı 32 °C: ısı stresi soğuk stresi sayılmıyor, "sütü artırın" denmiyor',au.heat>0&&au.cold===0&&/Sıcak stresi/.test(au.ctxt)&&!/Soğuk stresi/.test(au.ctxt),JSON.stringify({heat:au.heat,cold:au.cold}));
 ok('10 günlük buzağıda süt girilmemişse sütten kesilmiş sayılmıyor ve uyarı çıkıyor',!au.wean&&!au.W&&/Süt veya süt ikame yemi girilmedi/.test(au.ctxt2),JSON.stringify({wean:au.wean,W:au.W}));
 ok('Besi: üreli düşük enerjili rasyonda protein artışı NASEM 2016 MP ile (eski %66 HP varsayımından düşük)',au.g1<au.g0*0.8,JSON.stringify({yeni:Math.round(au.g1),eski:Math.round(au.g0)}));
 ok('Süt: doğum haftası 0 ketozis kontrollerini kapatmıyor (hafta 0 ≈ hafta 1)',au.k0!==undefined&&au.k0>=au.k1-1&&au.k0>0,JSON.stringify({k0:au.k0,k1:au.k1}));
 ok('Etiket: "Selenyum 0.150 mg" 0,15; "Kobalt 0,500 mg" 0,5; "1.000 IU/g" 1.000.000 IU/kg; "10 mg/g" 10.000 mg/kg',au.lb.se===0.15&&au.lb.co===0.5&&au.lb.vitA===1000000&&au.lb.cu===10000,JSON.stringify(au.lb));
 ok('Kaynak kodda: güvenlik sınırları gevşetilmez, besi üre sınırı %1, premiks element toplamı, mineral 1 g hassasiyet',/güvenlik sınırları \(üre, gossipol, tuz, yağ\) asla gevşetilmez/.test(html)&&/\[\/\^Üre\/,0,1,"kesif yemde en çok %1/.test(html)&&/Element toplamı ve yasal sınır/.test(html)&&/isMin\(x\)\?Math\.round\(res\.x\[q\]\*100\/x\.dm\*1000\)\/1000/.test(html));
 /* V115: süt ineği hastalık rehberi */
 const hz=await E(()=>{var o={},L=HZ.sut;o.n=L.length;o.full=L.every(d=>d.b.length&&d.i.length&&d.t.length&&d.h.length&&d.q.length&&d.o.length&&d.a&&d.s);
  o.dose=[];L.forEach(d=>d.t.forEach(t=>{if(/V/.test(t[1])&&/\d+\s*(mg|ml|mL|IU|g\/|g\s|cc)/.test(t[0]+' '+t[2]))o.dose.push(d.k+': '+t[0])}));
  HZSEL={dogum:true,kesif:true,aseton:true};o.r1=hzRank("sut").map(r=>r.d.k);HZSEL={dogum0:true,yat:true,soguk:true};o.r2=hzRank("sut").map(r=>r.d.k);HZSEL={meme:true};o.r3=hzRank("sut").map(r=>r.d.k);HZSEL={};
  S.type="sut";Object.assign(S.b,{mode:"lak",wk:3});S.feeds.forEach(x=>{x.on=false;x.kg=0});var x=S.feeds.filter(y=>/^Mısır silajı/.test(y.n))[0];x.on=true;x.kg=25;var y2=S.feeds.filter(y=>/^Arpa/.test(y.n))[0];y2.on=true;y2.kg=6;save();renderCmp();o.txt=document.getElementById('cmp').textContent;o.w=document.documentElement.scrollWidth;return o});
 ok('Süt ineği hastalık rehberi: 9 hastalık; her kartta belirti, ilk müdahale, tedavi, sık hata, veterinere soru, önleme, acil durum ve kaynak',hz.n===9&&hz.full,String(hz.n));
 ok('Rehberde reçeteli (veteriner) ilaçlar için doz yazılmıyor; arınma süresi ve "teşhis koymaz" uyarısı var',hz.dose.length===0&&/arınma süresi/.test(hz.txt)&&/teşhis koymaz/.test(hz.txt),hz.dose.join('; '));
 ok('Belirti listesi: doğum sonrası + kesifi bırakma + aseton → ketozis; doğum + yatma + soğuk kulak → süt humması; meme → mastitis',hz.r1[0]==="keto"&&hz.r2[0]==="hipoca"&&hz.r3[0]==="mast",JSON.stringify([hz.r1,hz.r2,hz.r3]));
 ok('Rehber süt analizinde görünüyor, 390 px',/Hastalık rehberi/.test(hz.txt)&&hz.w<=390,'w='+hz.w);
 /* V116: besi, küçükbaş, buzağı hastalık rehberleri */
 const hz2=await E(()=>{var o={},chk=sp=>HZ[sp].every(d=>d.b.length&&d.i.length&&d.t.length&&d.h.length&&d.q.length&&d.o.length&&d.a&&d.s&&Object.keys(d.sg).every(k=>HZS[k]));o.n=[HZ.besi.length,HZ.koyun.length,HZ.buzagi.length];o.full=chk("besi")&&chk("koyun")&&chk("buzagi");
  o.dose=[];["besi","koyun","buzagi"].forEach(sp=>HZ[sp].forEach(d=>d.t.forEach(t=>{if(/V/.test(t[1])&&/\d+\s*(mg|ml|mL|IU|g\/|cc)/.test(t[0]+' '+t[2]))o.dose.push(d.k+': '+t[0])})));
  var R=(sp,sel)=>{HZSEL={};sel.forEach(k=>HZSEL[k]=true);var r=hzRank(sp).map(x=>x.d.k);HZSEL={};return r[0]};
  o.r=[R("besi",["idrar","kum"]),R("besi",["korluk","tit"]),R("koyun",["gebe","ayrilir","korluk"]),R("koyun",["sari"]),R("buzagi",["ishal","susuz","emme"]),R("buzagi",["sagsis"])];
  var txt=sp=>{S.type=sp;S.feeds.forEach(x=>{x.on=false;x.kg=0});var set=(re,kg)=>{var x=S.feeds.filter(y=>re.test(y.fam||y.n))[0];if(x){x.on=true;x.kg=kg}};if(sp==="buzagi"){set(/^Tam yağlı süt/,6);set(/^Buzağı Plus/,0.5)}else if(sp==="koyun"){set(/^Arpa/,0.5);set(/^Kuru yonca/,1)}else{set(/^Mısır silajı/,10);set(/^Arpa/,4)}save();renderSeg();showPanels();renderCmp();return document.getElementById('cmp').textContent};
  o.t=["besi","koyun","buzagi"].map(sp=>/Hastalık rehberi/.test(txt(sp)));o.w=document.documentElement.scrollWidth;return o});
 ok('Besi (6), küçükbaş (8), buzağı (5) hastalık rehberi; tüm kartlar eksiksiz; reçeteli ilaçta doz yok',hz2.n.join()==="6,8,5"&&hz2.full&&hz2.dose.length===0,JSON.stringify(hz2.n)+' '+hz2.dose.join(';'));
 ok('Belirti listesi: idrar→idrar taşı, körlük→PEM, son gebelik+ayrılma→gebelik toksemisi, sarılık→bakır, ishal+susuzluk→ishal, sağ karın→abomazum şişmesi',JSON.stringify(hz2.r)==='["uro","pem","gtox","cutox","ishal","abobloat"]',JSON.stringify(hz2.r));
 ok('Rehber besi, küçükbaş ve buzağı analizinde görünüyor, 390 px',hz2.t.every(Boolean)&&hz2.w<=390,JSON.stringify(hz2.t)+' w='+hz2.w);
 /* V117: aşı programı ve takvimi */
 const vx=await E(()=>{var o={},day=864e5,iso=d=>new Date(Date.now()+d*day).toISOString().slice(0,10);o.n=[VX.sigir.length,VX.koyun.length];o.off=VX.sigir.filter(v=>v.o).map(v=>v.k).concat(VX.koyun.filter(v=>v.o).map(v=>v.k));
  var g={id:9,sp:"sut",kind:"genc",dob:iso(-100),done:{}};var P=vxPlan(g),bru=P.filter(p=>p.v.k==="bru")[0];o.bru=bru.st;o.bruW=[Math.round((bru.from-new Date(g.dob))/day),Math.round((bru.to-new Date(g.dob))/day)];
  g.done={clos_0:{d:iso(-30),lot:"X"}};var P2=vxPlan(g),rap=P2.filter(p=>p.key==="clos_1")[0];o.rap=Math.round((rap.from-new Date(iso(-30)))/day);
  var a={id:10,sp:"sut",kind:"anne",calv:iso(40),done:{}};o.ishal=vxPlan(a).filter(p=>p.v.k==="ishal")[0].st;
  var k={id:11,sp:"koyun",kind:"kuzu",dob:iso(-50),done:{}};o.ent=vxPlan(k).filter(p=>p.v.k==="entero"&&p.key==="entero_1")[0].st;
  S.type="sut";Object.assign(S.b,{mode:"lak",wk:10});S.vx=[g];S.feeds.forEach(x=>{x.on=false;x.kg=0});var x=S.feeds.filter(y=>/^Mısır silajı/.test(y.n))[0];x.on=true;x.kg=25;save();renderCmp();var b=document.getElementById('vxBox');b.open=true;o.txt=b.textContent;o.w=document.documentElement.scrollWidth;S.vx=[];save();return o});
 ok('Aşı programı: sığır 11, küçükbaş 9 aşı; resmî aşılar (şap, brusella, LSD, şarbon, PPR, çiçek) işaretli',vx.n.join()==="11,9"&&["sap","bru","lsd","sarbon","ksap","rev1","ppr","cicek"].every(k=>vx.off.includes(k)),JSON.stringify(vx.off));
 ok('Takvim: brusella S19 dişi buzağıda 90–180. gün (100 günlükte "zamanı geldi"); Clostridium rapeli 1. dozdan 28 gün sonra; ishal aşısı doğuma 40 gün kala zamanı geldi; kuzuda enterotoksemi 50. günde',vx.bru==="now"&&vx.bruW.join()==="90,180"&&vx.rap===28&&vx.ishal==="now"&&vx.ent==="now",JSON.stringify(vx));
 ok('Aşı bölümü analizde görünüyor: resmî aşı uyarısı, soğuk zincir, 390 px',/Tarım ve Orman Bakanlığı/.test(vx.txt)&&/soğuk zincir/.test(vx.txt)&&vx.w<=390,'w='+vx.w);
 /* V118: veri güvenliği ve dönem uyumlu ürün seçimi */
 const ds=await E(()=>{var o={},R=solverRe;S.type="sut";S.b.mode="lak";var a=R();o.lakKuru=a.not.test("Başaran Kuru Dönem Yemi");o.lakSut=a.not.test("Süt 19");S.b.mode="kuru";var d=R();o.kuruSut=d.not.test("Süt 19")&&d.not.test("Bypass yağ");o.kuruOwn=d.own.test("Başaran Kuru Dönem Yemi");S.b.mode="lak";
  S.type="buzagi";o.calfPmx=R().not.test("Premiks süt");S.type="koyun";S.k=Object.assign(S.k||{},{mode:"gebe"});o.eweToklu=R().not.test("Başaran Toklu Besi Taneli");S.k.mode="kuzu";o.lambToklu=R().not.test("Başaran Toklu Besi Taneli");S.type="sut";
  S.ai=Object.assign(S.ai||{},{key:"sk-test-123"});S.vx=[{id:5,sp:"sut",kind:"genc",dob:"2026-01-01",done:{}}];var B=JSON.stringify(window.bkStatus&&(function(){var x=JSON.parse(JSON.stringify(S));return x})());
  var exp=(function(){var oo=JSON.parse(JSON.stringify(S));if(oo.ai)delete oo.ai.key;return {app:"YemAkil",S:oo}})();o.noKey=!/sk-test-123/.test(JSON.stringify(exp));
  var keep=localStorage.getItem(KEY);o.imp=bkImportText(JSON.stringify(exp),false);var st=JSON.parse(localStorage.getItem(KEY));o.impVx=st.vx&&st.vx.length===1;o.impKey=st.ai&&st.ai.key==="sk-test-123";o.bad=bkImportText('{"x":1}',false);localStorage.setItem(KEY,keep);
  o.box=!!document.getElementById('bkBox');return o});
 ok('Ürün seçimi döneme göre: sağmala kuru dönem yemi, kuru ineğe süt yemi/bypass yağ, buzağıya inek premiksi, gebe koyuna toklu yemi önerilmez',ds.lakKuru&&!ds.lakSut&&ds.kuruSut&&ds.kuruOwn&&ds.calfPmx&&ds.eweToklu&&!ds.lambToklu,JSON.stringify(ds));
 ok('Yedekleme: yedekte API anahtarı yok; geri yükleme aşı kayıtlarını getiriyor, mevcut anahtarı koruyor; geçersiz dosya reddediliyor',ds.box&&ds.noKey&&ds.imp==="ok"&&ds.impVx&&ds.impKey&&/geçerli bir YemAkıl yedeği değil/.test(ds.bad),JSON.stringify({imp:ds.imp,bad:ds.bad}));
 {const q=await b.newPage({viewport:{width:390,height:844}});const qe=[];q.on('pageerror',e=>qe.push(e.message));await q.goto('file://'+path.resolve(FILE));
  await q.evaluate(()=>{S.vx=[{id:7,sp:"sut",kind:"anne",calv:"2027-01-01",done:{}}];S.excl={sut:["Melas"]};save();window.confirm=()=>true;document.getElementById('reset').click()});const rs=await q.evaluate(()=>({vx:(S.vx||[]).length,ex:(S.excl&&S.excl.sut||[]).length,st:JSON.parse(localStorage.getItem(KEY)).vx.length}));
  ok('"Varsayılanlara dön" aşı kayıtlarını ve dışlanan hammaddeleri silmiyor',rs.vx===1&&rs.ex===1&&rs.st===1,JSON.stringify(rs));
  await q.evaluate(()=>localStorage.setItem(KEY,JSON.stringify({type:"sut",t:{},feeds:[],saved:[{id:1,name:"Eski rasyon",feeds:[]}],vx:[{id:9,sp:"sut",kind:"genc",done:{}}]})));await q.reload();await q.waitForTimeout(500);
  const cr=await q.evaluate(()=>({saved:(S.saved||[]).length,vx:(S.vx||[]).length,feeds:S.feeds.length,raw:Object.keys(localStorage).some(k=>/-bozuk-/.test(k)),ban:!!document.getElementById('errBan')}));
  ok('Kısmen bozuk kayıt: formüller ve aşı kayıtları korunuyor, hammadde listesi kuruluyor, ham kopya saklanıyor, kullanıcı uyarılıyor',cr.saved===1&&cr.vx===1&&cr.feeds>3&&cr.raw&&cr.ban,JSON.stringify(cr));
  await q.evaluate(()=>{var o=JSON.parse(localStorage.getItem(KEY));o.vx={};o.mk="s";o.k=5;o.c="x";delete o.refd;localStorage.setItem(KEY,JSON.stringify(o))});qe.length=0;await q.reload();await q.waitForTimeout(500);
  for(const t of ["sut","koyun","buzagi","mikro"]){await q.evaluate(t=>{S.type=t;renderSeg();showPanels();renderCmp()},t)}
  ok('Yanlış türde kayıt alanları (vx, mk, k, c) ve eski kayıt (refd yok) açılışta hata vermiyor',qe.length===0,qe.join('; '));await q.close()}
 ok('Servis çalışanı: sayfa açılışında 3 sn zaman aşımı, sorgu parametresi yok sayılıyor, yalnız kendi dosyaları ve yazı tipleri önbelleğe',/setTimeout\(\(\)=>cached\(\)\.then\(fin\),3000\)/.test(sw)&&/ignoreSearch:nav/.test(sw)&&/if\(!same&&!font\)return/.test(sw));
 /* V119: eşik tutarlılığı, sağlık/aşı düzeltmeleri, yem kütüphanesi */
 const v9=await E(()=>{var o={},day=864e5,iso=d=>new Date(Date.now()+d*day).toISOString().slice(0,10),F=re=>S.feeds.filter(y=>re.test(y.fam||y.n))[0],set=(L)=>{S.feeds.forEach(x=>{x.on=false;x.kg=0});L.forEach(([re,kg])=>{var x=F(re);if(x){x.on=true;x.kg=kg}});save()};
  S.type="sut";Object.assign(S.b,{bw:620,milk:25,fat:3.8,pr:3.3,wk:20,mode:"lak",dp:120,bcs:3});set([[/^Mısır silajı/,28],[/^Kuru yonca/,4],[/^Buğday samanı/,1.5],[/^Arpa/,3],[/^Soya küspesi/,1.5],[/^Ayçiçeği küspesi/,1]]);var r=sutRisk();o.aNorm=r.a;o.kaba=Math.round(r.m.kaba);
  set([[/^Mısır silajı/,12],[/^Arpa/,9],[/^Buğday$/,3],[/^Soya küspesi/,3]]);var r2=sutRisk();o.aLow=r2.a;
  var VXo=VX;o.preb=VXo.sigir.filter(v=>v.k==="solunum")[0].sch.filter(x=>x.g==="calv")[0];
  var g={id:1,sp:"sut",kind:"genc",dob:iso(-500),done:{clos_0:{d:iso(-440)},clos_1:{d:iso(-410)},clos_5:{d:iso(-400)}}};o.yr=vxPlan(g).filter(p=>p.key==="clos_5")[0].st;
  var ge={id:2,sp:"sut",kind:"genc",dob:iso(-100),sex:"e",done:{}};o.maleBru=vxPlan(ge).some(p=>p.v.k==="bru");
  o.orf=vxPlan({id:3,sp:"koyun",kind:"kuzu",dob:iso(-10),done:{}}).filter(p=>p.v.k==="orf")[0].st;
  o.cowClos=vxPlan({id:4,sp:"sut",kind:"anne",calv:iso(45),done:{}}).filter(p=>p.v.k==="clos").map(p=>p.st);
  o.past=vxPlan({id:5,sp:"sut",kind:"anne",calv:iso(100),done:{}}).filter(p=>p.key==="solunum_4")[0].st;
  var R=(sp,sel)=>{HZSEL={};sel.forEach(k=>HZSEL[k]=true);var x=hzRank(sp).map(y=>y.d.k);HZSEL={};return x[0]};o.r=[R("sut",["dogum","yat","ist"]),R("koyun",["olum","ayrilir"]),R("sut",["dogum","ates","ist","sut"])];
  var H=JSON.stringify(HZ);o.txt=[/sefalosporin grubu\)/.test(H),/Yalnız sola kaymada/.test(H),/Mide sondasıyla bol soğuk su/.test(H),/Keçide bakır yasal sınırı 35/.test(H),/sığır yeminde katkı olarak izinli değildir/.test(H)];
  o.pancar=FAM["Kuru pancar posası"][0][6];o.ddgs=STA.DDGS;o.se=XR.lak.se[0];o.pe=XR.lak.pendf[0];return o});
 ok('Asidoz puanı: kaba yemi %'+v9.kaba+' olan normal sağmal rasyonu "yüksek" değil; düşük kaba yemli rasyon yüksek',v9.aNorm<4&&v9.aLow>=4,JSON.stringify({normal:v9.aNorm,dusuk:v9.aLow}));
 ok('Aşı: tohumlama öncesi doz doğumdan 325–311 gün önce; yıllık doz ertesi yıl yeniden çıkıyor; erkek grupta brusella yok; ektima isteğe bağlı; inekte doğum öncesi Clostridium rapeli; gebe inekte geçen pencere "geçti"',v9.preb.a===-325&&v9.preb.b===-311&&v9.yr!=="ok"&&!v9.maleBru&&v9.orf==="opt"&&v9.cowClos.includes("now")&&v9.past==="past",JSON.stringify(v9));
 ok('Belirti sıralaması: taze dönemde yatan iştahsız inek → süt humması; kuzuda ani ölüm → enterotoksemi; ateşli taze inek → rahim iltihabı',JSON.stringify(v9.r)==='["hipoca","entero","son"]',JSON.stringify(v9.r));
 ok('Rehber düzeltmeleri: antibiyotik örneği penisilin/oksitetrasiklin, yuvarlama yalnız sola kaymada, üre zehirlenmesinde sonda, keçide bakır 35, monensin sığır yeminde izinli değil',!v9.txt[0]&&v9.txt.slice(1).every(Boolean),JSON.stringify(v9.txt));
 ok('Eşik ve kütüphane: sağmal selenyum alt sınırı 0,3, peNDF alt sınırı 22; kuru pancar posası Ca %1,45; DDGS nişastası %9',v9.se===0.3&&v9.pe===22&&v9.pancar===1.45&&v9.ddgs===9,JSON.stringify({se:v9.se,pe:v9.pe,p:v9.pancar,d:v9.ddgs}));
 /* V120: sütten kesilmiş buzağı (NRC 2001 düve) ve kuzu (AFRC 1993) büyüme modelleri */
 const gm=await E(()=>{var o={},F=re=>S.feeds.filter(y=>re.test(y.fam||y.n))[0],set=L=>{S.feeds.forEach(x=>{x.on=false;x.kg=0});L.forEach(([re,kg])=>{var x=F(re);if(x){x.on=true;x.kg=kg}});save()};
  S.type="buzagi";S.c=Object.assign(S.c||{},{breed:"hol",bw:100,age:90,bwb:40,adg:900,temp:18});set([[/^Buzağı Büyütme/,2.6],[/^Kuru yonca/,0.4]]);var m=metrics(cItems()),R=CREQ(m),g=cGain(m);o.c={W:R.W,me:R.me,adg:Math.min(g.adg,g.adgp)};
  S.c=Object.assign(S.c,{bw:70,age:42,adg:800});set([[/^Tam yağlı süt/,6],[/^Buzağı Plus/,1.1]]);m=metrics(cItems());o.pre=CREQ(m).me;
  S.type="koyun";S.k=Object.assign(S.k||{},{mode:"kuzu",breed:"akk",bw:30,adg:300,sex:"e",temp:18});set([[/^Arpa/,0.8],[/^Kuru yonca/,0.4],[/^Soya küspesi/,0.15]]);m=metrics(curItems());var kg=kGain(m.dmi,m.meT,m.cp*m.dmi*10);o.l={me:KREQ().me,adg:Math.min(kg.adg,kg.adgp)};return o});
 ok('Sütten kesilmiş buzağı 100 kg, 900 g/gün: ME 6,2–7,0 Mcal (NRC 2001 ≈ 6,7); 2,65 kg KM ile artış 0,85–1,15 kg/gün (saha 0,8–1,0)',gm.c.W&&approx(gm.c.me,6.2,7.0)&&approx(gm.c.adg,850,1150),JSON.stringify(gm.c));
 ok('Süt emen buzağı modeli değişmedi (NASEM 2021; 70 kg, 800 g: ME 5,5–6,5)',approx(gm.pre,5.5,6.5),String(gm.pre));
 ok('Kuzu 30 kg: ME 3,0–3,4 Mcal (AFRC 1993 = 3,17); 0,8 kg arpa + 0,4 kg yonca + 0,15 kg soya ile artış 260–380 g/gün',approx(gm.l.me,3.0,3.4)&&approx(gm.l.adg,260,380),JSON.stringify(gm.l));
 /* Deneme sürümü: yol /deneme/ ise ayrı veri anahtarı ve görünür şerit */
 {const dn=await E(()=>({d:DENEME,k:KEY,ban:!!document.getElementById('denemeBan')}));const isD=/[\\/]deneme[\\/]/.test(path.resolve(FILE));
  ok('Deneme sürümü ayrımı: '+(isD?'deneme yolu → ayrı anahtar (rasyon-v1-deneme) ve şerit':'asıl sürüm → rasyon-v1, şerit yok'),isD?(dn.d&&dn.k==="rasyon-v1-deneme"&&dn.ban):(!dn.d&&dn.k==="rasyon-v1"&&!dn.ban),JSON.stringify(dn))}
 /* V122: tek referans tablosu (deneme sürümünde; yayına alınınca asıl sürümde de) */
 if(/var REF=\{/.test(html)){const rf=await E(()=>{var o={};o.cons=XR.lak.se[0]===REF.seLak.lo&&XR.lak.pendf[0]===REF.pendf.min&&XR.lak.dcad[0]===REF.dcadLak.lo&&XR.koyun.cu[1]===REF.sheepCu.ust&&STR()[1]===(isDry()?STR()[1]:REF.staLak.ust);
  S.type="sut";Object.assign(S.b,{mode:"lak",wk:10,milk:35});S.feeds.forEach(x=>{x.on=false;x.kg=0});[[/^Mısır silajı/,25],[/^Kuru yonca/,4],[/^Arpa/,5],[/^Soya küspesi/,3]].forEach(([re,kg])=>{var x=S.feeds.filter(y=>re.test(y.fam||y.n))[0];x.on=true;x.kg=kg});save();
  var r=sutRisk(),has=r=>r.A.some(a=>/Rumende yıkılan nişasta/.test(a.t));o.rfs=r.rfs;o.before=has(r);var keep=REF.rfs.ust,keep2=REF.rfs.hedef;REF.rfs.ust=Math.max(1,r.rfs-2);REF.rfs.hedef=Math.max(1,r.rfs-3);o.after=has(sutRisk());REF.rfs.ust=keep;REF.rfs.hedef=keep2;return o});
 ok('Tek referans tablosu: analiz tablosu ve çözücü sınırları REF ile aynı; REF değişince risk kartı da değişiyor',rf.cons&&rf.after===true,JSON.stringify(rf));
 ok('Eşikler kodda tek yerde: risk kartlarında sabit sayı kalmadı (rumende yıkılan nişasta, nişasta, peNDF, DCAD, Se, lizin/metiyonin, besi fosforu, koyun bakırı)',!/if\(rfs>22\)|if\(m\.sta>30\)add\(A|if\(m\.pendf<20\)|if\(m\.dcad<250\)|if\(m\.se<0\.3\)tm|Math\.min\(6\.65,|if\(m\.ph>0\.5\)add\(U|if\(m\.cu>15\)\{cu\+=3/.test(html)&&/var REF=\{/.test(html));}
 /* V122: saha kaydı ve hata bildir (deneme sürümünde; yayına alınınca asıl sürümde) */
 if(/window\.fdGuide=/.test(html)){const fd=await E(()=>{var o={},F=re=>S.feeds.filter(y=>re.test(y.fam||y.n))[0];S.type="sut";Object.assign(S.b,{mode:"lak",wk:12,milk:30,bw:650});S.cal={};S.feeds.forEach(x=>{x.on=false;x.kg=0});[[/^Mısır silajı/,28],[/^Kuru yonca/,4],[/^Arpa/,5],[/^Soya küspesi/,3]].forEach(([re,kg])=>{var x=F(re);x.on=true;x.kg=kg});save();
   var P=fdPred(),d0=REQ().dmi;o.pred=!!(P&&P.dmi>0&&P.milkE>0);S.fd=[{id:1,t:"sut",date:"2026-10-01",dmi:d0*0.9,milk:29,pred:P},{id:2,t:"sut",date:"2026-10-08",dmi:d0*0.9,milk:29,pred:P}];o.st=fdStats("sut");
   renderCmp();var bt=document.querySelector('[data-fdcal]');o.btn=bt?bt.dataset.fdcal:null;if(bt)bt.click();o.r=REQ().dmi/d0;S.cal={};S.fd=[];save();
   S.type="besi";S.bb=Object.assign(S.bb||{},{bw:400,fin:600});S.fd=[{id:3,t:"besi",date:"2026-09-01",bw:400,pred:{adg:1300}},{id:4,t:"besi",date:"2026-10-01",bw:430,pred:{adg:1300}}];o.bst=fdStats("besi");S.fd=[];S.type="sut";save();
   window.prompt=()=>"deneme notu";o.bug=window.bugReport?bugReport():null;return {pred:o.pred,st:o.st,btn:o.btn,r:o.r,bst:o.bst,bug:o.bug&&o.bug.note==="deneme notu"&&!JSON.stringify(o.bug).includes('"key"')}});
  ok('Saha kaydı: tahmin kaydediliyor; gerçek KM tüketimi %10 düşükse ×0,90 ayar öneriliyor ve uygulanınca tahmin değişiyor',fd.pred&&Math.abs(fd.st.dmi-0.9)<0.001&&fd.btn==="sut|0.900"&&Math.abs(fd.r-0.9)<0.001,JSON.stringify(fd));
  ok('Saha kaydı: besi tartısından gerçek artış (30 günde 30 kg = 1000 g) tahminle (1300 g) karşılaştırılıyor',fd.bst.an===1&&Math.abs(fd.bst.adg-1000/1300)<0.01,JSON.stringify(fd.bst));
  ok('Hata bildir: not, ekran ve veriler dosyaya; API anahtarı yok',fd.bug===true,String(fd.bug));}
 /* V123: fiyat panosu */
 if(/window\.fpChange=/.test(html)){const fpx=await E(()=>{var o={},mk=(n,f0)=>{var a=[],d=new Date(Date.UTC(2026,0,1));for(var i=0;i<n;i++){a.push([d.toISOString().slice(0,10),f0(i)]);d.setUTCDate(d.getUTCDate()+1)}return a};
   var s=mk(100,i=>100+i);o.w=fpChange(s,7);o.m=fpChange(s,30);o.q=fpChange(s,91);o.none=fpChange(mk(20,i=>100),30);var ay=[['2026-08-01',100],['2026-09-01',101],['2026-10-01',102]];o.ay=[fpChange(ay,7),fpChange(ay,30)];
   var x=S.feeds.filter(y=>/^Arpa/.test(y.fam||y.n))[0],keep=x.p;S.ph={};x.p=11;phSnap();x.p=11;phSnap();var n1=(S.ph[x.n]||[]).length;x.p=12;phSnap();o.ph=[n1,(S.ph[x.n]||[]).length,S.ph[x.n].slice(-1)[0][1]];x.p=keep;S.ph={};
   o.btn=!!document.getElementById('fpBtn');fpOpen();window.FPDATA={guncel:new Date().toISOString(),kaynak:"test",not:"",usdtry:mk(100,i=>40+i*0.01),urunler:[{ad:"Mısır",sembol:"ZC=F",seri:mk(100,i=>9000+i*10)},{ad:"Buğday",sembol:"ZW=F",seri:mk(100,i=>11000-i*10)},{ad:"DDGS",sembol:"USDA",seri:[["2026-04-10",14000]]}],yurtici:{kaynak:"Borsa test",not:"",urunler:[{ad:"Arpa",borsa:"Gaziantep",seri:mk(100,i=>15+i*0.01)},{ad:"Mısır",borsa:"Konya",seri:mk(100,i=>14)},{ad:"DDGS",borsa:"Gaziantep",seri:mk(40,i=>16.5)},{ad:"Pamuk tohumu küspesi",borsa:"Gaziantep",seri:[]}]}};
   var fb=S.feeds.filter(y=>/^(Başaran|Yemcibey)/.test(y.n))[0],fbp=fb&&fb.p,fbo=fb&&fb.on;if(fb){fb.p=29;fb.on=true}window._fpAc={};fpRender();o.txt=document.getElementById('fpBody').innerText;fpAc(0);o.svg=document.querySelectorAll('#fpBody svg[role=img] polyline').length;fpGun(30);o.g30=/1 ay/.test(document.getElementById('fpBody').innerText)&&document.querySelectorAll('#fpBody svg[role=img]').length===1;fpAc(0);o.fab=fb?o.txt.indexOf(fb.n.replace(/,.*$/,''))>=0:false;if(fb){fb.p=fbp;fb.on=fbo}o.wd=document.documentElement.scrollWidth;o.pw=document.getElementById('fpPanel').scrollWidth;fpClose();return o});
  ok('Fiyat panosu: değişim hesabı (100→107 = +%7 hafta; 30 gün önceki değere göre; 3 ay; geçmiş yetersizse boş; aylık seride haftalık değişim boş, aylık dolu)',Math.abs(fpx.w-(199/192-1)*100)<0.01&&Math.abs(fpx.m-(199/169-1)*100)<0.01&&Math.abs(fpx.q-(199/108-1)*100)<0.01&&fpx.none===null&&fpx.ay[0]===null&&Math.abs(fpx.ay[1]-(102/101-1)*100)<0.01,JSON.stringify([fpx.w,fpx.m,fpx.q,fpx.none,fpx.ay]));
  ok('Kendi fiyat geçmişi: yalnız fiyat değişince tarihli kayıt; aynı gün tekrar kayıt şişirmiyor',fpx.ph[0]===1&&fpx.ph[1]===1&&fpx.ph[2]===12,JSON.stringify(fpx.ph));
  ok('Fiyat panosu: hammadde başına merkezler (yurt içi borsa + dünya), hepsi TL/kg, 1 hafta–3 ay sütunları; dokununca tüm merkezler tek grafikte (1/2/3 ay); eski işlem, işlem yok, kaynak yok notları; fabrika yemleri gizli; 390 px',fpx.btn&&/Mısır/.test(fpx.txt)&&/Yurt içi/.test(fpx.txt)&&/Dünya/.test(fpx.txt)&&/Konya/.test(fpx.txt)&&/Chicago vadeli/.test(fpx.txt)&&/9,99/.test(fpx.txt)&&/15,99/.test(fpx.txt)&&/ABD iç piyasa \(USDA, haftalık\)/.test(fpx.txt)&&/14,00/.test(fpx.txt)&&/geçmiş birikiyor/.test(fpx.txt)&&/son işlem/.test(fpx.txt)&&/son 4 ayda işlem yok/.test(fpx.txt)&&/otomatik kaynak yok/.test(fpx.txt)&&/3 ay/.test(fpx.txt)&&/USD\/TL/.test(fpx.txt)&&/Sizin alış fiyatlarınız/.test(fpx.txt)&&!fpx.fab&&fpx.svg===2&&fpx.g30&&fpx.wd<=390&&fpx.pw<=390,'w='+fpx.wd+'/'+fpx.pw+' fab='+fpx.fab+' svg='+fpx.svg+' g30='+fpx.g30);
  {let er=null;try{require('child_process').execSync('node --check '+JSON.stringify(path.join(__dirname,'..','tools','fiyat_guncelle.mjs')),{stdio:'pipe'})}catch(e){er=String(e.stderr||e.message).slice(0,200)}ok('Fiyat güncelleme betiği (tools/fiyat_guncelle.mjs) sözdizimi doğru',!er,er)}
  {const fs2=require('fs'),os=require('os'),src=fs2.readFileSync(path.join(__dirname,'..','tools','fiyat_guncelle.mjs'),'utf8');if(/gaziantepSatirlar/.test(src)){let r=null,er2=null;try{const tmp=path.join(os.tmpdir(),'yk_fiyat_lib_'+process.pid+'.mjs');fs2.writeFileSync(tmp,src.split('\nconst eski =')[0]);
    const fx='<h2>04.11.2026 - Günlük Bülten Endeksi</h2><table><tr><th>Ürün Adı</th></tr>'+[['MISIR','15,000','1.000','HTS'],['MISIR','16,000','3.000','HTSGT'],['MISIR(RUTUBETLİ)','9,000','5.000','HTS'],['AYÇİÇEK KÜSPESİ(İTHL','12,000','2.000','HTS'],['AYÇİÇEK KÜSPESİ(İTHL','5,000','9.000','İTHAL'],['KEPEK (BUĞDAY)','14,127','60.520','HTS'],['KEPEK (BULGUR)','11,000','9.000','HTS']].map(a=>'<tr><td>'+a[0]+'</td><td>1</td><td>2</td><td>'+a[1]+'</td><td>'+a[2]+'</td><td>KG</td><td>x</td><td>'+a[3]+'\n  AÇIKLAMA</td><td>1</td></tr>').join('')+'</table>';
    const ut=['Report for 11/2/2026 - 11/6/2026','',' '.repeat(70)+'Corn Distillers Dried Grain 10%','             Region              Sale Type             Basis          Basis Change               Price ($/Ton)    Price Change      Average   Year Ago    Freight','Illinois                            Ask                                                         185.00-200.00     UNCH-DN 5.00      192.50     152.50      FOB-T','Pacific Northwest                   Ask                                                         252.00-308.00    DN 3.00-DN 14.00   276.67     236.25     DLVD-T','Iowa                                Ask                                                         145.00-195.00         UNCH          167.50     134.25      FOB-T','',' '.repeat(70)+'Sunflower Meal','           Region                Sale Type             Basis        Basis Change            Price ($/Ton)    Price Change    Average   Year Ago    Freight','Min-Dak                             Ask                                                      140.00-180.00       UNCH        160.00     110.00      FOB-T'].join('\n');
    const code='const ut='+JSON.stringify(ut)+';import("'+tmp.replace(/\\/g,'/')+'").then(m=>{const fx='+JSON.stringify(fx)+',g=m.gaziantepSatirlar(fx,"2026-11-04"),f=a=>m.urunFiyati(m.YURTICI.find(u=>u.ad===a&&u.borsa==="Gaziantep"),{Gaziantep:g});const k=[{GrupAdi:"Arpa",OrtFiyat:"15,0000",Miktar:"100.000"},{GrupAdi:"Arpa",OrtFiyat:"16,0000",Miktar:"300.000"}];console.log(JSON.stringify({n:g.length,m:f("Mısır"),a:f("Ayçiçeği küspesi"),k:f("Buğday kepeği"),eski:m.gaziantepSatirlar(fx,"2026-11-05").length,ko:m.urunFiyati(m.YURTICI.find(u=>u.ad==="Arpa"&&u.borsa==="Konya"),{Konya:k}),po:m.urunFiyati(m.YURTICI.find(u=>u.ad==="Arpa"&&u.borsa==="Polatlı"),{"Polatlı":m.polatliSatirlar({Bulten:[{UrunAdi:"ARPA",UrunKodu:"1114",OrtFiyat:"0",Miktar:"255000"},{UrunAdi:"BEYAZ ARPA (1.GRUP)",UrunKodu:"1110",OrtFiyat:"15,0",Miktar:"100000"},{UrunAdi:"STANDARD DIŞI ARPA",UrunKodu:"1113",OrtFiyat:"16,0",Miktar:"300000"},{UrunAdi:"STANDART DIŞI MISIR",UrunKodu:"1142",OrtFiyat:"14,6",Miktar:"236000"}]})}),ad:m.urunFiyati(m.YURTICI.find(u=>u.ad==="Soya fasulyesi"&&u.borsa==="Adana"),{Adana:m.adanaSatirlar("Buğday (1.Sınıf Serbest Piyasa Fiyatı)   İşlem gerçekleşmemiştir      İşlem gerçekleşmemiştir"+String.fromCharCode(10)+"          Soya Fasulyesi                    27,000 – 28,000              28,000 – 29,000"+String.fromCharCode(10)+"   Çiğit (Roll.Mak.Top %5 Emp.)                  17,500                       18,000")}),ci:m.urunFiyati(m.YURTICI.find(u=>u.ad==="Pamuk tohumu küspesi"&&u.borsa==="Adana"),{Adana:m.adanaSatirlar("   Çiğit (Roll.Mak.Top %5 Emp.)                  17,500                       18,000")}),n10:m.YURTICI.length,us:m.usdaOku(ut)}))})';
    r=JSON.parse(require('child_process').execFileSync('node',['-e',code],{stdio:'pipe'}).toString());fs2.unlinkSync(tmp)}catch(e){er2=String(e.stderr||e.message).slice(0,200)}
    ok('Borsa bülteni ve USDA raporu okuma (DDGS yalnız FOB satırları, kısa ton → ton): Gaziantep miktar ağırlıklı ortalama (mısır 15,75), rutubetli/bulgur kepeği/İTHAL beyanı hariç, başka günün bülteni reddedilir; Konya ağırlıklı (arpa 15,75); Polatlı ağırlıklı (arpa 15,75); Adana PDF satırı (soya 28,0; çiğit 17,75)',r&&r.n===7&&r.m===15.75&&r.a===12&&r.k===14.127&&r.eski===0&&r.ko===15.75&&r.po===15.75&&r.ad===28&&r.ci===17.75&&r.n10>=10&&r.us&&r.us.tarih==="2026-11-06"&&r.us.fiyat.DDGS===198.42&&r.us.fiyat["Ayçiçeği küspesi"]===176.37,er2||JSON.stringify(r))}}}
 /* V125: Yemci Bey / Başaran yaş analizleri (form Y.029, 10.11.2026) */
 if(/var YAK=\{\}/.test(html)){const ya=await E(()=>{var o={},g=k=>{var a=FAM[k][0];return {lab:a[0],dm:a[1],me:a[2],cpAF:Math.round(a[3]*a[1])/100,sta:STA[k],ee:MX[k].ee,ash:MX[k].ash}};
   o.n=Object.keys(YAK).length;o.first=Object.keys(YAK).filter(k=>!/^Yaş analiz/.test(FAM[k][0][0]));o.s19=g("Başaran Süt 19");o.pik=g("Yemcibey Süt Pik Yemi");o.kd=[g("Başaran Kuru Dönem Yemi"),g("Yemcibey Kuru Dönem Yemi")];
   var C=flCalc({nem:11.83,hp:19.52,hy:3.88,hs:9.71,kul:7.58,sta:28.46});o.tse=Math.round(C.meTse);
   o.neu=["Yemcibey Kuzu Başlangıç","Yemcibey Kuzu Büyütme","Başaran Kuzu Başlangıç","Başaran Kuzu Büyütme","Yemcibey Çiftlikte Besi","Başaran Çiftlikte Besi","Yemcibey Peletli Taneli Toklu","Başaran Peletli Taneli Toklu","Yemcibey Çiftlikte Peletli Taneli Toklu"].every(k=>FAM[k]&&S.feeds.some(x=>x.fam===k));
   o.poultry=Object.keys(FAM).some(k=>/Yumurta|Piliç|Pilic/.test(k));
   var R=solverRe;S.type="koyun";S.k=Object.assign(S.k||{},{mode:"kuzu"});var rk=R();o.lamb=rk.own.test("Yemcibey Kuzu Başlangıç")&&!rk.not.test("Yemcibey Kuzu Başlangıç");S.k.mode="gebe";o.ewe=R().not.test("Başaran Kuzu Büyütme");S.type="sut";S.b.mode="lak";o.sut=R().not.test("Yemcibey Çiftlikte Besi")&&!R().not.test("Yemcibey Çiftlikte Süt");S.type="besi";o.besi=R().own.test("Başaran Çiftlikte Besi");S.type="sut";return o});
  ok('Yaş analizler: 34 ürün (9 yeni) analizle; kanatlı yemleri eklenmedi; her üründe ilk (varsayılan) değer analiz — sonradan etiketle ezilmiyor',ya.n===34&&ya.neu&&!ya.poultry&&ya.first.length===0,JSON.stringify({n:ya.n,neu:ya.neu,ezilen:ya.first}));
  ok('Başaran Süt 19 (DN301008): KM 88,17, HP %19,52 yaş, nişasta %28,46 yaş → %32,3 KM, yağ %4,4 KM; ME = TSE 9610 analizden ('+ya.tse+' kcal/kg KM)',ya.s19.lab==="Yaş analiz 30.10.2026"&&ya.s19.dm===88.17&&Math.abs(ya.s19.cpAF-19.52)<0.02&&ya.s19.sta===32.3&&Math.abs(ya.s19.ee-4.4)<0.01&&Math.round(ya.s19.me*100)===Math.round(ya.tse/10),JSON.stringify(ya.s19));
  ok('Analizden enerji etiketten düşük (Süt Pik: etiket 2975 yaş, analiz < 2700 yaş) ve Başaran = Yemci Bey Kuru Dönem (kullanıcı onayı)',ya.pik.me*ya.pik.dm/100<2.7&&JSON.stringify(ya.kd[0])===JSON.stringify(ya.kd[1]),JSON.stringify(ya.pik));
  ok('Yeni ürünler doğru grupta: kuzu yemi kuzuda öncelikli, koyunda değil; çiftlikte besi beside, sütte değil',ya.lamb&&ya.ewe&&ya.sut&&ya.besi,JSON.stringify(ya));}
 ok('Kendi analiziniz öncelikli: yem düzenleyicide A/B/kd girilince RUP ona göre (A 15, B 80, kd 4 → soya RUP ≈ %50,5)',pf.user.r>49.5&&pf.user.r<51.5&&/pA/.test(pf.ed)&&/kd/.test(pf.ed)&&/dcR/.test(pf.ed),JSON.stringify(pf.user));
 ok('Referans: koyun rasyonu Cu üst sınırı 12 mg/kg (NRC 2005 tolerans 15; etiket kontrolüyle aynı)',await E(()=>XR.koyun.cu[1]===12&&XR.koyunE.cu[1]===12)&&/12-mx\(x\)\.cu/.test(html));
 ok('Referans: AB 2018/1039 bakır sığır 30 mg/kg',/bakır sığır 30 \(buzağı 15\)/.test(html)&&!/bakır sığır 35/.test(html));
 ok('Buzağı süt KM alt sınırı doğum ağırlığına göre (metinle aynı)',/minLq:0\.015\*\(c\.bwb>0\?c\.bwb:c\.bw\)/.test(html));
 /* Rasyon eksiklerini Premiks sekmesine aktar (V101) */
 await E(()=>{S.type="sut";S.t.sut.n=40;S.feeds.forEach(x=>{x.on=false;x.kg=0});var set=(re,kg)=>{var x=S.feeds.filter(y=>re.test(y.n))[0];x.on=true;x.kg=kg};set(/^Mısır silajı/,30);set(/^Buğday samanı/,3);set(/^Arpa/,7);set(/^Soya küspesi/,2);S.mk.sel=[];S.mk.rx=null;save();renderSeg();showPanels();renderCmp()});
 await p.click('#tabs button[data-t="3"]');await p.waitForTimeout(400);
 const mmb=await p.$('#mmToMk');ok('Süt analizinde "Premiks sekmesine aktar" düğmesi var',!!mmb);
 if(mmb){await p.click('#mmToMk');await p.waitForTimeout(800);
  const tx=await E(()=>({type:S.type,an:S.mk.an,n:S.mk.n,conc:S.mk.conc,k:(S.mk.rx&&S.mk.rx.items||[]).map(o=>o.k),out:document.getElementById('mkOut').innerText,w:document.documentElement.scrollWidth}));
  ok('Aktarım: Premiks sekmesi açılıyor, süt ineği, 40 baş, kesif 9 kg, DCP/kireç/Zn/Se aktarıldı',tx.type==="mikro"&&tx.an==="sut"&&tx.n===40&&tx.conc===9&&['dcp','kir','zn','se'].every(k=>tx.k.includes(k)),JSON.stringify({type:tx.type,an:tx.an,n:tx.n,conc:tx.conc,k:tx.k}));
  ok('Aktarılan eksikler reçetede: sürü/dönem/g-ton tablosu, "hesap" kanıtı, 390 px',/Katkı reçetesi: Rasyon eksikleri/.test(tx.out)&&/g\/ton kesif/.test(tx.out)&&/hesap/.test(tx.out)&&tx.w<=390,tx.out.slice(0,120)+' w='+tx.w);
  const cb=await E(()=>{S.mk.sel=["tirnak"];save();mikroSolve();var t=document.getElementById('mkOut').innerText;S.mk.sel=[];return t});
  ok('Rasyon eksikleri ve seçilen sorun birlikte (Rasyon eksikleri + Tırnak)',/Rasyon eksikleri \+ Tırnak/.test(cb)&&/Biotin/.test(cb)&&/Dikalsiyum fosfat/.test(cb),cb.slice(0,120));
  const ot=await E(()=>{S.mk.an="koyun";save();renderMikro();var c=document.getElementById('mkBody').innerText,o=document.getElementById('mkOut').innerText;S.mk.an="sut";S.mk.rx.on=false;save();mikroSolve();var off=document.getElementById('mkOut').innerText;document.getElementById('mkRxDel')&&document.getElementById('mkRxDel').click();return {c:c,o:o,off:off,rx:S.mk.rx}});
  ok('Başka hayvanda aktarılan eksikler reçeteye girmiyor, uyarı var; kapatılınca ve Kaldır ile siliniyor',/Hayvan olarak onu seçin/.test(ot.c)&&!/Rasyon eksikleri/.test(ot.o)&&/En az bir sorun/.test(ot.off)&&ot.rx===null,JSON.stringify({o:ot.o.slice(0,60),off:ot.off.slice(0,60),rx:ot.rx}));}
 const ur=await E(()=>{var m=MK_def(),old={rx:m.rx,an:m.an,conc:m.conc,sel:m.sel};m.an="sut";m.conc=9;m.sel=[];m.rx={an:"sut",on:true,date:"",items:[{k:"ure",n:"Yem üresi",g:145,why:"RDP"}]};mikroSolve();var o=document.getElementById('mkOut').innerText;m.conc=20;mikroSolve();var o2=document.getElementById('mkOut').innerText;Object.assign(m,old);return {o,o2}});
 ok('Üre kesif yemde %1\'i geçince uyarı (145 g / 9 kg); 20 kg kesifte uyarı yok',/Üre kesif yemde %1'i geçiyor/.test(ur.o)&&!/%1'i geçiyor/.test(ur.o2),ur.o.slice(-200));
 const cl=await E(()=>{S.type="sut";S.feeds.forEach(x=>{x.on=false;x.kg=0});var set=(re,kg)=>{var x=S.feeds.filter(y=>re.test(y.n))[0];x.on=true;x.kg=kg};set(/^Mısır silajı/,30);set(/^Buğday samanı/,3);set(/^Arpa/,7);set(/^Soya küspesi/,2);var m=metrics(curItems()),P=xProf(),G=SG();microMix(m);var g={};window._mmLast.items.forEach(o=>g[o.k]=o.g);var D=m.dm_,a=(k,c)=>(g[k]||0)*c/1000/D*100;
  return {P:m.ph+a('dcp',0.18)>=G.p,Ca:m.ca+a('dcp',0.22)+a('kir',0.38)>=G.ca&&m.ca+a('dcp',0.23)+a('kir',0.38)<=(G.cax||1.2),Na:m.na+a('tuz',0.393)+a('bik',0.274)>=P.na[0]&&m.na+a('tuz',0.393)+a('bik',0.274)<=P.na[1],Zn:m.zn+(g.zn||0)*360/D>=P.zn[0],Cu:m.cu+(g.cu||0)*255/D>=P.cu[0]&&m.cu+(g.cu||0)*255/D<=P.cu[1],Se:m.se+(g.se||0)*60/1000/D>=P.se[0]&&m.se+(g.se||0)*60/1000/D<=P.se[1]}});
 ok('Önerilen katkılar eklenince P/Ca/Na/Zn/Cu/Se hedef aralığına giriyor (süt, eksik rasyon)',Object.values(cl).every(Boolean),JSON.stringify(cl));
 ok('MICRO→MKA eşlemesindeki her katkının Premiks kaydı var',await E(()=>Object.keys(MM2MK).every(k=>MICRO[k]&&MKA[MM2MK[k]])));
 /* Sıfırlama: onay ister; vazgeçilirse değişmez; onaylanırsa kayıtlar, API anahtarı ve kendi hammaddeleri korunur */
 const rs0=await E(()=>{AI_def().key="sk-keep";S.feeds.push({n:"Benim silajım",k:1,on:true,p:0,dm:30,me:2.4,cp:8,ndf:45,adf:28,ca:0.3,ph:0.2,mn:0,mx:"",fam:"",v:0,src:"analiz"});save();window.confirm=()=>false;var n=S.feeds.length;document.getElementById('reset').click();return {n0:n,n1:S.feeds.length}});
 ok('Sıfırlama vazgeçilince hiçbir şey silinmiyor',rs0.n0===rs0.n1,JSON.stringify(rs0));
 const rs=await E(()=>{var before=JSON.stringify(S.mk).length;window.confirm=()=>true;document.getElementById('reset').click();return {after:JSON.stringify(S.mk||{}).length,before:before,ym:!!S.ym,key:S.ai&&S.ai.key,own:S.feeds.some(x=>x.n==="Benim silajım")}});
 ok('Sıfırlama Premiks sekmesinde çalışıyor ve kayıtları koruyor',rs.after===rs.before&&rs.ym,JSON.stringify(rs));
 ok('Sıfırlama API anahtarını ve kendi eklenen hammaddeyi koruyor',rs.key==="sk-keep"&&rs.own,JSON.stringify(rs));
 /* Açık <details> içinde 360 px taşma yok */
 await p.setViewportSize({width:360,height:800});await E(()=>{S.type="sut";save();renderSeg();showPanels();document.querySelectorAll('details').forEach(d=>d.open=true)});await p.waitForTimeout(300);
 const w360=await E(()=>document.documentElement.scrollWidth);ok('360 px, tüm açılır bölümler açıkken taşma yok',w360<=360,String(w360));
 await E(()=>document.querySelectorAll('details').forEach(d=>d.open=false));await p.setViewportSize({width:390,height:844});
 /* Sekme geçişleri ve genişlik */
 const widths={};for(const t of ["sut","besi","koyun","buzagi","yem","mikro"]){await p.click('#seg button[data-t="'+t+'"]');await p.waitForTimeout(300);widths[t]=await E(()=>document.documentElement.scrollWidth)}
 ok('Hiçbir sekme 390 px\'i taşmıyor',Object.values(widths).every(w=>w<=390),JSON.stringify(widths));
 ok('Tarayıcı JS hatası yok',!errs.length,errs.slice(0,3).join(' | '));
 /* Bozuk kayıt: uygulama varsayılanlarla açılıyor */
 for(const bad of ['{"type":"sut","t":{},"feeds":[null]}','{"feeds":{"a":1},"t":{}}']){const q=await b.newPage({viewport:{width:390,height:844}});const qe=[];q.on('pageerror',e=>qe.push(e.message));await q.goto('file://'+path.resolve(FILE));await q.evaluate(v=>localStorage.setItem(KEY,v),bad);await q.reload();await q.waitForTimeout(500);const nb=await q.evaluate(()=>document.querySelectorAll('#seg button').length);ok('Bozuk kayıtla açılış hatasız: '+bad.slice(0,30),!qe.length&&nb>0,qe.join('|')+' seg='+nb);await q.evaluate(()=>localStorage.clear());await q.close()}
 await b.close();done();
})().catch(e=>{ok('Test koşucusu',false,e.message);done()});

function done(){const fail=R.filter(r=>!r.ok);R.forEach(r=>console.log((r.ok?'✓ ':'✗ ')+r.name+(r.ok?'':'  — '+r.info)));console.log('\n'+(R.length-fail.length)+'/'+R.length+' kontrol geçti'+(fail.length?' — YAYINLAMAYIN':''));process.exit(fail.length?1:0)}
