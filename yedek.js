/* YemAkıl otomatik yedek (yedek.js) — üç programın (Rasyon, Fiyatlar, Sipariş) ortak TEK parçası; programlar arasında veri/fiyat paylaşımı yapmaz, yalnız yedekler.
   - Kullanıcı kayıtları (rasyon-v1, fiyat-v1, siparis-v1) değişince ~2 sn sonra üçünün tam kopyası telefonda (IndexedDB "yemakil-yedek") saklanır.
     Önbellekler (fiyat-veri), "-onceki"/"-bozuk" kopyaları ve yapay zekâ (API) anahtarı yedeğe girmez.
   - Saklama: son 50 değişiklik + son 48 saatte saatte bir + son 60 günde günde bir; toplam boyut sınırlı (en eskiler silinir). Aynı içerik bir kez saklanır.
   - "Dışarı gönder": tek dosya (rasyonun eski "Yedek al" biçimi + ek; eski "Yedek yükle" düğmeleri de okur), paylaş menüsüyle Drive/WhatsApp'a; yoksa indirilir.
   - IndexedDB yoksa ya da hata verirse program hiç etkilenmez (sessizce atlanır). */
(function(){
"use strict";
var KEYS=["rasyon-v1","fiyat-v1","siparis-v1"],AD={"rasyon-v1":"Rasyon","fiyat-v1":"Fiyatlar","siparis-v1":"Sipariş"};
var DK="yemakil-yedek-durum",GK="yemakil-yedek-geri",DB="yemakil-yedek",SON=50,SAAT=48,GUN=60,BEKLE=2000,HAFTA=7*864e5;
var CAP=25*1048576;
var LS=null;try{LS=window.localStorage}catch(e){}
var SP=(typeof Storage!=="undefined")?Storage.prototype:null,oSet=SP&&SP.setItem,oRem=SP&&SP.removeItem,oClr=SP&&SP.clear;
var ACILIS=Date.now(),GIRIS=function(){return !!document.getElementById("ykPanel")};
function lsGet(k){try{return LS?LS.getItem(k):null}catch(e){return null}}
function lsSet(k,v){try{oSet.call(LS,k,v);return true}catch(e){return false}}
function durum(){var d=null;try{d=JSON.parse(lsGet(DK)||"null")}catch(e){}return (d&&typeof d==="object"&&!Array.isArray(d))?d:{}}
function durumYaz(d){lsSet(DK,JSON.stringify(d))}
function iki(n){return (n<10?"0":"")+n}
function gunK(t){var d=new Date(t);return d.getFullYear()+"-"+iki(d.getMonth()+1)+"-"+iki(d.getDate())}
function zaman(t){if(!t)return "";var d=new Date(t),bg=gunK(Date.now()),dn=gunK(Date.now()-864e5),k=gunK(t),s=iki(d.getHours())+":"+iki(d.getMinutes());
 return k===bg?"bugün "+s:k===dn?"dün "+s:d.toLocaleDateString("tr-TR")+" "+s}
function surum(){var e=document.querySelector("h1 span");return e?String(e.textContent||"").trim():""}
/* hash (cyrb53) + uzunluk: aynı içerik bir kez saklanır */
function hash(s){var h1=0xdeadbeef,h2=0x41c6ce57;for(var i=0,c;i<s.length;i++){c=s.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}
 h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
 return (4294967296*(2097151&h2)+(h1>>>0)).toString(36)+"-"+s.length}
/* yedeğe girmeyenler: yapay zekâ anahtarı (…ai.key, apiKey) ve yalnız bu telefona ait yedek tarihleri; geri yüklemede telefondaki değerleri korunur */
var GIZLI=/^(api_?key|apikey)$/i,META={"rasyon-v1":[["bkAt"],["bkHide"]],"siparis-v1":[["sip","yedekT"]]};
function ayikla(o,yol,cik){if(!o||typeof o!=="object")return;Object.keys(o).forEach(function(k){var v=o[k],y=yol.concat(k);
 if((k==="key"&&yol[yol.length-1]==="ai")||GIZLI.test(k)){if(v!==null&&typeof v!=="object"){cik.push([y,v]);delete o[k]}return}
 if(v&&typeof v==="object")ayikla(v,y,cik)})}
function al_(o,y){for(var i=0;i<y.length;i++){if(!o||typeof o!=="object")return undefined;o=o[y[i]]}return o}
function temizle(k,o){var cik=[];if(!o||typeof o!=="object")return cik;ayikla(o,[],cik);(META[k]||[]).forEach(function(y){var p=al_(o,y.slice(0,-1)),s=y[y.length-1];if(p&&typeof p==="object"&&p[s]!==undefined){cik.push([y,p[s]]);delete p[s]}});return cik}
function geriKoy(o,cik){if(!o||typeof o!=="object")return;cik.forEach(function(c){var y=c[0],p=o;for(var i=0;i<y.length-1;i++){if(!p[y[i]]||typeof p[y[i]]!=="object")p[y[i]]={};p=p[y[i]]}p[y[y.length-1]]=c[1]})}
/* telefondaki kayıtlar (anahtarsız): {anahtar:{o,s,cik}} */
function oku(){var r={};KEYS.forEach(function(k){var s=lsGet(k);if(!s)return;var o=null;try{o=JSON.parse(s)}catch(e){}
 if(!o||typeof o!=="object"){r[k]={o:null,s:s,cik:[]};return}var cik=temizle(k,o);r[k]={o:o,s:JSON.stringify(o),cik:cik}});return r}

/* ---------- IndexedDB (sessiz: hata olursa null) ---------- */
var dbP=null,DBYOK=false;
function ac(){if(dbP)return dbP;dbP=new Promise(function(res){try{if(!window.indexedDB){DBYOK=true;return res(null)}var r=indexedDB.open(DB,1);
 r.onupgradeneeded=function(){var db=r.result;if(!db.objectStoreNames.contains("kayit"))db.createObjectStore("kayit",{keyPath:"id",autoIncrement:true});if(!db.objectStoreNames.contains("parca"))db.createObjectStore("parca",{keyPath:"h"})};
 r.onsuccess=function(){var db=r.result;db.onversionchange=function(){try{db.close()}catch(e){}dbP=null};res(db)};r.onerror=function(){DBYOK=true;res(null)};r.onblocked=function(){res(null)}}catch(e){DBYOK=true;res(null)}});return dbP}
function islem(adlar,mod,fn){return ac().then(function(db){if(!db)return null;return new Promise(function(res){var out={};try{var tx=db.transaction(adlar,mod);fn(tx,out);tx.oncomplete=function(){res(out.v===undefined?true:out.v)};tx.onerror=tx.onabort=function(e){try{e&&e.preventDefault&&e.preventDefault()}catch(x){}res(null)}}catch(e){res(null)}})}).catch(function(){return null})}
function tumKayitlar(){return islem(["kayit"],"readonly",function(tx,out){var q=tx.objectStore("kayit").getAll();q.onsuccess=function(){out.v=(q.result||[]).sort(function(a,b){return b.t-a.t||b.id-a.id})}}).then(function(L){return L||[]})}
function yaz(kayit,v){return islem(["kayit","parca"],"readwrite",function(tx,out){var P=tx.objectStore("parca");
 Object.keys(kayit.refs).forEach(function(k){var h=kayit.refs[k],c=P.count(h);c.onsuccess=function(){if(!c.result)P.put({h:h,s:v[k].s})}});
 var a=tx.objectStore("kayit").add(kayit);a.onsuccess=function(){out.v=a.result}}).then(function(id){if(id===null||id===true)return null;return budama().then(function(){return id})})}
/* saklama: son 50 + son 48 saatte saatte bir + son 60 günde günde bir; toplam boyut CAP'i aşarsa en eskiler silinir; kullanılmayan parçalar temizlenir */
function secim(L,now){var keep=[],saat={},gun={};L.forEach(function(r,i){var hk=Math.floor(r.t/36e5),gk=gunK(r.t),yas=now-r.t,al=false;
  if(i<SON)al=true;else if(yas<SAAT*36e5&&!saat[hk])al=true;else if(yas<GUN*864e5&&!gun[gk])al=true;
  if(al){keep.push(r);saat[hk]=1;gun[gk]=1}});
 var boy=function(){var u={},t=0;keep.forEach(function(r){Object.keys(r.refs||{}).forEach(function(k){var h=r.refs[k];if(!u[h]){u[h]=1;t+=(r.sz&&r.sz[h])||0}})});return t};
 while(keep.length>1&&boy()>CAP)keep.pop();return keep}
function budama(now){now=now||Date.now();return islem(["kayit","parca"],"readwrite",function(tx,out){var K=tx.objectStore("kayit"),P=tx.objectStore("parca"),q=K.getAll();
 q.onsuccess=function(){var L=(q.result||[]).sort(function(a,b){return b.t-a.t||b.id-a.id}),keep=secim(L,now),ids={},ref={},sil=0;keep.forEach(function(r){ids[r.id]=1;Object.keys(r.refs||{}).forEach(function(k){ref[r.refs[k]]=1})});
  L.forEach(function(r){if(!ids[r.id]){K.delete(r.id);sil++}});
  var pk=P.getAllKeys();pk.onsuccess=function(){(pk.result||[]).forEach(function(h){if(!ref[h])P.delete(h)})};out.v=sil}})}
function parcalar(refs){return islem(["parca"],"readonly",function(tx,out){var P=tx.objectStore("parca");out.v={};Object.keys(refs).forEach(function(k){var g=P.get(refs[k]);g.onsuccess=function(){if(g.result)out.v[k]=g.result.s}})})}
function kayitGetir(id){return islem(["kayit"],"readonly",function(tx,out){var g=tx.objectStore("kayit").get(id);g.onsuccess=function(){out.v=g.result||null}})}

/* ---------- otomatik yedek ---------- */
var bekleyen={},zam=null,dinleyen=[];
function haber(){dinleyen.forEach(function(f){try{f()}catch(e){}});try{uyariCiz()}catch(e){}}
function isaretle(k){if(AD[k])bekleyen[AD[k]]=1;clearTimeout(zam);zam=setTimeout(function(){al("oto")},BEKLE)}
/* tur: oto | ilk | geri-oncesi | geri | dosya ; zorla: içerik aynı olsa da kaydet */
function al(tur,not,zorla){clearTimeout(zam);zam=null;var ap=Object.keys(bekleyen);bekleyen={};
 try{var v=oku(),refs={},sz={},d=durum(),eski=d.son||{},deg=[];
  Object.keys(v).forEach(function(k){var h=hash(v[k].s);refs[k]=h;sz[h]=v[k].s.length*2;if(eski[k]!==h)deg.push(AD[k])});
  Object.keys(eski).forEach(function(k){if(!refs[k]&&AD[k])deg.push(AD[k])});
  if(!Object.keys(refs).length&&!zorla){if(deg.length){d.son={};durumYaz(d)}return Promise.resolve(null)}
  if(!deg.length&&!zorla)return Promise.resolve(null);
  if(!d.ilk)d.ilk=Date.now();d.son=refs;if(deg.length&&tur!=="geri"&&tur!=="dosya")d.sonDeg=Date.now();d.sonOto=Date.now();durumYaz(d);
  var kayit={t:Date.now(),tur:tur||"oto",apps:deg.length?deg:ap,refs:refs,sz:sz,not:not||""};
  return yaz(kayit,v).then(function(id){haber();return id}).catch(function(){return null})}catch(e){return Promise.resolve(null)}}
/* localStorage yazımları izlenir (yalnız üç kullanıcı kaydı); asıl yazma aynen yapılır, hatası (depolama dolu) programa aynen döner */
if(SP&&oSet&&LS){try{
 SP.setItem=function(k,v){var izle=this===LS&&KEYS.indexOf(String(k))>=0,once=izle?lsGet(String(k)):null,r=oSet.apply(this,arguments);if(izle&&once!==String(v))isaretle(String(k));return r};
 SP.removeItem=function(k){var izle=this===LS&&KEYS.indexOf(String(k))>=0&&lsGet(String(k))!==null,r=oRem.apply(this,arguments);if(izle)isaretle(String(k));return r};
 SP.clear=function(){var izle=this===LS&&KEYS.some(function(k){return lsGet(k)!==null}),r=oClr.apply(this,arguments);if(izle)KEYS.forEach(isaretle);return r};
}catch(e){}}

/* ---------- geri dönüş / dosyadan yükleme ---------- */
/* veri: {anahtar: metin}; telefondaki anahtar ve yedek tarihleri korunur; açık program pencereleri yenilenir */
function yukle(veri){var simdi=oku();Object.keys(veri).forEach(function(k){if(KEYS.indexOf(k)<0||typeof veri[k]!=="string")return;var s=veri[k],o=null;try{o=JSON.parse(s)}catch(e){}
  if(o&&typeof o==="object"){if(simdi[k])geriKoy(o,simdi[k].cik);s=JSON.stringify(o)}var es=lsGet(k);if(es&&es!==s)lsSet(k+"-onceki",es);lsSet(k,s)});
 lsSet(GK,String(Date.now()))}
function geriDon(id){return kayitGetir(id).then(function(r){if(!r)return {hata:"Bu yedek bulunamadı."};return parcalar(r.refs).then(function(v){if(!v||Object.keys(v).length<Object.keys(r.refs).length)return {hata:"Yedek okunamadı."};
  return al("geri-oncesi","Geri dönmeden önceki hâl",true).then(function(onc){yukle(v);return al("geri",zaman(r.t)+" hâline dönüldü",true).then(function(){return {ok:true,oncesi:onc,t:r.t}})})})})}
/* yedek dosyası: yeni biçim / rasyonun "Yedek al" dosyası ({app:"YemAkil",S,ek}) / siparişin "Yedek al" dosyası ({app:"YemAkil-Siparis",sip}) */
function dosyaCoz(txt){var o;try{o=JSON.parse(txt)}catch(e){return {hata:"Dosya okunamadı: YemAkıl yedek dosyası değil."}}if(!o||typeof o!=="object")return {hata:"Bu dosya bir YemAkıl yedeği değil."};
 var v={},ob=function(x){return x&&typeof x==="object"&&!Array.isArray(x)};
 if(ob(o.veri))KEYS.forEach(function(k){if(ob(o.veri[k]))v[k]=o.veri[k]});
 if(ob(o.S)&&Array.isArray(o.S.feeds)&&o.S.feeds.length&&ob(o.S.t))v["rasyon-v1"]=o.S;
 if(ob(o.ek))KEYS.forEach(function(k){if(ob(o.ek[k]))v[k]=o.ek[k]});
 if(!v["siparis-v1"]&&ob(o.S)&&ob(o.S.sip))v["siparis-v1"]={sip:o.S.sip};
 if(!v["siparis-v1"]&&ob(o.sip))v["siparis-v1"]={sip:o.sip};
 var ks=Object.keys(v);if(!ks.length)return {hata:"Bu dosya bir YemAkıl yedeği değil (içinde rasyon, fiyat ya da sipariş kaydı yok)."};
 var sp=v["siparis-v1"]&&v["siparis-v1"].sip,ek=[];if(sp){ek.push((Array.isArray(sp.ls)?sp.ls.length:0)+" sipariş, "+(Array.isArray(sp.cari)?sp.cari.length:0)+" cari")}
 var r=v["rasyon-v1"];if(r){ek.unshift((Array.isArray(r.saved)?r.saved.length:0)+" kayıtlı rasyon")}
 return {veri:v,tarih:o.date||null,programlar:KEYS.filter(function(k){return v[k]}).map(function(k){return AD[k]}),ozet:ek.join(", ")}}
function dosyaYukle(c){if(!c||!c.veri)return Promise.resolve({hata:"Geçersiz yedek."});var v={};Object.keys(c.veri).forEach(function(k){v[k]=JSON.stringify(c.veri[k])});
 return al("geri-oncesi","Dosya yüklenmeden önceki hâl",true).then(function(onc){yukle(v);return al("dosya","Yedek dosyasından yüklendi"+(c.tarih?" ("+new Date(c.tarih).toLocaleDateString("tr-TR")+" tarihli)":""),true).then(function(){return {ok:true,oncesi:onc}})})}

/* ---------- telefon dışına gönderme ---------- */
function dosyaVeri(){var v=oku(),o={app:"YemAkil",yedek:2,ver:surum(),date:new Date().toISOString(),ek:{}};if(v["rasyon-v1"]&&v["rasyon-v1"].o)o.S=v["rasyon-v1"].o;
 ["siparis-v1","fiyat-v1"].forEach(function(k){if(v[k]&&v[k].o)o.ek[k]=v[k].o});return o}
function disariOldu(){var d=durum();d.sonDisari=Date.now();delete d.gizle;durumYaz(d);haber()}
/* cb(durum, mesaj, dosyaAdı): gonderildi | indirildi | iptal | bos | hata. Dosya eşzamanlı hazırlanır (paylaş menüsü dokunuşla açılabilsin). */
function gonder(cb,ad){cb=typeof cb==="function"?cb:function(){};var o=dosyaVeri();if(!o.S&&!Object.keys(o.ek).length){cb("bos","Yedeklenecek kayıt yok.");return}
 var txt=JSON.stringify(o),kb=Math.max(1,Math.round(txt.length/1024));ad=ad||("yemakil-yedek-"+gunK(Date.now())+".json");
 var indir=function(){try{var u=URL.createObjectURL(new Blob([txt],{type:"application/json"})),a=document.createElement("a");a.href=u;a.download=ad;document.body.appendChild(a);a.click();setTimeout(function(){try{URL.revokeObjectURL(u);a.remove()}catch(e){}},60000)}catch(e){cb("hata","Yedek dosyası oluşturulamadı.");return}
  disariOldu();cb("indirildi","Yedek dosyası indirildi: "+ad+" ("+kb+" KB). Dosya şimdilik telefonda; Google Drive'a, WhatsApp'ta kendinize ya da e-postaya da gönderin.",ad)};
 try{var f=new File([txt],ad,{type:"application/json"});if(navigator.share&&navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],title:"YemAkıl yedeği"}).then(function(){disariOldu();cb("gonderildi","Yedek gönderildi: "+ad+" ("+kb+" KB).",ad)}).catch(function(e){if(e&&e.name==="AbortError")cb("iptal","Gönderme iptal edildi.");else indir()});return}}catch(e){}
 indir()}

