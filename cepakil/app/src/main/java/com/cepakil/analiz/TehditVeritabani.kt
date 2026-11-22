package com.cepakil.analiz

import java.util.Locale

/**
 * Herkese açık, uluslararası tehdit listelerinin telefondaki kopyası.
 *
 * Kaynaklar (günde bir indirilir; bkz. veri/TehditGuncelleyici):
 *  - URLhaus (abuse.ch): zararlı yazılım dağıtan bağlantılar ve sunucular
 *  - OpenPhish: güncel kimlik avı (sahte giriş) sayfaları
 *  - MalwareBazaar (abuse.ch): son günlerde bildirilen zararlı dosyaların SHA-256 parmak izleri
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
                "Bu adres uluslararası tehdit listelerinde (URLhaus / OpenPhish) zararlı ya da sahte sayfa olarak kayıtlı. Açma.",
            )
        }
        val h = host?.lowercase(Locale.ROOT)?.trimEnd('.') ?: return null
        if (hostListede(h)) {
            return Bulgu(
                Seviye.KIRMIZI, "Bilinen zararlı site",
                "\"$h\" sunucusu uluslararası tehdit listelerinde zararlı yazılım ya da kimlik avı için kullanılan bir site olarak kayıtlı. Açma.",
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
                "Bu dosyanın parmak izi (SHA-256), MalwareBazaar zararlı yazılım veritabanında kayıtlı. Açma ve sil.",
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

        private fun hostOf(u: String): String? {
            val g = u.trim().lowercase(Locale.ROOT).substringAfter("://", u.trim().lowercase(Locale.ROOT))
            val h = g.substringBefore('/').substringBefore('?').substringBefore('#').substringAfterLast('@').substringBefore(':')
            return h.takeIf { it.contains('.') && it.length in 4..253 }
        }

        private fun satirlar(metin: String?): Sequence<String> =
            metin.orEmpty().lineSequence().map { it.trim() }.filter { it.isNotEmpty() && !it.startsWith("#") }

        /**
         * İndirilen ham metinlerden veritabanını kurar.
         * @param urlhausUrl  "text_online" listesi: her satırda bir URL
         * @param urlhausHost "hostfile": "127.0.0.1<TAB>sunucu" satırları
         * @param openphish   her satırda bir URL
         * @param bazaar      her satırda bir SHA-256
         */
        fun ayristir(urlhausUrl: String?, urlhausHost: String?, openphish: String?, bazaar: String?, zaman: Long): TehditVeritabani {
            val urller = HashSet<String>()
            val hostlar = HashSet<String>()
            satirlar(urlhausUrl).forEach { urller += urlNormal(it) }
            satirlar(urlhausHost).forEach { s ->
                val h = s.split(Regex("\\s+")).lastOrNull()?.lowercase(Locale.ROOT)?.trimEnd('.')
                if (h != null && h.contains('.') && h != "localhost" && !Regex("""^\d+(\.\d+){3}$""").matches(h) && !ortakPlatformMi(h)) hostlar += h
            }
            satirlar(openphish).forEach { s ->
                urller += urlNormal(s)
                // Sahte sayfanın sunucusu da engellenir; ortak platformlar (ör. sites.google.com) hariç.
                hostOf(s)?.let { h -> if (!ortakPlatformMi(h) && !Regex("""^\d+(\.\d+){3}$""").matches(h)) hostlar += h }
            }
            val hashler = satirlar(bazaar).map { it.lowercase(Locale.ROOT) }.filter { Regex("^[0-9a-f]{64}$").matches(it) }.toHashSet()
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
