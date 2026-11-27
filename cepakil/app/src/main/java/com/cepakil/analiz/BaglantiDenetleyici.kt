package com.cepakil.analiz

import java.net.IDN
import java.util.Locale

/**
 * Yapıştırılan bir bağlantıyı (URL) yalnızca METNİNE bakarak denetler.
 *
 * Ne yapar: protokol (HTTPS/HTTP), adresin biçimi (IP adresi, @ hilesi, taklit
 * harfler, çok sayıda alt alan adı), bağlantı kısaltıcılar, ücretsiz barındırma
 * hizmetleri, kötüye kullanımı sık görülen uzantılar, tanınmış kurum adlarının
 * taklidi ve harf benzerliğiyle yazılmış (typosquatting) alan adları.
 *
 * Ne yapmaz: bağlantıyı açmaz, sayfayı indirmez, hiçbir sunucuya sormaz
 * (adres hiçbir yere gönderilmez; tehdit listeleriyle telefonda karşılaştırılır). Yeni açılmış bir dolandırıcılık
 * sitesini tanıyamaz ve hiçbir bağlantıyı "güvenli" ilan etmez.
 */
object BaglantiDenetleyici {

    data class Sonuc(
        val girilen: String,
        val alanAdi: String?,
        val seviye: Seviye,
        val ozet: String,
        val bulgular: List<Bulgu>,
    )

    const val SINIR_NOTU =
        "Bu kontrol bağlantıyı açmadan adresin yazılışına bakar ve telefona indirilmiş tehdit listeleriyle " +
            "(USOM, OpenPhish, URLhaus) karşılaştırır; adres hiçbir yere gönderilmez. Listeler günde bir güncellenir; birkaç saat önce " +
            "kurulmuş bir sahte site henüz listede olmayabilir. İşaret bulunmaması bağlantının güvenli olduğunu göstermez."

    private val tehlikeliProtokoller = setOf("javascript", "data", "vbscript", "file", "intent", "content")
    private val webDisiProtokoller = setOf("tel", "mailto", "sms", "smsto", "geo", "market")

    /** Gerçek hedefi gizleyen bağlantı kısaltıcılar. */
    val kisalticilar = setOf(
        "bit.ly", "bitly.com", "t.co", "tinyurl.com", "cutt.ly", "shorturl.at", "is.gd",
        "ow.ly", "rebrand.ly", "s.id", "t.ly", "tiny.cc", "rb.gy", "v.gd", "goo.su",
        "qr.ae", "lnkd.in", "buff.ly", "shorturl.com", "short.io", "bl.ink", "urlkisa.com",
    )

    /**
     * Herkesin ücretsiz site ya da geçici tünel açabildiği hizmetler. Bunlar kendi
     * başına zararlı değildir; ancak bankalar ve resmi kurumlar sitelerini bunlarda
     * barındırmaz, kimlik avı sayfalarında ise sık kullanılırlar.
     */
    val ucretsizBarindirma = setOf(
        "ngrok.io", "ngrok-free.app", "ngrok.app", "trycloudflare.com", "duckdns.org",
        "no-ip.org", "ddns.net", "hopto.org", "zapto.org", "000webhostapp.com",
        "weebly.com", "wixsite.com", "firebaseapp.com", "web.app", "pages.dev",
        "workers.dev", "netlify.app", "vercel.app", "glitch.me", "github.io",
        "blogspot.com", "godaddysites.com", "square.site", "webflow.io", "repl.co",
        "herokuapp.com", "surge.sh", "framer.website", "mybluehost.me", "sites.google.com",
    )

    /** Kötüye kullanım raporlarında sık geçen üst düzey alan adı uzantıları. */
    val supheliUzantilar = setOf(
        "zip", "mov", "top", "xyz", "click", "tk", "ml", "ga", "cf", "gq", "icu", "cyou",
        "buzz", "rest", "cam", "sbs", "lol", "quest", "monster", "bond", "cfd", "work", "loan",
    )

