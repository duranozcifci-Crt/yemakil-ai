/* YemAkıl Fiyatlar (V140): rasyon programından ayrı sayfa (fiyat.html). Piyasa fiyatları fiyatlar.json'dan (GitHub Actions her gün günceller).
   Gerekenler fiyat.html'de: S (rasyon kayıtlarından salt-okunur feeds/ph + kendi navlun/teklif kaydı), save, f, esc.
   Denetim düzeltmeleri (2026-11-14): donmuş fiyat ("fiyat haftalardır aynı") ve oynak seri uyarısı, dosya güncellenmediyse uyarı,
   internet yokken telefonda kayıtlı son fiyatlar, tek birim (yurt içi TL/ton), grafikte ithal mal Mersin teslim fiyatıyla, ayrıntılar dokununca açılır. */
(function(){
var RAW="https://raw.githubusercontent.com/duranozcifci-Crt/yemakil-ai/main/fiyatlar.json",YEDEK="fiyat-veri",PER=[["1 hf",7],["1 ay",30],["2 ay",61],["3 ay",91]];
window.FPDATA=window.FPDATA||null;
function iki(n){return (n<10?'0':'')+n}
function dAdd(d,n){var x=new Date(d+"T00:00:00Z");x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)}
function gunFark(a,b){return Math.round((Date.parse(a)-Date.parse(b))/864e5)}
/* bugün telefonun kendi saatine göre (gece 00–03 arası Greenwich'e göre dün olmasın) */
function today(){var d=new Date();return d.getFullYear()+'-'+iki(d.getMonth()+1)+'-'+iki(d.getDate())}
function fpTarih(d){return new Date(d+"T00:00:00Z").toLocaleDateString("tr-TR",{timeZone:"UTC"})}
function fpTl(v){return f(Math.round(v/100)*100,0)}
/* seri: [[tarih, değer], ...] artan. N gün önceki (ya da ondan önceki son) değer; o değer N günden çok daha eskiyse (1 haftada 3 gün, uzun sürelerde N/4) karşılaştırma yapılmaz */
window.fpRef=function(seri,n){if(!seri||seri.length<2)return null;var last=seri[seri.length-1],lim=dAdd(last[0],-n),ref=null;for(var i=seri.length-1;i>=0;i--){if(seri[i][0]<=lim){ref=seri[i];break}}if(!ref||!(ref[1]>0))return null;if(gunFark(lim,ref[0])>(n<=7?3:Math.round(n/4)))return null;return ref};
window.fpChange=function(seri,n){var r=fpRef(seri,n);return r?(seri[seri.length-1][1]/r[1]-1)*100:null};
function fpNeden(s,n,yd){if(!s||!s.length)return 'veri yok';var last=s[s.length-1][0],lim=dAdd(last,-n);if(s[0][0]>lim)return 'birikiyor';if(s.length>=2){var gs=[];for(var i=1;i<s.length;i++)gs.push(gunFark(s[i][0],s[i-1][0]));gs.sort(function(a,b){return a-b});if(gs[Math.floor(gs.length/2)]>20&&n<20)return 'aylık'}return yd?'fiyat yok':'işlem yok'}
function renk(v){return v>=0.05?"var(--bad)":v<=-0.05?"var(--ok)":"inherit"}
function yuzde(v){return (v>=0.05?"+":v<=-0.05?"−":"")+f(Math.abs(v),1)+'%'}
function pcHucre(s,n,carp,dec,yd){var r=fpRef(s,n);if(!r)return '<td class="pn">—<br>'+fpNeden(s,n,yd)+'</td>';var v=(s[s.length-1][1]/r[1]-1)*100;return '<td class="pc">'+f(r[1]*carp,dec)+'<br><small style="color:'+renk(v)+'">'+yuzde(v)+'</small></td>'}
function pc(v){if(v===null||!isFinite(v))return '<td class="pc mu">—</td>';return '<td class="pc" style="color:'+renk(v)+'">'+yuzde(v)+'</td>'}
function spark(seri){if(!seri||seri.length<3)return '';var lim=dAdd(seri[seri.length-1][0],-91),s=seri.filter(function(p){return p[0]>=lim});if(s.length<3)return '';var vs=s.map(function(p){return p[1]}),mn=Math.min.apply(null,vs),mx=Math.max.apply(null,vs),w=70,h=20,r=mx-mn||1;var pts=s.map(function(p,i){return (i/(s.length-1)*w).toFixed(1)+','+(h-(p[1]-mn)/r*h).toFixed(1)}).join(' ');return '<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" style="vertical-align:middle" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="1.3" points="'+pts+'"/></svg>'}
/* kendi fiyat geçmişi (rasyon programının kaydından, salt-okunur): her kayıtta fiyatı değişen hammadde tarihli saklanır */
function ownRows(){var ph=S.ph||{},t=today();return (S.feeds||[]).filter(function(x){return x&&x.p>0&&(x.on||(ph[x.n]&&ph[x.n].length>1))}).map(function(x){var L=(ph[x.n]||[]).slice();if(!L.length||L[L.length-1][1]!==x.p)L.push([t,x.p]);if(L[L.length-1][0]!==t)L.push([t,x.p]);return {ad:x.n.replace(/,.*$/,''),p:x.p,L:L}}).sort(function(a,b){return a.ad.localeCompare(b.ad,"tr")})}
var FABR=/^(Yemcibey|Başaran|Süt \d|Süt yemi|Prenses|Düve|Buzağı|Besi|Toklu|Kuzu|Bypass|Premiks|Kuru dönem|Süt ikame|Etiketten|Çiftlik karması)/;
function fpTable(L){return '<div class="ox"><table class="c"><tr><th>Hammadde</th><th class="r">TL/ton</th>'+PER.map(function(p){return '<th class="r">'+p[0]+'</th>'}).join('')+'</tr>'+L.map(function(u){var s=u.seri,l=s[s.length-1];return '<tr><td><b>'+esc(u.ad)+'</b><br>'+spark(s)+'</td><td class="pc">'+f(l[1]*1000,0)+'</td>'+PER.map(function(p){return pc(fpChange(s,p[1]))}).join('')+'</tr>'}).join('')+'</table></div>'}
/* Hammaddeler: k = fiyatlar.json'daki ürün adları (yurt içi ve dünya), yi = yalnız yurt içi fiyatı olan, dnot = dünya fiyatları için not */
var HAM=[{kisa:"Mısır",ad:"Mısır",k:["Mısır"],ure:"ABD, Çin, Brezilya, AB, Arjantin, Ukrayna",ihr:"ABD, Brezilya, Arjantin, Ukrayna"},
 {kisa:"Arpa",ad:"Arpa",k:["Arpa"],ure:"AB (Fransa, Almanya), Rusya, Avustralya, Kanada, Türkiye, Ukrayna",ihr:"AB, Avustralya, Rusya, Kanada, Arjantin, Ukrayna"},
 {kisa:"Yem. buğday",ad:"Yemlik buğday",k:["Yemlik buğday","Buğday"],dnot:"dünya fiyatları ekmeklik/değirmenlik buğday",ure:"AB, Çin, Hindistan, Rusya, ABD, Kanada, Avustralya, Türkiye",ihr:"Rusya, AB, Kanada, Avustralya, ABD, Arjantin, Ukrayna"},
 {kisa:"Soya fas.",ad:"Soya fasulyesi",k:["Soya fasulyesi"],ure:"Brezilya, ABD, Arjantin, Çin, Hindistan, Paraguay",ihr:"Brezilya, ABD, Paraguay, Arjantin"},
 {kisa:"Soya küsp.",ad:"Soya küspesi",k:["Soya küspesi"],ure:"Çin, ABD, Brezilya, Arjantin, AB, Hindistan",ihr:"Arjantin, Brezilya, ABD, Paraguay"},
 {kisa:"DDGS",ad:"DDGS",k:["DDGS"],ure:"ABD (açık ara), Çin, AB",ihr:"ABD"},
 {ad:"Mısır gluteni (feed / meal)",k:["Mısır gluten yemi (feed)","Mısır gluteni (meal)"],ayir:["Gluten yemi","Gluten (meal)"],ure:"ABD, Çin, AB",ihr:"ABD, Çin"},
 {kisa:"Ayçiçeği küsp.",ad:"Ayçiçeği küspesi",k:["Ayçiçeği küspesi"],ure:"Rusya, Ukrayna, Arjantin, AB, Türkiye",ihr:"Ukrayna, Rusya, Arjantin"},
 {kisa:"Pamuk küsp.",ad:"Pamuk tohumu küspesi",k:["Pamuk tohumu küspesi"],ure:"Hindistan, Çin, Pakistan, ABD, Brezilya",ihr:"dış ticareti az; çoğu üretildiği ülkede tüketilir"},
 {kisa:"Çiğit",ad:"Çiğit (pamuk tohumu)",k:["Çiğit (pamuk tohumu)"],yi:1,dnot:"küspe değil: yağı alınmamış tam pamuk tohumu",ure:"Hindistan, Çin, ABD, Brezilya, Türkiye (Çukurova, GAP)",ihr:"dış ticareti az"},
 {kisa:"Kepek",ad:"Buğday kepeği",k:["Buğday kepeği"],ure:"un sanayisi olan her ülke: Çin, Hindistan, AB, Rusya, ABD, Türkiye",ihr:"Rusya, Ukrayna, Kazakistan, Pakistan"}],FPREN=["#2f6fb3","#c2571a","#2e8b57","#8e44ad","#b8860b","#d6336c","#17a2b8","#6c757d"];
window._fpAc=window._fpAc||{};window._fpGun=window._fpGun||91;
function ekGl(a){return /feed/.test(a)?" feed":/meal/.test(a)?" meal":""}
function fpRefGun(D){return String((D&&D.guncel)||'').slice(0,10)}
/* aynı güne iki kayıt gelirse (Chicago: günün kapanışı + gece seansının anlık fiyatı aynı tarihle) ilki, yani kapanış kalır; yoksa "günlük +%2,6" diye sahte hareket çıkıyordu */
function fpTekil(s){var o=[];for(var i=0;i<s.length;i++)if(!i||s[i][0]!==s[i-1][0])o.push(s[i]);return o.length===s.length?s:o}
function fpMerkez(D){var Y=(D&&D.yurtici&&Array.isArray(D.yurtici.urunler))?D.yurtici.urunler:[],U=(D&&Array.isArray(D.urunler))?D.urunler:[];
 var M=HAM.map(function(h){var L=[],cok=h.k.length>1;
  Y.forEach(function(u){if(u&&Array.isArray(u.seri)&&h.k.indexOf(u.ad)>=0)L.push({yer:"yi",ad:u.ad,borsa:u.borsa||"Borsa",tur:u.tur||"",etiket:(u.borsa||"Borsa")+(u.tur?" "+u.tur:"")+(cok?ekGl(u.ad):""),not:u.not||"",seri:u.seri,gor:u.gorulme||""})});
  U.forEach(function(u){if(u&&Array.isArray(u.seri)&&u.seri.length&&h.k.indexOf(u.ad)>=0){var sr=fpTekil(u.seri);L.push({yer:"yd",ad:u.ad,etiket:(u.merkez?u.merkez:u.sembol==="USDA"?"ABD iç piyasa (USDA, haftalık)":"Chicago vadeli")+(cok?ekGl(u.ad):""),seri:sr,usd:sr.map(function(p){return [p[0],p[1]/fpKur(D,p[0])]}),koken:fpKoken(u),gor:u.gorulme||""})}});
  return {ad:h.ad,L:L,h:h}});
 var son="";M.forEach(function(m){m.L.forEach(function(x){if(x.yer==="yi"&&x.seri.length){var d=x.seri[x.seri.length-1][0];if(d>son)son=d}})});
 var ctx={ref:fpRefGun(D),son:son};M.forEach(function(m){m.L.forEach(function(x){x.b=fpBak(x,ctx)})});M.son=son;return M}
function fpKur(D,d){var k=(D&&D.usdtry)||[],v=null;for(var i=0;i<k.length;i++){if(k[i][0]<=d)v=k[i][1];else break}return v||(k[0]&&k[0][1])||1}
function fpKoken(u){var m=u.merkez||'';if(/Karadeniz|Ukrayna FOB|Rusya FOB/.test(m))return 'KD';if(/^Fransa/.test(m))return 'AB';if(/Arjantin FOB|Paranaguá/.test(m))return 'GA';if(/^Avustralya/.test(m))return 'AU';if(/^ABD Körfez FOB/.test(m))return 'US';return null}
var NAVV={KD:['Karadeniz (Rusya, Ukrayna) → Mersin',20],AB:['Fransa (Rouen) → Mersin',35],GA:['Güney Amerika (Arjantin, Brezilya) → Mersin',50],AU:['Avustralya → Mersin',50],US:['ABD Körfezi → Mersin',45],MS:['Liman, sigorta, boşaltma (her yük için)',8]};
function fpNav(k){var n=(S&&S.navlun&&typeof S.navlun==='object')?S.navlun:{};var v=+n[k];return isFinite(v)&&v>=0&&v<500&&n[k]!==''&&n[k]!=null?v:NAVV[k][1]}
window.fpNavSet=function(k,v){S.navlun=(S.navlun&&typeof S.navlun==='object')?S.navlun:{};var t=String(v==null?'':v).trim(),x=parseFloat(t.replace(',','.'));
 if(t==='')delete S.navlun[k];else if(isFinite(x)&&x>=0&&x<500)S.navlun[k]=x;else{alert('Navlun 0 ile 499 $/ton arasında olmalı; önceki değer korundu.');fpRender();return}
 try{save()}catch(e){}fpRender()};
/* Kaynak durdu mu: serinin olağan aralığına göre son fiyat çok eskiyse gün sayısı. Günlük/haftalık seride 3 aralık (en az 14 gün), aylık seride 100 gün. ref = verinin güncellendiği gün. */
window.fpDurdu=fpDurdu;function fpDurdu(s,ref){if(!s||s.length<3||!ref)return 0;var gs=[];for(var i=1;i<s.length;i++)gs.push(gunFark(s[i][0],s[i-1][0]));gs.sort(function(a,b){return a-b});var g=gs[Math.floor(gs.length/2)],yas=gunFark(ref,s[s.length-1][0]),lim=g>20?100:Math.max(3*g,14);return yas>lim?yas:0}
/* Donmuş fiyat (denetim Y1): tarih ilerlediği halde son fiyat en az 3 kayıt ve 6 hafta boyunca aynıysa (±%0,15) gün sayısı; örnek Ukrayna FOB 3 ay 224 $/t */
window.fpDonuk=fpDonuk;function fpDonuk(s){if(!s||s.length<3)return 0;var l=s[s.length-1],i=s.length-1;if(!(l[1]>0))return 0;while(i>0&&Math.abs(s[i-1][1]/l[1]-1)<=0.0015)i--;var g=gunFark(l[0],s[i][0]);return s.length-i>=3&&g>=42?g:0}
/* Oynak seri (denetim Y2): son 45 günde iki ya da daha çok kez bir işlemden diğerine %15'ten fazla oynama (çoğunlukla farklı kaliteler karışıyor) */
function fpOynak(s){var lim=dAdd(s[s.length-1][0],-45),n=0;for(var i=1;i<s.length;i++)if(s[i][0]>=lim&&s[i-1][1]>0&&Math.abs(s[i][1]/s[i-1][1]-1)>0.15)n++;return n>=2}
/* Aynı fiyat (yumuşak işaret, kontrol 18.11.2026): günlük borsa serisinde son fiyat en az 5 kayıt ve 14 gün boyunca hiç değişmediyse gün sayısı.
   Seri hesaptan ÇIKARILMAZ (Adana soya/çiğit gibi kote/ilan fiyatı olabilir); yalnız "N gündür aynı" diye işaretlenir. 6 haftayı geçince fpDonuk devreye girer. */
window.fpAyni=fpAyni;function fpAyni(s){if(!s||s.length<5)return 0;var l=s[s.length-1],i=s.length-1;if(!(l[1]>0))return 0;while(i>0&&Math.abs(s[i-1][1]/l[1]-1)<=0.0015)i--;var g=gunFark(l[0],s[i][0]);return s.length-i>=5&&g>=14?g:0}
/* Serinin olağan aralığı (gün, ortanca): 20 günden uzunsa aylık ortalama serisidir (tarihi ayın ilk günü) */
function fpAralik(s){if(!s||s.length<2)return 0;var gs=[];for(var i=1;i<s.length;i++)gs.push(gunFark(s[i][0],s[i-1][0]));gs.sort(function(a,b){return a-b});return gs[Math.floor(gs.length/2)]}
function fpSicra(s){if(s.length<2)return 0;var a=s[s.length-1][1],b=s[s.length-2][1];return b>0&&Math.abs(a/b-1)>0.15?(a/b-1)*100:0}
/* Özetteki değişim (denetim O5): her merkezde aynı süre, son 1 haftaya göre. Bir hafta önceki fiyat yoksa bir önceki fiyata göre ve süresi yazılır ("ay" ya da gün) */
function fpDeg(s){if(!s||s.length<2)return null;var v=fpChange(s,7);if(v!==null)return {v:v,e:''};var l=s[s.length-1],o=s[s.length-2];if(!(o[1]>0))return null;var g=gunFark(l[0],o[0]);return {v:(l[1]/o[1]-1)*100,e:g>=25&&g<=45?'ay':g+' g'}}
function fpBak(x,ctx){var yd=x.yer==="yd",s=yd?x.usd:x.seri;if(!s||!s.length)return null;var l=s[s.length-1],o={s:s,l:l};
 o.dur=yd?fpDurdu(s,ctx.ref):0;o.eski=yd?o.dur>0:!!(ctx.son&&l[0]<dAdd(ctx.son,-7));o.donuk=fpDonuk(s);o.oynak=!yd&&fpOynak(s);o.sicra=yd?0:fpSicra(s);
 o.gecersiz=o.eski||o.donuk>0;o.aylik=yd&&fpAralik(s)>20;o.ayni=!yd&&!o.gecersiz?fpAyni(s):0;o.deg=fpDeg(s);o.mersin=yd&&x.koken&&!o.gecersiz?l[1]+fpNav(x.koken)+fpNav('MS'):null;return o}
/* Grafik (denetim O4): yurt içi TL/ton; ithal mal (FOB) tahmini Mersin liman teslim fiyatıyla (FOB + navlun + liman, o günkü kur) TL/ton. Vadeli borsa ve ABD iç piyasa fiyatı navlunsuz olduğu için çizilmez. */
function fpCizgi(m,D){return m.L.map(function(x){if(x.yer==="yi")return x.seri.map(function(p){return [p[0],p[1]*1000]});if(!x.koken)return null;var ek=fpNav(x.koken)+fpNav('MS'),c=x.usd.map(function(p){return [p[0],(p[1]+ek)*fpKur(D,p[0])]});if(x.b&&x.b.gecersiz)c.gri=fpKisa(x.etiket);return c})}
function fpGrafik(M,gun,D){var W=340,H=170,pl=44,pr=8,pt=8,pb=20,C=fpCizgi(M,D),son="";C.forEach(function(s){if(s&&s.length){var d=s[s.length-1][0];if(d>son)son=d}});if(!son)return '<p class="s">Grafik için fiyat yok.</p>';
 var bas=dAdd(son,-gun),gri=[],S2=C.map(function(s){var q=s?s.filter(function(p){return p[0]>=bas}):[];if(s&&s.gri&&q.length){q.gri=1;gri.push(s.gri)}return q}),v=[];S2.forEach(function(s){s.forEach(function(p){v.push(p[1])})});if(!v.length)return '<p class="s">Bu dönemde veri yok.</p>';
 var mn=Math.min.apply(null,v),mx=Math.max.apply(null,v),pad=(mx-mn)*0.08||mx*0.05||1;mn-=pad;mx+=pad;var t0=Date.parse(bas),t1=Date.parse(son)||t0+1,X=function(d){return pl+(Date.parse(d)-t0)/(t1-t0||1)*(W-pl-pr)},Yk=function(y){return pt+(mx-y)/(mx-mn)*(H-pt-pb)};
 var g='<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="max-width:'+W+'px;display:block" role="img" aria-label="'+esc(M.ad)+' son '+gun+' gün fiyat grafiği, TL/ton">';
 for(var i=0;i<=3;i++){var yv=mn+(mx-mn)*i/3,yy=Yk(yv);g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yy.toFixed(1)+'" y2="'+yy.toFixed(1)+'" stroke="currentColor" stroke-opacity=".15"/><text x="'+(pl-4)+'" y="'+(yy+3).toFixed(1)+'" font-size="9" text-anchor="end" fill="currentColor" fill-opacity=".7">'+f(yv,0)+'</text>'}
 [bas,dAdd(son,-Math.round(gun/2)),son].forEach(function(d,i){g+='<text x="'+X(d).toFixed(1)+'" y="'+(H-5)+'" font-size="9" text-anchor="'+(i===0?"start":i===2?"end":"middle")+'" fill="currentColor" fill-opacity=".7">'+fpTarih(d).slice(0,5)+'</text>'});
 S2.forEach(function(s,j){if(!s.length)return;var c=s.gri?'#8a8f8c':FPREN[j%FPREN.length],da=s.gri?' stroke-dasharray="1 4" stroke-opacity=".75"':M.L[j].yer==="yd"?' stroke-dasharray="5 3"':'';if(s.length===1){g+='<circle cx="'+X(s[0][0]).toFixed(1)+'" cy="'+Yk(s[0][1]).toFixed(1)+'" r="3" fill="'+c+'"/>';return}
  g+='<polyline fill="none" stroke="'+c+'" stroke-width="'+(s.gri?1.5:2)+'"'+da+' points="'+s.map(function(p){return X(p[0]).toFixed(1)+','+Yk(p[1]).toFixed(1)}).join(' ')+'"/>';if(s.length<25&&!s.gri)s.forEach(function(p){g+='<circle cx="'+X(p[0]).toFixed(1)+'" cy="'+Yk(p[1]).toFixed(1)+'" r="2" fill="'+c+'"/>'})});
 return g+'</svg><p class="s mu" style="margin:2px 0">TL/ton. Düz çizgi yurt içi borsa; kesikli çizgi ithal malın tahmini Mersin liman teslim fiyatı (FOB + navlun + liman; gümrük ve KDV hariç). Vadeli borsa ve ABD iç piyasa fiyatları navlunsuz olduğu için grafikte yok.'+(gri.length?' <span class="gri">Gri noktalı çizgi: güncel olmayan kaynak ('+esc(gri.join(', '))+'): kaynak yeni fiyat vermiyor ya da fiyat haftalardır aynı; Mersin hesabına katılmaz.</span>':'')+'</p>'}
/* Size gelen teklifler: elle girilir, bu sayfanın kaydında (fiyat-v1) durur. k = köken, s = teslim şekli (FOB: ihracat limanı $/t; LMN: Mersin/İskenderun liman teslim $/t; FAB: fabrikaya teslim, kayıtta TL/kg, ekranda TL/ton). */
var TKK=[["Rusya","KD"],["Ukrayna","KD"],["Kazakistan","KD"],["Romanya / Bulgaristan","KD"],["Fransa / AB","AB"],["Arjantin","GA"],["Brezilya","GA"],["ABD","US"],["Avustralya","AU"],["Türkiye (yerli)",""],["Diğer",""]],TKS=[["FOB","İhracat limanı FOB","$/t"],["LMN","Mersin / İskenderun liman teslim","$/t"],["FAB","Fabrikaya / depoya teslim","TL/ton"]];
function fpTk(){return Array.isArray(S.teklif)?S.teklif:[]}
function fpTkNav(k){for(var i=0;i<TKK.length;i++)if(TKK[i][0]===k)return TKK[i][1];return ""}
function fpTkFiyat(t){return t.s==="FAB"?f(t.p*1000,0)+' TL/ton':f(t.p,0)+' $/t'}
window.fpTfAc=function(i){var kapa=window._fpTf===i;window._fpTf=kapa?null:i;window._fpTfHata="";if(window._fpTf!==null)window._fpAc[i]=true;fpRender();if(kapa)fpGor('[data-tf="'+i+'"]')};
/* Aç-kapa (kullanıcı isteği 2026-11-16): ikinci basış açılanı kapatır; kapanınca düğme ekranda kalsın (yapışkan başlığın altında görünür) */
function fpGor(sel){if(typeof document==='undefined')return;var x=document.querySelector(sel);if(!x||!x.getBoundingClientRect)return;var r=x.getBoundingClientRect(),ust=100;if(r.top<ust||r.top>window.innerHeight-40)window.scrollTo(0,Math.max(0,(window.scrollY||window.pageYOffset||0)+r.top-ust))}
window.fpGor=fpGor;
/* katlanır kutular (Mersin teslim hesabı, Tablo nasıl okunur): sayfa yenilenince (navlun değişince) kullanıcının açtığı/kapattığı hali korunur */
window._fpDAc=window._fpDAc||{};function fpDA(k){return ' data-da="'+k+'"'+(window._fpDAc[k]?' open':'')}
if(typeof document!=='undefined'&&document.addEventListener&&!window._fpDAcB){window._fpDAcB=1;document.addEventListener('toggle',function(e){var d=e.target,k=d&&d.getAttribute&&d.getAttribute('data-da');if(k)window._fpDAc[k]=!!d.open},true)}
window.fpTfEkle=function(h){var g=function(id){var e=document.getElementById(id);return e?e.value:""};var k=g("fpTk"),sk=g("fpTs"),p=parseFloat(String(g("fpTp")).replace(/\./g,function(m,o,str){return /,/.test(str)?"":"."}).replace(",",".")),d=g("fpTd"),n=String(g("fpTn")).trim().slice(0,80);
 if(sk==="FAB"&&p>=1000)p=p/1000;/* fabrikaya teslim TL/ton yazılır (12.500); TL/kg (12,50) de kabul edilir; kayıt TL/kg */
 var hata=!(p>0)?"Fiyatı yazın.":sk!=="FAB"&&(p<50||p>2000)?"Fiyat $/ton olarak 50–2000 arası olmalı (örnek 245).":sk==="FAB"&&(p<3||p>200)?"Fabrikaya teslim fiyatını TL/ton olarak yazın (örnek 12.500; 3.000–200.000 arası).":k==="Türkiye (yerli)"&&sk==="FOB"?"Yerli malda 'İhracat limanı FOB' seçilmez; 'Fabrikaya / depoya teslim' seçin.":!/^\d{4}-\d{2}-\d{2}$/.test(d)?"Tarihi seçin.":d>today()?"Tarih ileri bir gün olamaz.":"";
 if(hata){window._fpTfHata=hata;fpRender();return}
 var L=fpTk().slice();L.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),h:h,k:k,s:sk,p:Math.round(p*1000)/1000,d:d,n:n});L.sort(function(a,b){return a.d<b.d?-1:a.d>b.d?1:0});S.teklif=L.slice(-300);window._fpTf=null;window._fpTfHata="";try{save()}catch(e){}fpRender()};
