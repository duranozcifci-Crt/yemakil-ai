// Sabah fiyat bildirimi (kullanıcı isteği 2026-11-14; telefona her sabah zamanlanmış görevle gider, ilk satır bildirim başlığıdır).
// Kurallar fiyat.js'ten AYNEN alınır: bu betik fiyat.js'i (Fiyatlar sayfasının kendi kodu) ayrı bir kum havuzunda yükler ve
// fpDikkat'i çağırır. Donmuş/durmuş kaynak, oynak seri, son işlemde sıçrama, ayda 6'dan az işlem, çiğit adı, dökerli/kırık ayrımı,
// Mersin teslim hesabı ve "Dikkat" maddeleri sayfadakiyle birebir aynıdır; burada yalnız telefona uygun kısa metin yazılır.
// Kullanım: node tools/gunluk_ozet.mjs [fiyatlar.json] [uyarilar.json]  → Markdown metni stdout'a.
// uyarilar.json: kullanıcının fiyat sınırları (biçim dosyanın içinde anlatılıyor); verilmezse depo kökündeki dosya okunur.
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const KOK = fileURLToPath(new URL("..", import.meta.url));

// fiyat.js'i tarayıcı olmadan yükle: sayfanın sağladığı S, f, esc, save yerine sade karşılıkları (navlun varsayılan değerlerde).
export function fiyatJs(yol = KOK + "fiyat.js") {
  const sb = { console, S: { feeds: [], ph: {}, navlun: {}, teklif: [], uyari: [] }, save() {}, confirm: () => true, alert() {} };
  sb.window = sb;
  sb.esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  sb.f = (v, d) => { if (d === undefined) d = 2; return Number(v).toLocaleString("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d }); };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(yol, "utf8"), sb, { filename: "fiyat.js" });
  if (typeof sb.fpDikkat !== "function") throw new Error("fiyat.js içinde fpDikkat yok");
  return sb;
}

// uyarilar.json: ya liste ya da {"yuzde_esik": 2, "uyarilar":[...], "bildirim": {"gunler":[2,3,4,5,6], "saat":"08:06"}} (açıklama alanları "_" ile başlar).
// Dosya yoksa, bozuksa ya da içinde okunamayan bir şey varsa SESSİZCE geçilmez: "hata" metni bildirimde görünür (kontrol 18.11.2026).
export function ayarOku(yol) {
  const bos = (hata) => ({ uy: [], esik: null, bildirim: null, hata });
  let t, j;
  try { t = fs.readFileSync(yol, "utf8"); } catch (e) { return bos("fiyat sınırları dosyası (uyarilar.json) bulunamadı; sınırlarınız bu bildirimde denetlenmedi"); }
  try { j = JSON.parse(t); } catch (e) { return bos("fiyat sınırları dosyası (uyarilar.json) bozuk, okunamadı; sınırlarınız bu bildirimde denetlenmedi"); }
  const hata = [];
  const L0 = Array.isArray(j) ? j : j && Array.isArray(j.uyarilar) ? j.uyarilar : null;
  if (!L0) hata.push("uyarilar.json içinde \"uyarilar\" listesi yok; sınırlarınız denetlenmedi");
  const L = (L0 || []).filter((x) => x && typeof x === "object" && !Array.isArray(x));
  if (L0 && L.length !== L0.length) hata.push(`uyarilar.json'da ${L0.length - L.length} satır okunamadı (biçimi yanlış)`);
  let esik = null;
  if (j && !Array.isArray(j) && j.yuzde_esik != null) {
    const v = typeof j.yuzde_esik === "number" ? j.yuzde_esik : parseFloat(String(j.yuzde_esik).replace("%", "").replace(",", "."));
    if (v > 0 && v < 100) esik = v; else hata.push("uyarilar.json'daki yuzde_esik okunamadı; %2 kullanıldı");
  }
  const b = j && !Array.isArray(j) && j.bildirim && typeof j.bildirim === "object" ? j.bildirim : null;
  const bildirim = b && Array.isArray(b.gunler) && b.gunler.length && /^\d{1,2}:\d{2}$/.test(String(b.saat || "")) ? { gunler: b.gunler.map(Number), saat: String(b.saat) } : null;
  return { uy: L, esik, bildirim, hata: hata.join("; ") || null };
}
export const uyarilariOku = (yol) => ayarOku(yol).uy;

// Bildirim takvimi (varsayılan Salı–Cumartesi 08:06, Türkiye saati = UTC+3; uyarilar.json "bildirim" ile değiştirilir).
// "Son bildirimden beri yeni gelen fiyat" penceresi için bir önceki bildirim anı (sunucuda kayıt tutulmaz, takvimden hesaplanır).
// Salı bildirimi Cumartesi sabahından beri gelenleri kapsar (hafta sonu geç gelen bülten, haftalık FOB fiyatı kaçmasın).
export const BILDIRIM = { gunler: [2, 3, 4, 5, 6], saat: "08:06" };
export function oncekiBildirim(simdi, b) {
  b = b || BILDIRIM;
  const [sa, dk] = String(b.saat).split(":").map(Number), TR = 3 * 36e5, g = new Date(simdi + TR);
  for (let i = 0; i < 15; i++) {
    const d = new Date(Date.UTC(g.getUTCFullYear(), g.getUTCMonth(), g.getUTCDate() - i, sa, dk)), t = d.getTime() - TR;
    if (b.gunler.includes(d.getUTCDay()) && t <= simdi - 2 * 36e5) return t; // şimdiki bildirimin kendisi sayılmaz (2 saat pay)
  }
  return simdi - 30 * 36e5;
}
// Pencere bir önceki bildirimden 20 dakika önce başlar: tam bildirim saatinde yazılan fiyat iki bildirimin arasında kaybolmasın (nadiren iki kez yazılır).
export const pencereBasi = (simdi, b) => oncekiBildirim(simdi, b) - 20 * 60e3;

let FJ = null;
export function analiz(D, uy = [], opt = {}) { FJ = FJ || fiyatJs(); return FJ.fpDikkat(D, uy, opt); }

const tr = (v, d = 0) => Number(v).toLocaleString("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d });
const tl = (v) => tr(Math.round(v / 100) * 100);
const yz = (v) => v === null || v === undefined || !isFinite(v) ? "—" : Math.abs(v) < 0.05 ? "0%" : (v > 0 ? "+" : "−") + tr(Math.abs(v), 1) + "%";
const gun = (d) => d.slice(8, 10) + "." + d.slice(5, 7);

// Boş ya da eksik dosya (denetim 27.11.2026, D5): içi boş ama geçerli dosyada ("{}") bildirim "Bugün önemli bir değişiklik yok … USD/TL 1,00" diyordu.
// Fiyat serisi, kur ya da güncelleme tarihi yoksa neyin eksik olduğu döner; bildirim o zaman yalnız "veri okunamadı" der.
export function veriSorunu(D) {
  if (!D || typeof D !== "object" || Array.isArray(D)) return "dosyanın içi boş ya da biçimi bozuk";
  const dolu = (L) => Array.isArray(L) && L.some((u) => u && Array.isArray(u.seri) && u.seri.length);
  if (!dolu(D.urunler) && !dolu(D.yurtici && D.yurtici.urunler)) return "dosyada hiç fiyat yok";
  if (!Array.isArray(D.usdtry) || !D.usdtry.length || !(D.usdtry[D.usdtry.length - 1][1] > 0)) return "dosyada dolar kuru yok";
  if (!isFinite(Date.parse(D.guncel))) return "dosyanın güncelleme tarihi okunamıyor";
  return null;
}
export const VERI_YOK = (neden) => `⚠ Fiyat verisi okunamadı\nFiyat dosyası (fiyatlar.json) eksik ya da bozuk: ${neden}. Bugün fiyat özeti çıkarılamadı; "değişiklik yok" anlamına gelmez.\n`;

export function ozet(D, uy = [], opt = {}) {
  const vs = veriSorunu(D);
  if (vs) return VERI_YOK(vs);
  const simdi = opt.simdi != null ? +opt.simdi : Date.now();
  const o2 = { ...opt, simdi, yeniden: opt.yeniden != null ? +opt.yeniden : pencereBasi(simdi, opt.bildirim) };
  const A = analiz(D, uy, o2), K = D.usdtry || [];
  const satir = [];
  satir.push(A.baslik);
  const kurHf = K.length > 5 ? FJ.fpChange(K, 7) : null;
  // kur bayatsa (son kur 4 günden eski; denetim 27.11.2026, O2) tarihi satırda yazar; ayrıntısı "Dikkat" maddesinde (fiyat.js fpDikkat)
  satir.push(`Borsa günü ${A.son ? gun(A.son) : "—"} · USD/TL ${tr(A.kur, 2)}${A.kurYas > 4 && A.kurD ? ` (${gun(A.kurD)} kuru, ESKİ)` : kurHf !== null ? ` (1 hf ${yz(kurHf)})` : ""}`);
  const ayar = [];
  if (opt.hata) ayar.push("⚠ " + opt.hata[0].toLocaleUpperCase("tr") + opt.hata.slice(1) + ".");
  if (A.sorun.length) ayar.push("⚠ Fiyat sınırlarında (uyarilar.json) çalışmayan satır: " + A.sorun.join("; ") + ".");
  if (A.dikkat.length || ayar.length) {
    satir.push("", "**⚠ Dikkat**");
    A.dikkat.forEach((x) => satir.push("- " + x.m));
    ayar.forEach((x) => satir.push("- " + x));
  }
  satir.push("", "| Ürün | Borsa en ucuz TL/t | 1 hf | İthal Mersin TL/t | Not |", "|---|--:|--:|--:|---|");
  const yok = [];
  for (const r of A.satir) {
    // borsa ve ithal (FOB) kaynağı hiç tanımlı olmayan hammadde (pamuk tohumu küspesi; denetim O3) her sabah "fiyatı olmayan" diye yazılmaz
    if (!r.ucuz && !r.eski && !r.ithal && r.kaynak === false) continue;
    if (!r.ucuz && !r.eski && !r.ithal) { yok.push(r.kisa + (r.diger ? ` (yalnız ${r.diger})` : "")); continue; }
    const not = [];
    let bor = "—", hf = "";
    if (r.ucuz) {
      // fiyat son borsa gününün değilse tarihi yazılır (denetim 27.11.2026, O4: bir haftalık Gaziantep fiyatı bugünkü gibi görünüyordu)
      const fd = r.ucuz.x && r.ucuz.x.b && r.ucuz.x.b.l[0];
      bor = `${tr(r.ucuz.tl)} ${r.ucuz.et}${fd && A.son && fd !== A.son ? ", " + gun(fd) : ""}`;
      hf = r.ucuz.supheli ? "?" : yz(r.ucuz.hf);
      if (r.ucuz.supheli) not.push(r.ucuz.x && r.ucuz.x.b ? FJ.fpSupNeden(r.ucuz.x.b) : "fiyat çok oynuyor");
      else if (r.ucuz.az) not.push("az işlem");
      if (r.ucuz.ayni) not.push(`fiyat ${r.ucuz.ayni} gündür aynı (kote fiyat olabilir)`);
    } else if (r.eski) { bor = `${tr(r.eski.tl)}* ${r.eski.et}`; not.push("son işlem " + gun(r.eski.d)); }
    const it = r.ithal ? tl(r.ithal.mn) + (r.ithal.mx - r.ithal.mn >= 100 ? "–" + tl(r.ithal.mx) : "") : "—";
    if (r.ithal) not.push(r.ithal.et + (r.ithal.yalnizAylik ? " (yalnız aylık ortalama; haftalık kaynaklar eski)" : ""));
    satir.push(`| ${r.kisa} | ${bor} | ${hf} | ${it} | ${not.join(", ")} |`);
  }
  satir.push("");
  satir.push(`Uyarı eşiği: bir öncekine göre ±%${tr(opt.esik || FJ.UYE_YUZDE || 2, 1).replace(/,0$/, "")}. Borsa: güncel ve düzgün fiyatların en ucuzu; 1 hf = son 1 haftaya göre. İthal = FOB + navlun + liman, bugünkü kurla; gümrük ve KDV hariç. Borsa fiyatının yanında tarih varsa (örnek "Gaziantep, 20.11") fiyat o günündür; yoksa son borsa günündendir. Not'taki "FOB 30.10" ithal hesabının dayandığı FOB fiyatının tarihidir ("Ekim ort." = aylık ortalama): tarih eskiyse ithal rakamı da eskidir.`);
  const ek = [];
  if (A.disariAd.length) ek.push("Güncel olmadığı için ithal hesabına katılmayan: " + A.disariAd.join("; ") + ".");
  if (yok.length) ek.push("Fiyatı olmayan: " + yok.join(", ") + " — borsada işlem ve ithal (FOB) fiyatı yok.");
  if (uy.length) ek.push(`Sizin fiyat sınırlarınız: ${uy.length}${A.sorun.length ? ` (${A.sorun.length} tanesi çalışmıyor, yukarıda)` : ""}.`);
  if (ek.length) satir.push(ek.join(" "));
  return satir.join("\n") + "\n";
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  // Kullanım: node tools/gunluk_ozet.mjs [fiyatlar.json] [uyarilar.json] [--simdi=2026-11-19T05:06:00Z] [--onceki=2026-11-18T05:06:00Z]
  const arg = process.argv.slice(2), yol = arg.filter((a) => !a.startsWith("--")), sec = (k) => { const a = arg.find((x) => x.startsWith("--" + k + "=")); return a ? Date.parse(a.split("=")[1]) : NaN; };
  const a = ayarOku(yol[1] || KOK + "uyarilar.json");
  let D;
  try { D = JSON.parse(fs.readFileSync(yol[0] || "fiyatlar.json", "utf8")); } catch (e) { process.stdout.write(VERI_YOK("dosya bulunamadı ya da açılamadı")); process.exit(1); }
  if (veriSorunu(D)) { process.stdout.write(VERI_YOK(veriSorunu(D))); process.exit(1); }
  const opt = {};
  if (a.esik) opt.esik = a.esik;
  if (a.bildirim) opt.bildirim = a.bildirim;
  if (a.hata) opt.hata = a.hata;
  if (isFinite(sec("simdi"))) opt.simdi = sec("simdi");
  if (isFinite(sec("onceki"))) opt.yeniden = sec("onceki");
  process.stdout.write(ozet(D, a.uy, opt));
}