    /** İki parçalı kayıt uzantıları (ör. ornek.com.tr → kayıtlı ad "ornek.com.tr"). */
    private val ikiliUzantilar = setOf(
        "com.tr", "gov.tr", "edu.tr", "org.tr", "net.tr", "bel.tr", "k12.tr", "av.tr",
        "dr.tr", "gen.tr", "web.tr", "info.tr", "biz.tr", "tv.tr", "name.tr", "pol.tr",
        "tsk.tr", "bbs.tr", "co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "co.jp",
        "com.br", "co.nz", "co.za", "com.cn",
    )

    /**
     * Taklit edilmesi sık görülen kurumlar ve resmi alan adları.
     * [kisaAd] true ise ad yalnızca adresin ayrı bir parçası olarak geçtiğinde
     * (ör. "ptt-kargo.com") eşleşir; uzun adlar her yerde aranır.
     */
    data class Kurum(val ad: String, val anahtarlar: List<String>, val resmi: Set<String>, val kisaAd: Boolean = false)

    val kurumlar = listOf(
        Kurum("e-Devlet", listOf("edevlet", "turkiyegov"), setOf("turkiye.gov.tr")),
        // "=" ile başlayan anahtar yalnız adresin ayrı bir parçası olarak eşleşir ("ziraat" = tarım: ziraat.ankara.edu.tr).
        Kurum("Ziraat Bankası", listOf("ziraatbank", "=ziraat"), setOf(
            "ziraatbank.com.tr", "ziraatkatilim.com.tr", "ziraatyatirim.com.tr", "ziraatsigorta.com.tr",
            "ziraatportfoy.com.tr", "ziraatemeklilik.com.tr", "ziraatteknoloji.com",
        )),
        Kurum("Garanti BBVA", listOf("garantibbva", "=garanti"), setOf(
            "garantibbva.com.tr", "garanti.com.tr", "garantibbvaemeklilik.com.tr", "garantibbvayatirim.com.tr",
            "garantibbvaportfoy.com.tr", "garantibbvafilo.com.tr", "garantibbvaleasing.com.tr", "garantibbvafaktoring.com.tr",
        )),
        Kurum("Akbank", listOf("akbank"), setOf("akbank.com", "akbank.com.tr")),
        Kurum("İş Bankası", listOf("isbank", "isbankasi"), setOf("isbank.com.tr")),
        Kurum("Yapı Kredi", listOf("yapikredi"), setOf("yapikredi.com.tr")),
        Kurum("Halkbank", listOf("halkbank"), setOf("halkbank.com.tr")),
        Kurum("VakıfBank", listOf("vakifbank"), setOf("vakifbank.com.tr")),
        Kurum("DenizBank", listOf("denizbank"), setOf("denizbank.com")),
        Kurum("QNB", listOf("qnb"), setOf("qnb.com.tr", "qnb.com", "qnbfinansbank.com"), kisaAd = true),
        Kurum("Enpara", listOf("enpara"), setOf("enpara.com")),
        Kurum("Papara", listOf("papara"), setOf("papara.com")),
        Kurum("PTT", listOf("ptt"), setOf("ptt.gov.tr", "pttavm.com"), kisaAd = true),
        Kurum("SGK", listOf("sgk"), setOf("sgk.gov.tr"), kisaAd = true),
        Kurum("Gelir İdaresi", listOf("gib"), setOf("gib.gov.tr"), kisaAd = true),
        Kurum("Trendyol", listOf("trendyol"), setOf("trendyol.com")),
        Kurum("Hepsiburada", listOf("hepsiburada"), setOf("hepsiburada.com")),
        Kurum("Sahibinden", listOf("sahibinden"), setOf("sahibinden.com")),
        Kurum("n11", listOf("n11"), setOf("n11.com"), kisaAd = true),
        Kurum("Yurtiçi Kargo", listOf("yurticikargo", "=yurtici"), setOf("yurticikargo.com")),
        Kurum("Turkcell", listOf("turkcell"), setOf("turkcell.com.tr", "turkcell.com", "paycell.com.tr", "bip.com", "fizy.com")),
        Kurum("Vodafone", listOf("vodafone"), setOf("vodafone.com.tr", "vodafone.com")),
        Kurum("Türk Telekom", listOf("turktelekom"), setOf("turktelekom.com.tr", "ttnet.com.tr")),
        Kurum("Aras Kargo", listOf("araskargo"), setOf("araskargo.com.tr")),
        Kurum("MNG Kargo", listOf("mngkargo"), setOf("mngkargo.com.tr")),
        Kurum("PayPal", listOf("paypal"), setOf("paypal.com", "paypal.me")),
        Kurum("Netflix", listOf("netflix"), setOf("netflix.com")),
        Kurum("WhatsApp", listOf("whatsapp"), setOf("whatsapp.com", "whatsapp.net", "wa.me")),
        Kurum("Instagram", listOf("instagram"), setOf("instagram.com")),
        Kurum("Facebook", listOf("facebook"), setOf("facebook.com", "fb.com", "fb.me")),
        Kurum("Apple", listOf("icloud", "appleid"), setOf("apple.com", "icloud.com")),
    )