window.fpTfSil=function(id){if(!confirm("Bu teklif silinsin mi?"))return;S.teklif=fpTk().filter(function(t){return t.id!==id});try{save()}catch(e){}fpRender()};
function fpTfSatir(m,i,D){var L=fpTk().filter(function(t){return t&&t.h===m.ad}),kur=fpKur(D,'9999'),h='',son=L.slice(-6).reverse();
 if(L.length)h+='<tr><td colspan="6" class="alt">Size gelen teklifler <small>(elle girilir; yalnız bu telefonda)</small></td></tr>';
 son.forEach(function(t){var sk=TKS.filter(function(x){return x[0]===t.s})[0]||TKS[0],nv=fpTkNav(t.k),ek='',onc=null;
  for(var j=L.indexOf(t)-1;j>=0;j--){if(L[j].k===t.k&&L[j].s===t.s){onc=L[j];break}}
  if(t.s==="FOB"){var mt=t.p+(nv?fpNav(nv)+fpNav('MS'):0);ek=nv?'Mersin teslim ≈ <b>'+f(mt,0)+' $/t</b> · '+fpTl(mt*kur)+' TL/ton':'navlun bilinmiyor, Mersin teslim hesaplanmadı'}
  else if(t.s==="LMN")ek='≈ '+fpTl(t.p*kur)+' TL/ton (bugünkü kurla)';else ek='≈ '+f(t.p*1000/kur,0)+' $/t (bugünkü kurla)';
  h+='<tr><td colspan="6" class="ic"><div class="tf"><div style="flex:1;min-width:0"><span class="mu">✎</span> '+esc(t.k)+' · '+esc(sk[1])+(t.n?' <small class="mu">('+esc(t.n)+')</small>':'')+'<br><small class="mu">'+ek+(onc?' · önceki teklif '+fpTkFiyat(onc)+' ('+fpTarih(onc.d).slice(0,5)+') → '+(t.p>=onc.p?'+':'−')+f(Math.abs((t.p/onc.p-1)*100),1)+'%':'')+'</small></div><div class="r nw"><b>'+fpTkFiyat(t)+'</b><br><small class="mu">'+fpTarih(t.d)+'</small></div><button class="btn l kb" onclick="fpTfSil(\''+esc(t.id)+'\')" aria-label="Teklifi sil">Sil</button></div></td></tr>'});
 if(L.length>6)h+='<tr><td colspan="6" class="ic mu" style="font-size:11px">ve '+(L.length-6)+' eski teklif daha (önceki teklif karşılaştırmasında kullanılıyor)</td></tr>';
 if(window._fpTf===i){var o=function(A,sel){return A.map(function(x){return '<option value="'+esc(x[0])+'"'+(x[0]===sel?' selected':'')+'>'+esc(x[1]||x[0])+(x[2]?' ('+x[2]+')':'')+'</option>'}).join('')},S0=son[0]||{};
  h+='<tr><td colspan="6" class="ic"><button class="btn l kb" data-tf="'+i+'" aria-expanded="true" onclick="fpTfAc('+i+')">▲ Teklif girişini kapat</button><div class="tform" style="margin-top:6px"><label>Nereden (köken) <select id="fpTk">'+o(TKK.map(function(x){return [x[0]]}),S0.k||(m.ad==="Ayçiçeği küspesi"?"Rusya":""))+'</select></label><label>Teslim şekli <select id="fpTs">'+o(TKS,S0.s||"FOB")+'</select></label><label>Fiyat ($/ton; fabrikaya teslimde TL/ton) <input id="fpTp" inputmode="decimal" placeholder="örnek 245 ya da 12.500"></label><label>Tarih <input id="fpTd" type="date" value="'+today()+'" max="'+today()+'"></label><label>Firma / not (isteğe bağlı) <input id="fpTn" maxlength="80" placeholder="örnek: X Tarım, 36 pro, Kasım yüklemesi"></label>'+(window._fpTfHata?'<div class="wa" role="alert">'+esc(window._fpTfHata)+'</div>':'')+'<div style="display:flex;gap:6px"><button class="btn" style="margin:0;flex:1" onclick="fpTfEkle(\''+esc(m.ad)+'\')">Kaydet</button><button class="btn l" style="margin:0;flex:1" onclick="fpTfAc('+i+')">Vazgeç</button></div></div></td></tr>'}
 else h+='<tr><td colspan="6" class="ic"><button class="btn l kb" data-tf="'+i+'" aria-expanded="false" onclick="fpTfAc('+i+')">+ Gelen teklif ekle</button>'+(m.ad==="Ayçiçeği küspesi"&&!L.length?' <small class="mu">Rusya/Ukrayna küspesinin ücretsiz güvenilir günlük fiyatı yok; size gelen teklifleri buraya yazın.</small>':'')+'</td></tr>';
 return h}
