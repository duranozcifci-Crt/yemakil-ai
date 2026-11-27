package com.cepakil.analiz

import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.InputStream
import java.io.OutputStream
import java.util.Locale

/**
 * Herkese açık tehdit listelerinin telefondaki kopyası.
 *
 * Kaynaklar (günde bir indirilir; bkz. koruma/TehditGuncelleyici; hepsi herkese açık):
 *  - USOM (Türkiye Ulusal Siber Olaylara Müdahale Merkezi): zararlı ve sahte bağlantılar
 *  - OpenPhish: güncel kimlik avı (sahte giriş) sayfaları
 *  - URLhaus (abuse.ch, malware-filter kopyası): zararlı yazılım dağıtan sunucular
 *  - phishing-filter (OpenPhish + IPThreat): kimlik avı sunucuları
 *  - (kuruluysa) bildirilmiş zararlı Android uygulamalarının SHA-256 parmak izleri
 *
 * Bellek: Yarım milyon kayıt metin olarak ~60 MB tutar. Bu yüzden kayıtların kendisi değil
 * 64 bitlik özetleri sıralı bir dizide saklanır (~4 MB) ve ikili aramayla bulunur. İki farklı
 * adresin aynı özete düşme olasılığı pratikte sıfırdır (2^64'te ~500 bin kayıt).
 *
 * Gizlilik: Listeler telefona İNDİRİLİR, karşılaştırma telefonda yapılır. Kullanıcının
 * açtığı adresler, dosyaları ya da uygulama listesi hiçbir yere gönderilmez.
 */
