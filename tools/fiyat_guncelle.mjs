// YemAkıl — piyasa fiyat panosu verisi (GitHub Actions'ta her iş günü çalışır).
// Chicago vadeli (CBOT) fiyatlarını Yahoo Finance'ten çeker, USD/TRY ile TL/ton'a çevirir,
// Yurt içi hammadde fiyatlarını Gaziantep ve Konya ticaret borsalarının günlük bültenlerinden ekler,
// son ~6 ayın günlük serisini fiyatlar.json'a yazar. Bir ürün çekilemezse önceki verisi korunur.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const OUT = process.env.FIYAT_OUT || process.argv[2] || "fiyatlar.json";
const URUNLER = [
  { ad: "Mısır", sembol: "ZC=F", carpan: 0.39368, birim: "sent/bushel → USD/ton (25,40 kg/bushel)" },
  { ad: "Buğday", sembol: "ZW=F", carpan: 0.36744, birim: "sent/bushel → USD/ton (27,22 kg/bushel)" },
  { ad: "Soya küspesi", sembol: "ZM=F", carpan: 1.10231131, birim: "USD/kısa ton → USD/ton" },
  { ad: "Soya yağı", sembol: "ZL=F", carpan: 22.0462262, birim: "sent/libre → USD/ton" },
  { ad: "Soya fasulyesi", sembol: "ZS=F", carpan: 0.36744, birim: "sent/bushel → USD/ton (27,22 kg/bushel)" },
  { ad: "Yulaf", sembol: "ZO=F", carpan: 0.68894, birim: "sent/bushel → USD/ton (14,52 kg/bushel)" },
];
// Yurt içi: Gaziantep Ticaret Borsası günlük bülteni (HTML) ve Konya Ticaret Borsası (JSON).
// Her gün için ürün satırlarının miktar ağırlıklı ortalaması (TL/kg); "İTHAL" satış şekli (gümrük beyanı) hariç.
const UA = { "User-Agent": "Mozilla/5.0 (YemAkil fiyat panosu)" };
const KONYA = "https://www.ktb.org.tr/api/v1/Alpha.WebPanel/OnlineKullaniciBulten/GetGunlukBulten/";
const GAZIANTEP = "https://www.gtb.org.tr/gunluk-bulten?tarih=";
export const YURTICI = [
  { ad: "Mısır", borsa: "Gaziantep", re: /^MISIR$/ },
  { ad: "Mısır", borsa: "Konya", gruplar: ["Mısır"] },
  { ad: "Arpa", borsa: "Gaziantep", re: /^ARPA$/ },
  { ad: "Arpa", borsa: "Konya", gruplar: ["Arpa"] },
  { ad: "Yemlik buğday", borsa: "Gaziantep", re: /^BUĞDAY ?\(DÖKERLİ\)$|^BUĞDAY KIRIK$/, not: "dökerli + kırık" },
  { ad: "Yemlik buğday", borsa: "Konya", gruplar: ["Diğer Kırmızı Buğday", "Diğer Beyaz Buğday"], not: "düşük vasıflı" },
  { ad: "Soya fasulyesi", borsa: "Gaziantep", re: /^SOYA FASULYES/ },
  { ad: "Soya küspesi", borsa: "Gaziantep", re: /^SOYA KÜSPES/ },
  { ad: "DDGS", borsa: "Gaziantep", re: /DDGS/ },
  { ad: "Mısır gluten yemi (feed)", borsa: "Gaziantep", re: /^MISIR GLUTENİ YEMİ$/ },
  { ad: "Mısır gluteni (meal)", borsa: "Gaziantep", re: /^MISIR GLUTENİ$/ },
  { ad: "Ayçiçeği küspesi", borsa: "Gaziantep", re: /^AYÇİÇE(K|Ğİ) KÜSPES/ },
  { ad: "Pamuk tohumu küspesi", borsa: "Gaziantep", re: /^(PAMUK( TOHUMU)?|ÇİĞİT) KÜSPES/ },
  { ad: "Buğday kepeği", borsa: "Gaziantep", re: /^KEPEK \(BUĞDAY\)$/ },
];
const sayi = (x) => parseFloat(String(x ?? "").replace(/\./g, "").replace(",", "."));
const bekle = (ms) => new Promise((s) => setTimeout(s, ms));
async function getir(url, json) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { ...UA, Accept: json ? "application/json" : "text/html" } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return json ? await r.json() : await r.text();
    } catch (e) { if (i === 2) throw e; await bekle(1500 * (i + 1)); }
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
export function urunFiyati(u, gSatir, kSatir) {
  if (u.borsa === "Gaziantep") return ortalama((gSatir || []).filter((x) => u.re.test(x.ad) && x.sekil !== "İTHAL" && (!x.birim || /KG/i.test(x.birim))));
  return ortalama((kSatir || []).filter((x) => u.gruplar.includes(x.GrupAdi)).map((x) => ({ ort: sayi(x.OrtFiyat), miktar: sayi(x.Miktar) })));
}
async function seri(sembol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sembol)}?range=6mo&interval=1d`;
  let son;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (YemAkil fiyat panosu)" } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      const res = j.chart && j.chart.result && j.chart.result[0];
      const ts = res.timestamp || [], cl = (res.indicators.quote[0] || {}).close || [];
      const out = [];
      ts.forEach((t, k) => { const v = cl[k]; if (v != null && isFinite(v)) out.push([new Date(t * 1000).toISOString().slice(0, 10), v]); });
      if (out.length < 20) throw new Error("az veri: " + out.length);
      return out;
    } catch (e) { son = e; await new Promise((s) => setTimeout(s, 2000 * (i + 1))); }
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
const eski = (() => { try { return JSON.parse(fs.readFileSync(OUT, "utf8")); } catch { return null; } })();
let kur;
try { kur = await seri("TRY=X"); } catch (e) { console.error("USD/TRY çekilemedi:", e.message); kur = (eski && eski.usdtry) || null; }
if (!kur) { console.error("Kur yok; dosya değiştirilmedi."); process.exit(1); }
const kurAt = (d) => { let v = null; for (const [t, x] of kur) { if (t <= d) v = x; else break; } return v ?? kur[0][1]; };
const sonuc = { guncel: new Date().toISOString(), kaynak: "CBOT vadeli fiyatları (Yahoo Finance) ve USDA AMS haftalık yem hammaddeleri raporu × USD/TRY", not: "Uluslararası referans fiyattır; Türkiye fiyatı değildir. Navlun, gümrük, vergi ve kalite farkı içermez; yönü ve değişim hızı için kullanın.", usdtry: kur.map(([d, v]) => [d, Math.round(v * 10000) / 10000]), urunler: [] };
let basarili = 0;
for (const u of URUNLER) {
  try {
    const s = await seri(u.sembol);
    if (!kur || (eski && kur === eski.usdtry)) throw new Error("güncel kur yok");
    sonuc.urunler.push({ ad: u.ad, sembol: u.sembol, birim: u.birim, seri: s.map(([d, v]) => [d, Math.round(v * u.carpan * kurAt(d))]) });
    basarili++;
  } catch (e) {
    const o = eski && eski.urunler && eski.urunler.find((x) => x.sembol === u.sembol);
    if (o) sonuc.urunler.push({ ...o, eski: true });
    console.error(u.ad, "çekilemedi:", e.message);
  }
}
// USDA haftalık raporu: PDF → pdftotext → ürün fiyatları; önceki haftalar korunur, seri haftalık birikir.
try {
  const r = await fetch("https://www.ams.usda.gov/mnreports/ams_3511.pdf", { headers: UA });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const pdf = path.join(os.tmpdir(), "ams_3511.pdf");
  fs.writeFileSync(pdf, Buffer.from(await r.arrayBuffer()));
  const p = spawnSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8" });
  if (p.status !== 0) throw new Error("pdftotext: " + (p.error ? p.error.message : p.stderr));
  const o = usdaOku(p.stdout);
  if (!o || !Object.keys(o.fiyat).length) throw new Error("rapor okunamadı");
  for (const u of USDA) {
    const eskiU = eski && eski.urunler && eski.urunler.find((x) => x.sembol === "USDA" && x.ad === u.ad);
    const seri = ((eskiU && eskiU.seri) || []).filter(([d]) => d !== o.tarih);
    if (o.fiyat[u.ad] != null) seri.push([o.tarih, Math.round(o.fiyat[u.ad] * kurAt(o.tarih))]);
    seri.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    if (seri.length) sonuc.urunler.push({ ad: u.ad, sembol: "USDA", birim: "ABD iç piyasa (USDA AMS haftalık, FOB bölge ortalaması) $/kısa ton → USD/ton", seri: seri.slice(-60) });
  }
  basarili++;
  console.log("USDA raporu", o.tarih, JSON.stringify(o.fiyat));
} catch (e) {
  console.error("USDA raporu çekilemedi:", e.message);
  for (const x of (eski && eski.urunler) || []) if (x.sembol === "USDA") sonuc.urunler.push({ ...x, eski: true });
}
// Yurt içi: eksik günleri tamamla (ilk çalışmada geriye 120 gün; sonra son kontrolden 5 gün geriden).
const yEski = (eski && eski.yurtici) || null, anahtar = (u) => u.ad + "|" + u.borsa;
const yi = { kaynak: "Gaziantep ve Konya ticaret borsaları günlük bültenleri (miktar ağırlıklı ortalama)", not: "Borsada tescil edilen gerçek satışların ortalamasıdır; kalite, nem ve nakliye farkı içerir. Az işlem gören ürünlerde fiyat günden güne sıçrayabilir.", birim: "TL/kg", kontrol: yEski && yEski.kontrol,
  urunler: YURTICI.map((u) => { const o = yEski && Array.isArray(yEski.urunler) && yEski.urunler.find((x) => anahtar(x) === anahtar(u)); return { ad: u.ad, borsa: u.borsa, not: u.not, seri: ((o && o.seri) || []).slice() }; }) };
const bugun = new Date().toISOString().slice(0, 10);
const gunEkle = (d, n) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
let gun = yi.kontrol ? gunEkle(yi.kontrol, -5) : gunEkle(bugun, -120);
const say = { Gaziantep: 0, Konya: 0, hata: 0 };
for (; gun <= bugun; gun = gunEkle(gun, 1)) {
  const hg = new Date(gun + "T00:00:00Z").getUTCDay();
  if (hg === 0 || hg === 6) continue;
  let g = null, k = null;
  try { g = gaziantepSatirlar(await getir(GAZIANTEP + gun, false), gun); if (g.length) say.Gaziantep++; } catch (e) { say.hata++; if (say.hata <= 4) console.error("Gaziantep", gun, e.message); }
  try { k = await getir(KONYA + gun, true); if (!Array.isArray(k)) k = null; else if (k.length) say.Konya++; } catch (e) { say.hata++; if (say.hata <= 4) console.error("Konya", gun, e.message); }
  if (g || k) yi.kontrol = gun;
  YURTICI.forEach((u, i) => {
    if ((u.borsa === "Gaziantep" ? g : k) === null) return;
    const v = urunFiyati(u, g, k), s = yi.urunler[i].seri.filter(([d]) => d !== gun);
    if (v != null) s.push([gun, v]);
    s.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    yi.urunler[i].seri = s.filter(([d]) => d >= gunEkle(bugun, -200));
  });
  await bekle(400);
}
sonuc.yurtici = yi;
if (say.Gaziantep || say.Konya) basarili++;
console.log(`Yurt içi: Gaziantep ${say.Gaziantep} gün, Konya ${say.Konya} gün okundu; ${say.hata} hata.`);
if (!basarili) { console.error("Hiç ürün çekilemedi; dosya değiştirilmedi."); process.exit(1); }
fs.writeFileSync(OUT, JSON.stringify(sonuc));
console.log(`fiyatlar.json yazıldı: ${basarili}/${URUNLER.length} ürün, USD/TRY ${kur.at(-1)[1].toFixed(2)} (${kur.at(-1)[0]})`);