/* Özet (kullanıcı isteği 2026-11-13): iki sade tablo — Yurt içi borsalar (TL/ton) ve Dünya merkezleri (USD/ton + Mersin liman aralığı).
   Her hammadde tek satır; her merkezde son fiyat, son 1 haftadaki ▲/▼ % ve tarih. Kullanıcının kendi kayıtları (alış fiyatları, teklifler) girmez. */
function fpKisa(e){return String(e).replace(/^Brezilya Paranaguá limanı/,'Brezilya Paranaguá').replace(/^(Fransa|Avustralya) yemlik/,'$1').replace(/^Arjantin FOB limanları/,'Arjantin FOB').replace(/^ABD Körfez FOB SRW/,'ABD Körfez FOB').replace(/ 12,5% \(FAO\/IGC, aylık\)/,' IGC').replace(/\s*\((?:FAO[^)]*|CEPEA|tarım bakanlığı|USDA, haftalık)\)/g,'').replace(/ limanları?$/,'').replace(/^ABD iç piyasa/,'ABD iç p.').replace(/ vadeli$/,'')}
function fpOk(b){var d=b.deg;if(b.gecersiz||!d||Math.abs(d.v)<0.05)return '';return (d.v>0?'▲':'▼')+f(Math.abs(d.v),1)+'%'+(d.e?'/'+d.e:'')+(b.sicra||b.oynak?'!':'')}
function fpOzetHucre(x){var b=x.b;if(!b)return '';var yd=x.yer==="yd",ok=fpOk(b),c=ok?renk(b.deg.v):'inherit',fy=yd?f(b.l[1],1).replace(/,0$/,''):f(b.l[1]*1000,0);
 return '<div>'+esc(fpKisa(x.etiket))+' <b class="nw"><b style="color:'+c+'">'+(ok?ok+' ':'')+fy+(b.gecersiz?'*':'')+'</b> <small class="mu">'+fpTarih(b.l[0]).slice(0,5)+'</small></b></div>'}
/* İthal (Mersin teslim) aralığı: güncel FOB kaynaklarının en ucuzu–en pahalısı. et = hesabın dayandığı FOB fiyatının tarihi ("FOB 30.10"; aylık ortalama seride "FOB Ekim ort.");
   yalnizAylik = haftalık/günlük FOB kaynakları eskidiği için hesap yalnız aylık ortalamaya kaldı (kontrol 18.11.2026: sessizce eski aylık kaynağa düşmesin, yazsın). */
var AYAD=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
function fpGA(d){return d.slice(8,10)+'.'+d.slice(5,7)}
function fpFobT(x){return x.b.aylik?AYAD[+x.b.l[0].slice(5,7)-1]+' ort.':fpGA(x.b.l[0])}
function fpIthal(L){var K=L.filter(function(x){return x.yer==="yd"&&x.b&&x.b.mersin!=null});if(!K.length)return null;K=K.slice().sort(function(a,b){return a.b.mersin-b.b.mersin});var a=K[0],z=K[K.length-1],ta=fpFobT(a),tz=fpFobT(z);
 return {mn:a.b.mersin,mx:z.b.mersin,x:a,et:'FOB '+ta+(z.b.mersin-a.b.mersin>=1&&tz!==ta?' / '+tz:''),d:a.b.l[0],aylik:!!a.b.aylik,yalnizAylik:K.every(function(x){return x.b.aylik})&&L.some(function(x){return x.yer==="yd"&&x.koken&&x.b&&x.b.gecersiz&&!x.b.aylik})}}
function fpMersin(m){return fpIthal(m.L)}
function fpZaman(D,uzun){var z=new Date(D.guncel);return isNaN(z)?'':iki(z.getDate())+'.'+iki(z.getMonth()+1)+(uzun?'.'+z.getFullYear():'')+' '+iki(z.getHours())+':'+iki(z.getMinutes())}
function fpYas(D){var t=Date.parse(D&&D.guncel);return isNaN(t)?0:Math.floor((Date.now()-t)/864e5)}
function fpOzet(M,D){var kur=fpKur(D,'9999'),zs=fpZaman(D)?' · '+fpZaman(D):'',th='class="oth"',td='class="otd"';
 var h='<h3 class="oh">Yurt içi borsalar · TL/ton'+zs+fpPayBtn('yi')+'</h3><table class="oz"><tr><th '+th+'>Hammadde</th><th '+th+'>Borsa ve fiyat</th></tr>';
 M.forEach(function(m){var c=m.L.filter(function(x){return x.yer==="yi"&&x.b}).map(fpOzetHucre).join('');h+='<tr><td '+td+' style="width:27%"><b>'+esc(m.ad.replace(' (feed / meal)',''))+'</b></td><td '+td+'>'+(c||'<span class="mu">borsada işlem yok</span>')+'</td></tr>'});
 h+='</table><p class="s mu" style="margin:2px 0 10px"><span style="color:var(--bad)">▲ artış</span> · <span style="color:var(--ok)">▼ düşüş</span>: son 1 haftaya göre (bir hafta önce fiyat yoksa önceki fiyata göre ve süresi yazar: /ay, /13 g). * güncel değil: son işlem 1 haftadan eski ya da fiyat haftalardır hiç değişmiyor. ! fiyat bir işlemde %15\'ten çok oynadı: farklı kaliteler karışmış olabilir, dikkatli okuyun.</p>';
 h+='<h3 class="oh">Dünya merkezleri · USD/ton'+zs+fpPayBtn('yd')+'</h3><table class="oz"><tr><th '+th+'>Hammadde</th><th '+th+'>Merkez ve fiyat</th><th '+th+' style="text-align:right">Mersin liman USD/ton<br><small>gümrük, KDV hariç</small></th></tr>';
 M.forEach(function(m){if(m.h.yi)return;var L=m.L.filter(function(x){return x.yer==="yd"&&x.b}),r=fpMersin(m);
  var rng=r?'<b>'+f(r.mn,0)+(r.mx-r.mn>=1?'–'+f(r.mx,0):'')+'</b><br><small class="mu">'+fpTl(r.mn*kur)+(r.mx-r.mn>=1?'–'+fpTl(r.mx*kur):'')+' TL/ton</small><br><small class="mu">'+esc(r.et)+'</small>'+(r.yalnizAylik?'<br><small class="wa">yalnız aylık ortalama; haftalık kaynaklar eski</small>':''):'<span class="mu">—</span>';
  h+='<tr><td '+td+' style="width:22%"><b>'+esc(m.ad.replace(' (feed / meal)',''))+'</b>'+(m.h.dnot?'<br><small class="mu">'+esc(m.h.dnot)+'</small>':'')+'</td><td '+td+'>'+(L.map(fpOzetHucre).join('')||'<span class="mu">otomatik kaynak yok</span>')+'</td><td '+td+' style="text-align:right">'+rng+'</td></tr>'});
 h+='</table><p class="s mu" style="margin:2px 0 12px"><span style="color:var(--bad)">▲ artış</span> · <span style="color:var(--ok)">▼ düşüş</span>: son 1 haftaya göre (aylık kaynaklarda /ay). * güncel değil: kaynak bir süredir yeni fiyat vermiyor ya da fiyat haftalardır aynı (kaynak donmuş olabilir); Mersin hesabına katılmaz. Mersin = ihracat limanı (FOB) fiyatı + navlun + liman/sigorta (aşağıdan değiştirilebilir), bugünkü kurla; altında hesabın dayandığı FOB fiyatının tarihi yazar ("FOB 30.10"; aylık kaynakta "Ekim ort."): tarih eskiyse rakam da eskidir. Gümrük vergisi ve KDV hariç; FOB fiyatı olmayan hammaddede —. Kur '+f(kur,2)+'.</p>';
 return h}
/* Paylaş (kullanıcı isteği 2026-11-14): yurt içi tablo, dünya tablosu ve her hammadde (grafiği dahil) beyaz zeminli resim (PNG) olarak
   telefonun paylaş menüsüyle (WhatsApp vb.) gönderilir; paylaş desteklenmez ya da reddedilirse resim indirilir. Kullanıcı kayıtları (alış fiyatı, teklif) girmez. */