/* ---------- hatırlatma: 7 günden uzun süredir dışarı gönderilmedi ve o zamandan beri değişiklik var ---------- */
function uyariVar(){var d=durum(),now=Date.now();if(!d.son||!Object.keys(d.son).length)return false;if(d.gizle&&d.gizle>now)return false;
 var taban=Math.max(d.sonDisari||0,d.ilk||now);if(now-taban<=HAFTA)return false;return !d.sonDisari||(d.sonDeg||0)>d.sonDisari}
function uyariCiz(){if(!document.body||GIRIS())return;var el=document.getElementById("ykUyari");if(!uyariVar()){if(el)el.remove();return}
 if(!el){el=document.createElement("div");el.id="ykUyari";el.setAttribute("role","status");el.style.cssText="background:var(--card,#fff);color:var(--tx,#16251c);border:1px solid var(--wa,#a86a00);border-radius:10px;padding:8px 10px;margin:8px 0;font-size:13px;line-height:1.4";
  var sg=document.getElementById("seg"),h=document.querySelector("main h1");if(sg&&sg.parentNode)sg.parentNode.insertBefore(el,sg);else if(h&&h.parentNode)h.parentNode.insertBefore(el,h.nextSibling);else return}
 var d=durum(),gn=d.sonDisari?Math.floor((Date.now()-d.sonDisari)/864e5):null;
 el.innerHTML='<b style="color:var(--wa,#a86a00)">Yedeği telefon dışına gönderin:</b> '+(gn===null?'kayıtlarınız henüz telefon dışına gönderilmedi.':'son gönderim '+gn+' gün önce, o zamandan beri değişiklik var.')+' Telefondaki otomatik yedekler telefon kaybolursa gider.'
  +'<div style="display:flex;gap:6px;margin-top:6px"><button type="button" id="ykUyGo" style="flex:1;min-height:40px;border:0;border-radius:8px;background:var(--ac,#1d5c4a);color:var(--on,#fff);font:600 14px inherit;font-family:inherit">Şimdi gönder</button><button type="button" id="ykUyNo" style="flex:1;min-height:40px;border:1px solid var(--bd,#cbd5cd);border-radius:8px;background:none;color:inherit;font:500 14px inherit;font-family:inherit">Yarın hatırlat</button></div>';
 document.getElementById("ykUyGo").onclick=function(){gonder(function(s,m){if(s==="indirildi"||s==="hata")try{alert(m)}catch(e){}})};
 document.getElementById("ykUyNo").onclick=function(){var d2=durum();d2.gizle=Date.now()+864e5;durumYaz(d2);uyariCiz()}}

