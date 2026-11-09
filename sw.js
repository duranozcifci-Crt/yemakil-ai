const C="yemakil-v74";
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(["./","./index.html","./manifest.json","./icon-192.png","./icon-512.png"]).catch(()=>{})))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
/* Ağ öncelikli; sayfa açılışında ağ 3 sn'de yanıt vermezse önbellek (zayıf kırsal bağlantı). Yalnız kendi dosyalarımız ve yazı tipleri önbelleğe alınır; hatalı yanıt önbelleğe yazılmaz. */
self.addEventListener("fetch",e=>{const q=e.request;if(q.method!=="GET")return;const u=new URL(q.url),same=u.origin===self.location.origin,font=/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);if(!same&&!font)return;const nav=q.mode==="navigate";
 const cached=()=>caches.match(q,{ignoreSearch:nav}).then(c=>c||(nav?caches.match("./index.html"):null));
 const net=fetch(q).then(r=>{if(!r.ok)return caches.match(q).then(c=>c||r);const cp=r.clone();caches.open(C).then(c=>c.put(q,cp)).catch(()=>{});return r});
 if(!nav){e.respondWith(net.catch(()=>cached()).then(x=>x||Response.error()));return}
 e.respondWith(new Promise(res=>{let done=false;const fin=x=>{if(!done&&x){done=true;res(x)}};const t=setTimeout(()=>cached().then(fin),3000);net.then(x=>{clearTimeout(t);fin(x)}).catch(()=>cached().then(c=>{clearTimeout(t);fin(c||Response.error())}))}))});