function fpKes(c,t,w){t=String(t);if(c.measureText(t).width<=w)return t;while(t.length>1&&c.measureText(t+'…').width>w)t=t.slice(0,-1);return t+'…'}
/* uzun yazıyı genişliğe göre satırlara böler (kontrol 18.11.2026: notlardaki "gümrük ve KDV hariç" kesilen kısımda kalıyordu) */
function fpSar(c,t,w){var L=[],x='';String(t).split(' ').forEach(function(k){var d=x?x+' '+k:k;if(!x||c.measureText(d).width<=w)x=d;else{L.push(x);x=k}});if(x)L.push(x);return L}
window.fpSar=fpSar;
function fpResim(o){return new Promise(function(ok,red){try{var W=540,K=2,pad=16,sh=22,F='-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif';
  var oc=document.createElement('canvas').getContext('2d'),NL=[],AL=[];oc.font='11px '+F;o.notlar.forEach(function(t){NL=NL.concat(fpSar(oc,t,W-2*pad))});if(o.alt){oc.font='12px '+F;AL=fpSar(oc,o.alt,W-2*pad)}
  var gH=o.grafik?264:0,H=pad+30+(AL.length?18+(AL.length-1)*15:0)+8+sh+o.satirlar.length*sh+o.satirlar.filter(function(r){return r.ayir}).length*4+(gH?gH+10:0)+NL.length*15+34;
  var cv=document.createElement('canvas');cv.width=W*K;cv.height=H*K;var c=cv.getContext('2d');c.scale(K,K);c.fillStyle='#fff';c.fillRect(0,0,W,H);
  var y=pad+20;c.fillStyle='#16251c';c.font='700 18px '+F;c.fillText(fpKes(c,o.baslik,W-2*pad),pad,y);
  c.font='12px '+F;c.fillStyle='#5b6b60';AL.forEach(function(t,i){y+=i?15:18;c.fillText(t,pad,y)});y+=10;
  var cell=function(t,x,w,sag,renk,kalin){var px=12;t=String(t);c.fillStyle=renk||'#16251c';for(;;){c.font=(kalin?'700 ':'')+px+'px '+F;if(px<=9.5||c.measureText(t).width<=w-4)break;px-=0.5}var s=fpKes(c,t,w-4);if(s!==t)(o.kesik=o.kesik||[]).push(t);c.fillText(s,sag?x+w-c.measureText(s).width-2:x+2,y)};
  var kolX=[];var xx=pad;o.kol.forEach(function(k){kolX.push(xx);xx+=k.w});
  y+=sh-6;o.kol.forEach(function(k,i){c.font='600 11px '+F;c.fillStyle='#5b6b60';var s=fpKes(c,k.t,k.w-4);c.fillText(s,k.sag?kolX[i]+k.w-c.measureText(s).width-2:kolX[i]+2,y)});
  y+=6;c.strokeStyle='#cbd5cd';c.beginPath();c.moveTo(pad,y);c.lineTo(W-pad,y);c.stroke();
  o.satirlar.forEach(function(r){if(r.ayir){y+=4;c.strokeStyle='#e3e9e4';c.beginPath();c.moveTo(pad,y-1);c.lineTo(W-pad,y-1);c.stroke()}y+=sh-4;r.h.forEach(function(h,i){if(h&&h.t!=null&&h.t!=='')cell(h.t,kolX[i],o.kol[i].w,o.kol[i].sag,h.c,h.b)});y+=4});
  var son=function(){y+=8;c.font='11px '+F;c.fillStyle='#5b6b60';NL.forEach(function(t){y+=15;c.fillText(t,pad,y)});o.notSatir=NL;window._fpPayKesik=o.kesik||[];
   y+=22;c.font='600 11px '+F;c.fillStyle='#1d5c4a';c.fillText(fpKes(c,'YemAkıl Fiyatlar'+(/^https?:/.test(location.href)?' · '+location.host+location.pathname:''),W-2*pad),pad,y);
   cv.toBlob(function(b){b?ok(b):red(new Error('resim oluşturulamadı'))},'image/png')};
  if(!gH)return son();
  /* grafik 340×170 (2:1) → 508×254, oran korunur */
  var svg=o.grafik.replace(/currentColor/g,'#333').replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="508" height="254" ').replace(/ width="100%"/,'').replace(/style="[^"]*"/,''),im=new Image();
  im.onload=function(){c.drawImage(im,pad,y+8,508,254);y+=gH+10;son()};im.onerror=function(){son()};im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}catch(e){red(e)}})}
function fpHamKisa(a){return a.replace(' (feed / meal)','').replace('Pamuk tohumu küspesi','Pamuk küspesi')}
function fpDegH(b){if(b.gecersiz)return {t:'eski',c:'#5b6b60'};var d=b.deg;if(!d)return {t:'—',c:'#5b6b60'};if(Math.abs(d.v)<0.05)return {t:'0%'+(d.e?'/'+d.e:''),c:'#5b6b60'};return {t:(d.v>0?'▲+':'▼−')+f(Math.abs(d.v),1)+'%'+(d.e?'/'+d.e:'')+(b.sicra||b.oynak?'!':''),c:d.v>0?'#a8281f':'#1d6b3a',b:1}}
function fpDosya(a){var t={'ç':'c','ğ':'g','ı':'i','ö':'o','ş':'s','ü':'u'};return a.toLocaleLowerCase('tr').replace(/[çğıöşü]/g,function(c){return t[c]}).replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
function fpPayVeri(tur,i){var D=window.FPDATA;if(!D)throw new Error('fiyatlar henüz yüklenmedi');var M=fpMerkez(D),kur=fpKur(D,'9999'),son=M.son,g=fpYas(D),zs=fpZaman(D,1)+(g>=3?' (⚠ '+g+' gündür güncellenmedi)':''),R=[];
 if(tur==='yi'){M.forEach(function(m){var L=m.L.filter(function(x){return x.yer==="yi"&&x.b});if(!L.length){R.push({ayir:R.length>0,h:[{t:fpHamKisa(m.ad),b:1},{t:'borsada işlem yok',c:'#5b6b60'}]});return}
   L.forEach(function(x,j){var b=x.b;R.push({ayir:j===0&&R.length>0,h:[j?null:{t:fpHamKisa(m.ad),b:1},{t:fpKisa(x.etiket)},{t:f(b.l[1]*1000,0)+(b.gecersiz?'*':''),b:1},fpDegH(b),{t:fpTarih(b.l[0]).slice(0,5),c:'#5b6b60'}]})})});
  return {ad:'yurt-ici-fiyatlar',baslik:'Yurt içi borsalar · TL/ton',alt:'Güncelleme '+zs+' · son borsa günü '+(son?fpTarih(son):'—'),kol:[{t:'Hammadde',w:130},{t:'Borsa',w:134},{t:'Fiyat TL/ton',w:84,sag:1},{t:'Değişim',w:110,sag:1},{t:'Tarih',w:50,sag:1}],satirlar:R,notlar:['Değişim: ▲ artış · ▼ düşüş, son 1 haftaya göre; bir hafta önce fiyat yoksa önceki fiyata göre ve süresi yazar (/ay: 1 ay, /5 g: 5 gün). * güncel değil. ! tek işlemde %15\'ten çok oynama (kalite farkı olabilir).','Borsa bülteni TL/kg × 1000. Çiğit pamuk tohumudur, küspe değildir.']}}
 if(tur==='yd'){M.forEach(function(m){if(m.h.yi)return;var L=m.L.filter(function(x){return x.yer==="yd"&&x.b}),r=fpMersin(m),mr=r?f(r.mn,0)+(r.mx-r.mn>=1?'–'+f(r.mx,0):''):'—';
   if(!L.length){R.push({ayir:R.length>0,h:[{t:fpHamKisa(m.ad),b:1},{t:'otomatik kaynak yok',c:'#5b6b60'}]});return}
   L.forEach(function(x,j){var b=x.b;R.push({ayir:j===0&&R.length>0,h:[j?null:{t:fpHamKisa(m.ad),b:1},{t:fpKisa(x.etiket)},{t:f(b.l[1],1).replace(/,0$/,'')+(b.gecersiz?'*':''),b:1},fpDegH(b),{t:fpTarih(b.l[0]).slice(0,5),c:'#5b6b60'},j?null:{t:mr,b:1}]})})});
  return {ad:'dunya-fiyatlar',baslik:'Dünya merkezleri · USD/ton',alt:'Güncelleme '+zs+' · kur '+f(kur,2),kol:[{t:'Hammadde',w:106},{t:'Merkez',w:132},{t:'USD/ton',w:58,sag:1},{t:'Değişim',w:98,sag:1},{t:'Tarih',w:42,sag:1},{t:'Mersin',w:72,sag:1}],satirlar:R,
   notlar:['Değişim: ▲ artış · ▼ düşüş, son 1 haftaya göre (/ay: aylık kaynak, 1 aya göre). * güncel değil (kaynak durdu ya da fiyat haftalardır aynı).','Mersin = ihracat limanı (FOB) + navlun + liman/sigorta, tahmini USD/ton; gümrük ve KDV hariç; FOB yoksa —.']}}
 var m=M[i];if(!m)throw new Error('hammadde bulunamadı');m.L.forEach(function(x,j){var yd=x.yer==="yd",b=x.b;if(!b)return;
   R.push({ayir:j>0&&yd&&m.L[j-1].yer!=="yd",h:[{t:(yd?(b.gecersiz&&x.koken?'┈ ':'┅ '):'━ ')+fpKisa(x.etiket),c:yd&&x.koken&&b.gecersiz?'#8a8f8c':FPREN[j%FPREN.length]},{t:(yd?f(b.l[1],0)+' $/t':f(b.l[1]*1000,0)+' TL/ton')+(b.gecersiz?'*':''),b:1,c:'#16251c'},{t:fpTarih(b.l[0]).slice(0,5),c:'#5b6b60'}].concat([7,30,91].map(function(n){var v=fpChange(b.s,n);return v===null?{t:'—',c:'#5b6b60'}:fpDegH({deg:{v:v,e:''}})}))})});
 var gr=(fpGrafik(m,window._fpGun||91,D).match(/<svg[\s\S]*<\/svg>/)||[null])[0];
 return {ad:fpDosya(m.ad),baslik:m.ad+' fiyatları',alt:'Güncelleme '+zs+(m.h.ure?' · başlıca üreticiler: '+m.h.ure:''),kol:[{t:'Merkez',w:156},{t:'Son fiyat',w:90,sag:1},{t:'Tarih',w:44,sag:1},{t:'1 hafta',w:72,sag:1},{t:'1 ay',w:72,sag:1},{t:'3 ay',w:72,sag:1}],satirlar:R,
  grafik:gr,notlar:[gr?'Grafik son '+(window._fpGun||91)+' gün, TL/ton: düz çizgi yurt içi borsa, kesikli çizgi ithal malın tahmini Mersin teslim fiyatı (gümrük ve KDV hariç).'+(/stroke="#8a8f8c"/.test(gr)?' Gri noktalı çizgi: güncel olmayan kaynak.':''):'Grafik yok: bu hammaddede çizilecek yurt içi borsa ya da ithal (FOB) fiyatı yok.','Yüzdeler bugünkü fiyatın o tarihteki fiyata göre değişimi (▲ artış · ▼ düşüş). * güncel değil.'+(m.h.dnot?' Not: '+m.h.dnot+'.':'')]}}
window.fpPayVeri=fpPayVeri;window.fpResim=fpResim;
window.fpPaylas=function(tur,i){var o;try{o=fpPayVeri(tur,i)}catch(e){alert('Paylaşılamadı: '+e.message);return}
 var indir=function(b,ad){var a=document.createElement('a'),u=URL.createObjectURL(b);a.href=u;a.download=ad;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(u);a.remove()},2000);window._fpPayInd=ad};
 fpResim(o).then(function(b){var ad=o.ad+'-'+today()+'.png',fl=null;try{fl=new File([b],ad,{type:'image/png'})}catch(e){}
  if(fl&&navigator.canShare&&navigator.canShare({files:[fl]}))return navigator.share({files:[fl],title:o.baslik,text:o.baslik+' — YemAkıl Fiyatlar'}).catch(function(e){if(!e||e.name!=='AbortError')indir(b,ad)});
  indir(b,ad)}).catch(function(e){alert('Resim hazırlanamadı: '+(e&&e.message||e))})};
function fpPayBtn(tur,i){return '<button class="btn l kb pb" onclick="event.stopPropagation();fpPaylas(\''+tur+'\''+(i!=null?','+i:'')+')" aria-label="Paylaş">⤴ Paylaş</button>'}
window.fpAc=function(i){window._fpAc[i]=!window._fpAc[i];fpRender();if(!window._fpAc[i])fpGor('[data-ham="'+i+'"]')};
window.fpAcTus=function(e,i){if(e&&e.target===e.currentTarget&&(e.key==='Enter'||e.key===' ')){e.preventDefault();fpAc(i)}};window.fpGun=function(g){window._fpGun=g;fpRender()};
/* Ayrıntı (denetim F1): her hammadde kapalı başlar; dokununca grafik, merkezlerin 1 hafta–3 ay önceki fiyatı ve gelen teklifler açılır */
function fpHamBlok(m,i,D){var ac=!!window._fpAc[i],kur=fpKur(D,'9999'),tk=fpTk().filter(function(t){return t&&t.h===m.ad}).length,h='<div class="hb"><div class="hbb" data-ham="'+i+'" onclick="fpAc('+i+')" onkeydown="fpAcTus(event,'+i+')" role="button" tabindex="0" aria-expanded="'+ac+'"><span class="hbt"><b>'+esc(m.ad)+'</b> <small class="mu">'+(ac?'▲ kapat':'▼ grafik ve geçmiş')+(tk?' · '+tk+' teklif':'')+'</small></span>'+fpPayBtn('h',i)+'</div>';
 if(!ac)return h+'</div>';
 h+='<p class="s mu" style="margin:0 0 4px">Başlıca üreticiler: '+esc(m.h.ure)+'. İhracatçılar: '+esc(m.h.ihr)+'.'+(m.h.dnot?' Not: '+esc(m.h.dnot)+'.':'')+'</p>'+fpGrafik(m,window._fpGun,D);
 var sat=function(x){var b=x.b,yd=x.yer==="yd",j=m.L.indexOf(x),gri=yd&&x.koken&&b&&b.gecersiz,iz='<span style="color:'+(yd&&(!x.koken||gri)?'var(--mu)':FPREN[j%FPREN.length])+'">'+(yd?(gri?'┈':'┅'):'━')+'</span> ';
  if(!b)return '<tr><td class="ic mu">'+iz+esc(x.etiket)+'</td><td colspan="5" class="mu">son 4 ayda işlem yok</td></tr>';
  var n=[];if(!yd&&x.not)n.push('<small class="mu">'+esc(x.not)+'</small>');if(!yd&&b.eski)n.push('<small class="mu">son işlem '+fpTarih(b.l[0])+'</small>');
  if(b.dur)n.push('<small class="wa">⚠ kaynak '+b.dur+' gündür yeni fiyat vermiyor</small>'+ogN('Neden: kaynak yayımı durdu. → Ne yapmalı: bu satırı eski kabul edin; güncel teklif isteyin.'));
  if(b.donuk)n.push('<small class="wa">⚠ fiyat '+b.donuk+' gündür hiç değişmiyor: kaynak yenilemiyor olabilir</small>'+ogN('Neden: piyasa her gün oynar; haftalarca aynı rakam kaynağın donduğunu gösterir. → Ne yapmalı: bu rakamla karar vermeyin.'));
  if(b.oynak)n.push('<small class="wa">⚠ fiyat işlemden işleme çok oynuyor: farklı kaliteler karışıyor olabilir</small>'+ogN('Neden: borsada farklı kalitede mallar aynı adla satılıyor. → Ne yapmalı: ortalamaya ve gidişe bakın, tek rakama değil.'));else if(b.sicra)n.push('<small class="wa">⚠ son işlemde '+yuzde(b.sicra)+' sıçrama</small>'+ogN('Neden: tek bir işlem fiyatı çok değiştirdi. → Ne yapmalı: ertesi günü bekleyin ya da borsadan teyit edin.'));
  if(b.ayni)n.push('<small class="mu">fiyat '+b.ayni+' gündür aynı (kote fiyat olabilir)</small>');if(yd&&b.s.length<3)n.push('<small class="mu">geçmiş birikiyor</small>');
  var ms='';if(yd){if(x.koken)ms=b.mersin!=null?'Mersin teslim ≈ <b>'+f(b.mersin,0)+' $/t</b> · '+fpTl(b.mersin*kur)+' TL/ton':b.dur?'fiyat eski olduğu için Mersin teslim hesaplanmadı':'fiyat değişmediği için Mersin teslim hesaplanmadı';else ms=/Chicago/.test(x.etiket)?'vadeli borsa fiyatı, FOB değil':'iç piyasa fiyatı, FOB değil';n.push('<small class="mu">'+ms+'</small>')}
  var alt=n.join(' · ');
  return '<tr'+(alt?' class="ns"':'')+'><td class="ic">'+iz+esc(x.etiket)+'</td><td class="pc">'+(yd?f(b.l[1],0):f(b.l[1]*1000,0))+'<br><small class="mu">'+fpTarih(b.l[0]).slice(0,5)+'</small></td>'+PER.map(function(p){return yd?pcHucre(b.s,p[1],1,0,true):pcHucre(b.s,p[1],1000,0,false)}).join('')+'</tr>'+(alt?'<tr class="nt"><td colspan="6" class="ic">'+alt+'</td></tr>':'')};
 var yi=m.L.filter(function(x){return x.yer==="yi"}),yd=m.L.filter(function(x){return x.yer==="yd"}),yiDolu=yi.filter(function(x){return x.b});if(yiDolu.length)yi=yiDolu;
 h+='<div class="ox"><table class="c"><tr><th></th><th></th><th colspan="4" class="alt" style="text-align:center">O tarihteki fiyat ve bugüne göre değişim %</th></tr><tr><th>Merkez</th><th class="r">Fiyat</th>'+PER.map(function(p){return '<th class="r">'+p[0]+'</th>'}).join('')+'</tr>';
 h+='<tr><td colspan="6" class="alt">Yurt içi borsa — fiyat <b>TL/ton</b></td></tr>'+(yi.length?yi.map(sat).join(''):'<tr><td colspan="6" class="ic mu">borsa kaynağı yok</td></tr>');
 if(!m.h.yi)h+='<tr><td colspan="6" class="alt">Dünya — fiyat <b>$/ton</b></td></tr>'+(yd.length?yd.map(sat).join(''):'<tr><td colspan="6" class="ic mu">otomatik kaynak yok</td></tr>');
 return h+fpTfSatir(m,i,D)+'</table></div><button class="btn l kb" data-hamk="'+i+'" aria-expanded="true" onclick="fpAc('+i+')" style="margin:4px 0 6px">▲ '+esc(m.ad)+' kapat</button></div>'}