/* ---------- açılış ---------- */
function basla(){try{if(navigator.storage&&navigator.storage.persisted)navigator.storage.persisted().then(function(p){if(!p&&navigator.storage.persist)return navigator.storage.persist()}).catch(function(){})}catch(e){}
 try{if(navigator.storage&&navigator.storage.estimate)navigator.storage.estimate().then(function(e){if(e&&e.quota)CAP=Math.max(2*1048576,Math.min(25*1048576,e.quota*0.1))}).catch(function(){})}catch(e){}
 var d=durum();if(!d.ilk){d.ilk=Date.now();durumYaz(d)}
 try{uyariCiz()}catch(e){}
 setTimeout(function(){tumKayitlar().then(function(L){if(!L.length&&Object.keys(oku()).length)return al("ilk","İlk yedek",true);return al("oto")})},1200)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",basla);else basla();
/* sayfa kapanırken / arka plana geçerken bekleyen yedek hemen alınır (yetişmezse sonraki açılışta fark yakalanır) */
document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden"){if(zam)al("oto")}else{var g=+lsGet(GK)||0;if(g>ACILIS&&!GIRIS())location.reload();else try{uyariCiz()}catch(e){}}});
window.addEventListener("pagehide",function(){if(zam)al("oto")});
/* başka pencerede geri dönüş yapıldıysa açık program yenilenir (eski kayıt üzerine yazmasın) */
window.addEventListener("storage",function(e){if(e.key===GK&&!GIRIS())location.reload();else if(e.key===DK||KEYS.indexOf(e.key)>=0)haber()});

window.YK={gonder:gonder,dosyaVeri:dosyaVeri,dosyaCoz:dosyaCoz,dosyaYukle:dosyaYukle,geriDon:geriDon,liste:tumKayitlar,al:function(){return al("oto")},
 durum:durum,uyariVar:uyariVar,zaman:zaman,AD:AD,dbYok:function(){return DBYOK},
 sonDisari:function(){return durum().sonDisari||0},dinle:function(f){dinleyen.push(f)},
 _ic:{parcaSay:function(){return islem(["parca"],"readonly",function(tx,out){var q=tx.objectStore("parca").count();q.onsuccess=function(){out.v=q.result}})},CAP:function(){return CAP},oku:oku,hash:hash,yaz:yaz,budama:budama,secim:secim,parcalar:parcalar,al:al,durumYaz:durumYaz,KEYS:KEYS}};
})();