    private val hassasSozcukler = listOf(
        "login", "signin", "verify", "dogrula", "giris", "sifre", "parola", "guncelle",
        "odeme", "iade", "ceza", "aidat", "kargo", "hesap", "onay", "kart",
    )

    private val ipv4 = Regex("""^\d{1,3}(\.\d{1,3}){3}$""")
    private val sayisalHost = Regex("""^(0x[0-9a-f]+|\d{8,10})$""")

    fun denetle(hamGirdi: String): Sonuc {
        val girdi = hamGirdi.trim()
        if (girdi.isEmpty()) {
            return Sonuc(girdi, null, Seviye.BILGI, "Kontrol etmek için bir bağlantı yapıştır.", emptyList())
        }
        if (girdi.any { it.isWhitespace() }) {
            // Mesajın tamamı yapıştırılmış olabilir: içindeki ilk bağlantıyı al.
            // Cümle sonundaki noktalama bağlantıya dahil değildir ("…/ode." → "…/ode").
            val ilk = Regex("""(?i)\b(?:https?://|www\.)\S+""").find(girdi)?.value
                ?.trimEnd('.', ',', ';', ':', '!', '?', ')', ']', '"', '\'', '»')
            if (ilk != null && ilk != girdi) return denetle(ilk)
        }

        val bulgular = mutableListOf<Bulgu>()

        // 1) Protokol
        val protokolEslesme = Regex("""^([a-zA-Z][a-zA-Z0-9+.\-]*):""").find(girdi)
        var protokol = protokolEslesme?.groupValues?.get(1)?.lowercase(Locale.ROOT)
        var kalan: String
        if (protokol != null && !girdi.startsWith("$protokol://", ignoreCase = true) && protokol !in tehlikeliProtokoller && protokol !in webDisiProtokoller) {
            // "ornek.com:8080/yol" gibi: protokol değil, port.
            protokol = null
        }
        when {
            protokol == null -> {
                kalan = girdi
                bulgular += Bulgu(
                    Seviye.BILGI, "Adreste http/https yazmıyor",
                    "Açıldığında tarayıcı hangi protokolü kullanacağına kendisi karar verir. Denetim adres https ile açılacakmış gibi yapıldı.",
                )
            }
            protokol in tehlikeliProtokoller -> {
                bulgular += Bulgu(
                    Seviye.KIRMIZI, "Web adresi değil: \"$protokol:\"",
                    "Bu tür bağlantılar doğrudan kod çalıştırabilir ya da cihazdaki bir uygulamayı tetikleyebilir. Mesajla gelen bu tür bağlantıları açma.",
                )
                return sonucuKur(girdi, null, bulgular)
            }
            protokol in webDisiProtokoller -> {
                bulgular += Bulgu(
                    Seviye.BILGI, "Web adresi değil: \"$protokol:\"",
                    "Bu bağlantı bir web sayfası yerine arama, e-posta, mesaj ya da uygulama mağazası açar. Kime yönlendirdiğini kendin kontrol et.",
                )
                return sonucuKur(girdi, null, bulgular)
            }
            protokol == "http" -> {
                kalan = girdi.substring(girdi.indexOf("://") + 3)
                bulgular += Bulgu(
                    Seviye.SARI, "Şifrelenmemiş bağlantı (HTTP)",
                    "Bu sayfaya gönderdiğin bilgiler şifrelenmeden iletilir. Bankalar ve resmi kurumlar giriş sayfalarında her zaman HTTPS kullanır.",
                )
            }
            protokol == "https" -> kalan = girdi.substring(girdi.indexOf("://") + 3)
            else -> {
                kalan = girdi.substring(girdi.indexOf("://") + 3)
                bulgular += Bulgu(
                    Seviye.SARI, "Alışılmadık protokol: \"$protokol\"",
                    "Web sayfaları için http ya da https kullanılır. Bu bağlantının ne açacağı belirsiz.",
                )
            }
        }

        // 2) Adres bölümü (authority)
        val bitis = kalan.indexOfFirst { it == '/' || it == '?' || it == '#' || it == '\\' }
        val yetki = if (bitis >= 0) kalan.substring(0, bitis) else kalan
        val yolVeSorgu = if (bitis >= 0) kalan.substring(bitis) else ""

        var hostKismi = yetki
        if (yetki.contains('@')) {
            hostKismi = yetki.substringAfterLast('@')
            val onuncu = yetki.substringBeforeLast('@')
            bulgular += Bulgu(
                Seviye.KIRMIZI, "Adreste \"@\" hilesi",
                "Tarayıcı \"@\" işaretinden önceki kısmı (\"${onuncu.take(40)}\") yok sayar ve \"${hostKismi.take(60)}\" adresini açar. Bu, gerçek adresi gizlemek için kullanılan bir yöntemdir.",
            )
        }

        var port: String? = null
        val hostHam: String
        if (hostKismi.startsWith("[")) {
            hostHam = hostKismi.substringBefore(']') + "]"
            port = hostKismi.substringAfter("]:", "").ifEmpty { null }
        } else if (hostKismi.count { it == ':' } == 1) {
            hostHam = hostKismi.substringBefore(':')
            port = hostKismi.substringAfter(':').ifEmpty { null }
        } else {
            hostHam = hostKismi
        }
        val host = hostHam.lowercase(Locale.ROOT).trimEnd('.')

        if (host.isEmpty() || host.contains(' ')) {
            bulgular += Bulgu(Seviye.SARI, "Adres çözümlenemedi", "Bağlantının alan adı okunamadı. Eksik ya da bozuk kopyalanmış olabilir.")
            return sonucuKur(girdi, null, bulgular)
        }

        if (port != null && port != "443" && port != "80") {
            bulgular += Bulgu(
                Seviye.SARI, "Alışılmadık bağlantı noktası (:$port)",
                "Sıradan web siteleri adreste ayrıca port numarası kullanmaz. Geçici ya da kişisel bir sunucuya işaret ediyor olabilir.",
            )
        }

        // Uluslararası tehdit listeleri (telefona indirilmiş kopya).
        TehditKaynagi.veritabani?.baglantiBulgusu(girdi, host)?.let { bulgular += it }

        // 3) IP adresi
        if (ipv4.matches(host) || host.startsWith("[") || sayisalHost.matches(host)) {
            bulgular += Bulgu(
                Seviye.SARI, "Alan adı yerine IP adresi",
                "Bağlantı bir şirket adı yerine doğrudan sayısal adrese gidiyor. Tanınmış kurumlar bunu neredeyse hiç kullanmaz; kimin sunucusu olduğu anlaşılamaz.",
            )
            return sonucuKur(girdi, host, bulgular)
        }

        // 4) Harf hileleri (Punycode / farklı alfabeler)
        val unicodeHost = try { IDN.toUnicode(host, IDN.ALLOW_UNASSIGNED) } catch (e: Exception) { host }
        val asciiDisi = unicodeHost.any { it.code > 127 }
        if (asciiDisi) {
            val alfabeler = unicodeHost.filter { it.isLetter() }.map { alfabe(it) }.toSet()
            if (alfabeler.size > 1 && "latin" in alfabeler) {
                bulgular += Bulgu(
                    Seviye.KIRMIZI, "Karışık alfabe: taklit harf olabilir",
                    "Adreste Latin harflerinin yanında ${alfabeler.filter { it != "latin" }.joinToString()} harfleri var (\"$unicodeHost\"). Bazı harfler göze aynı görünür; tanınmış bir siteyi taklit etmek için kullanılır.",
                )
            } else {
                bulgular += Bulgu(
                    Seviye.SARI, "Uluslararası karakterli alan adı",
                    "Adres \"$unicodeHost\" olarak görünüyor. Türkçe karakterli meşru adresler de vardır; ancak benzer görünen harflerle taklit de yapılabilir. Adresi dikkatle oku.",
                )
            }
        } else if (host.split('.').any { it.startsWith("xn--") }) {
            bulgular += Bulgu(Seviye.SARI, "Kodlanmış alan adı (xn--)", "Bu adres özel karakterler içeriyor. Göründüğünden farklı bir siteye gidebilir.")
        }

        // 5) Alan adı yapısı
        val etiketler = host.split('.').filter { it.isNotEmpty() }
        val kayitliAd = kayitliAlanAdi(host)
        val uzanti = etiketler.lastOrNull() ?: ""

        if (etiketler.size >= 5) {
            bulgular += Bulgu(
                Seviye.SARI, "Çok sayıda alt alan adı",
                "Adres ${etiketler.size} parçadan oluşuyor. Gerçek site adresin en sonundaki \"$kayitliAd\" kısmıdır; öndeki parçalar herkes tarafından istenildiği gibi yazılabilir.",
            )
        }

        val kisaltici = host in kisalticilar || kayitliAd in kisalticilar
        if (kisaltici) {
            bulgular += Bulgu(
                Seviye.SARI, "Kısaltılmış bağlantı",
                "\"$kayitliAd\" bir bağlantı kısaltma hizmetidir; gerçek hedef görünmüyor. CepAkıl bağlantıyı açmadığı için nereye gittiğini bilemez.",
            )
        }

        val ucretsiz = ucretsizBarindirma.firstOrNull { host == it || host.endsWith(".$it") }
        if (ucretsiz != null) {
            bulgular += Bulgu(
                Seviye.SARI, "Ücretsiz site / tünel hizmeti ($ucretsiz)",
                "Bu hizmette herkes birkaç dakikada site açabilir. Kendi başına zararlı değildir; ancak bankalar ve resmi kurumlar sitelerini burada barındırmaz.",
            )
        }

        if (uzanti in supheliUzantilar) {
            bulgular += Bulgu(
                Seviye.SARI, "Kötüye kullanımı sık görülen uzantı (.$uzanti)",
                "Bu uzantılı alan adları kötüye kullanım raporlarında sık geçer. Meşru siteler de olabilir; tek başına zararlı olduğunu göstermez.",
            )
        }

        if (host.length > 60 || girdi.length > 200) {
            bulgular += Bulgu(Seviye.BILGI, "Çok uzun adres", "Uzun adresler, asıl alan adını gözden kaçırmak için kullanılabilir. Adresin \"$kayitliAd\" olduğuna dikkat et.")
        }

        // 6) Kurum taklidi ve harf benzerliği
        val benzerlik = harfBenzerligi(kayitliAd)
        val kurumBulgusu = if (benzerlik == null) kurumTaklidi(host, kayitliAd) else null
        if (benzerlik != null) bulgular += benzerlik

        // 7) Yol ve sorgu
        val yolKucuk = yolVeSorgu.lowercase(Locale.ROOT)
        val hassasVar = hassasSozcukler.any { yolKucuk.contains(it) } ||
            hassasSozcukler.any { s -> etiketler.dropLast(1).any { it.contains(s) } }
        if (Regex("""\.(apk|xapk|apks)(\?|#|$)""").containsMatchIn(yolKucuk)) {
            bulgular += Bulgu(
                Seviye.SARI, "Bağlantı bir uygulama dosyasına (.apk) gidiyor",
                "Bu bağlantı Google Play dışından uygulama yükletmeye çalışıyor. Mesajla gelen APK dosyaları bankacılık dolandırıcılığında sık kullanılır.",
            )
        } else if (Regex("""\.(exe|scr|bat|cmd|msi|vbs|js|jar|hta|ps1)(\?|#|$)""").containsMatchIn(yolKucuk)) {
            bulgular += Bulgu(Seviye.SARI, "Bağlantı çalıştırılabilir bir dosyaya gidiyor", "İndirilen dosya bilgisayarda açılırsa program çalıştırabilir.")
        }
        if (Regex("""[?&](url|redirect|redir|next|goto|target|link)=(https?|%68%74%74%70)""", RegexOption.IGNORE_CASE).containsMatchIn(yolVeSorgu)) {
            bulgular += Bulgu(Seviye.BILGI, "Başka adrese yönlendirme", "Adresin içinde ikinci bir bağlantı var. Açıldığında başka bir siteye geçebilirsin.")
        }

        if (kurumBulgusu != null) {
            // Kurum adı + başka bir şüpheli işaret = güçlü gösterge.
            val baskaIsaret = bulgular.any { it.seviye.agirlik >= Seviye.SARI.agirlik } || hassasVar
            bulgular += if (baskaIsaret) kurumBulgusu.copy(seviye = Seviye.KIRMIZI) else kurumBulgusu
        } else if (hassasVar && bulgular.any { it.seviye.agirlik >= Seviye.SARI.agirlik }) {
            bulgular += Bulgu(
                Seviye.BILGI, "Giriş, ödeme ya da doğrulama sözcükleri",
                "Adreste \"giriş\", \"şifre\", \"ödeme\", \"kargo\" gibi sözcükler geçiyor. Bu tür sayfalarda kart ya da şifre bilgisi girmeden önce adresi doğrula.",
            )
        }

        return sonucuKur(girdi, unicodeHost, bulgular)
    }