/* ===== Fiyat uyarıları ve "Dikkat" (kullanıcı isteği 2026-11-14) =====
   Sabah telefona gelen bildirim (tools/gunluk_ozet.mjs bu dosyayı OLDUĞU GİBİ yükleyip fpDikkat'i çağırır) ve sayfa açılınca üstteki
   "Dikkat" şeridi AYNI kuralları kullanır; iki ayrı kopya yok.
   Güvenilir seri (fpDuzenli): güncel (fpBak: eski ya da donmuş değil), oynak değil, son işlemde %15 sıçrama yok; borsada son 30 günde en az 6 işlem.
   Fiyat hareketi (kullanıcı kararı 2026-11-14): bütün hammaddelerde fiyat bir öncekine göre %2'den ÇOK artar ya da düşerse uyarı
   (borsada bir önceki işlem gününe, dünyada bir önceki yayımlanan fiyata göre; satırda süresi yazar: günlük, haftalık, aylık ya da "N günde").
   Eşik değiştirilebilir: uyarilar.json "yuzde_esik" (sabah bildirimi), sayfada UYE.yuzde. Güvenilir serinin hareketi "Dikkat"e kendi satırıyla girer;
   oynak, son işlemde sıçrayan ya da az işlem gören serinin %2'yi aşan hareketi gizlenmez, "Şüpheli" diye işaretli tek kısa satırda yazılır.
   Donmuş ya da eski (güncel olmayan) seriler hareket sayılmaz.
   Hangi fiyat "yeni" (kontrol 18.11.2026): güncelleme betiği her serinin son fiyatını İLK GÖRDÜĞÜ anı yazar (fiyatlar.json "gorulme"). Hareket ve 3 ay uyarısı,
   son fiyatı son bildirimden beri (sayfada son UYE.yeni saat içinde) ilk kez görülen her seriye bakar: bülteni geç gelen borsa (Gaziantep) ve fiyatı 2 hafta gecikmeli
   yayımlanan dünya FOB serileri de bir kez uyarır; satırda fiyatın kendi tarihi yazar. "gorulme" yoksa (eski dosya) eski kural: borsada son borsa günü, dünyada son 4 gün.
   3 ayın en yükseği/düşüğü: son fiyat önceki 3 ayın en yükseğini/düşüğünü %1'den çok geçerse (en az 2 ay ve 10 kayıt geçmiş varsa).
   İthal–yerli: tahmini Mersin teslim (FOB + navlun + liman; gümrük, KDV hariç) en ucuz güvenilir borsa fiyatının altına iner ya da üstüne çıkarsa (bir önceki borsa gününe göre).
     Satır neyin değiştiğini yazar (yerli fiyat, FOB, kur); FOB değişmediyse ve 10 günden eskiyse "eski FOB fiyatıyla" der, başlık "Yerli … ithalin üstüne çıktı / altına indi" olur.
   Kullanıcı sınırı: {urun, borsa:"en ucuz" | borsa adı (Konya, Gaziantep kırık…) | "ithal", alt, ust} TL/ton; alt'a eşit/altında ya da ust'e eşit/üstünde ise uyarı. */
var UYE={yuzde:2,uc:1,ithal:1,dosya:3,borsa:2,yeni:30,fob:10};window.UYE_YUZDE=UYE.yuzde;
function fpSure(g){return g<=4?'günlük':g<=10?'haftalık':g>=25&&g<=45?'aylık':g+' günde'}
function fpTemiz(x){var b=x.b;return !!b&&!b.gecersiz&&!b.oynak&&!b.sicra}
function fpDuzenli(x){if(!fpTemiz(x))return false;if(x.yer!=="yi")return true;var lim=dAdd(x.b.l[0],-30);return x.b.s.filter(function(p){return p[0]>=lim}).length>=6}
function fpEt(x){return x.yer==="yi"?x.borsa+(x.tur?' '+x.tur:''):fpKisa(x.etiket)}
function fpSonD(s,d){for(var i=s.length-1;i>=0;i--)if(s[i][0]<=d)return s[i];return null}
function fpYz(v,g){return (v>0?'+':'−')+f(Math.abs(v),1)+'%'+(g?' ('+g+')':'')}
function fpNorm(a){return String(a||'').toLocaleLowerCase('tr').replace(/[^a-zçğıöşü0-9]/g,'')}
/* hammadde satırları: mısır gluteni feed ve meal ayrı ürün (fiyatları 2 kat farklı), diğerleri tek satır */
function fpUrunler(M){var P=[];M.forEach(function(m){if(m.h.ayir)m.h.k.forEach(function(k,j){P.push({ad:k,kisa:m.h.ayir[j],m:m,L:m.L.filter(function(x){return x.ad===k})})});else P.push({ad:m.ad,kisa:m.h.kisa||m.ad,m:m,L:m.L})});return P}
/* en ucuz yurt içi fiyat: güncel ve temiz seriler arasından (yoksa güncel ama oynak olanlardan, "şüpheli" işaretli); L verilirse yalnız onlar */
function fpUcuz(L){var g=L.filter(function(x){return x.yer==="yi"&&x.b&&!x.b.gecersiz}),t=g.filter(fpTemiz),A=t.length?t:g;if(!A.length)return null;
 var x=A.slice().sort(function(a,b){return a.b.l[1]-b.b.l[1]})[0];return {x:x,tl:x.b.l[1]*1000,et:fpEt(x),hf:fpChange(x.b.s,7),supheli:!t.length,az:!fpDuzenli(x)}}
/* Sınır rakamı: sayı ya da yazı ("15.500", "15500", TL/kg olarak "15,5") → TL/ton; boş → null; okunamazsa NaN */
function fpSinir(v){if(v==null||v==='')return null;if(typeof v==='number')return isFinite(v)?(v>0&&v<200?v*1000:v):NaN;return fpUyTl(v)}
/* Hammadde adı: önce tam ad/kısa ad, sonra adın başı, sonra içinde geçen; bir kademede birden çok hammadde uyarsa ("Soya", "Gluten") sessizce ilki seçilmez, "cok" döner */
function fpUyUrun(ad,P){var n=fpNorm(ad),T=[function(q){return fpNorm(q.ad)===n||fpNorm(q.kisa)===n},function(q){return fpNorm(q.ad).indexOf(n)===0},function(q){return n.length>=3&&fpNorm(q.ad).indexOf(n)>=0}];
 if(!n)return {yok:1};for(var i=0;i<T.length;i++){var A=P.filter(T[i]);if(A.length===1)return {p:A[0]};if(A.length>1)return {cok:A.map(function(q){return q.ad})}}return {yok:1}}
function fpUyDeger(e,P,kur){var uu=fpUyUrun(e.urun,P);if(!uu.p)return uu;var p=uu.p,b=fpNorm(e.borsa||'en ucuz');
 if(b==='ithal'||b==='ithalmersin'){var r=fpIthal(p.L);return {p:p,v:r?Math.round(r.mn*kur):null,et:'ithal (Mersin ≈)',it:1,fob:r?r.et:'',kaynakYok:!p.L.some(function(x){return x.yer==="yd"&&x.koken})}}
 var hep=b==='enucuz'||!b,K=hep?p.L:p.L.filter(function(x){return x.yer==="yi"&&fpNorm(fpEt(x)).indexOf(b)===0});
 if(!hep&&!K.length)return {p:p,v:null,et:e.borsa,borsaYok:p.L.filter(function(x){return x.yer==="yi"}).map(fpEt)};
 var u=fpUcuz(K);return {p:p,v:u?Math.round(u.tl):null,et:u?(hep?'en ucuz borsa ('+u.et+')':u.et):e.borsa}}
