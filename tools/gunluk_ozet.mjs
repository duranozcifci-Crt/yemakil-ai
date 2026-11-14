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

// uyarilar.json: ya liste ya da {"yuzde_esik": 2, "uyarilar":[...]} (açıklama alanları "_" ile başlar)
export function ayarOku(yol) {
  try {
    const j = JSON.parse(fs.readFileSync(yol, "utf8"));
    const L = Array.isArray(j) ? j : Array.isArray(j && j.uyarilar) ? j.uyarilar : [];
    const e = j && !Array.isArray(j) && +j.yuzde_esik > 0 ? +j.yuzde_esik : null;
    return { uy: L.filter((x) => x && typeof x === "object" && x.urun), esik: e };
  } catch (e) { return { uy: [], esik: null }; }
}
export const uyarilariOku = (yol) => ayarOku(yol).uy;

let FJ = null;
export function analiz(D, uy = [], opt = {}) { FJ = FJ || fiyatJs(); return FJ.fpDikkat(D, uy, opt); }

const tr = (v, d = 0) => Number(v).toLocaleString("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d });
const tl = (v) => tr(Math.round(v / 100) * 100);
const yz = (v) => v === null || v === undefined || !isFinite(v) ? "—" : Math.abs(v) < 0.05 ? "0%" : (v > 0 ? "+" : "−") + tr(Math.abs(v), 1) + "%";
const gun = (d) => d.slice(8, 10) + "." + d.slice(5, 7);

export function ozet(D, uy = [], opt = {}) {
  const A = analiz(D, uy, opt), K = D.usdtry || [];
  const satir = [];
  satir.push(A.baslik);
  const kurHf = K.length > 5 ? FJ.fpChange(K, 7) : null;
  satir.push(`Borsa günü ${A.son ? gun(A.son) : "—"} · USD/TL ${tr(A.kur, 2)}${kurHf !== null ? ` (1 hf ${yz(kurHf)})` : ""}`);
  if (A.dikkat.length) {
    satir.push("", "**⚠ Dikkat**");
    A.dikkat.forEach((x) => satir.push("- " + x.m));
  }
  satir.push("", "| Ürün | Borsa en ucuz TL/t | 1 hf | İthal Mersin TL/t | Not |", "|---|--:|--:|--:|---|");
  const yok = [];
  for (const r of A.satir) {
    if (!r.ucuz && !r.eski && !r.ithal) { yok.push(r.kisa); continue; }
    const not = [];
    let bor = "—", hf = "";
    if (r.ucuz) {
      bor = `${tr(r.ucuz.tl)} ${r.ucuz.et}`;
      hf = r.ucuz.supheli ? "?" : yz(r.ucuz.hf);
      if (r.ucuz.supheli) not.push("fiyat çok oynuyor");
      else if (r.ucuz.az) not.push("az işlem");
    } else if (r.eski) { bor = `${tr(r.eski.tl)}* ${r.eski.et}`; not.push("son işlem " + gun(r.eski.d)); }
    const it = r.ithal ? tl(r.ithal.mn) + (r.ithal.mx - r.ithal.mn >= 100 ? "–" + tl(r.ithal.mx) : "") : "—";
    satir.push(`| ${r.kisa} | ${bor} | ${hf} | ${it} | ${not.join(", ")} |`);
  }
  satir.push("");
  satir.push(`Uyarı eşiği: bir öncekine göre ±%${tr(opt.esik || FJ.UYE_YUZDE || 2, 1).replace(/,0$/, "")}. Borsa: güncel ve düzgün fiyatların en ucuzu; 1 hf = son 1 haftaya göre. İthal = FOB + navlun + liman, bugünkü kurla; gümrük ve KDV hariç.`);
  const ek = [];
  if (A.disari.length) ek.push("Güncel olmadığı için ithal hesabına katılmayan: " + A.disari.join(", ") + ".");
  if (yok.length) ek.push("Fiyatı olmayan: " + yok.join(", ").replace(/\.$/, "") + ".");
  if (A.eksik.length) ek.push("⚠ uyarilar.json'da bulunamayan ürün: " + A.eksik.join(", ") + ".");
  if (uy.length) ek.push(`Sizin fiyat sınırlarınız: ${uy.length}.`);
  if (ek.length) satir.push(ek.join(" "));
  return satir.join("\n") + "\n";
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const D = JSON.parse(fs.readFileSync(process.argv[2] || "fiyatlar.json", "utf8"));
  const a = ayarOku(process.argv[3] || KOK + "uyarilar.json");
  process.stdout.write(ozet(D, a.uy, a.esik ? { esik: a.esik } : {}));
}