    private fun sonucuKur(girdi: String, host: String?, bulgular: List<Bulgu>): Sonuc {
        val seviye = bulgular.enYuksekSeviye()
        val ozet = when (seviye) {
            Seviye.KIRMIZI -> "Tehlike göstergeleri var. Bu bağlantıyı açmaman önerilir."
            Seviye.SARI -> "Dikkat gerektiren işaretler var. Göndereni ve adresi doğrulamadan açma."
            else -> "Kesin sonuç verilemiyor. Bilinen göstergelere rastlanmadı; bu, bağlantının güvenli olduğu anlamına gelmez."
        }
        // Bağlantılarda "yeşil" sonuç verilmez: yeterli veri yoksa belirsiz kalır.
        val gosterilen = if (seviye == Seviye.YESIL) Seviye.BILGI else seviye
        return Sonuc(girdi, host, gosterilen, ozet, bulgular.oneminGoreSirala())
    }

    /** "giris.ziraat.com.tr" → "ziraat.com.tr", "a.b.ornek.com" → "ornek.com" */
    fun kayitliAlanAdi(host: String): String {
        val e = host.split('.').filter { it.isNotEmpty() }
        if (e.size <= 2) return e.joinToString(".")
        val sonIki = e.takeLast(2).joinToString(".")
        return if (sonIki in ikiliUzantilar) e.takeLast(3).joinToString(".") else sonIki
    }