window.fpUyDeger=fpUyDeger;
function fpIsGunu(a,b){var n=0,d=dAdd(a,1);while(d<b){var w=new Date(d+"T00:00:00Z").getUTCDay();if(w>0&&w<6)n++;d=dAdd(d,1)}return n}
window.fpDikkat=function(D,uy,opt){opt=opt||{};var esik=opt.esik!=null&&isFinite(+opt.esik)&&+opt.esik>0?+opt.esik:UYE.yuzde,simdi=opt.simdi!=null?+opt.simdi:Date.now(),M=fpMerkez(D),ref=fpRefGun(D),kur=fpKur(D,'9999'),P=fpUrunler(M),I=[],eksik=[],sorun=[],hf=[];
 var bugun=new Date(simdi+3*36e5).toISOString().slice(0,10);/* Türkiye saati (UTC+3) */
 var T=function(v){return f(Math.round(v),0)},TT=function(v){return f(Math.round(v/100)*100,0)};
 /* "yeni fiyat" penceresinin başı: sabah bildirimi bir önceki bildirimin saatini verir (opt.yeniden); sayfada son UYE.yeni saat */
 var bas=opt.yeniden!=null&&isFinite(+opt.yeniden)?+opt.yeniden:simdi-UYE.yeni*36e5;
 var yeniMi=function(x){var t=x.gor?Date.parse(x.gor):NaN;if(isFinite(t))return t>bas;return x.yer==="yd"?gunFark(ref,x.b.l[0])<=4:x.b.l[0]===M.son};
 /* 1) veri güncel mi */
 var yas=Math.floor((simdi-Date.parse(D.guncel))/864e5);
 if(yas>=UYE.dosya)I.push({t:'eski',alt:'dosya',k:'Fiyatlar '+yas+' gündür güncellenmedi',m:'Fiyatlar '+yas+' gündür güncellenmedi (son güncelleme '+fpTarih(ref).slice(0,5)+'): gösterilen fiyatlar eski, alımdan önce borsadan teyit edin.'});
 else if(M.son){var ig=fpIsGunu(M.son,bugun);if(ig>=UYE.borsa)I.push({t:'eski',alt:'borsa',k:'Borsa fiyatları '+ig+' iş günüdür gelmiyor',m:'Borsa fiyatları '+ig+' iş günüdür gelmiyor (son borsa günü '+fpTarih(M.son).slice(0,5)+'; resmi tatil olabilir).'})}
 /* hammadde satırları (bildirimdeki tablo). ithal.et = hesabın dayandığı FOB fiyatının tarihi; diger = borsa ve FOB fiyatı yokken görünen tek dünya fiyatı (ABD iç piyasa, vadeli) */
 var R=P.map(function(p){var u=fpUcuz(p.L),it=fpIthal(p.L),yi=p.L.filter(function(x){return x.yer==="yi"&&x.b}),son=null,dg=p.L.filter(function(x){return x.yer==="yd"&&!x.koken&&x.b&&!x.b.gecersiz})[0];
  if(!u)yi.forEach(function(x){if(!son||x.b.l[0]>son.b.l[0])son=x});if(u)u.ayni=u.x.b.ayni||0;
  return {ad:p.ad,kisa:p.kisa,ucuz:u,ithal:it?{mn:it.mn*kur,mx:it.mx*kur,usd:it.mn,fob:it.x.b.l[1],et:it.et,d:it.d,aylik:it.aylik,yalnizAylik:it.yalnizAylik}:null,ithalUcuz:!!(u&&!u.supheli&&it&&it.mn*kur<u.tl),eski:son?{tl:son.b.l[1]*1000,et:fpEt(son),d:son.b.l[0]}:null,diger:dg?fpKisa(dg.etiket).replace(/^ABD iç p\./,'ABD iç piyasa')+' '+f(dg.b.l[1],0)+' $/t':''}});
 /* 2) kullanıcının sınırları; eşleşmeyen, belirsiz ya da okunamayan satır sessizce geçilmez, "sorun" listesine yazılır */
 (Array.isArray(uy)?uy:[]).forEach(function(e){if(!e||typeof e!=='object')return;var kim='"'+String(e.urun==null?'':e.urun)+'"'+(e.borsa?' ('+e.borsa+')':'');if(!e.urun){sorun.push('hammadde adı yazılmamış bir satır var');return}
  var alt=fpSinir(e.alt),ust=fpSinir(e.ust),r=fpUyDeger(e,P,kur);
  if(r.yok){eksik.push(String(e.urun));sorun.push(kim+': bu adda hammadde yok');return}
  if(r.cok){sorun.push(kim+': birden çok hammaddeye uyuyor ('+r.cok.join(', ')+'); tam adını yazın');return}
  if(r.borsaYok){sorun.push(kim+': bu hammaddenin o borsada fiyatı yok'+(r.borsaYok.length?' (olan: '+r.borsaYok.join(', ')+')':''));return}
  if(r.kaynakYok){sorun.push(kim+': bu hammaddenin ithal (FOB) fiyat kaynağı yok');return}
  if((alt!==null&&!(alt>0))||(ust!==null&&!(ust>0))){sorun.push(kim+': sınır rakamı okunamadı');return}
  if(alt===null&&ust===null){sorun.push(kim+': alt ya da üst sınır yazılmamış');return}
  if(r.v==null)return;var a=alt!==null&&r.v<=alt,u=ust!==null&&r.v>=ust;if(!a&&!u)return;
  var vt=r.it?TT(r.v):T(r.v);I.push({t:'esik',ad:r.p.kisa,k:r.p.kisa+(r.it?' ithal ':' ')+vt+' (sınır '+(a?T(alt)+' altı':T(ust)+' üstü')+')',m:r.p.ad+' '+r.et+' '+vt+' TL/ton'+(r.it&&r.fob?' ('+r.fob+')':'')+': sınırınızın ('+(a?T(alt)+') altına indi':T(ust)+') üstüne çıktı')+(e.not?' — '+e.not:'')+'.'})});
 /* 3) ithal–yerli geçişi (bir önceki borsa gününe göre); neyin değiştiği ve FOB fiyatının tazeliği yazılır */
 var onc='';M.forEach(function(m){m.L.forEach(function(x){if(x.yer==="yi"&&x.b)x.b.s.forEach(function(q){if(q[0]<M.son&&q[0]>onc)onc=q[0]})})});
 if(onc)P.forEach(function(p,i){var r=R[i];if(!r.ucuz||r.ucuz.supheli||!r.ithal)return;
  var dp=null;p.L.forEach(function(x){if(x.yer!=="yi"||!fpTemiz(x))return;var q=fpSonD(x.b.s,onc);if(q&&q[0]>=dAdd(onc,-7)&&(dp===null||q[1]*1000<dp))dp=q[1]*1000});
  /* geç yayımlanan FOB (tarihi eski ama yeni görülen haftalık fiyat): "önceki" durum için bir önceki fiyatı alınır, yoksa yeni gelen fiyatın yol açtığı geçiş hiç görülmezdi */
  var ip=null,iu=null,ko=fpKur(D,onc);p.L.forEach(function(x){if(x.yer!=="yd"||!x.b||x.b.mersin==null)return;var q=fpSonD(x.usd,onc);if(q&&q===x.b.l&&x.usd.length>1&&x.gor&&yeniMi(x)&&gunFark(ref,q[0])>4)q=x.usd[x.usd.length-2];if(!q)return;var v=(q[1]+fpNav(x.koken)+fpNav('MS'))*ko;if(ip===null||v<ip){ip=v;iu=q[1]}});
  if(dp===null||ip===null)return;var simd=r.ucuz.tl-r.ithal.mn,once=dp-ip;if(Math.abs(simd)/r.ucuz.tl*100<UYE.ithal||(simd>0)===(once>0)||once===0)return;
  var ucz=simd>0,dY=(r.ucuz.tl/dp-1)*100,dF=(r.ithal.fob/iu-1)*100,dK=(kur/ko-1)*100,dg=[],kc=p.kisa.toLocaleLowerCase('tr');
  if(Math.abs(dY)>=0.05)dg.push('yerli fiyat '+fpYz(dY));if(Math.abs(dF)>=0.05)dg.push('FOB '+fpYz(dF));if(Math.abs(dK)>=0.05)dg.push('kur '+fpYz(dK));
  var fobAyni=Math.abs(dF)<0.05,fobEski=fobAyni&&(r.ithal.aylik||gunFark(ref,r.ithal.d)>UYE.fob),yerli=Math.abs(r.ucuz.tl-dp)>=Math.abs(r.ithal.mn-ip);
  I.push({t:'ithal',ad:p.kisa,k:(yerli?'Yerli '+kc+' ithalin '+(ucz?'üstüne çıktı':'altına indi'):'İthal '+kc+' yerliden '+(ucz?'ucuzladı':'pahalandı'))+(fobEski?' (eski FOB fiyatıyla)':''),
   m:p.ad+': ithal artık yerli borsadan '+(ucz?'ucuz':'pahalı')+' — Mersin ≈ '+TT(r.ithal.mn)+', en ucuz borsa '+T(r.ucuz.tl)+' TL/ton ('+r.ucuz.et+'). Değişen: '+(dg.join(', ')||'—')+(fobAyni?'; FOB fiyatı değişmedi':'')+'. '+(fobEski?'İthal hesabı eski FOB fiyatıyla ('+r.ithal.et+'): güncel teklif alın. ':r.ithal.et.replace(/^FOB /,'FOB tarihi: ')+'. ')+'Gümrük ve KDV hariç.'})});
 /* 4) fiyat hareketi (%esik'ten çok) ve 3 ayın en yükseği/düşüğü: son fiyatı yeni görülen güncel seriler (yeniMi); güvenilir olmayanlar "Şüpheli" satırına */
 var H=[],SP=[];P.forEach(function(p){var parca=[],sk=0,uc=0;p.L.forEach(function(x){var b=x.b,yd=x.yer==="yd";if(!b||b.gecersiz)return;
   if(!yeniMi(x))return;var s=b.s,l=b.l,o=s[s.length-2],g=o?gunFark(l[0],o[0]):0,gd=o&&o[1]>0?(l[1]/o[1]-1)*100:null,h=fpChange(s,7),ps=[],gec=yd?gunFark(ref,l[0])>4:l[0]!==M.son,fy=(yd?f(l[1],0)+' $/t':T(l[1]*1000)+' TL/t')+(gec?' ('+fpGA(l[0])+' fiyatı'+(yd?'':', geç geldi')+')':'');
   if(!fpDuzenli(x)){if(gd!==null&&Math.abs(gd)>esik)SP.push(p.kisa+' '+fpEt(x)+' '+fpYz(gd,fpSure(g))+' → '+fy+' ('+(b.oynak?'fiyat çok oynuyor':b.sicra?'tek işlemde sıçrama':'az işlem')+')');return}
   if(!yd&&h!==null)hf.push({k:p.kisa+' '+fpEt(x),v:h});
   if(gd!==null&&Math.abs(gd)>esik){ps.push(fpYz(gd,fpSure(g)));sk=Math.max(sk,Math.abs(gd))}
   var lim=dAdd(l[0],-91),w=s.slice(0,-1).filter(function(q){return q[0]>=lim});
   if(w.length>=10&&w[0][0]<=dAdd(l[0],-60)){var mx=Math.max.apply(null,w.map(function(q){return q[1]})),mn=Math.min.apply(null,w.map(function(q){return q[1]}));
    if(l[1]>mx*(1+UYE.uc/100)){ps.push('3 ayın en yükseği');uc++}else if(l[1]<mn*(1-UYE.uc/100)){ps.push('3 ayın en düşüğü');uc++}}
   if(ps.length)parca.push(fpEt(x)+' '+ps.join(', ')+' → '+fy)});
  if(parca.length)H.push({t:sk?'hareket':'uc',ad:p.kisa,sk:sk+uc,k:p.kisa+' '+parca[0].replace(/ → .*$/,''),m:p.ad+': '+parca.join('; ')+'.'})});
 if(SP.length)H.push({t:'supheli',sk:-1,k:'Şüpheli: '+SP[0].replace(/ → .*$/,''),m:'Şüpheli (güvenilir değil, dikkatli okuyun): '+SP.join('; ')+'.'});
 H.sort(function(a,b){return b.sk-a.sk});I=I.concat(H);
 hf.sort(function(a,b){return Math.abs(b.v)-Math.abs(a.v)});
 /* ithal hesabına katılmayan kaynaklar: hangi hammaddenin hangi kaynağı ve neden (Ukrayna FOB hem mısırda hem buğdayda var) */
 var dis=[],disAd=[];P.forEach(function(p){var K=[];p.L.forEach(function(x){if(x.yer==="yd"&&x.koken&&x.b&&x.b.gecersiz){var e=fpKisa(x.etiket);if(dis.indexOf(e)<0)dis.push(e);K.push(e+' ('+(x.b.donuk?'fiyat '+x.b.donuk+' gündür aynı':'son fiyat '+fpGA(x.b.l[0]))+')')}});if(K.length)disAd.push(p.kisa.replace(/\.$/,'')+' – '+K.join(', '))});
 var ks=I.map(function(x){return x.k});
 var baslik=I.length?'⚠ '+ks.slice(0,2).join(' · ')+(I.length>2?' (+'+(I.length-2)+' uyarı)':''):'Bugün önemli bir değişiklik yok'+(hf.length?' · 1 haftada: '+hf.slice(0,2).map(function(x){return x.k+' '+fpYz(x.v)}).join(', '):'');
 return {M:M,P:P,satir:R,dikkat:I,baslik:baslik,kur:kur,son:M.son,ref:ref,eksik:eksik,sorun:sorun,disari:dis,disariAd:disAd,hareket:hf,yeniden:bas}};
/* Kullanıcının bu telefondaki sınırları (fiyat-v1 kaydında "uyari"): fiyat.html'deki save() yalnız navlun ve teklifi yazdığı için uyarılar ayrıca korunur */
function fpUyOku(){try{var o=JSON.parse(localStorage.getItem('fiyat-v1')||'null');return o&&Array.isArray(o.uyari)?o.uyari:[]}catch(e){return []}}
function fpUyYaz(){try{var o=JSON.parse(localStorage.getItem('fiyat-v1')||'null')||{};o.uyari=fpUy();localStorage.setItem('fiyat-v1',JSON.stringify(o))}catch(e){}}
function fpUy(){if(typeof S!=='object'||!S)return [];if(!Array.isArray(S.uyari))S.uyari=fpUyOku();return S.uyari}
if(typeof window.save==='function'&&!window.save._uy){var _fpSave0=window.save;window.save=function(){var r=_fpSave0.apply(this,arguments);fpUyYaz();return r};window.save._uy=1}
function fpUyTl(t){t=String(t==null?'':t).trim();if(!t)return null;var v=parseFloat(t.replace(/\./g,function(m,o,str){return /,/.test(str)?"":(/\.\d{3}$/.test(str)?"":".")}).replace(",","."));if(!isFinite(v))return NaN;return v<200?v*1000:v}/* 15.000 ya da 15000 TL/ton; 15,5 (TL/kg) de kabul edilir */
var UYB=[["en ucuz","En ucuz borsa"],["Konya","Konya"],["Polatlı","Polatlı"],["Gaziantep","Gaziantep"],["Adana","Adana"],["ithal","İthal (Mersin teslim tahmini)"]];
window.fpUyEkle=function(){var g=function(id){var e=document.getElementById(id);return e?e.value:""};var u=g('fpUyU'),b=g('fpUyB'),a=fpUyTl(g('fpUyA')),s=fpUyTl(g('fpUyS'));
 var h=!u?'Hammaddeyi seçin.':a===null&&s===null?'Alt ya da üst sınırdan en az birini yazın (TL/ton).':[a,s].some(function(v){return v!==null&&!(v>=1000&&v<=200000)})?'Sınırı TL/ton olarak yazın (örnek 15.000; 1.000–200.000 arası).':a!==null&&s!==null&&a>=s?'Alt sınır üst sınırdan küçük olmalı.':'';
 if(!h&&window.FPDATA){var r0=fpUyDeger({urun:u,borsa:b||'en ucuz'},fpUrunler(fpMerkez(window.FPDATA)),1);if(r0.borsaYok)h=u+' için '+b+' borsasında fiyat yok'+(r0.borsaYok.length?' (olan: '+r0.borsaYok.join(', ')+')':'')+'; başka bir fiyat seçin.';else if(r0.kaynakYok)h=u+' için ithal (FOB) fiyat kaynağı yok; borsa fiyatı seçin.'}
 if(h){window._fpUyHata=h;fpRender();return}
 var L=fpUy();L.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),urun:u,borsa:b||'en ucuz',alt:a,ust:s});S.uyari=L.slice(-40);window._fpUyHata='';fpUyYaz();fpRender()};
