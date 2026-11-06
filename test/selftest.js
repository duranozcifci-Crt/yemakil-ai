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
 /* Sıfırlama her sekmede hatasız ve premiks/ym korunur */
 const rs=await E(()=>{var before=JSON.stringify(S.mk).length;document.getElementById('reset').click();return {after:JSON.stringify(S.mk||{}).length,before:before,ym:!!S.ym}});
 ok('Sıfırlama Premiks sekmesinde çalışıyor ve kayıtları koruyor',rs.after===rs.before&&rs.ym,JSON.stringify(rs));
 /* Sekme geçişleri ve genişlik */
 const widths={};for(const t of ["sut","besi","koyun","buzagi","yem","mikro"]){await p.click('#seg button[data-t="'+t+'"]');await p.waitForTimeout(300);widths[t]=await E(()=>document.documentElement.scrollWidth)}
 ok('Hiçbir sekme 390 px\'i taşmıyor',Object.values(widths).every(w=>w<=390),JSON.stringify(widths));
 ok('Tarayıcı JS hatası yok',!errs.length,errs.slice(0,3).join(' | '));
 await b.close();done();
})().catch(e=>{ok('Test koşucusu',false,e.message);done()});

function done(){const fail=R.filter(r=>!r.ok);R.forEach(r=>console.log((r.ok?'✓ ':'✗ ')+r.name+(r.ok?'':'  — '+r.info)));console.log('\n'+(R.length-fail.length)+'/'+R.length+' kontrol geçti'+(fail.length?' — YAYINLAMAYIN':''));process.exit(fail.length?1:0)}