    /**
     * Belge ile alınabilen Türkiye uzantıları (devlet, üniversite, belediye, okul…):
     * bunlar kurum taklidi sayılmaz; ör. ziraat.ankara.edu.tr bir üniversite fakültesidir.
     */
    private val belgeliUzantilar = listOf(".gov.tr", ".edu.tr", ".bel.tr", ".k12.tr", ".av.tr", ".pol.tr", ".tsk.tr")

    fun belgeliUzantiMi(alan: String): Boolean = belgeliUzantilar.any { alan.endsWith(it) } || alan in setOf("gov.tr", "edu.tr")

    /** Dolandırıcılık sitelerinin kurum adının yanına eklediği tipik kelimeler. */
    private val oltaKelimeleri = setOf(
        "giris", "login", "signin", "onay", "dogrulama", "dogrula", "verify", "sube", "subesi", "mobil", "mobile",
        "kampanya", "odeme", "odemeler", "iade", "borc", "ceza", "hediye", "cekilis", "destek", "guvenlik", "hesap",
        "hesabim", "sifre", "bireysel", "internet", "online", "aidat", "basvuru", "takip", "kargo", "teslimat",
        "gumruk", "fatura", "puan", "bonus", "indirim", "firsat", "kredi", "kart", "musteri", "islem", "guncelle",
        "guncelleme", "aktivasyon", "kimlik", "secure", "account", "update", "support", "tr", "turkiye", "resmi",
    )