class TehditVeritabani(
    val urller: Kume,
    val hostlar: Kume,
    val hashler: Kume,
    val guncelleme: Long,
) {
    constructor(urller: Set<String>, hostlar: Set<String>, hashler: Set<String>, guncelleme: Long) :
        this(Kume.of(urller), Kume.of(hostlar), Kume.of(hashler), guncelleme)

    /** Metinlerin 64 bitlik özetlerinden oluşan, sıralı ve değişmez küme. */
    class Kume internal constructor(internal val d: LongArray) {
        val size: Int get() = d.size
        fun isNotEmpty(): Boolean = d.isNotEmpty()
        fun isEmpty(): Boolean = d.isEmpty()
        operator fun contains(s: String): Boolean = d.binarySearch(ozet(s)) >= 0

        companion object {
            val BOS = Kume(LongArray(0))
            fun of(c: Collection<String>): Kume = Biriktirici().also { b -> c.forEach(b::ekle) }.bitir()

            /** FNV-1a (64 bit) + son karıştırma. */
            fun ozet(s: String): Long {
                var h = -0x340d631b7bdddcdbL
                for (ch in s) {
                    h = h xor (ch.code and 0xFF).toLong(); h *= 0x100000001b3L
                    h = h xor (ch.code ushr 8).toLong(); h *= 0x100000001b3L
                }
                h = h xor (h ushr 33); h *= -0xae502812aa7333L; h = h xor (h ushr 33)
                return h
            }
        }
    }

    /** Özetleri büyüyebilen bir dizide toplar; [bitir] sıralar ve tekrarları atar. */
    class Biriktirici {
        private var d = LongArray(1024)
        private var n = 0
        fun ekle(s: String) {
            if (n == d.size) d = d.copyOf(n * 2)
            d[n++] = Kume.ozet(s)
        }
        fun bitir(): Kume {
            val a = d.copyOf(n)
            a.sort()
            var k = 0
            for (i in a.indices) if (i == 0 || a[i] != a[i - 1]) a[k++] = a[i]
            return Kume(if (k == a.size) a else a.copyOf(k))
        }
    }

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
        if (korunanMi(h)) return false
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
                "Bu dosyanın parmak izi (SHA-256), bildirilmiş zararlı yazılım listesinde kayıtlı. Açma ve sil.",
            )
        } else null

    /** Hazır veritabanını ikili biçimde yazar (her açılışta metni yeniden ayrıştırmamak için). */
    fun yaz(cikis: OutputStream) {
        val o = DataOutputStream(cikis.buffered())
        o.writeInt(SIHIR); o.writeLong(guncelleme)
        for (k in listOf(urller, hostlar, hashler)) {
            o.writeInt(k.d.size)
            for (v in k.d) o.writeLong(v)
        }
        o.flush()
    }

    companion object {
        /** Dosya biçimi/kurallar değişince artırılır; eski dosya yok sayılıp yeniden kurulur. */
        private const val SIHIR = 0x43413033 // "CA03"

        fun oku(giris: InputStream): TehditVeritabani? = try {
            val i = DataInputStream(giris.buffered(1 shl 16))
            if (i.readInt() != SIHIR) null else {
                val zaman = i.readLong()
                val k = List(3) {
                    val n = i.readInt()
                    require(n in 0..20_000_000)
                    Kume(LongArray(n) { i.readLong() })
                }
                TehditVeritabani(k[0], k[1], k[2], zaman)
            }
        } catch (_: Exception) { null }

        /**
         * İçeriği herkesin yükleyebildiği ortak hizmetler: adresin tamamı (yol dahil) eşleşmedikçe
         * engellenmez; yoksa tek bir sahte sayfa yüzünden tüm hizmet kapanırdı.
         */
        private val paylasimliHizmetler = setOf(
            "google.com", "googleusercontent.com", "googleapis.com", "github.com", "githubusercontent.com",
            "microsoft.com", "live.com", "office.com", "dropbox.com", "dropboxusercontent.com", "amazonaws.com",
            "ipfs.io", "cloudflare-ipfs.com", "telegra.ph", "t.me", "discord.com", "discordapp.com",
            "sites.google.com", "docs.google.com", "drive.google.com", "forms.gle", "onedrive.live.com", "1drv.ms",
            "1fichier.com", "mediafire.com", "mega.nz", "archive.org", "pastebin.com", "4shared.com", "wetransfer.com",
            "gofile.io", "catbox.moe", "transfer.sh", "yandex.com", "yandex.com.tr", "mail.ru", "vk.com",
        ) + BaglantiDenetleyici.kisalticilar

        /**
         * Her kullanıcıya ayrı alt alan adı veren hizmetler ("sahte.duckdns.org"): hizmetin kendisi
         * engellenmez ama listedeki ALT alan adı engellenir.
         */
        private val altAlanliHizmetler = setOf(
            "sharepoint.com", "cloudfront.net", "azurewebsites.net", "wordpress.com", "r2.dev", "notion.site",
            "blogspot.com.tr", "appspot.com", "myshopify.com", "godaddysites.com", "tr.gg",
        ) + BaglantiDenetleyici.ucretsizBarindirma - "sites.google.com"

        /**
         * Hiçbir liste yüzünden engellenmeyecek alanlar: uygulamanın tanıdığı kurumların resmi
         * adresleri ve çok kullanılan temel hizmetler. Bir liste hatayla (ya da kötü niyetle)
         * bunlardan birini içerirse yok sayılır.
         */
        private val korunanAlanlar: Set<String> by lazy {
            BaglantiDenetleyici.kurumlar.flatMap { it.resmi }.toSet() + setOf(
                "google.com", "google.com.tr", "youtube.com", "gmail.com", "android.com", "gstatic.com", "googleapis.com",
                "whatsapp.com", "whatsapp.net", "facebook.com", "fbcdn.net", "instagram.com", "cdninstagram.com",
                "x.com", "twitter.com", "apple.com", "icloud.com", "microsoft.com", "live.com", "outlook.com", "office.com",
                "samsung.com", "wikipedia.org", "amazon.com", "amazon.com.tr", "netflix.com", "spotify.com",
                "telegram.org", "tiktok.com", "linkedin.com", "github.com", "usom.gov.tr", "btk.gov.tr",
            )
        }

        private fun ebeveyndeVar(h: String, kume: Set<String>, kendisiDahil: Boolean): Boolean {
            var x = h
            var ilk = true
            while (x.contains('.')) {
                if ((kendisiDahil || !ilk) && x in kume) return true
                x = x.substringAfter('.'); ilk = false
            }
            return false
        }

        fun korunanMi(host: String): Boolean = ebeveyndeVar(host, korunanAlanlar, kendisiDahil = true)

        /** Bu sunucu adı engelleme listesine girebilir mi? */
        fun hostEngellenebilir(h: String): Boolean {
            if (!h.contains('.') || h == "localhost" || ipDeseni.matches(h)) return false
            if (korunanMi(h)) return false
            if (ebeveyndeVar(h, paylasimliHizmetler, kendisiDahil = true)) return false
            // Alt alanlı hizmetin kendisi (ya da "www."si) engellenmez; kullanıcıya ait alt alan adı engellenir.
            val yalin = h.removePrefix("www.")
            if (yalin in altAlanliHizmetler) return false
            return true
        }

        fun urlNormal(u: String): String = u.trim().lowercase(Locale.ROOT)
            .removePrefix("http://").removePrefix("https://").removePrefix("www.")
            .trimEnd('/')

        fun hostOf(u: String): String? {
            val g = u.trim().lowercase(Locale.ROOT).substringAfter("://", u.trim().lowercase(Locale.ROOT))
            val h = g.substringBefore('/').substringBefore('?').substringBefore('#').substringAfterLast('@').substringBefore(':')
            return h.takeIf { it.contains('.') && it.length in 4..253 }
        }

        private fun satirlar(metin: String?): Sequence<String> = metin.orEmpty().lineSequence()

        private val ipDeseni = Regex("""^\d+(\.\d+){3}$""")
        private val hashDeseni = Regex("^[0-9a-f]{64}$")

        /** Kaynak dosyalarını satır satır işleyip veritabanını kuran yardımcı (büyük metni belleğe almadan). */
        class Kurucu {
            private val urller = Biriktirici()
            private val hostlar = Biriktirici()
            private val hashler = Biriktirici()

            private fun gecerli(s: String): String? = s.trim().takeIf { it.isNotEmpty() && !it.startsWith("#") && !it.startsWith("!") }

            /** Her satırda bir zararlı URL (yalnız tam adres eşleşir). */
            fun urlSatiri(s: String) { gecerli(s)?.let { urller.ekle(urlNormal(it)) } }

            /** hosts biçimi: "0.0.0.0 sunucu" ya da yalnız "sunucu". */
            fun hostSatiri(s: String) {
                val g = gecerli(s) ?: return
                val h = g.substringAfterLast(' ').substringAfterLast('\t').lowercase(Locale.ROOT).trimEnd('.')
                if (hostEngellenebilir(h)) hostlar.ekle(h)
            }

            /** Sahte sayfa listeleri (OpenPhish, USOM): URL ya da yalın alan adı. */
            fun sayfaSatiri(s: String) {
                val g = gecerli(s) ?: return
                val n = urlNormal(g)
                val h = hostOf(g)
                val yalinAlanAdi = h != null && n == h
                val hostEklendi = h != null && hostEngellenebilir(h).also { if (it) hostlar.ekle(h) }
                // Yalın alan adı: sunucu listesine girdiyse ayrıca saklanmaz; korunan alan adıysa hiç alınmaz.
                if (yalinAlanAdi && (hostEklendi || korunanMi(h!!))) return
                urller.ekle(n)
            }

            fun hashSatiri(s: String) {
                val g = gecerli(s)?.lowercase(Locale.ROOT) ?: return
                if (hashDeseni.matches(g)) hashler.ekle(g)
            }

            fun bitir(zaman: Long) = TehditVeritabani(urller.bitir(), hostlar.bitir(), hashler.bitir(), zaman)
        }

        /** Küçük metinlerden veritabanı kurar (testler ve basit kullanım için). */
        fun ayristir(urlListesi: String?, hostListesi: String?, sayfaListesi: String?, hashListesi: String?, zaman: Long): TehditVeritabani {
            val k = Kurucu()
            satirlar(urlListesi).forEach(k::urlSatiri)
            satirlar(hostListesi).forEach(k::hostSatiri)
            satirlar(sayfaListesi).forEach(k::sayfaSatiri)
            satirlar(hashListesi).forEach(k::hashSatiri)
            return k.bitir(zaman)
        }
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
