// YemAkıl — piyasa fiyat panosu verisi (GitHub Actions'ta her gün çalışır).
// Chicago vadeli (CBOT), FAO, USDA, Güney Amerika FOB fiyatlarını ve USD/TRY kurunu çeker; yurt içi fiyatları
// Gaziantep, Konya, Polatlı ve Adana borsalarının günlük bültenlerinden ekler; Mersin motorin fiyatını (sipariş nakliye hesabı) ekler.
// Sayfanın okuduğu fiyatlar.json yalnız son SAYFA_GUN günü tutar (3 aylık grafik ve yüzdeler için yeter; dosya büyümez);
// uzun geçmiş (SAKLA_GUN) fiyat-arsiv.json'da birikir. Bir kaynak çekilemezse önceki verisi korunur; her istek ve her aşama süre sınırlıdır.
// Gecede birkaç kez çalışır (GitHub zamanlaması saatlerce gecikebiliyor): veri değişmediyse dosyalara dokunmaz (kayıt oluşmaz),
// haftalık kaynaklar (FAO, USDA) 6 saatte bir çekilir. Her serinin son fiyatının ilk görüldüğü an "gorulme" alanına yazılır (uyarılar için).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const OUT = process.env.FIYAT_OUT || process.argv[2] || "fiyatlar.json";
const ARSIV = process.env.FIYAT_ARSIV || path.join(path.dirname(OUT), "fiyat-arsiv.json");
const URUNLER = [
  { ad: "Mısır", sembol: "ZC=F", carpan: 0.39368, birim: "sent/bushel → USD/ton (25,40 kg/bushel)" },
  { ad: "Buğday", sembol: "ZW=F", carpan: 0.36744, birim: "sent/bushel → USD/ton (27,22 kg/bushel)" },
  { ad: "Soya küspesi", sembol: "ZM=F", carpan: 1.10231131, birim: "USD/kısa ton → USD/ton" },
  { ad: "Soya fasulyesi", sembol: "ZS=F", carpan: 0.36744, birim: "sent/bushel → USD/ton (27,22 kg/bushel)" },
];
// Yurt içi: Gaziantep Ticaret Borsası günlük bülteni (HTML) ve Konya Ticaret Borsası (JSON).
// Her gün için ürün satırlarının miktar ağırlıklı ortalaması (TL/kg); "İTH…" ile başlayan satış şekilleri (İTHAL, İTHGT: gümrük beyanı) hariç.
// Fiyat geçmişi ne kadar saklanır (kullanıcı kararı 2026-11-13: 2 yıl; "geçen yıl bu zaman" karşılaştırması için) → fiyat-arsiv.json.
// Pano en çok 3 ay gösterir (grafik 91 gün; aylık seriler ~2,5 ay gecikmeli geldiği için 3 aylık yüzde ~170 gün geriye bakar) → fiyatlar.json yalnız son SAYFA_GUN gün (denetim F2).
const SAKLA_GUN = 740;
const SAYFA_GUN = 170;
// Süre sınırları (denetim O6; kontrol 18.11.2026): her istek en çok 25 sn. Eskiden 7 dakikalık sınır yalnız borsa günleri ve Arjantin arşivi
// döngülerinde denetleniyordu; FAO ya da Yahoo yanıt vermeden beklerse (25 sn × 3 deneme × 14 seri) betik iş akışının 11 dakikalık sınırına
// takılıp hiçbir şey yazamıyordu. Şimdi her aşamanın kendi süresi var (asama): süre dolunca o aşamanın kalan istekleri hemen vazgeçer
// (önceki veri korunur) ve sonraki aşamaya (borsa, motorin) vakit kalır. Yanıt vermeyen sunucu (zaman aşımı / bağlantı hatası) o çalıştırmada
// bir daha denenmez. Toplam: dünya fiyatları en çok ~4 dk, borsa 6 dk 15 sn'ye kadar, motorin en geç 8. dakikada biter.
const ISTEK_SN = 25, BASLANGIC = Date.now(), TOPLAM_SN = 7 * 60, SERT_SN = 8 * 60;
let asamaAd = "başlangıç", asamaSon = BASLANGIC + TOPLAM_SN * 1000;
const asama = (ad, sn) => { asamaAd = ad; asamaSon = Math.min(Date.now() + sn * 1000, BASLANGIC + SERT_SN * 1000); };
const vakitVar = () => Date.now() < asamaSon - 2000;
const olu = new Set();
const agHatasi = (e) => !!e && (e.name === "TimeoutError" || e.name === "AbortError" || e instanceof TypeError);
// Bu istek için kalan süre (ms); sunucu bu çalıştırmada yanıt vermediyse ya da aşamanın süresi dolduysa hemen hata
function istekSuresi(url) {
  const host = new URL(url).host;
  if (olu.has(host)) throw new Error(host + " yanıt vermiyor (bu çalıştırmada atlandı)");
  const ms = Math.floor(Math.min(ISTEK_SN * 1000, asamaSon - Date.now()));
  if (ms < 1500) throw new Error("süre doldu (" + asamaAd + ")");
  return ms;
}
const vazgec = (e) => /yanıt vermiyor|^süre doldu/.test(String(e && e.message));
const UA = { "User-Agent": "Mozilla/5.0 (YemAkil fiyat panosu)" };
const KONYA = "https://www.ktb.org.tr/api/v1/Alpha.WebPanel/OnlineKullaniciBulten/GetGunlukBulten/";
const GAZIANTEP = "https://www.gtb.org.tr/gunluk-bulten?tarih=";
const POLATLI = "https://bulten.polatliborsa.org.tr/BultenGunluk.ashx?tarih=";
export const YURTICI = [
  { ad: "Mısır", borsa: "Gaziantep", re: /^MISIR$/ },
  { ad: "Mısır", borsa: "Konya", gruplar: ["Mısır"] },
  { ad: "Mısır", borsa: "Adana", satir: /^Mısır \(1\.Sınıf Serbest/, not: "1. sınıf, en düşük–en yüksek ortası" },
  { ad: "Mısır", borsa: "Polatlı", kod: /^114/ },
  { ad: "Arpa", borsa: "Gaziantep", re: /^ARPA$/ },
  { ad: "Arpa", borsa: "Konya", gruplar: ["Arpa"] },
  { ad: "Arpa", borsa: "Polatlı", kod: /^111/ },
  // Gaziantep yemlik buğday: dökerli ve kırık ayrı seri (denetim Y2: ikisinin ortalaması güne göre %25–50 zıplıyordu)
  { ad: "Yemlik buğday", borsa: "Gaziantep", tur: "dökerli", re: /^BUĞDAY ?\(DÖKERLİ\)$/ },
  { ad: "Yemlik buğday", borsa: "Gaziantep", tur: "kırık", re: /^BUĞDAY KIRIK$/ },
  { ad: "Yemlik buğday", borsa: "Konya", gruplar: ["Diğer Kırmızı Buğday", "Diğer Beyaz Buğday"], not: "düşük vasıflı" },
  { ad: "Yemlik buğday", borsa: "Polatlı", isim: /DÜŞÜK VASIFLI|STANDART DIŞI BUĞDAY/, not: "düşük vasıflı + standart dışı" },
  { ad: "Soya fasulyesi", borsa: "Gaziantep", re: /^SOYA FASULYES/ },
  { ad: "Soya fasulyesi", borsa: "Adana", satir: /^Soya Fasulyesi/, not: "en düşük–en yüksek ortası" },
  { ad: "Soya küspesi", borsa: "Gaziantep", re: /^SOYA KÜSPES/ },
  { ad: "DDGS", borsa: "Gaziantep", re: /DDGS/ },
  { ad: "Mısır gluten yemi (feed)", borsa: "Gaziantep", re: /^MISIR GLUTENİ YEMİ$/ },
  { ad: "Mısır gluteni (meal)", borsa: "Gaziantep", re: /^MISIR GLUTENİ$/ },
  { ad: "Ayçiçeği küspesi", borsa: "Gaziantep", re: /^AYÇİÇE(K|Ğİ) KÜSPES/ },
  // Pamuk tohumu küspesi (denetim 27.11.2026, O3): Gaziantep'te hiç işlem görmüyor (13.07–27.11 arası 97 bültende tek satır yok; pamuk adlı satırlar lif pamuk).
  // Boş seri kaldırıldı; bültende küspe/pamuk/çiğit adlı yeni bir satır çıkarsa günlükte "eşleşmeyen adlar" satırında görünür.
  // Adana çiğit = pamuk tohumunun kendisi (küspe değil; denetim Y3) → ayrı hammadde
  { ad: "Çiğit (pamuk tohumu)", borsa: "Adana", satir: /^Çiğit/, not: "en düşük–en yüksek ortası" },
  { ad: "Buğday kepeği", borsa: "Gaziantep", re: /^KEPEK \(BUĞDAY\)$/ },
];
const sayi = (x) => parseFloat(String(x ?? "").replace(/\./g, "").replace(",", "."));
const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
// İstek: süre sınırlı (ISTEK_SN ve aşamanın kalan süresi); HTTP hatasında 3, zaman aşımı/bağlantı hatasında 2 deneme, sonra sunucu "yanıt vermiyor" sayılır
async function getir(url, json) {
  for (let i = 0; ; i++) {
    const ms = istekSuresi(url);
    try {
      const r = await fetch(url, { headers: { ...UA, Accept: json ? "application/json" : "text/html" }, signal: AbortSignal.timeout(ms) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return json ? await r.json() : await r.text();
    } catch (e) {
      const ag = agHatasi(e);
      if (i >= (ag ? 1 : 2)) { if (ag) olu.add(new URL(url).host); throw e; }
      await bekle(1500 * (i + 1));
    }
  }
}
const metin = (h) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
// Gaziantep: [{ad, ort, miktar, sekil}] — bültenin kendi tarihi istenen gün değilse (henüz yayımlanmadı / tatil) boş döner.
export function gaziantepSatirlar(html, gun) {
  const m = metin(html).match(/(\d{2})\.(\d{2})\.(\d{4}) ?- ?Günlük Bülten/);
  if (!m || `${m[3]}-${m[2]}-${m[1]}` !== gun) return [];
  const out = [];
  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/g) || []) {
    const td = (tr.match(/<td[\s\S]*?<\/td>/g) || []).map(metin);
    if (td.length < 8) continue;
    out.push({ ad: td[0].toLocaleUpperCase("tr-TR"), ort: sayi(td[3]), miktar: sayi(td[4]), birim: td[5], sekil: td[7].split(" ")[0] });
  }
  return out;
}
export function ortalama(satirlar) {
  let t = 0, m = 0;
  for (const x of satirlar) { if (!(x.ort > 0) || !(x.miktar > 0)) continue; t += x.ort * x.miktar; m += x.miktar; }
  return m > 0 ? Math.round((t / m) * 1000) / 1000 : null;
}
// Adana: günlük işlem fiyatları PDF'i (pdftotext -layout) → [{ad, ort}] ; "İşlem gerçekleşmemiştir" satırları atlanır.
export function adanaSatirlar(txt) {
  const out = [];
  for (const l of String(txt || "").split(/\r?\n/)) {
    const t = l.trim(), m = t.match(/^(\S.*?)\s{2,}(\d.*)$/);
    if (!m) continue;
    const v = (m[2].match(/\d{1,3},\d{3}/g) || []).map((x) => parseFloat(x.replace(",", ".")));
    if (v.length) out.push({ ad: m[1].trim(), ort: Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 1000) / 1000, miktar: 1 });
  }
  return out;
}
// Polatlı: BultenGunluk.ashx JSON {Bulten:[{UrunAdi, UrunKodu, OrtFiyat, Miktar, ...}]}; yalnız fiyatı olan alt satırlar.
export function polatliSatirlar(j) {
  return ((j && j.Bulten) || []).map((x) => ({ ad: String(x.UrunAdi || ""), kod: String(x.UrunKodu || ""), ort: sayi(x.OrtFiyat), miktar: sayi(x.Miktar) })).filter((x) => x.ort > 0 && x.miktar > 0);
}
export function urunFiyati(u, K) {
  const L = K && K[u.borsa];
  if (!L) return null;
  // Satış şekli "İTH…" (İTHAL = ithalat gümrük beyanı, İTHGT = aynısının geç tescili) borsadaki satış değildir (denetim 27.11.2026, Y2:
  // 24 bin tonluk tek İTHGT beyanı 159 tonluk gerçek satışı ezdi, soya 29,546 yerine 22,338 göründü).
  if (u.borsa === "Gaziantep") return ortalama(L.filter((x) => u.re.test(x.ad) && !/^İTH/.test(String(x.sekil || "").toLocaleUpperCase("tr-TR")) && (!x.birim || /KG/i.test(x.birim))));
  if (u.borsa === "Konya") return ortalama(L.filter((x) => u.gruplar.includes(x.GrupAdi)).map((x) => ({ ort: sayi(x.OrtFiyat), miktar: sayi(x.Miktar) })));
  if (u.borsa === "Polatlı") return ortalama(L.filter((x) => (u.kod ? u.kod.test(x.kod) : u.isim.test(x.ad))));
  if (u.borsa === "Adana") { const x = L.find((r) => u.satir.test(r.ad)); return x ? x.ort : null; }
  return null;
}
// Aynı tarihe iki kayıt (kontrol 18.11.2026): Yahoo gece seansının anlık fiyatını bir önceki günün tarihiyle ikinci kez veriyor
// ([18.11 kapanış], [18.11 gece seansı]). İkincisi ertesi günün henüz bitmemiş fiyatıdır; ilki (kapanış) tutulur, yoksa "günlük +%2,6" diye sahte hareket çıkıyordu.
// Eski kayıtların düzeltmesi (denetim 27.11.2026, Y2): İTHGT beyanının karıştığı 4 nokta. Betik yalnız son 5 günü yeniden okuduğu için
// kendiliğinden düzelmez; kayıtlı değer hâlâ hatalı rakamsa doğrusu yazılır (null = o gün yalnız beyan vardı, kayıt silinir). Doğrular bültenlerden hesaplandı.
export const BORSA_DUZELTME = [
  ["Soya fasulyesi|Gaziantep", "2026-07-17", 28.61, null],
  ["Ayçiçeği küspesi|Gaziantep", "2026-07-30", 12.071, 14.2],
  ["Ayçiçeği küspesi|Gaziantep", "2026-10-14", 15.396, 16.716],
  ["Soya fasulyesi|Gaziantep", "2026-11-20", 22.338, 29.546],
];
export function borsaDuzelt(urunler) {
  const yapilan = [];
  for (const [k, gun, yanlis, dogru] of BORSA_DUZELTME) {
    const u = (urunler || []).find((x) => x.ad + "|" + x.borsa + (x.tur ? "|" + x.tur : "") === k), i = u ? u.seri.findIndex(([d, v]) => d === gun && v === yanlis) : -1;
    if (i < 0) continue;
    if (dogru == null) u.seri.splice(i, 1); else u.seri[i] = [gun, dogru];
    yapilan.push(k + " " + gun + ": " + yanlis + " → " + (dogru == null ? "silindi" : dogru));
  }
  return yapilan;
}
export function gunTekil(L) {
  const out = [];
  for (const p of L) if (!out.length || out[out.length - 1][0] !== p[0]) out.push(p);
  return out;
}
// Bitmemiş gün (denetim 27.11.2026, Y1): Yahoo son satırda günün ANLIK fiyatını verir; Chicago'da bu rakam kesinleşen kapanıştan %3–4 farklı
// çıkabiliyor (mısır 179,6 → 173,1) ve gün boyu "Mısır Chicago +%5" diye sahte uyarı üretiyordu. bitmis (şimdiki an, ms) verilirse son günün satırı
// yalnız gün bittiyse alınır: (a) aynı tarihe iki satır varsa ilki kapanıştır (akşam seansı başlamış), alınır; (b) tek satırsa ve tarihi borsanın
// saatine göre bugünse ya da zamanı Yahoo'nun "son işlem anı" (meta.regularMarketTime) ise anlık fiyattır, atılır. Kur için bitmis verilmez (anlık kur istenir).
export function yahooSeri(j, bitmis) {
  const res = j && j.chart && j.chart.result && j.chart.result[0];
  if (!res) throw new Error("yanıt boş");
  const ts = res.timestamp || [], cl = ((res.indicators && res.indicators.quote && res.indicators.quote[0]) || {}).close || [];
  const out = [];
  // Tarih borsanın kendi saat diliminde (denetim K7: kur yaz aylarında Greenwich'e göre bir gün geride, Pazar tarihli kaydediliyordu)
  const tz = (res.meta && res.meta.exchangeTimezoneName) || "UTC";
  const gun = (t) => { try { return new Date(t * 1000).toLocaleDateString("en-CA", { timeZone: tz }); } catch { return new Date(t * 1000).toISOString().slice(0, 10); } };
  ts.forEach((t, k) => { const v = cl[k]; if (v != null && isFinite(v)) out.push([gun(t), v, t]); });
  const tek = gunTekil(out);
  if (bitmis != null && tek.length) {
    const son = tek[tek.length - 1], cift = out.filter((p) => p[0] === son[0]).length > 1, canli = res.meta && +res.meta.regularMarketTime;
    if (!cift && (son[0] >= gun(bitmis / 1000) || (canli > 0 && Math.abs(son[2] - canli) <= 60))) tek.pop();
  }
  return tek.map(([d, v]) => [d, v]);
}
// Chicago serisini önceki kayıtla birleştirir (denetim 27.11.2026, Y1). eskiU: önceki dosyadaki ürün; yeni: Yahoo'dan gelen bitmiş günler (TL/ton); bugun: çalıştırma günü.
// "kesin" = bu kuralla yazılmış son gün. Önceki kayıtta "kesin" yoksa (eski betiğin dosyası: son gün geçici olabilir) Yahoo'nun bitmiş günleri olduğu gibi alınır.
// Varsa, kayıtlı son CBOT_PENCERE günde: Yahoo'nun o yanıtta vermediği gün silinmez (Pazar günleri kapanış satırı boş geliyor); kayıtlı rakamdan %2'den çok
// farklı gelen rakam yazılmaz, günlüğe not düşülür (Pazar günü 20.11 mısır 171,1 → 176,7 olup Pazartesi geri dönmüştü). Aynı yeni rakam (±%0,5)
// CBOT_GUN ayrı günde gelirse kaynağın gerçek düzeltmesi sayılıp kabul edilir (yanlış bir rakam sonsuza dek kilitlenmesin).
export const CBOT_SAPMA = 0.02, CBOT_GUN = 3, CBOT_PENCERE = 10;
export function chicagoBirlestir(eskiU, yeni, bugun) {
  if (!eskiU || !eskiU.kesin || !Array.isArray(eskiU.seri)) return { seri: yeni, bekleyen: null, not: [], ilk: true };
  const E = eskiU.seri.filter(([d]) => d <= eskiU.kesin).slice(-CBOT_PENCERE), M = new Map(yeni), bek = {}, not = [];
  for (const [d, e] of E) {
    const y = M.get(d);
    if (y == null) { M.set(d, e); continue; }
    if (!(e > 0) || Math.abs(y / e - 1) <= CBOT_SAPMA) continue;
    const b = eskiU.bekleyen && eskiU.bekleyen[d], ayni = b && b.v > 0 && Math.abs(y / b.v - 1) <= 0.005;
    const gunler = [...new Set([...(ayni ? b.gunler || [] : []), bugun])].sort(), fark = (y / e - 1) * 100;
    if (gunler.length >= CBOT_GUN) { not.push(`${d}: ${e} → ${y} (${CBOT_GUN} ayrı gün aynı rakam geldi; kabul edildi)`); continue; }
    M.set(d, e); bek[d] = { v: y, gunler };
    not.push(`${d}: kesinleşmiş ${e} yerine ${y} geldi (${fark > 0 ? "+" : ""}${fark.toFixed(1)}%); yazılmadı (${gunler.length}/${CBOT_GUN} gün)`);
  }
  return { seri: [...M.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)), bekleyen: Object.keys(bek).length ? bek : null, not, ilk: false };
}
async function seri(sembol, bitmis) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sembol)}?range=2y&interval=1d`;
  let son;
  for (let i = 0; i < 2; i++) {
    try {
      const out = yahooSeri(await getir(url, true), bitmis);
      if (out.length < 20) throw new Error("az veri: " + out.length);
      return out;
    } catch (e) { son = e; if (vazgec(e) || agHatasi(e)) break; await bekle(2000 * (i + 1)); }
  }
  throw son;
}
// Yurt dışı (ABD iç piyasa, haftalık): USDA AMS "National Grain and Oilseed Processor Feedstuff Report" (AMS_3511).
// Ürün başlığının altındaki bölge satırlarından "Average" sütunu; yalnız FOB satırları; $/kısa ton → $/ton.
export const USDA = [
  { ad: "DDGS", baslik: /^Corn Distillers Dried Grain/ },
  { ad: "Mısır gluten yemi (feed)", baslik: /^Corn Gluten Feed Pellets/ },
  { ad: "Mısır gluteni (meal)", baslik: /^Corn Gluten Meal/ },
  { ad: "Ayçiçeği küspesi", baslik: /^Sunflower Meal/ },
  { ad: "Pamuk tohumu küspesi", baslik: /^Cottonseed Meal/ },
  { ad: "Buğday kepeği", baslik: /^Wheat Middlings/, rapor: "3512" },
];
export function usdaOku(txt) {
  const tm = txt.match(/Report for \d{1,2}\/\d{1,2}\/\d{4}\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!tm) return null;
  const tarih = `${tm[3]}-${tm[1].padStart(2, "0")}-${tm[2].padStart(2, "0")}`, sonuc = {};
  let urun = null, kol = -1;
  for (const satir of txt.split(/\r?\n/)) {
    const t = satir.trim();
    if (!t || /National Grain and Oilseed|Market News|Dept\. of Ag|Email us|^Source:|General inquiries|https?:\/\/|^Page \d/.test(t)) continue;
    if (/^\s{25,}\S/.test(satir) && !/\d{2}\.\d{2}/.test(t)) { urun = USDA.find((u) => u.baslik.test(t)) || null; kol = -1; continue; }
    if (/^\s*Region\s+Sale Type/.test(satir)) { kol = satir.indexOf("Average"); continue; }
    if (!urun || kol < 0 || !/\bFOB/.test(satir)) continue;
    const parca = satir.slice(Math.max(0, kol - 4), kol + 9).trim(), v = parseFloat(parca.replace(/,/g, ""));
    if (!(v > 0)) continue;
    (sonuc[urun.ad] = sonuc[urun.ad] || []).push(v);
  }
  const out = {};
  for (const [ad, L] of Object.entries(sonuc)) out[ad] = Math.round((L.reduce((a, b) => a + b, 0) / L.length) * 1.10231131 * 100) / 100;
  return { tarih, fiyat: out };
}
export function cepeaTablo(html) {
  const t = (html.match(/<table[\s\S]*?<\/table>/) || [""])[0], out = [];
  for (const tr of t.match(/<tr[\s\S]*?<\/tr>/g) || []) {
    const td = (tr.match(/<td[\s\S]*?<\/td>/g) || []).map(metin);
    const m = td[0] && td[0].match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m || td.length < 5) continue;
    const usd = sayi(td[4]);
    if (usd > 0) out.push([`${m[3]}-${m[2]}-${m[1]}`, Math.round((usd * 1000) / 60 * 100) / 100]);
  }
  return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
}
// Arjantin tarım bakanlığı (MAGyP) "Cotizaciones Diarias": FOB Arjantin limanları, US$/ton.
// Ürün başlığından sonraki "DEL DIA" satırı: [etiket, liman, kamara $/t, tohum FOB, emb., yağ, yan ürün (küspe), ...]
const AYLAR_ES = { ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06", jul: "07", ago: "08", sep: "09", set: "09", oct: "10", nov: "11", dic: "12" };
export function magypFob(html) {
  const out = {};
  let urun = null;
  for (const tr of String(html).match(/<tr[\s\S]*?<\/tr>/gi) || []) {
    const td = (tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || []).map(metin);
    const dm = td.length === 1 && td[0].match(/^(\d{2})-([a-z]{3})-(\d{2})$/i);
    if (dm && AYLAR_ES[dm[2].toLowerCase()]) { out.tarih = `20${dm[3]}-${AYLAR_ES[dm[2].toLowerCase()]}-${dm[1]}`; continue; }
    if (td.length === 1 && /^[A-ZÁÉÍÓÚÑ ]{3,}$/.test(td[0])) { urun = td[0].trim(); continue; }
    if (urun && td[0] === "DEL DIA" && td.length >= 7) {
      // Sayı yazımı günden güne değişiyor: "1.175,00" (virgül ondalık) ya da "403.00" (nokta ondalık).
      const v = (x) => { const t = String(x || "").trim(); const n = /,/.test(t) ? sayi(t) : /^\d+\.\d{1,2}$/.test(t) ? parseFloat(t) : sayi(t); return n >= 30 && n <= 5000 ? n : null; };
      out[urun] = { tohum: v(td[3]), kuspe: v(td[6]) };
      urun = null;
    }
  }
  return out.tarih ? out : null;
}
// CEPEA sayfasındaki grafik verisi: son 60 iş gününün R$/60 kg değerleri (yeniden eskiye, tarihsiz).
// Tarihler Brezilya iş günlerinden üretilir; sayfadaki tablonun 15 günüyle birebir eşleşmezse kullanılmaz.
const BR_TATIL = new Set(["2026-01-01", "2026-02-16", "2026-02-17", "2026-04-03", "2026-04-21", "2026-05-01", "2026-06-04", "2026-09-07", "2026-10-12", "2026-11-02", "2026-11-20", "2026-12-25",
  "2027-01-01", "2027-02-08", "2027-02-09", "2027-03-26", "2027-04-21", "2027-05-27", "2027-09-07", "2027-10-12", "2027-11-02", "2027-11-15", "2027-11-20", "2027-12-25"]);
export function cepeaGecmis(html) {
  const m = String(html).match(/valor_array\[0\]\s*=\s*\[([^\]]+)\]/);
  if (!m) return null;
  const R = m[1].split(",").map((x) => parseFloat(x)).filter((x) => x > 0);
  const t = (String(html).match(/<table[\s\S]*?<\/table>/) || [""])[0], tab = [];
  for (const tr of t.match(/<tr[\s\S]*?<\/tr>/g) || []) {
    const td = (tr.match(/<td[\s\S]*?<\/td>/g) || []).map(metin), dm = td[0] && td[0].match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dm && td.length >= 2) tab.push([`${dm[3]}-${dm[2]}-${dm[1]}`, sayi(td[1])]);
  }
  if (tab.length < 5 || !R.length) return null;
  const gunler = []; let d = tab[0][0];
  while (gunler.length < R.length) {
    const g = new Date(d + "T00:00:00Z").getUTCDay();
    if (g !== 0 && g !== 6 && !BR_TATIL.has(d)) gunler.push(d);
    const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() - 1); d = x.toISOString().slice(0, 10);
  }
  for (let i = 0; i < tab.length && i < R.length; i++) if (tab[i][0] !== gunler[i] || Math.abs(tab[i][1] - R[i]) > 0.005) return null;
  return gunler.map((g, i) => [g, R[i]]).reverse();
}
// Ham PDF/ikili dosya: süre sınırlı; 404 → null
async function getirIkili(url) {
  const ms = istekSuresi(url);
  let r;
  try { r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms) }); } catch (e) { if (agHatasi(e)) olu.add(new URL(url).host); throw e; }
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("HTTP " + r.status);
  return Buffer.from(await r.arrayBuffer());
}
// Sayfa dosyası: her seri son SAYFA_GUN güne kısaltılır
export function sayfaKes(v, bugunG) {
  const s = new Date(Date.parse(bugunG + "T00:00:00Z") - SAYFA_GUN * 864e5).toISOString().slice(0, 10);
  const k = (L) => (Array.isArray(L) ? L.filter(([d]) => d >= s) : L);
  return { ...v, usdtry: k(v.usdtry), urunler: (v.urunler || []).map((u) => ({ ...u, seri: k(u.seri) })),
    ...(v.yurtici ? { yurtici: { ...v.yurtici, urunler: v.yurtici.urunler.map((u) => ({ ...u, seri: k(u.seri) })) } } : {}),
    ...(v.motorin ? { motorin: { ...v.motorin, seri: k(v.motorin.seri) } } : {}) };
}
// "gorulme" (kontrol 18.11.2026): her serinin SON fiyatının bu betikçe ilk görüldüğü an (ISO, dakika). Fiyat uyarıları (fiyat.js fpDikkat) buna bakar:
// bülteni ertesi gün gelen Gaziantep fiyatı ya da 2 hafta gecikmeli yayımlanan FAO haftalık fiyatı, tarihi eski olsa da geldiği gün "yeni" sayılır.
// Son tarih değişmediyse eski damga korunur (aynı günün fiyatı düzeltilse de yeniden uyarmaz); önceki dosyada damga yoksa uydurulmaz (bilinmiyor).
export function gorulmeIsle(yeni, eski, simdi) {
  if (!eski) return yeni; // ilk dosya: hiçbir fiyat "yeni geldi" sayılmaz
  const kd = (u) => u.ad + "|" + (u.sembol || "") + "|" + (u.merkez || ""), ky = (u) => u.ad + "|" + u.borsa + (u.tur ? "|" + u.tur : "");
  const son = (u) => (u && Array.isArray(u.seri) && u.seri.length ? u.seri[u.seri.length - 1][0] : "");
  const isle = (L, E, k) => {
    const M = new Map((E || []).map((u) => [k(u), u]));
    for (const u of L || []) {
      const o = M.get(k(u)), d = son(u);
      delete u.gorulme;
      if (!d) continue;
      if (o && son(o) >= d) { if (o.gorulme) u.gorulme = o.gorulme; } else u.gorulme = simdi;
    }
  };
  isle(yeni.urunler, eski.urunler, kd);
  if (yeni.yurtici) isle(yeni.yurtici.urunler, eski.yurtici && eski.yurtici.urunler, ky);
  return yeni;
}
// Veri aynı mı: aynıysa dosyalar yazılmaz (gecede birkaç çalıştırma boş kayıt üretmesin). "guncel" saati ve kaynak çekim saatleri sayılmaz;
// kur ve kurla TL'ye çevrilen dünya fiyatlarında binde 1,5'e kadar oynama (kurun dakikalık kıpırtısı) değişiklik sayılmaz; borsa ve motorin birebir karşılaştırılır.
export function veriAyni(a, b, tol = 0.0015) {
  if (!a || !b) return false;
  const es = (x, y, t) => {
    if (typeof x === "number" && typeof y === "number") return x === y || (t > 0 && Math.abs(x - y) <= t * Math.max(Math.abs(x), Math.abs(y)));
    if (Array.isArray(x) || Array.isArray(y)) return Array.isArray(x) && Array.isArray(y) && x.length === y.length && x.every((v, i) => es(v, y[i], t));
    if (x && y && typeof x === "object" && typeof y === "object") { for (const q of new Set([...Object.keys(x), ...Object.keys(y)])) if (!es(x[q], y[q], t)) return false; return true; }
    return x === y;
  };
  for (const q of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (q === "guncel" || q === "cekim") continue;
    if (!es(a[q], b[q], q === "usdtry" || q === "urunler" ? tol : 0)) return false;
  }
  return true;
}
// Motorin (nakliye hesabı için): Opet il fiyatları (Mersin, il kodu 33), yedek Petrol Ofisi. TL/L, KDV dahil pompa fiyatı.
export function motorinBul(veri) {
  // Opet: [{districtName, prices:[{productName, amount}]}] — Akdeniz ilçesi önce, "Motorin" adlı ürünlerin en düşüğü (EcoForce/UltraForce)
  const L = Array.isArray(veri) ? veri : (veri && (veri.data || veri.result || veri.items)) || [];
  const ilce = (x) => String(x.districtName || x.ilceAdi || x.name || "").toLocaleUpperCase("tr");
  const sirali = [...L].sort((a, b) => (/AKDENİZ|AKDENIZ/.test(ilce(b)) ? 1 : 0) - (/AKDENİZ|AKDENIZ/.test(ilce(a)) ? 1 : 0));
  for (const d of sirali) {
    const P = (d.prices || d.fiyatlar || []).filter((p) => /motorin/i.test(String(p.productName || p.urunAdi || p.name || "")) && !/kırsal|kirsal|gaz/i.test(String(p.productName || "")));
    const v = P.map((p) => +(p.amount ?? p.price ?? p.fiyat)).filter((x) => x > 10 && x < 500);
    if (v.length) return { tl: Math.min(...v), ilce: ilce(d) || "MERSİN" };
  }
  return null;
}
// Petrol Ofisi yedek okuması (kontrol 18.11.2026: eski okuma "MERSİN'den sonraki ikinci rakam motorindir" diye varsayıyor, hücrede
// KDV dahil + KDV hariç iki rakam olunca benzinin KDV hariç fiyatını (60,84) motorin sanıyordu). Artık tahmin yok:
// motorin sütunu tablo başlığından ("Motorin" / "Diesel" / "Dizel"), satır Akdeniz ilçesi ya da Mersin adından, rakam KDV dahil olandan seçilir;
// bunlardan biri açıkça bulunamazsa null döner (önceki değer korunur).
const fiyatSayilari = (t) => (String(t).match(/\d{2,3}[.,]\d{1,2}/g) || []).map((x) => +x.replace(",", ".")).filter((x) => x > 10 && x < 500);
export function pompaFiyati(hucre) {
  const h = String(hucre), dahil = h.match(/<[^>]*class\s*=\s*["'][^"']*\bwith-tax\b[^"']*["'][^>]*>([^<]*)</i);
  if (dahil) { const v = fiyatSayilari(dahil[1]); if (v.length === 1) return v[0]; }
  const v = fiyatSayilari(metin(h));
  if (v.length === 1) return v[0];
  // iki rakam: KDV dahil ve hariç (oran 1,01–1,30 arası olmalı) → büyük olan pompa fiyatıdır
  if (v.length === 2) { const b = Math.max(...v), k = Math.min(...v); if (b / k > 1.005 && b / k < 1.31) return b; }
  return null;
}
export function motorinHtml(html) {
  const H = String(html), DZ = /motor[iİı]n|d[iİı]esel|d[iİı]zel/i, DEGIL = /k[ıi]rsal|gaz|kalorifer|fuel|benz[iİ]n|kurşunsuz/i;
  const baslikMi = (c) => { const t = metin(c); return DZ.test(t) && !DEGIL.test(t) && !fiyatSayilari(t).length; };
  for (const tablo of H.match(/<table[\s\S]*?<\/table>/gi) || [H]) {
    const R = (tablo.match(/<tr[\s\S]*?<\/tr>/gi) || []).map((tr) => ({ tr, h: tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || [] }));
    const bi = R.findIndex((r) => r.h.some(baslikMi));
    if (bi < 0) continue;
    const kol = R[bi].h.findIndex(baslikMi), veri = R.slice(bi + 1).filter((r) => r.h.length > kol && kol > 0);
    const ad = (r) => (metin(r.h[0]) + " " + ((r.tr.match(/data-[a-z-]*name\s*=\s*["']([^"']+)/i) || [])[1] || "")).toLocaleUpperCase("tr");
    const oku = (r) => (r ? pompaFiyati(r.h[kol]) : null);
    const ak = oku(veri.find((r) => /AKDEN[İI]Z/.test(ad(r)))), ms = oku(veri.find((r) => /MERS[İI]N/.test(ad(r))));
    if (ak) return { tl: ak, ilce: "AKDENİZ" };
    if (ms) return { tl: ms, ilce: "MERSİN" };
    // il sayfası (başlıkta Mersin yazıyor, satırlar ilçe): ilçelerin ortancası
    if (/<(title|h1|h2)[^>]*>[^<]*mers[iİ]n/i.test(H)) { const v = veri.map(oku).filter((x) => x > 0).sort((a, b) => a - b); if (v.length) return { tl: v[Math.floor(v.length / 2)], ilce: "il ortancası" }; }
  }
  return null;
}
// Motorin akıl süzgeci (kontrol 18.11.2026: yedek kaynak 97,20 yerine 60,84 yazdı; Sipariş'teki tahmini nakliye bununla hesaplanıyor).
// Yeni okuma son kabul edilen değerden %15'ten çok farklıysa tek başına kabul edilmez: ya ikinci kaynak aynı rakamı (±%5) vermeli
// ya da aynı rakam (±%3) 3 ayrı gün üst üste gelmeli. O zamana kadar önceki değer korunur, "kaynak" alanına not düşülür.
export const MOT_SAPMA = 0.15, MOT_GUN = 3;
export function motorinKarar(eM, okumalar, bugun) {
  const son = eM && eM.tl > 0 ? eM.tl : null, yakin = (a, b, o) => Math.abs(a / b - 1) <= o;
  if (!okumalar.length) return { kabul: null, bekleyen: (eM && eM.bekleyen) || null, neden: "kaynak yok" };
  if (son == null) return { kabul: okumalar[0], bekleyen: null, neden: "ilk değer" };
  const uygun = okumalar.find((o) => yakin(o.tl, son, MOT_SAPMA));
  if (uygun) return { kabul: uygun, bekleyen: null, neden: "olağan" };
  const a = okumalar[0], teyit = okumalar.find((o) => o.kaynak !== a.kaynak && yakin(o.tl, a.tl, 0.05));
  if (teyit) return { kabul: a, bekleyen: null, neden: "iki kaynak aynı rakamı verdi (" + a.kaynak + ", " + teyit.kaynak + ")" };
  const b = eM.bekleyen && eM.bekleyen.tl > 0 && yakin(a.tl, eM.bekleyen.tl, 0.03) ? eM.bekleyen : null;
  const gunler = [...new Set([...((b && b.gunler) || []), bugun])].sort();
  if (gunler.length >= MOT_GUN) return { kabul: a, bekleyen: null, neden: MOT_GUN + " gün üst üste aynı rakam" };
  return { kabul: null, bekleyen: { tl: a.tl, kaynak: a.kaynak, gunler }, neden: "teyitsiz" };
}
// Eski kayıtların temizliği (bir kez; sonra "surum: 2"): önceki kabul edilmiş değerden %15'ten çok sapan ve 3 gün üst üste sürmeyen nokta
// okuma hatasıdır. Aradaki nokta önceki değerle değiştirilir, sondaki (henüz teyit edilememiş) nokta atılır.
export function motorinTemizle(seri) {
  const s = (seri || []).map(([d, v]) => [d, v]), out = [], duz = [];
  let ref = null;
  for (let i = 0; i < s.length; i++) {
    const [d, v] = s[i];
    if (ref == null || Math.abs(v / ref - 1) <= MOT_SAPMA) { ref = v; out.push([d, v]); continue; }
    const sur = s.slice(i, i + MOT_GUN);
    if (sur.length === MOT_GUN && sur.every(([, x]) => Math.abs(x / v - 1) <= 0.03)) { ref = v; out.push([d, v]); continue; }
    duz.push(d);
    if (s.slice(i + 1).some(([, x]) => Math.abs(x / ref - 1) <= MOT_SAPMA)) out.push([d, ref]);
  }
  return { seri: out, duzeltilen: duz };
}
// Önceki veri: uzun geçmiş arşivden (yoksa sayfa dosyasından)
const oku = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
const eski = oku(ARSIV) || oku(OUT);
// Haftalık kaynaklar (FAO, USDA) her çalıştırmada değil, son başarılı çekimden 6 saat sonra yeniden çekilir (FIYAT_TAM=1: hepsi; elle çalıştırmada)
const cekimEski = (eski && eski.cekim) || {}, TAM = !!process.env.FIYAT_TAM;
const taze = (ad, saat) => { const t = Date.parse(cekimEski[ad] || ""); return !TAM && isFinite(t) && Date.now() >= t && Date.now() - t < saat * 36e5; };
asama("kur ve Chicago", 90);
let kur;
try { kur = await seri("TRY=X"); } catch (e) { console.error("USD/TRY çekilemedi:", e.message); kur = (eski && eski.usdtry) || null; }
if (!kur) { console.error("Kur yok; dosya değiştirilmedi."); process.exit(1); }
const kurAt = (d) => { let v = null; for (const [t, x] of kur) { if (t <= d) v = x; else break; } return v ?? kur[0][1]; };
const sonuc = { guncel: new Date().toISOString(), kaynak: "CBOT vadeli (Yahoo Finance), FAO GIEWS, CEPEA (Brezilya), Arjantin tarım bakanlığı (FOB) ve USDA AMS haftalık yem raporları × USD/TRY", not: "Uluslararası referans fiyattır; Türkiye fiyatı değildir. Navlun, gümrük, vergi ve kalite farkı içermez; yönü ve değişim hızı için kullanın.", usdtry: kur.map(([d, v]) => [d, Math.round(v * 10000) / 10000]), urunler: [], cekim: { ...cekimEski } };
let basarili = 0;
// Chicago: yalnız bitmiş gün yazılır, kesinleşmiş rakam %2'den çok oynarsa yazılmaz (yahooSeri, chicagoBirlestir). "gorulme" damgası (gorulmeIsle)
// serinin son tarihi ilerleyince vurulduğu için artık rakam kesinleşince vurulur. geriAlinan: eski betiğin yazdığı geçici son gün seriden çıkarsa
// bir önceki günün fiyatı "yeni geldi" sayılıp ikinci kez uyarmasın diye damgası o günün sonuna çekilir.
const geriAlinan = new Map();
for (const u of URUNLER) {
  const o = eski && eski.urunler && eski.urunler.find((x) => x.sembol === u.sembol);
  try {
    const s = await seri(u.sembol, Date.now());
    if (!kur || (eski && kur === eski.usdtry)) throw new Error("güncel kur yok");
    const b = chicagoBirlestir(o, s.map(([d, v]) => [d, Math.round(v * u.carpan * kurAt(d))]), new Date().toISOString().slice(0, 10));
    b.not.forEach((n) => console.error("Chicago", u.ad, n));
    const sonD = b.seri[b.seri.length - 1][0];
    if (b.ilk && o && Array.isArray(o.seri) && o.seri.length && o.seri[o.seri.length - 1][0] > sonD) { geriAlinan.set(u.sembol, sonD + "T23:59Z"); console.log("Chicago", u.ad + ":", o.seri[o.seri.length - 1][0], "geçici fiyatı seriden çıkarıldı (gün bitince yazılacak)"); }
    sonuc.urunler.push({ ad: u.ad, sembol: u.sembol, birim: u.birim, seri: b.seri, kesin: sonD, ...(b.bekleyen ? { bekleyen: b.bekleyen } : {}) });
    basarili++;
  } catch (e) {
    if (o) sonuc.urunler.push({ ...o, eski: true });
    console.error(u.ad, "çekilemedi:", e.message);
  }
}
// USDA haftalık raporları (3511: yağlı tohum/tahıl yan ürünleri, 3512: değirmen yan ürünleri — kepek):
// PDF → pdftotext → ürün fiyatları; önceki haftalar korunur, seri haftalık birikir.
asama("dünya fiyatları", 150);
const usdaSon = {}, usdaAtla = taze("usda", 6);
let usdaTamam = 0;
if (usdaAtla) console.log("USDA: son 6 saat içinde çekildi, atlandı");
else for (const rapor of ["3511", "3512"]) {
  try {
    const buf = await getirIkili(`https://www.ams.usda.gov/mnreports/ams_${rapor}.pdf`);
    if (!buf) throw new Error("HTTP 404");
    const pdf = path.join(os.tmpdir(), `ams_${rapor}.pdf`);
    fs.writeFileSync(pdf, buf);
    const p = spawnSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8" });
    if (p.status !== 0) throw new Error("pdftotext: " + (p.error ? p.error.message : p.stderr));
    const o = usdaOku(p.stdout);
    if (!o || !Object.keys(o.fiyat).length) throw new Error("rapor okunamadı");
    for (const [ad, v] of Object.entries(o.fiyat)) usdaSon[ad] = [o.tarih, v];
    usdaTamam++;
    console.log("USDA", rapor, o.tarih, JSON.stringify(o.fiyat));
  } catch (e) { console.error("USDA", rapor, "çekilemedi:", e.message); }
}
for (const u of USDA) {
  const eskiU = eski && eski.urunler && eski.urunler.find((x) => x.sembol === "USDA" && x.ad === u.ad), yeni = usdaSon[u.ad];
  const seri = ((eskiU && eskiU.seri) || []).filter(([d]) => !yeni || d !== yeni[0]);
  if (yeni) seri.push([yeni[0], Math.round(yeni[1] * kurAt(yeni[0]))]);
  seri.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  if (seri.length) sonuc.urunler.push({ ad: u.ad, sembol: "USDA", birim: "ABD iç piyasa (USDA AMS haftalık, FOB bölge ortalaması) $/kısa ton → USD/ton", seri: seri.filter(([d]) => d >= new Date(Date.now() - SAKLA_GUN * 864e5).toISOString().slice(0, 10)), ...(yeni || (usdaAtla && !(eskiU && eskiU.eski)) ? {} : { eski: true }) });
}
if (Object.keys(usdaSon).length) basarili++;
if (usdaTamam === 2) sonuc.cekim.usda = sonuc.guncel;
// FAO GIEWS FPMA uluslararası ihracat fiyatları (USD/ton; haftalık varsa haftalık, yoksa aylık; geçmiş dahil).
export const FAO = [
  { ad: "Arpa", merkez: "Karadeniz FOB (FAO/IGC, aylık)", uuid: "1d723a09-4225-49ee-b629-2f23a7ce7fc4" },
  { ad: "Arpa", merkez: "Fransa yemlik (FAO, aylık)", uuid: "aa0ee75e-441a-4a04-b762-24b2c2dccaaf" },
  { ad: "Mısır", merkez: "Ukrayna FOB (FAO)", uuid: "e49cb11d-3366-4d90-863b-f1a65fe78f09" },
  { ad: "Mısır", merkez: "Arjantin FOB (FAO)", uuid: "3fefffb8-a60a-43f6-9f70-b71479f44a04" },
  { ad: "Buğday", merkez: "Ukrayna FOB (FAO)", uuid: "a842f91c-53f9-4952-8afe-a0a684d743d0" },
  { ad: "Buğday", merkez: "Rusya FOB (FAO)", uuid: "9af3d755-75c1-4c9f-9593-3667f1b5bf8c" },
  { ad: "Buğday", merkez: "Fransa Rouen (FAO, aylık)", uuid: "97e58206-6e97-409b-b79d-6b57e642a615" },
  { ad: "Arpa", merkez: "Avustralya yemlik (FAO, aylık)", uuid: "992f1c4d-24ee-461c-aa57-bae353a2b1d5" },
  // Ek ihracat (FOB) fiyatları (kullanıcı sorusu 2026-11-14: "Ukrayna FOB varken diğer ülkelerde neden yok"). FAO GIEWS uluslararası fiyatları.
  { ad: "Mısır", merkez: "ABD Körfez FOB (FAO/USDA)", uuid: "5db69fc0-1005-440b-9e6c-065d1acec33e" },
  { ad: "Mısır", merkez: "Brezilya Paranaguá FOB (FAO/IGC, aylık)", uuid: "d471f6ae-21d2-4c05-a910-55f042fdebf1" },
  { ad: "Buğday", merkez: "Rusya FOB 12,5% (FAO/IGC, aylık)", uuid: "48593df4-3ed7-4f22-949d-1e7fa80db090" },
  { ad: "Buğday", merkez: "ABD Körfez FOB SRW (FAO/USDA)", uuid: "62dc04d8-35cc-4a5b-b58f-4f50a998681b" },
  { ad: "Buğday", merkez: "Arjantin FOB (FAO/IGC)", uuid: "e23b83a7-7cf7-40b0-87f7-6c03a2d3b2bc" },
  { ad: "Buğday", merkez: "Avustralya FOB ASW (FAO/IGC, aylık)", uuid: "c030667e-131d-421a-ba94-ab6cf8ffe2ee" },
];
export function faoSeri(j) {
  const dp = ((j && j.datapoints) || []).filter((x) => x && x.date && x.price_value_dollar > 0);
  const h = dp.filter((x) => x.periodicity === "weekly"), L = h.length >= 4 ? h : dp.filter((x) => x.periodicity === "monthly");
  return L.map((x) => [x.date, x.price_value_dollar]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
}
{
  const sinir = new Date(Date.now() - SAKLA_GUN * 864e5).toISOString().slice(0, 10), faoAtla = taze("fao", 6);
  let faoHata = 0;
  if (faoAtla) console.log("FAO: son 6 saat içinde çekildi, atlandı");
  for (const u of FAO) {
    const o0 = eski && eski.urunler && eski.urunler.find((x) => x.sembol === "FAO" && x.ad === u.ad && x.merkez === u.merkez);
    if (faoAtla && o0) { sonuc.urunler.push({ ...o0 }); continue; }
    try {
      const L = faoSeri(await getir(`https://fpma.fao.org/giews/v4/global/price_module/api/v1/FpmaSeriePrice/${u.uuid}/`, true)).filter(([d]) => d >= sinir);
      if (!L.length) throw new Error("veri yok");
      sonuc.urunler.push({ ad: u.ad, sembol: "FAO", merkez: u.merkez, birim: "USD/ton → TL/ton (o tarihteki kur)", seri: L.map(([d, v]) => [d, Math.round(v * kurAt(d))]) });
      basarili++;
    } catch (e) {
      faoHata++;
      console.error("FAO", u.merkez, "çekilemedi:", e.message);
      if (o0) sonuc.urunler.push({ ...o0, eski: true });
    }
  }
  if (!faoAtla && !faoHata) sonuc.cekim.fao = sonuc.guncel;
}
// Güney Amerika: Brezilya CEPEA Paranaguá limanı soya göstergesi (sayfadaki son ~15 gün, US$/60 kg çuval). Geçmiş günden güne birikir.
// (Brezilya iç piyasa mısırı, Çin ve Kanada iç fiyatları Türkiye'ye gelen malın fiyatını göstermediği için çıkarıldı; denetim F4.)
const GA = [
  { ad: "Soya fasulyesi", merkez: "Brezilya Paranaguá limanı (CEPEA)", url: "https://www.cepea.org.br/br/indicador/soja.aspx" },
];
const birikir = (sembol, ad, merkez, yeni) => {
  const o = eski && eski.urunler && eski.urunler.find((x) => x.sembol === sembol && x.ad === ad && x.merkez === merkez);
  const M = new Map(((o && o.seri) || []).map(([d, v]) => [d, v]));
  for (const [d, v] of yeni) M.set(d, v);
  const sinir = new Date(Date.now() - SAKLA_GUN * 864e5).toISOString().slice(0, 10);
  return [...M.entries()].filter(([d]) => d >= sinir).sort((a, b) => (a[0] < b[0] ? -1 : 1));
};
for (const u of GA) {
  try {
    const html = await getir(u.url, false), L = cepeaTablo(html);
    if (!L.length) throw new Error("tablo okunamadı");
    // Geçmiş azsa grafik verisinden son 60 iş gününü (R$ → US$, Kanada Merkez Bankası günlük kurları) ekle.
    const o0 = eski && eski.urunler && eski.urunler.find((x) => x.sembol === "CEPEA" && x.ad === u.ad);
    if (!o0 || o0.seri.length < 40) {
      const G = cepeaGecmis(html);
      if (G && G.length) {
        const fx = (await getir(`https://www.bankofcanada.ca/valet/observations/FXBRLCAD,FXUSDCAD/json?start_date=${G[0][0]}`, true)).observations
          .map((o) => [o.d, parseFloat(o.FXBRLCAD.v) / parseFloat(o.FXUSDCAD.v)]).filter(([, v]) => v > 0);
        const usdBrl = (d) => { let v = null; for (const [t, x] of fx) { if (t <= d) v = x; else break; } return v; };
        const ek = G.map(([d, r]) => { const k = usdBrl(d); return k ? [d, Math.round((r * k * 1000) / 60 * 100) / 100] : null; }).filter(Boolean);
        const tm = new Set(L.map(([d]) => d));
        for (const p of ek) if (!tm.has(p[0])) L.push(p);
        L.sort((a, b) => (a[0] < b[0] ? -1 : 1));
        console.log("CEPEA", u.ad, "geçmiş:", ek.length, "gün");
      } else console.error("CEPEA", u.ad, "grafik verisi tarihlerle eşleşmedi; geçmiş eklenmedi");
    }
    sonuc.urunler.push({ ad: u.ad, sembol: "CEPEA", merkez: u.merkez, birim: "US$/60 kg → USD/ton → TL/ton", seri: birikir("CEPEA", u.ad, u.merkez, L.map(([d, v]) => [d, Math.round(v * kurAt(d))])) });
    basarili++;
  } catch (e) {
    console.error("CEPEA", u.ad, "çekilemedi:", e.message);
    const o = eski && eski.urunler && eski.urunler.find((x) => x.sembol === "CEPEA" && x.ad === u.ad);
    if (o) sonuc.urunler.push({ ...o, eski: true });
  }
}
// Arjantin FOB (MAGyP): günlük arşiv sayfaları; eksik günler (en çok 120 gün geriye) tamamlanır.
{
  const B = "https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/areas/granos/";
  const AR = [["SOJA", "kuspe", "Soya küspesi"], ["GIRASOL", "kuspe", "Ayçiçeği küspesi"], ["SOJA", "tohum", "Soya fasulyesi"]];
  const merkez = "Arjantin FOB limanları (tarım bakanlığı)";
  const sonGun = {};
  for (const [, , ad] of AR) { const o = eski && eski.urunler && eski.urunler.find((x) => x.sembol === "MAGYP" && x.ad === ad); sonGun[ad] = o && o.seri.length ? o.seri[o.seri.length - 1][0] : ""; }
  const enEski = Object.values(sonGun).sort()[0] || "", sinir = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10);
  const yeni = {}; AR.forEach(([, , ad]) => (yeni[ad] = []));
  let okunan = 0, listeOk = false;
  try {
    const idx = await getir(B, false);
    listeOk = true;
    const linkler = [...new Set((idx.match(/_archivos\/000056_Precios Locales\/000060_[^'"]*?precart(\d{4}-\d{2}-\d{2})\.php/g) || []))]
      .map((l) => [l.match(/precart(\d{4}-\d{2}-\d{2})/)[1], l]).filter(([d]) => d >= sinir && d > enEski).sort();
    const tek = new Map(); for (const [d, l] of linkler) if (!tek.has(d)) tek.set(d, l);
    linkler.length = 0; linkler.push(...tek.entries());
    for (const [d, l] of linkler) {
      if (!vakitVar()) { console.error("MAGyP: süre doldu, kalan günler sonraki çalıştırmada"); break; }
      try {
        const o = magypFob(await getir(B + encodeURI(decodeURI(l)).replace(/,/g, "%2C"), false));
        if (!o) continue;
        okunan++;
        for (const [k, alan, ad] of AR) if (o[k] && o[k][alan]) yeni[ad].push([o.tarih, Math.round(o[k][alan] * kurAt(o.tarih))]);
      } catch (e) { console.error("MAGyP", d, e.message); }
      await bekle(300);
    }
  } catch (e) { console.error("MAGyP arşiv listesi alınamadı:", e.message); }
  for (const [, , ad] of AR) {
    const seri = birikir("MAGYP", ad, merkez, yeni[ad]);
    if (seri.length) sonuc.urunler.push({ ad, sembol: "MAGYP", merkez, birim: "USD/ton → TL/ton", seri, ...(listeOk ? {} : { eski: true }) });
  }
  if (listeOk) basarili++;
  console.log("MAGyP FOB:", okunan, "gün okundu");
}
// Yurt içi: eksik günleri tamamla. Her borsa için ayrı son kontrol günü; yeni eklenen borsa geriye 120 gün doldurulur.
const yEski = (eski && eski.yurtici) || null, anahtar = (u) => u.ad + "|" + u.borsa + (u.tur ? "|" + u.tur : "");
const BORSALAR = ["Gaziantep", "Konya", "Polatlı", "Adana"];
const yi = { kaynak: "Gaziantep, Konya, Polatlı ve Adana ticaret borsaları günlük bültenleri (miktar ağırlıklı ortalama; Adana en düşük–en yüksek ortası)", not: "Borsada tescil edilen gerçek satışların ortalamasıdır; kalite, nem ve nakliye farkı içerir. Az işlem gören ürünlerde fiyat günden güne sıçrayabilir.", birim: "TL/kg",
  kontrolB: Object.assign({}, (yEski && yEski.kontrolB) || {}),
  // tarandi: geriye 120 gün taraması yapılmış seriler (yeni eklenen ya da arama kalıbı değişen seri bir kez geriye doldurulur)
  tarandi: Object.assign({}, (yEski && yEski.tarandi) || Object.fromEntries(((yEski && yEski.urunler) || []).filter((x) => x.seri && x.seri.length).map((x) => [anahtar(x), (yEski.kontrolB && yEski.kontrolB[x.borsa]) || ""]))),
  urunler: YURTICI.map((u) => { const o = yEski && Array.isArray(yEski.urunler) && yEski.urunler.find((x) => anahtar(x) === anahtar(u)); return { ad: u.ad, borsa: u.borsa, ...(u.tur ? { tur: u.tur } : {}), ...(u.not ? { not: u.not } : {}), seri: ((o && o.seri) || []).slice() }; }) };
// Eski hatalı noktalar (İTHGT beyanı) bir kez düzeltilir; artık tanımlı olmayan serilerin (pamuk küspesi) tarama kaydı silinir
{ const dz = borsaDuzelt(yi.urunler); if (dz.length) console.log("Borsa geçmişi düzeltildi:", dz.join("; ")); }
for (const k of Object.keys(yi.tarandi)) if (!YURTICI.some((u) => anahtar(u) === k)) delete yi.tarandi[k];
const bugun = new Date().toISOString().slice(0, 10);
const gunEkle = (d, n) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const basla = {}; BORSALAR.forEach((b) => { basla[b] = yi.kontrolB[b] ? gunEkle(yi.kontrolB[b], -5) : gunEkle(bugun, -120); });
const geriDoldur = new Set(YURTICI.filter((u) => !(anahtar(u) in yi.tarandi)).map((u) => u.borsa));
geriDoldur.forEach((b) => { basla[b] = gunEkle(bugun, -120); console.log(b, ": yeni/değişen seri, geriye 120 gün taranıyor"); });
const say = { Gaziantep: 0, Konya: 0, Polatlı: 0, Adana: 0, hata: 0 };
const hataYaz = (b, gun, e) => { say.hata++; if (say.hata <= 6) console.error(b, gun, e.message); };
async function adanaGetir(gun) {
  const [y, m, d] = gun.split("-"), ad = `${d}${m}${y}.pdf`, sonraki = gunEkle(gun, 5).slice(0, 7).split("-");
  const yollar = [`${y}/${m}/${ad}`]; if (sonraki[1] !== m) yollar.push(`${sonraki[0]}/${sonraki[1]}/${ad}`);
  for (const yol of yollar) {
    const buf = await getirIkili("https://adanatb.org.tr/wp-content/uploads/" + yol);
    if (!buf) continue;
    const f = path.join(os.tmpdir(), "adana_" + ad);
    fs.writeFileSync(f, buf);
    const p = spawnSync("pdftotext", ["-layout", f, "-"], { encoding: "utf8" });
    if (p.status !== 0) throw new Error("pdftotext");
    const t = p.stdout, tm = t.match(/(\d{1,2})\s+([A-ZÇĞİÖŞÜa-zçğıöşü]+)\s+(\d{4})\s*[–-]\s*GÜNLÜK İŞLEM/);
    if (tm && +tm[1] !== +d) return [];
    return adanaSatirlar(t);
  }
  return [];
}
const enErken = BORSALAR.map((b) => basla[b]).sort()[0];
let tamam = true;
// Gaziantep bülteninde hiçbir kalıba uymayan küspe/pamuk adları günlüğe yazılır (pamuk tohumu küspesi serisi boş: bültendeki gerçek yazım görülsün)
const eslesmeyen = new Set();
asama("borsa", Math.max(20, (BASLANGIC + 375e3 - Date.now()) / 1000));
for (let gun = enErken; gun <= bugun; gun = gunEkle(gun, 1)) {
  if (!vakitVar()) { tamam = false; console.error("Yurt içi: süre doldu,", gun, "ve sonrası sonraki çalıştırmada"); break; }
  const hg = new Date(gun + "T00:00:00Z").getUTCDay();
  if (hg === 0 || hg === 6) continue;
  const K = {}, [y, m, d] = gun.split("-");
  if (gun >= basla.Gaziantep) try { K.Gaziantep = gaziantepSatirlar(await getir(GAZIANTEP + gun, false), gun); if (K.Gaziantep.length) say.Gaziantep++; for (const x of K.Gaziantep) if (/KÜSP|PAMUK|ÇİĞİT/.test(x.ad) && !YURTICI.some((u) => u.borsa === "Gaziantep" && u.re.test(x.ad))) eslesmeyen.add(x.ad); } catch (e) { hataYaz("Gaziantep", gun, e); }
  if (gun >= basla.Konya) try { const k = await getir(KONYA + gun, true); if (Array.isArray(k)) { K.Konya = k; if (k.length) say.Konya++; } } catch (e) { hataYaz("Konya", gun, e); }
  if (gun >= basla["Polatlı"]) try { K["Polatlı"] = polatliSatirlar(await getir(POLATLI + `${d}.${m}.${y}`, true)); if (K["Polatlı"].length) say["Polatlı"]++; } catch (e) { hataYaz("Polatlı", gun, e); }
  if (gun >= basla.Adana) try { K.Adana = await adanaGetir(gun); if (K.Adana.length) say.Adana++; } catch (e) { hataYaz("Adana", gun, e); }
  BORSALAR.forEach((b) => { if (K[b] && !geriDoldur.has(b)) yi.kontrolB[b] = gun; });
  YURTICI.forEach((u, i) => {
    if (!K[u.borsa]) return;
    // Boş/başka günün bülteni gelirse o günün önceki fiyatı silinmez (denetim O7); yalnız yeni fiyat varsa yazılır
    const v = urunFiyati(u, K);
    if (v == null) return;
    const s = yi.urunler[i].seri.filter(([dd]) => dd !== gun);
    s.push([gun, v]);
    s.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    yi.urunler[i].seri = s.filter(([dd]) => dd >= gunEkle(bugun, -SAKLA_GUN));
  });
  await bekle(400);
}
// Geriye tarama bittiyse o borsanın serileri "tarandı" sayılır; süre dolduysa sonraki çalıştırma yeniden dener
if (tamam) geriDoldur.forEach((b) => { yi.kontrolB[b] = bugun; YURTICI.filter((u) => u.borsa === b).forEach((u) => { yi.tarandi[anahtar(u)] = bugun; }); });
sonuc.yurtici = yi;
if (BORSALAR.some((b) => say[b])) basarili++;
console.log(`Yurt içi: ${BORSALAR.map((b) => b + " " + say[b] + " gün").join(", ")} okundu; ${say.hata} hata.`);
if (eslesmeyen.size) console.log("Gaziantep bülteninde eşleşmeyen küspe/pamuk adları:", [...eslesmeyen].join(" | "));
asama("motorin", 60);
{
  let eM = (eski && eski.motorin) || null;
  const yuv = (x) => Math.round(x * 100) / 100, trS = (x) => yuv(x).toFixed(2).replace(".", ",");
  // Bir kez (surum 2'den önceki kayıtlar): hatalı okuma noktalarını temizle; son kabul edilen değer temiz seriden alınır
  if (eM && eM.surum !== 2 && Array.isArray(eM.seri) && eM.seri.length) {
    const t = motorinTemizle(eM.seri);
    if (t.duzeltilen.length) {
      console.log("Motorin geçmişi: hatalı okuma noktaları düzeltildi:", t.duzeltilen.join(", "));
      const sonN = t.seri[t.seri.length - 1], sag = t.seri.filter(([d]) => !t.duzeltilen.includes(d)).pop();
      eM = { ...eM, seri: t.seri, duzeltilen: [...new Set([...(eM.duzeltilen || []), ...t.duzeltilen])].slice(-30) };
      if (sonN && !(Math.abs(eM.tl / sonN[1] - 1) <= MOT_SAPMA)) eM = { ...eM, tl: sonN[1], tarih: (sag || sonN)[0], yer: "Mersin", kaynak: "önceki değer (hatalı okuma düzeltildi)" };
    }
  }
  const oku = [];
  try { const o = motorinBul(await getir("https://api.opet.com.tr/api/fuelprices/prices?ProvinceCode=33&IncludeAllProducts=true", true)); if (o) oku.push({ ...o, kaynak: "Opet" }); else console.error("Opet motorin: yanıtta motorin fiyatı bulunamadı"); } catch (e) { console.error("Opet motorin:", e.message); }
  // Yedek kaynak yalnız Opet okunamadıysa ya da Opet'in rakamı son kabul edilenden %15'ten çok farklıysa (teyit için) sorulur
  if (!oku.length || (eM && eM.tl > 0 && Math.abs(oku[0].tl / eM.tl - 1) > MOT_SAPMA)) {
    try { const o = motorinHtml(await getir("https://www.petrolofisi.com.tr/akaryakit-fiyatlari/mersin-akaryakit-fiyatlari", false)); if (o) oku.push({ ...o, kaynak: "Petrol Ofisi" }); else console.error("PO motorin: sayfada motorin sütunu ya da Mersin satırı açıkça bulunamadı (tahmin edilmedi)"); } catch (e) { console.error("PO motorin:", e.message); }
  }
  const k = motorinKarar(eM, oku, bugun), ek = { surum: 2, ...(eM && eM.duzeltilen && eM.duzeltilen.length ? { duzeltilen: eM.duzeltilen } : {}), ...(eM && eM.not ? { not: eM.not } : {}) };
  if (k.kabul) {
    const s = ((eM && eM.seri) || []).filter(([d]) => d !== bugun); s.push([bugun, yuv(k.kabul.tl)]);
    if (ek.duzeltilen) { ek.duzeltilen = ek.duzeltilen.filter((d) => d !== bugun); if (!ek.duzeltilen.length) delete ek.duzeltilen; }
    sonuc.motorin = { tl: yuv(k.kabul.tl), tarih: bugun, yer: "Mersin " + k.kabul.ilce, kaynak: k.kabul.kaynak, seri: s.slice(-400), ...ek };
    console.log(`Motorin: ${sonuc.motorin.tl} TL/L (${k.kabul.kaynak}, ${sonuc.motorin.yer}; ${k.neden})`);
  } else if (eM) {
    const temel = String(eM.kaynak || "").replace(/ ?\((önceki değer|hatalı okuma)[^)]*\)$/, "") || "önceki değer";
    const not = k.bekleyen ? `${k.bekleyen.kaynak} ${trS(k.bekleyen.tl)} TL/L teyit edilmedi` : "kaynaklara ulaşılamadı";
    sonuc.motorin = { tl: eM.tl, tarih: eM.tarih, yer: eM.yer, kaynak: temel === "önceki değer" ? `önceki değer (${not})` : `${temel} (önceki değer; ${not})`, seri: (eM.seri || []).slice(-400), eski: true, ...(k.bekleyen ? { bekleyen: k.bekleyen } : {}), ...ek };
    console.log(k.bekleyen ? `Motorin: ${k.bekleyen.kaynak} ${trS(k.bekleyen.tl)} TL/L son kabul edilen ${trS(eM.tl)} TL/L'den %${Math.round(Math.abs(k.bekleyen.tl / eM.tl - 1) * 100)} farklı ve teyit edilmedi (${k.bekleyen.gunler.length}/${MOT_GUN} gün); önceki değer korundu.` : "Motorin çekilemedi; önceki değer korundu.");
  }
}
if (!basarili) { console.error("Hiç kaynak çekilemedi; dosya değiştirilmedi."); process.exit(1); }
gorulmeIsle(sonuc, eski, sonuc.guncel.slice(0, 16) + "Z");
for (const u of sonuc.urunler) if (geriAlinan.has(u.sembol)) u.gorulme = geriAlinan.get(u.sembol);
const sn = Math.round((Date.now() - BASLANGIC) / 1000), eskiYas = eski ? Date.now() - Date.parse(eski.guncel) : NaN;
// Veri değişmediyse dosyalara dokunulmaz (iş akışı "değişiklik yok" der, kayıt oluşmaz); yine de 20 saatte bir yazılır ki "güncelleme" saati ve sayfadaki "N gündür güncellenmedi" uyarısı doğru kalsın
if (eski && fs.existsSync(OUT) && fs.existsSync(ARSIV) && eskiYas >= 0 && eskiYas < 20 * 36e5 && veriAyni(sonuc, eski)) {
  console.log(`Veri değişmedi: dosyalar yazılmadı (son yazım ${eski.guncel}); ${basarili} kaynak grubu çekildi; ${sn} sn`);
} else {
  fs.writeFileSync(ARSIV, JSON.stringify(sonuc));
  fs.writeFileSync(OUT, JSON.stringify(sayfaKes(sonuc, bugun)));
  console.log(`${path.basename(OUT)} (son ${SAYFA_GUN} gün) ve ${path.basename(ARSIV)} yazıldı: ${basarili} kaynak grubu çekildi, ${sonuc.urunler.filter((u) => u.eski).length} dünya serisi eski kaldı; USD/TRY ${kur.at(-1)[1].toFixed(2)} (${kur.at(-1)[0]}); ${sn} sn`);
}