    /** Adreste adı geçen (ama resmi adresi bu olmayan) kurum; yoksa null. */
    private fun adiGecenKurum(host: String, kayitliAd: String): Kurum? {
        val parcalar = host.split('.', '-', '_').toSet()
        val bitisik = host.replace("-", "").replace(".", "")
        for (k in kurumlar) {
            val geciyor = k.anahtarlar.any { a ->
                when {
                    a.startsWith("=") -> a.substring(1) in parcalar
                    k.kisaAd -> a in parcalar
                    else -> bitisik.contains(a)
                }
            }
            if (!geciyor) continue
            return if (kayitliAd in k.resmi) null else k
        }
        return null
    }

    /**
     * Web koruması bu alan adını LİSTEDE OLMASA DA engellesin mi?
     *
     * Yalnız çok açık durumda evet: adreste bir kurumun adı geçiyor, adres o kurumun resmi adresi
     * (ya da aynı adın başka uzantısı) değil VE yanında tipik bir olta kelimesi ("giris", "onay",
     * "sube"…), kötüye kullanılan bir uzantı ya da ücretsiz barındırma var.
     * Harf benzerliği ("pcloud" ~ "icloud") bilerek sayılmaz: gerçek siteleri engelliyordu.
     */
    fun webdeEngellenmeli(hostHam: String): Boolean {
        val host = hostHam.lowercase(Locale.ROOT).trimEnd('.')
        if (!host.contains('.') || belgeliUzantiMi(host)) return false
        val kayitli = kayitliAlanAdi(host)
        if (belgeliUzantiMi(kayitli)) return false
        val kurum = adiGecenKurum(host, kayitli) ?: return false
        val ad = kayitli.substringBefore('.')
        if (kurum.resmi.any { it.substringBefore('.') == ad }) return false
        val parcalar = host.split('.', '-', '_')
        val uzanti = host.substringAfterLast('.')
        return parcalar.dropLast(1).any { it in oltaKelimeleri } ||
            uzanti in supheliUzantilar ||
            ucretsizBarindirma.any { host.endsWith(".$it") }
    }