window.fpUySil=function(id){S.uyari=fpUy().filter(function(e){return e.id!==id});fpUyYaz();fpRender()};
window.fpUyAc=function(el){window._fpUyAc=el.open};
function fpUyBolum(A){var L=fpUy(),kur=A.kur,h='<details class="dt" id="fpUy" ontoggle="fpUyAc(this)"'+(window._fpUyAc||window._fpUyHata?' open':'')+'><summary><b>🔔 Fiyat uyarılarım</b>'+(L.length?' ('+L.length+')':'')+'</summary>';
 h+='<p class="s" style="margin:4px 0 6px">Fiyat yazdığınız sınırın altına inerse ya da üstüne çıkarsa bu sayfayı açtığınızda en üstte uyarı çıkar. Fiyatlar <b>TL/ton</b>. Bu sınırlar yalnız bu telefonda kalır; sabah gelen bildirimde de çıksın isterseniz Claude\'a yazın (örnek: "arpa 15.000\'in altına inerse haber ver").</p>';
 L.forEach(function(e){var r=fpUyDeger(e,A.P,kur),v=r.v,hit=v!=null&&((e.alt!=null&&v<=e.alt)||(e.ust!=null&&v>=e.ust));
  h+='<div class="tf" style="padding:4px 0;border-top:1px solid var(--bd);font-size:13px"><div style="flex:1;min-width:0"><b>'+esc(e.urun)+'</b> · '+esc((UYB.filter(function(x){return x[0]===e.borsa})[0]||[0,e.borsa])[1])+'<br><small class="mu">'+(e.alt!=null?'alt '+f(e.alt,0):'')+(e.alt!=null&&e.ust!=null?' · ':'')+(e.ust!=null?'üst '+f(e.ust,0):'')+' TL/ton · şu an '+(v!=null?f(v,0)+(r.it&&r.fob?' ('+esc(r.fob)+')':''):r.borsaYok?'bu borsada bu hammaddenin fiyatı yok: uyarı çalışmaz':r.kaynakYok?'ithal (FOB) fiyat kaynağı yok: uyarı çalışmaz':r.yok||r.cok?'hammadde bulunamadı: uyarı çalışmaz':'fiyat yok')+'</small>'+(hit?' <small class="wa">⚠ sınır aşıldı</small>'+ogN('Neden: fiyat yazdığınız sınıra geldi. → Ne yapmalı: kararınızı verin; uyarı gereksizse Sil.'):'')+'</div><button class="btn l kb" onclick="fpUySil(\''+esc(e.id)+'\')" aria-label="Uyarıyı sil">Sil</button></div>'});
 var o=function(A2){return A2.map(function(x){return '<option value="'+esc(x[0])+'">'+esc(x[1])+'</option>'}).join('')};
 h+='<div class="tform" style="margin-top:6px"><label>Hammadde <select id="fpUyU">'+o([["","seçin"]].concat(A.P.filter(function(p){return p.L.length}).map(function(p){return [p.ad,p.ad]})))+'</select></label><label>Hangi fiyat <select id="fpUyB">'+o(UYB)+'</select></label>'+
  '<div style="display:flex;gap:6px"><label style="flex:1">Altına inerse <input id="fpUyA" inputmode="decimal" placeholder="örnek 15.000"></label><label style="flex:1">Üstüne çıkarsa <input id="fpUyS" inputmode="decimal" placeholder="boş bırakılabilir"></label></div>'+
  (window._fpUyHata?'<div class="wa" role="alert">'+esc(window._fpUyHata)+'</div>':'')+'<button class="btn" style="margin:0" onclick="fpUyEkle()">Uyarı ekle</button></div></details>';
 return h}
function fpDikkatSerit(A){var I=A.dikkat.filter(function(x){return x.alt!=='dosya'});/* dosya eskiliği zaten ayrı şeritte */
 if(!I.length)return '';return '<div class="uy" id="fpDikkat" role="status"><b>⚠ Dikkat</b>'+I.map(function(x){return '<div style="margin-top:3px">• '+esc(x.m)+(OGD[x.t]?ogN(OGD[x.t]):'')+'</div>'}).join('')+'</div>'}
/* ===== Öğretici mod (kullanıcı isteği 2026-11-15) =====
   Üç programda ortak görünüm tercihi: localStorage "yemakil-ogretici" = "1" açık / "0" kapalı (veri değil, yedeğe girmez).
   Anahtar yoksa: bu programın kendi kaydı (fiyat-v1) yoksa açık, varsa kapalı. Sayfa açılışında bir kez okunur.
   Yalnız açıklama ekler: "Öğretici · …" katlanır kutular ve uyarıların yanında tek satır "neden → ne yapmalı". Hiçbir hesaba dokunmaz. */
var OGK="yemakil-ogretici",OG=null;
function ogOku(){try{var v=localStorage.getItem(OGK);if(v==="1")return true;if(v==="0")return false;return !localStorage.getItem("fiyat-v1")}catch(e){return false}}
OG=false;/* V-fiyat 2026-11-16: kullanıcı isteği — Fiyatlar programında öğretici açıklamalar kaldırıldı (Sipariş V199 ile aynı) */
function ogAcik(){return false}
window.ogAcik=ogAcik;
window.ogSet=function(v){OG=false;try{localStorage.setItem(OGK,OG?"1":"0")}catch(e){}ogBar();fpRender()};
window._ogAc=window._ogAc||{};window.ogAc=function(el){window._ogAc[el.getAttribute('data-og')]=el.open};
function ogBar(){var el=typeof document!=='undefined'&&document.getElementById("ogBar");if(!el)return;el.innerHTML="";el.className="";return;var on=ogAcik();el.className="ogbar";
 el.innerHTML='<label title="Her bölümde kısa açıklamalar gösterir"><input type="checkbox" id="ogT"'+(on?' checked':'')+' onchange="ogSet(this.checked)">🎓 Öğretici mod</label>'}
window.ogBar=ogBar;
function og(k,bas,ic){if(!ogAcik())return '';return '<details class="og" data-og="'+k+'" ontoggle="ogAc(this)"'+(window._ogAc[k]?' open':'')+'><summary>🎓 Öğretici · '+bas+'</summary>'+ic+'</details>'}
function ogN(t){return ogAcik()?'<span class="ogn">🎓 '+t+'</span>':''}
function ogL(L,ol){return '<'+(ol?'ol':'ul')+'>'+L.map(function(x){return '<li>'+x+'</li>'}).join('')+'</'+(ol?'ol':'ul')+'>'}
var OGD={eski:'Neden: kaynak yeni fiyat vermiyor (tatil, kaynak arızası). → Ne yapmalı: alımdan önce borsayı ya da tüccarı arayıp fiyatı teyit edin.',
 esik:'Neden: kendi koyduğunuz sınır aşıldı. → Ne yapmalı: alım ya da satış kararını şimdi düşünün; sınır artık gereksizse "Fiyat uyarılarım"dan silin.',
 ithal:'Neden: ithal malın tahmini Mersin fiyatı en ucuz borsa fiyatının altına indi ya da üstüne çıktı (gümrük, KDV hariç). → Ne yapmalı: ithalatçıdan teklif isteyin, gümrük ve KDV\'yi ekleyip yerliyle karşılaştırın.',
 hareket:'Neden: fiyat bir öncekine göre %'+UYE.yuzde+'\'den çok değişti. → Ne yapmalı: hammaddeye dokunup grafiğe bakın; tek günlük mü, sürekli mi anlayın.',
 uc:'Neden: fiyat son 3 ayın en yükseğini ya da en düşüğünü geçti. → Ne yapmalı: düşükse stok almayı, yüksekse alımı bölmeyi düşünün.',
 supheli:'Neden: fiyat çok oynuyor, tek işlemde sıçradı ya da az işlem var; farklı kaliteler karışmış olabilir. → Ne yapmalı: bu rakama tek başına güvenmeyin, borsadan teyit edin.'};
