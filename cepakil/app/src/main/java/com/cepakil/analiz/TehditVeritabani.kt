package com.cepakil.analiz

import java.util.Locale

/**
 * Herkese açık, uluslararası tehdit listelerinin telefondaki kopyası.
 *
 * Kaynaklar (günde bir indirilir; bkz. koruma/TehditGuncelleyici; hepsi anahtarsız, herkese açık):
 *  - USOM (Türkiye Ulusal Siber Olaylara Müdahale Merkezi): zararlı ve sahte bağlantılar
 *  - OpenPhish: güncel kimlik avı (sahte giriş) sayfaları
 *  - URLhaus (abuse.ch, malware-filter kopyası): zararlı yazılım dağıtan sunucular
 *  - phishing-filter (OpenPhish + IPThreat): kimlik avı sunucuları
 * SHA-256 listesi şimdilik boştur (MalwareBazaar artık üyelik anahtarı istiyor); yapı hazır tutulur.
 *
 * Gizlilik: Listeler telefona İNDİRİLİR, karşılaştırma telefonda yapılır. Kullanıcının
 * açtığı adresler, dosyaları ya da uygulama listesi hiçbir yere gönderilmez.
 */
class TehditVeritabani(
    val urller: Set<String>,
    val hostlar: Set<String>,
    val hashler: Set<String>,
    val guncelleme: Long,
) {
    val kayitSayisi: Int get() = urller.size + hostlar.size + hashler.size

    /** Bağlantı listede mi? Önce tam adres, sonra sunucu (ve üst alan adları) aranır. */
    fun baglantiBulgusu(url: String, host: String?): Bulgu? {
        if (urlNormal(url) in urller) {
            return Bulgu(
                Seviye.KIRMIZI, "Bilinen zararlı bağlantı",
                "Bu adres tehdit listelerinde (USOM / OpenPhish / URLhaus) zararlı ya da sahte sayfa olarak kayıtlı. Açma.",
            )
        }
        val h = host?.lowercase(Locale.ROOT)?.trimEnd('.') ?: return null
        if (hostListede(h)) {
            return Bulgu(
                Seviye.KIRMIZI, "Bilinen zararlı site",
                "\"$h\" sunucusu tehdit listelerinde (USOM / OpenPhish / URLhaus) zararlı yazılım ya da kimlik avı için kullanılan bir site olarak kayıtlı. Açma.",
            )
        }
        return null
    }

    /** "a.b.kotu.com" için "a.b.kotu.com", "b.kotu.com", "kotu.com" aranır. */
    fun hostListede(host: String): Boolean {
        var h = host.lowercase(Locale.ROOT).trimEnd('.')
        while (h.contains('.')) {
            if (h in hostlar) return true
            h = h.substringAfter('.')
        }
        return false
    }

    fun dosyaBulgusu(sha256: String): Bulgu? =
        if (sha256.lowercase(Locale.ROOT) in hashler) {
            Bulgu(
                Seviye.KIRMIZI, "Bilinen zararlı dosya",
                "Bu dosyanın parmak izi (SHA-256), zararlı yazılım listesinde kayıtlı. Açma ve sil.",
            )
        } else null

    companion object {
        /** Ortak barındırma platformları: tek bir sahte sayfa yüzünden tüm platform engellenmesin. */
        private val ortakPlatformlar = setOf(
            "google.com", "googleusercontent.com", "github.io", "githubusercontent.com", "github.com",
            "microsoft.com", "live.com", "sharepoint.com", "office.com", "dropbox.com", "amazonaws.com",
            "cloudfront.net", "azurewebsites.net", "blogspot.com", "wordpress.com", "wixsite.com", "weebly.com",
            "web.app", "firebaseapp.com", "pages.dev", "workers.dev", "vercel.app", "netlify.app", "glitch.me",
            "000webhostapp.com", "herokuapp.com", "ipfs.io", "cloudflare-ipfs.com", "r2.dev", "notion.site",
            "telegra.ph", "t.me", "discord.com", "discordapp.com", "bit.ly", "tinyurl.com", "docs.google.com",
            "forms.gle", "sites.google.com", "drive.google.com", "onedrive.live.com", "1drv.ms",
        )

        fun urlNormal(u: String): String = u.trim().lowercase(Locale.ROOT)
            .removePrefix("http://").removePrefix("https://").removePrefix("www.")
            .trimEnd('/')

        fun hostOf(u: String): String? {
            val g = u.trim().lowercase(Locale.ROOT).substringAfter("://", u.trim().lowercase(Locale.ROOT))
            val h = g.substringBefore('/').substringBefore('?').substringBefore('#').substringAfterLast('@').substringBefore(':')
            return h.takeIf { it.contains('.') && it.length in 4..253 }
        }

        private fun satirlar(metin: String?): Sequence<String> =
            metin.orEmpty().lineSequence().map { it.trim() }.filter { it.isNotEmpty() && !it.startsWith("#") }

        private val ipDeseni = Regex("""^\d+(\.\d+){3}$""")
        private val bosluk = Regex("\\s+")
        private val hashDeseni = Regex("^[0-9a-f]{64}$")

        /**
         * İndirilen ham metinlerden veritabanını kurar.
         * @param urlListesi   her satırda bir zararlı URL (yalnız tam adres eşleşir)
         * @param hostListesi  hosts biçimi: "0.0.0.0 sunucu" ya da yalnız "sunucu" satırları
         * @param sayfaListesi sahte sayfa listeleri (OpenPhish, USOM): URL ya da yalın alan adı;
         *                     tam adres ve sunucusu eklenir (ortak platformlarda yalnız tam adres)
         * @param hashListesi  her satırda bir SHA-256
         */
        fun ayristir(urlListesi: String?, hostListesi: String?, sayfaListesi: String?, hashListesi: String?, zaman: Long): TehditVeritabani {
            val urller = HashSet<String>()
            val hostlar = HashSet<String>()
            fun hostEkle(h: String?): Boolean {
                if (h == null || !h.contains('.') || h == "localhost" || ipDeseni.matches(h) || ortakPlatformMi(h)) return false
                hostlar += h
                return true
            }
            satirlar(urlListesi).forEach { urller += urlNormal(it) }
            satirlar(hostListesi).forEach { s ->
                hostEkle(s.split(bosluk).lastOrNull()?.lowercase(Locale.ROOT)?.trimEnd('.'))
            }
            satirlar(sayfaListesi).forEach { s ->
                val n = urlNormal(s)
                val h = hostOf(s)
                val yalinAlanAdi = h != null && n == h
                // Sahte sayfanın sunucusu da engellenir; ortak platformlar (ör. sites.google.com) hariç.
                val hostEklendi = hostEkle(h)
                // Yalın alan adı sunucu listesine girdiyse ayrıca tam adres olarak saklanmaz (bellek tasarrufu).
                if (!(yalinAlanAdi && hostEklendi)) urller += n
            }
            val hashler = satirlar(hashListesi).map { it.lowercase(Locale.ROOT) }.filter { hashDeseni.matches(it) }.toHashSet()
            return TehditVeritabani(urller, hostlar, hashler, zaman)
        }

        private fun ortakPlatformMi(h: String): Boolean =
            ortakPlatformlar.any { h == it || h.endsWith(".$it") } || BaglantiDenetleyici.ucretsizBarindirma.any { h == it || h.endsWith(".$it") }
    }
}

/**
 * Telefondaki güncel tehdit veritabanı (yüklenmemişse null). Denetleyiciler buradan okur;
 * veri katmanı uygulama açılınca ve günlük güncellemede doldurur.
 */
object TehditKaynagi {
    @Volatile
    var veritabani: TehditVeritabani? = null
}