    private fun kurumTaklidi(host: String, kayitliAd: String): Bulgu? {
        if (belgeliUzantiMi(host)) return null
        val parcalar = host.split('.', '-', '_').toSet()
        val bitisik = host.replace("-", "").replace(".", "")
        for (k in kurumlar) {
            val geciyor = k.anahtarlar.any { a ->
                when {
                    a.startsWith("=") -> a.substring(1) in parcalar
                    k.kisaAd -> a in parcalar
                    else -> bitisik.contains(a)
                }
            }
            if (!geciyor) continue
            if (kayitliAd in k.resmi) return null
            val ad = kayitliAd.substringBefore('.')
            if (k.resmi.any { it.substringBefore('.') == ad }) {
                // ör. "ziraatbank.com" (resmi: ziraatbank.com.tr): aynı ad, farklı uzantı.
                return Bulgu(
                    Seviye.KIRMIZI, "${k.ad} adresinin farklı uzantılı kopyası",
                    "Bu bağlantı \"$kayitliAd\" sitesine gidiyor; ${k.ad} için bildiğimiz resmi adres: ${k.resmi.joinToString()}. Aynı adı başka uzantıyla kullanmak sahte sitelerin sık yöntemidir.",
                )
            }
            return Bulgu(
                Seviye.SARI, "${k.ad} adı geçiyor ama resmi adres değil",
                "Bu bağlantı \"$kayitliAd\" sitesine gidiyor. ${k.ad} için bildiğimiz resmi adres: ${k.resmi.joinToString()}. Kurumun adını taşıyan başka siteler dolandırıcılık için kurulmuş olabilir.",
            )
        }
        if (Regex("""(^|[.\-])(gov|devlet|resmi)([.\-]|$)""").containsMatchIn(host) && !host.endsWith(".gov.tr") && !host.endsWith(".gov")) {
            return Bulgu(
                Seviye.SARI, "Resmi kurum gibi görünüyor ama .gov.tr değil",
                "Türkiye'deki devlet kurumlarının adresleri \".gov.tr\" ile biter. Bu adres \"$kayitliAd\".",
            )
        }
        return null
    }