function ogFpGenel(){return og('genel','Bu ekran ne işe yarar?','<p>Yem hammaddelerinin (mısır, arpa, soya küspesi…) Türkiye borsalarındaki ve dünyadaki fiyatlarını tek yerde gösterir; her iş günü kendiliğinden güncellenir. Amaç: <b>alım zamanını ve yerini</b> doğru seçmek.</p><p><b>Adım adım:</b></p>'+ogL(['En üstteki <b>⚠ Dikkat</b> kutusunu okuyun: bugün önemli ne değişti.','<b>Yurt içi borsalar</b> tablosunda hangi borsa en ucuz, bakın.','<b>Dünya merkezleri</b> tablosunda ithal malın Mersin\'e tahmini gelişini (sağ sütun) yerli fiyatla karşılaştırın.','Hammaddenin adına dokunun: grafik ve 1 hafta–3 ay önceki fiyatlar açılır.','Size teklif gelince "+ Gelen teklif ekle" ile yazın; program karşılaştırır.','Belli bir fiyatı bekliyorsanız <b>🔔 Fiyat uyarılarım</b>\'a sınır yazın.'],1))}
function ogFpDikkat(){return og('dikkat','⚠ Dikkat kutusu ne zaman çıkar?','<p>Sayfa açılınca fiyatlar kontrol edilir; önemli bir durum varsa en üstte sarı çerçeveli kutu çıkar. Sabah telefona gelen bildirim de aynı kuralları kullanır.</p>'+ogL(['<b>±%'+UYE.yuzde+'</b>: fiyat bir öncekine göre %'+UYE.yuzde+'\'den çok arttı ya da düştü (borsada bir önceki işlem günü, dünyada bir önceki yayımlanan fiyat). Satırda süresi yazar: günlük, haftalık, aylık.','<b>3 ayın en yükseği / en düşüğü</b>: son fiyat önceki 3 ayın zirvesini ya da dibini geçti.','<b>İthal–yerli</b>: ithal malın tahmini Mersin teslim fiyatı en ucuz borsanın altına indi ya da üstüne çıktı.','<b>Sizin sınırınız</b>: Fiyat uyarılarım\'a yazdığınız sınır aşıldı.','<b>Şüpheli</b>: fiyatı çok oynayan, tek işlemde sıçrayan ya da az işlem gören seri; ayrı satırda, "dikkatli okuyun" diye.','<b>Eski kaynak</b>: borsa fiyatları '+UYE.borsa+' iş günü gelmezse ya da dosya '+UYE.dosya+' gün güncellenmezse. Donmuş ya da eski kaynakların değişimi "hareket" sayılmaz.'])+'<p><b>Ne yapmalı:</b> kutu yoksa bugün önemli bir değişiklik yok. Varsa ilgili hammaddeye dokunup grafiğe bakın; kararı tek güne göre değil, gidişe göre verin.</p>')}
function ogFpOzet(){return og('ozet','Özet tablolar nasıl okunur?','<p><b>Yurt içi borsalar</b>: Türkiye\'deki ürün borsalarında (Gaziantep, Konya, Polatlı, Adana) o gün yapılan satışların fiyatı. <b>TL/ton</b> yazılır (TL/kg × 1.000; örnek 15,99 TL/kg = 15.990 TL/ton).</p><p><b>Dünya merkezleri</b>: ihracat limanında gemiye yüklenmiş mal fiyatı, <b>dolar/ton</b>. Buna <b>FOB</b> denir (navlun alıcıya ait). Chicago vadeli borsa fiyatıdır, FOB değildir; yalnız piyasanın yönünü gösterir.</p><p><b>Mersin liman</b> sütunu: <b>Mersin teslim = FOB + navlun + liman/sigorta</b> (tahmini). <b>Gümrük vergisi ve KDV dahil değildir</b>; yerli fiyatla karşılaştırırken bunları ekleyin. Altındaki TL/ton bugünkü kurla.</p><p><b>▲ / ▼</b>: son 1 haftadaki değişim (kırmızı artış, yeşil düşüş). <b>/ay</b> ya da <b>/13 g</b>: kaynak haftalık değil, karşılaştırılan süre o.</p>')}
function ogFpIsaret(){return og('isaret','* ve ! işaretleri ne demek?',ogL(['<b>* güncel değil</b>: son işlem 1 haftadan eski ya da fiyat haftalardır hiç değişmiyor (kaynak "donmuş" olabilir). → Bu rakamla karar vermeyin; Mersin hesabına da katılmaz.','<b>! şüpheli</b>: fiyat bir işlemde %15\'ten çok oynadı. Genelde farklı kalitelerin (örnek kırık–sağlam) karışmasından olur. → Borsadan ya da tüccardan teyit edin.','<b>—</b>: o tarihte fiyat yok; altında nedeni yazar (birikiyor, aylık, işlem yok).']))}
function ogFpYuzde(){return og('yuzde','1 hf · 1 ay · 2 ay · 3 ay sütunları','<p>Hammaddenin adına dokununca açılan tabloda her sütunda <b>üstteki rakam o tarihteki fiyat</b>, <b>alttaki yüzde bugünkü fiyatın ona göre değişimi</b>.</p><p>Örnek: 1 ay sütununda 15.000 ve −7,7% → bir ay önce 15.000 TL/ton idi, bugün %7,7 daha ucuz.</p><p>Kısa pencere (1 hafta) ani değişimi, uzun pencere (3 ay) gidişi gösterir. Dünya satırlarında yüzde dolar fiyatından hesaplanır; kur değişimi ayrıca en alttaki USD/TL satırında.</p>')}
function ogFpGrafik(){return og('grafik','Grafik nasıl okunur?',ogL(['Grafik <b>TL/ton</b> çizer; düğmelerle 1, 2 ya da 3 ay seçilir.','<b>Düz çizgi</b> = yurt içi borsa; <b>kesikli çizgi</b> = ithal malın tahmini Mersin teslim fiyatı (gümrük, KDV hariç).','Kesikli çizgi düz çizginin altına iniyorsa ithal mal ucuzlamış demektir; gümrük ve KDV\'yi ekleyip yine de ucuz mu, bakın.','Çizginin tek bir noktada sivri zıplaması genelde kalite karışmasıdır (! işareti); gidişe bakın.']))}
function ogFpTeklif(){return og('teklif','Gelen teklif nasıl girilir?',ogL(['Hammaddenin adına dokunun, tablonun altındaki <b>+ Gelen teklif ekle</b>\'ye basın.','<b>Nereden</b>: malın geldiği ülke (navlun buna göre seçilir).','<b>Teslim şekli</b>: İhracat limanı FOB ($/ton), Mersin/İskenderun liman teslim ($/ton) ya da Fabrikaya/depoya teslim (<b>TL/ton</b>, örnek 12.500).','Tarihi ve isterseniz firma adını yazıp kaydedin.'],1)+'<p><b>Sonuç</b>: FOB teklifte program navlun ve liman ekleyip Mersin teslimi hesaplar; aynı yerden önceki teklife göre % değişimi yazar. Teklifler yalnız bu telefonda kalır, paylaşılan resme girmez.</p>')}
function ogFpNavlun(){return og('navlun','Navlun ayarı ne işe yarar?','<p><b>Navlun</b>: gemi taşıma ücreti ($/ton). Mersin teslim tahmini bu rakamlarla hesaplanır: FOB + navlun + liman/sigorta/boşaltma.</p>'+ogL(['Rakamlar tahminidir; gemi büyüklüğü ve mevsimle değişir.','Size gelen gerçek navlun teklifini aşağıdaki kutuya yazın: tüm Mersin hesapları, grafik ve uyarılar hemen ona göre değişir.','Gümrük vergisi ve KDV hiçbir zaman eklenmez; kararda kendiniz ekleyin.']))}
function ogFpUyari(){return og('uyari','Fiyat uyarılarım nasıl kullanılır?',ogL(['Hammaddeyi ve hangi fiyatı izleyeceğinizi seçin: en ucuz borsa, belli bir borsa ya da ithal (Mersin teslim tahmini).','"Altına inerse" ve/veya "Üstüne çıkarsa" kutusuna <b>TL/ton</b> yazın (örnek 15.000).','Uyarı ekle\'ye basın.'],1)+'<p><b>Sonuç</b>: fiyat sınıra gelince bu sayfayı açtığınızda en üstteki Dikkat kutusunda çıkar; listede "⚠ sınır aşıldı" yazar. Sınırlar yalnız bu telefonda kalır.</p>')}
function ogFpPaylas(){return og('paylas','⤴ Paylaş düğmesi','<p>Tablonun ya da hammaddenin (grafiğiyle) beyaz zeminli bir <b>resmini</b> hazırlar ve telefonun paylaş menüsünü açar; WhatsApp\'ta müşteriye ya da gruba gönderebilirsiniz. Paylaş menüsü açılmazsa resim telefona indirilir.</p><p>Sizin alış fiyatlarınız ve gelen teklifler resme <b>girmez</b>; yalnız piyasa fiyatları gider.</p>')}
function ogFpAlis(){return og('alis','Alış fiyatı tablosu','<p>Rasyon programında hammaddelere yazdığınız alış fiyatları burada tarihleriyle görünür (yalnız okunur). Borsa fiyatıyla yan yana koyup <b>pahalı mı aldım?</b> sorusuna bakmak için. Fiyatı değiştirmek için rasyon programını kullanın.</p>')}
window.fpRender=function(){var el=document.getElementById("fpBody");if(!el)return;var D=window.FPDATA,h='';
 if(!D)h+=window._fpErr?'<div class="uy">Fiyat verisi alınamadı ('+esc(window._fpErr)+'). İnternet bağlantısını kontrol edip sayfayı yeniden açın; fiyatlar her gün güncellenir.</div>':'<p class="s">Yükleniyor…</p>';
 else{var M=fpMerkez(D),son=M.son,g=fpYas(D),kur=fpKur(D,'9999');
  if(window._fpYedek)h+='<div class="uy" id="fpCevrimdisi"><b>Çevrimdışı.</b> İnternete bağlanılamadı: telefonda kayıtlı son fiyatlar gösteriliyor (güncelleme '+esc(fpZaman(D,1))+'). Bağlantı gelince fiyatlar kendiliğinden yenilenir.'+ogN('Neden: internet yok. → Ne yapmalı: bağlantı gelince sayfayı yeniden açın; o zamana kadar rakamları eski kabul edin.')+'</div>';
  if(g>=3)h+='<div class="uy">⚠ Fiyatlar <b>'+g+' gündür güncellenmedi</b> (son güncelleme '+esc(fpZaman(D,1))+'). Gösterilen fiyatlar eski; alım kararından önce borsadan teyit edin.'+ogN('Neden: otomatik güncelleme çalışmadı ya da internet yok. → Ne yapmalı: sayfayı yeniden açın; düzelmezse "Hata bildir" ile haber verin.')+'</div>';
  var A=fpDikkat(D,fpUy());h+=fpDikkatSerit(A)+ogFpGenel()+ogFpDikkat();
  h+=ogFpOzet()+ogFpIsaret()+ogFpPaylas()+fpOzet(M,D)+ogFpUyari()+fpUyBolum(A);
  h+='<h3 class="oh">Ayrıntılı tablo, geçmiş ve grafikler</h3><p class="s" style="margin:2px 0 6px">Hammaddenin adına dokunun: grafik, her merkezin 1 hafta–3 ay önceki fiyatı ve size gelen teklifler açılır. Yurt içi <b>TL/ton</b>, dünya <b>$/ton</b>.</p>'+ogFpYuzde()+ogFpGrafik()+ogFpTeklif()+'<div style="display:flex;gap:6px;margin:0 0 6px">'+[["1 ay",30],["2 ay",61],["3 ay",91]].map(function(p){return '<button class="btn l kb'+(window._fpGun===p[1]?' sec':'')+'" onclick="fpGun('+p[1]+')">Grafik '+p[0]+'</button>'}).join('')+'</div>';
  h+=M.map(function(m,i){return fpHamBlok(m,i,D)}).join('');
  var k=D.usdtry,kl=k&&k[k.length-1];if(kl)h+='<div class="ox"><table class="c" style="margin-top:8px"><tr><th>Kur</th><th class="r">Son</th>'+PER.map(function(p){return '<th class="r">'+p[0]+'</th>'}).join('')+'</tr><tr><td><b>USD/TL</b> '+spark(k)+'</td><td class="pc">'+f(kl[1],2)+'</td>'+PER.map(function(p){return pc(fpChange(k,p[1]))}).join('')+'</tr></table></div>';
  h+='<details class="dt"'+fpDA('oku')+'><summary>Tablo nasıl okunur?</summary><p class="s">Sağdaki sütunlarda üstteki rakam 1 hafta, 1 ay, 2 ay ve 3 ay önceki fiyat; altındaki yüzde bugünkü fiyatın o fiyata göre değişimi (örnek: 1 ay sütununda 15.000 ve −7,7% = bir ay önce 15.000 idi, bugün %7,7 daha ucuz). Dünya satırlarında değişim dolar fiyatı üzerinden hesaplanır. Fiyatın altındaki küçük tarih o fiyatın günüdür (aylık serilerde ayın ilk günü). <b>—</b> altında nedeni yazar: <i>birikiyor</i> = kaynak yeni eklendi; <i>aylık</i> = veri ayda bir geliyor; <i>işlem yok</i> = o tarihlerde borsada satış olmamış; <i>fiyat yok</i> = kaynak o tarihte fiyat vermemiş.</p></details>';
  h+=ogFpNavlun()+'<details class="dt"'+fpDA('nav')+'><summary><b>Mersin teslim hesabı</b>: FOB + navlun + liman/sigorta (varsayımları değiştirin)</summary><p class="s" style="margin:4px 0">Navlunlar tahminidir ve gemi büyüklüğüne, mevsime göre değişir; size gelen teklifle güncelleyin. Gümrük vergisi ve KDV dahil değildir. Mersin teslim yalnız ihracat limanı (FOB) fiyatı olan ve güncel satırlarda hesaplanır.</p>'+Object.keys(NAVV).map(function(k){return '<label class="s nv"><span style="flex:1">'+esc(NAVV[k][0])+'</span><input type="number" inputmode="decimal" min="0" max="499" step="1" value="'+fpNav(k)+'" onchange="fpNavSet(\''+k+'\',this.value)" aria-label="'+esc(NAVV[k][0])+' $/ton"> $/t</label>'}).join('')+'</details>';
  /* En çok artan/düşen (denetim Y2): yalnız güvenilir seriler (fpDuzenli, sabah bildirimiyle aynı kural): borsada ayda 6'dan az işlem gören, oynak, son işlemde sıçrayan ya da donmuş seriler katılmaz */
  var deg=[];M.forEach(function(m){m.L.forEach(function(x){var b=x.b;if(!fpDuzenli(x))return;var v=fpChange(b.s,30);if(v!==null)deg.push({ad:m.ad+' ('+fpKisa(x.etiket)+')',v:v})})});deg.sort(function(a,b){return b.v-a.v});
  if(deg.length)h+='<p class="s">Son 1 ayda en çok '+(deg[0].v>0?'artan':'değişen')+': <b>'+esc(deg[0].ad)+'</b> ('+(deg[0].v>0?'+':'')+f(deg[0].v,1)+'%)'+(deg[deg.length-1].v<0?'; en çok düşen: <b>'+esc(deg[deg.length-1].ad)+'</b> ('+f(deg[deg.length-1].v,1)+'%)':'')+'. <small class="mu">(Düzenli işlem gören ve güncel fiyatlar arasında.)</small></p>';
  var Y=D.yurtici||{};h+='<p class="s mu">Yurt içi: '+esc(Y.not||'')+(son?' Son borsa günü '+fpTarih(son)+'.':'')+' Kaynak: '+esc(Y.kaynak||'—')+'.<br>Dünya: '+esc(D.not||'')+' Kaynak: '+esc(D.kaynak||'')+'. Güncelleme: '+esc(fpZaman(D,1))+'.</p>'}
 var O=ownRows().filter(function(r){return !FABR.test(r.ad)});h+='<h3 class="oh">Sizin alış fiyatlarınız <small class="mu" style="font-weight:400">(hammaddeler, TL/ton)</small></h3><p class="s" style="margin:2px 0">Rasyon programında hammaddelere girdiğiniz fiyatlar (TL/kg) tarihiyle kaydedilir; borsa fiyatıyla karşılaştırmak için burada TL/ton gösterilir. Fabrika yemleri gösterilmez.</p>'+ogFpAlis();
 h+=O.length?fpTable(O.map(function(r){return {ad:r.ad,seri:r.L}})):'<p class="s mu">Henüz kayıt yok: rasyon programında hammadde fiyatı girdikçe burada görünür.</p>';
 el.innerHTML=h;ogBar()};
/* Veri: önce GitHub'daki güncel dosya, olmazsa sitedeki kopya; başarılı veri telefona kaydedilir (denetim O1) ve internet yokken o gösterilir */
function fpGecerli(j){return j&&Array.isArray(j.urunler)&&j.urunler.length?j:null}
function fpYedekOku(){try{var t=localStorage.getItem(YEDEK);return t?fpGecerli(JSON.parse(t)):null}catch(e){return null}}
function fpYedekYaz(j){try{localStorage.setItem(YEDEK,JSON.stringify(j))}catch(e){}}
/* Çevrimdışı (kontrol 18.11.2026): kurulu uygulamada servis çalışanı internet yokken önbellekteki eski fiyatlar.json'u verdiği için sayfa "internet var" sanıyordu.
   GitHub'daki dosya alınamadıysa ve (telefon çevrimdışı diyorsa ya da sitedeki kopyanın sunucu tarihi 15 dakikadan eskiyse = önbellekten geldiyse) not gösterilir. */
function fpOnbellek(r){try{var d=Date.parse(r.headers.get('date')||'');return isFinite(d)&&Math.abs(Date.now()-d)>15*60e3}catch(e){return false}}
function fpCevrimdisi(){return typeof navigator!=='undefined'&&navigator.onLine===false}
window.fpLoad=function(){if(!window.FPDATA){var y=fpYedekOku();if(y){window.FPDATA=y;if(fpCevrimdisi())window._fpYedek=true;fpRender()}}/* önce telefondaki son veri hemen görünür; ağdan gelince yenilenir */
 var al=function(u,o,bilgi){return fetch(u,o).then(function(r){if(!r.ok)throw new Error(r.status===404?"veri henüz oluşturulmadı":"sunucu hatası "+r.status);if(bilgi)bilgi.onbellek=fpOnbellek(r);return r.text()}).then(function(t){var j=null;try{j=JSON.parse(t)}catch(e){throw new Error("fiyat dosyası bozuk geldi")}if(!fpGecerli(j))throw new Error("fiyat dosyası boş geldi");return j})};
 var B={yedekten:false,onbellek:false};
 al(RAW,{cache:"no-store"}).catch(function(){B.yedekten=true;return al("fiyatlar.json",{cache:"no-cache"},B)}).then(function(j){var y=fpYedekOku();if(y&&Date.parse(y.guncel)>Date.parse(j.guncel))j=y;/* sitedeki kopya telefondakinden eskiyse yenisi kalır */window.FPDATA=j;window._fpYedek=B.yedekten&&(fpCevrimdisi()||B.onbellek);window._fpErr=null;fpYedekYaz(j);fpRender()})
 .catch(function(e){var m=String((e&&e.message)||e);window._fpErr=/fetch|network|load failed|internet/i.test(m)||e instanceof TypeError?"İnternete bağlanılamadı":/JSON|token|syntax/i.test(m)?"fiyat dosyası bozuk geldi":m;if(!window.FPDATA)window.FPDATA=fpYedekOku();window._fpYedek=!!window.FPDATA;fpRender()})};
/* bağlantı gidince not hemen çıkar, gelince fiyatlar yeniden alınır */
if(typeof window.addEventListener==='function'&&!window._fpAgB){window._fpAgB=1;window.addEventListener('online',function(){try{window.fpLoad()}catch(e){}});window.addEventListener('offline',function(){if(window.FPDATA){window._fpYedek=true;try{window.fpRender()}catch(e){}}})}
})();
