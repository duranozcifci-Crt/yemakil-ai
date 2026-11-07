/* YemAkıl Rasyon — öz-denetim (her yayından önce çalıştır)
   node test/selftest.js [dosya]   → varsayılan ../index.html veya argüman
   Çıkış kodu 0 = geçti, 1 = en az bir kontrol başarısız.
   Kural: düzeltilen her hata buraya bir "altın örnek" olarak eklenir. */
const fs=require('fs'),path=require('path');
const FILE=process.argv[2]||path.join(__dirname,'..','index.html');
const html=fs.readFileSync(FILE,'utf8');
const R=[];function ok(name,cond,info){R.push({name,ok:!!cond,info:info||''});}
function approx(v,lo,hi){return typeof v==='number'&&isFinite(v)&&v>=lo&&v<=hi}

/* ---------- 1. Sözdizimi ---------- */
let synErr=null;[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{try{new Function(m[1])}catch(e){synErr=i+': '+e.message}});
ok('JS sözdizimi',!synErr,synErr);

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
 const k=await E(()=>{S.type="koyun";S.k=Object.assign(S.k||{},{mode:"kuzu",bw:30,adg:300,sex:"m",temp:15});save();var R=KREQ();return {me:R.me,dmi:R.dmi,cp:R.cp}});
 ok('Kuzu ME 3,5–4,5 Mcal',approx(k.me,3.5,4.5),JSON.stringify(k));
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
 ok('Karışık OCR metni: sütun ayracı aşılmıyor, eksik virgül ve şüpheli değer ⚠ işaretli',gb.v.hp===19&&gb.v.hy===3.83&&gb.flag.hy&&gb.flag.na&&gb.v.zn===undefined&&gb.v.i===undefined,JSON.stringify(gb));
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
  S.k=Object.assign(S.k,{mode:"kuzu",bw:10,adg:250,sex:"m"});var R=KREQ();o.lamb=R.me/R.dmi;
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