    /** Resmi bir adrese çok benzeyen ama farklı olan alan adlarını yakalar (ör. "trendyoI", "z1raatbank"). */
    private fun harfBenzerligi(kayitliAd: String): Bulgu? {
        if (kurumlar.any { kayitliAd in it.resmi } || belgeliUzantiMi(kayitliAd)) return null
        val ad = kayitliAd.substringBefore('.')
        if (ad.length < 6) return null
        val normal = benzerHarfleriDuzelt(ad)
        for (k in kurumlar) for (resmi in k.resmi) {
            val resmiAd = resmi.substringBefore('.')
            if (resmiAd.length < 6) continue
            val esit = normal == benzerHarfleriDuzelt(resmiAd) && ad != resmiAd
            val mesafe = duzenlemeMesafesi(ad, resmiAd)
            // Kısa adlarda yalnız tek harf değişimi sayılır ("cloud" ≠ "icloud" taklidi değildir).
            val yakin = if (resmiAd.length >= 8) mesafe in 1..2 else mesafe == 1 && ad.length == resmiAd.length
            val uzantiFarki = ad == resmiAd
            if (esit || yakin || uzantiFarki) {
                return Bulgu(
                    Seviye.KIRMIZI, "${k.ad} adresine çok benziyor",
                    "Bu adres \"$kayitliAd\", resmi \"$resmi\" adresine çok benzer ama aynı değil. Harf değiştirme ya da farklı uzantı kullanma, sahte sitelerin en sık yöntemidir.",
                )
            }
        }
        return null
    }

    fun benzerHarfleriDuzelt(s: String): String = s
        .replace("rn", "m").replace("vv", "w")
        .map { when (it) { '0' -> 'o'; '1' -> 'l'; '3' -> 'e'; '5' -> 's'; '4' -> 'a'; '7' -> 't'; else -> it } }
        .joinToString("")
        .replace('l', 'i') // "paypa1" ve "trendyoI" gibi I/l/1 karışıklıkları

    fun duzenlemeMesafesi(a: String, b: String): Int {
        val d = Array(a.length + 1) { IntArray(b.length + 1) }
        for (i in 0..a.length) d[i][0] = i
        for (j in 0..b.length) d[0][j] = j
        for (i in 1..a.length) for (j in 1..b.length) {
            val m = if (a[i - 1] == b[j - 1]) 0 else 1
            d[i][j] = minOf(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + m)
        }
        return d[a.length][b.length]
    }

    private fun alfabe(c: Char): String = when (Character.UnicodeScript.of(c.code)) {
        Character.UnicodeScript.LATIN -> "latin"
        Character.UnicodeScript.CYRILLIC -> "Kiril"
        Character.UnicodeScript.GREEK -> "Yunan"
        Character.UnicodeScript.ARMENIAN -> "Ermeni"
        else -> Character.UnicodeScript.of(c.code).name.lowercase(Locale.ROOT)
    }
}
