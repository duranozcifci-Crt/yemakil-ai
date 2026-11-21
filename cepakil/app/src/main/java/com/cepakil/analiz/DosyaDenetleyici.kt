package com.cepakil.analiz

import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.security.MessageDigest
import java.util.Locale
import java.util.zip.ZipException
import java.util.zip.ZipInputStream

/**
 * Kullanıcının seçtiği tek bir dosyayı cihaz üzerinde, temel risk göstergeleri
 * açısından denetler.
 *
 * Ne yapar: dosyanın GERÇEK türünü ilk baytlarından (imza/"magic number")
 * belirler, uzantıyla karşılaştırır; çift uzantı ve ad hilelerini, uygulama
 * paketlerini (APK), makrolu Office belgelerini, PDF içindeki JavaScript/
 * otomatik çalıştırma komutlarını, betik içeren HTML dosyalarını ve arşiv
 * içindeki çalıştırılabilir dosyaları arar; SHA-256 özetini hesaplar.
 *
 * Ne yapmaz: zararlı yazılım imza veritabanı KULLANMAZ, dosyayı çalıştırmaz,
 * hiçbir yere göndermez. Bu yüzden hiçbir dosyayı "temiz" ilan etmez.
 */
object DosyaDenetleyici {

    /** İçerik aramalarında okunan en fazla bayt (özet her zaman tüm dosyadan alınır). */
    const val ICERIK_SINIRI = 8 * 1024 * 1024
    private const val ARSIV_KAYIT_SINIRI = 5000

    const val SINIR_NOTU =
        "CepAkıl dosyanın türüne, adına ve içindeki bazı bilinen risk işaretlerine bakar. " +
            "Zararlı yazılım imza veritabanı kullanmaz; dosyayı hiçbir sunucuya göndermez. " +
            "Bu yüzden bir dosyanın temiz olduğunu kesin olarak söyleyemez."

    enum class Tur(val ad: String, val tehlikeli: Boolean = false) {
        PDF("PDF belgesi"),
        APK("Android uygulama paketi (APK)", tehlikeli = true),
        OFFICE("Office belgesi (Word/Excel/PowerPoint)"),
        OFFICE_ESKI("Eski biçim Office belgesi (.doc/.xls/.ppt)"),
        JAR("Java arşivi (JAR)", tehlikeli = true),
        ZIP("ZIP arşivi"),
        RAR("RAR arşivi"),
        YEDIZ("7z arşivi"),
        GZIP("GZIP arşivi"),
        EXE("Windows programı", tehlikeli = true),
        ELF("Linux/Android çalıştırılabilir dosyası", tehlikeli = true),
        DEX("Android kod dosyası (DEX)", tehlikeli = true),
        PNG("PNG resmi"), JPEG("JPEG resmi"), GIF("GIF resmi"), WEBP("WebP resmi"),
        MP4("Video (MP4/MOV)"), MP3("Ses (MP3)"),
        HTML("Web sayfası (HTML)", tehlikeli = true),
        SVG("SVG çizimi"),
        BETIK("Betik / komut dosyası", tehlikeli = true),
        METIN("Düz metin"),
        BOS("Boş dosya"),
        BILINMIYOR("Tanınmayan biçim"),
    }

    /** Android katmanının APK dosyasından okuduğu bilgiler (PackageManager ile). */
    data class ApkOzeti(
        val paket: String?,
        val surum: String?,
        val izinler: List<String>,
        val erisilebilirlikHizmeti: Boolean,
        val cihazYoneticisi: Boolean,
        val bildirimDinleyici: Boolean,
    )

    data class Sonuc(
        val ad: String,
        val boyut: Long,
        val tur: Tur,
        val seviye: Seviye,
        val ozet: String,
        val bulgular: List<Bulgu>,
        val sha256: String,
        val kismiIcerik: Boolean,
        val apk: ApkOzeti?,
    )

    /** Hangi uzantılar hangi gerçek türle uyumludur. */
    private val beklenenUzantilar: Map<Tur, Set<String>> = mapOf(
        Tur.PDF to setOf("pdf"),
        Tur.APK to setOf("apk", "apks", "xapk"),
        Tur.OFFICE to setOf("docx", "xlsx", "pptx", "docm", "xlsm", "pptm", "dotx", "dotm", "xltx", "xltm", "potx", "ppsx", "ppsm"),
        Tur.OFFICE_ESKI to setOf("doc", "xls", "ppt", "msg", "msi", "dot", "xlt", "pps", "pub", "vsd"),
        Tur.JAR to setOf("jar"),
        Tur.ZIP to setOf("zip", "epub", "odt", "ods", "odp", "kmz", "xapk", "apks", "aar", "cbz"),
        Tur.RAR to setOf("rar", "cbr"),
        Tur.YEDIZ to setOf("7z"),
        Tur.GZIP to setOf("gz", "tgz"),
        Tur.EXE to setOf("exe", "dll", "scr", "com", "sys", "cpl", "ocx"),
        Tur.ELF to setOf("so", "bin", "elf", "o"),
        Tur.DEX to setOf("dex"),
        Tur.PNG to setOf("png"), Tur.JPEG to setOf("jpg", "jpeg", "jfif"), Tur.GIF to setOf("gif"),
        Tur.WEBP to setOf("webp"), Tur.MP4 to setOf("mp4", "m4a", "m4v", "mov", "3gp", "heic", "heif", "avif"),
        Tur.MP3 to setOf("mp3"),
        Tur.HTML to setOf("html", "htm", "xhtml", "mht", "shtml"),
        Tur.SVG to setOf("svg"),
        Tur.BETIK to setOf("sh", "js", "py", "pl", "vbs", "bat", "cmd", "ps1"),
        Tur.METIN to setOf("txt", "csv", "json", "xml", "md", "log", "vcf", "ics", "srt", "ini", "js", "vbs", "bat", "cmd", "ps1", "hta", "reg", "html", "htm"),
    )

    /** Masum görünen uzantılar: arkasında program saklanırsa çok şüphelidir. */
    private val masumUzantilar = setOf(
        "pdf", "jpg", "jpeg", "png", "gif", "webp", "heic", "doc", "docx", "xls", "xlsx",
        "ppt", "pptx", "txt", "csv", "mp3", "mp4", "mov", "zip", "rar",
    )

    private val calistirilabilirUzantilar = setOf(
        "apk", "xapk", "apks", "exe", "scr", "bat", "cmd", "com", "pif", "js", "jse", "vbs", "vbe",
        "wsf", "jar", "msi", "hta", "lnk", "ps1", "dex", "sh", "cpl", "reg", "iso", "img",
    )

    private val betikUzantilari = setOf("js", "jse", "vbs", "vbe", "wsf", "bat", "cmd", "ps1", "hta", "reg", "lnk", "sh")

    private val cifteUzanti = Regex(
        """\.(pdf|jpe?g|png|gif|docx?|xlsx?|pptx?|txt|mp3|mp4|mov|zip|rar|heic)\s*\.(${calistirilabilirUzantilar.joinToString("|")})$""",
        RegexOption.IGNORE_CASE,
    )

    /** Sağdan sola yazım gibi, dosya adını görsel olarak ters çeviren gizli karakterler. */
    private val yonKarakterleri = setOf('‮', '‭', '‫', '‪', '⁦', '⁧', '⁨', '‏', '‎')

    fun uzantisi(ad: String): String = ad.substringAfterLast('.', "").trim().lowercase(Locale.ROOT)

    /** Dosyanın ilk baytlarından gerçek türünü bulur (ZIP alt türleri için arşiv kayıt adları da kullanılır). */
    fun turuBelirle(bas: ByteArray, zipKayitlari: List<String>? = null): Tur {
        if (bas.isEmpty()) return Tur.BOS
        fun bayt(i: Int) = if (i < bas.size) bas[i].toInt() and 0xFF else -1
        fun ile(vararg b: Int, ofset: Int = 0) = b.indices.all { bayt(ofset + it) == b[it] }
        fun ascii(s: String, ofset: Int = 0) = s.indices.all { bayt(ofset + it) == s[it].code }

        return when {
            ascii("%PDF") -> Tur.PDF
            ile(0x50, 0x4B, 0x03, 0x04) || ile(0x50, 0x4B, 0x05, 0x06) || ile(0x50, 0x4B, 0x07, 0x08) -> zipAltTuru(zipKayitlari)
            ile(0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1) -> Tur.OFFICE_ESKI
            ascii("MZ") -> Tur.EXE
            ile(0x7F, 0x45, 0x4C, 0x46) -> Tur.ELF
            ascii("dex\n") -> Tur.DEX
            ile(0x89, 0x50, 0x4E, 0x47) -> Tur.PNG
            ile(0xFF, 0xD8, 0xFF) -> Tur.JPEG
            ascii("GIF8") -> Tur.GIF
            ascii("RIFF") && ascii("WEBP", 8) -> Tur.WEBP
            ascii("ftyp", 4) -> Tur.MP4
            ascii("ID3") || (bayt(0) == 0xFF && (bayt(1) and 0xE0) == 0xE0) -> Tur.MP3
            ascii("Rar!") -> Tur.RAR
            ile(0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C) -> Tur.YEDIZ
            ile(0x1F, 0x8B) -> Tur.GZIP
            metinMi(bas) -> metinAltTuru(bas)
            else -> Tur.BILINMIYOR
        }
    }

    private fun zipAltTuru(kayitlar: List<String>?): Tur {
        if (kayitlar == null) return Tur.ZIP
        val k = kayitlar.toSet()
        return when {
            "AndroidManifest.xml" in k && k.any { it.startsWith("classes") && it.endsWith(".dex") } -> Tur.APK
            "AndroidManifest.xml" in k && "resources.arsc" in k -> Tur.APK
            "[Content_Types].xml" in k && k.any { it.startsWith("word/") || it.startsWith("xl/") || it.startsWith("ppt/") } -> Tur.OFFICE
            "META-INF/MANIFEST.MF" in k && k.any { it.endsWith(".class") } -> Tur.JAR
            else -> Tur.ZIP
        }
    }

    private fun metinMi(bas: ByteArray): Boolean {
        val n = minOf(bas.size, 4096)
        var kontrol = 0
        for (i in 0 until n) {
            val c = bas[i].toInt() and 0xFF
            if (c == 0) return false
            if (c < 0x09 || (c in 0x0E..0x1F)) kontrol++
        }
        return kontrol * 20 < n
    }

    private fun metinAltTuru(bas: ByteArray): Tur {
        val s = String(bas, 0, minOf(bas.size, 4096), Charsets.ISO_8859_1).trimStart('\uFEFF', 'ï', '»', '¿', ' ', '\n', '\r', '\t').lowercase(Locale.ROOT)
        return when {
            s.startsWith("#!") -> Tur.BETIK
            s.startsWith("<!doctype html") || s.startsWith("<html") || s.contains("<script") || s.contains("<body") -> Tur.HTML
            s.startsWith("<svg") || (s.startsWith("<?xml") && s.contains("<svg")) -> Tur.SVG
            else -> Tur.METIN
        }
    }

    /**
     * Ana denetim. [ac] her çağrıldığında dosyanın başından okuyan YENİ bir akış
     * döndürmelidir (dosya birkaç kez okunur: özet, içerik, arşiv listesi).
     */
    fun denetle(ad: String, ac: () -> InputStream, apk: ApkOzeti? = null): Sonuc {
        val b = mutableListOf<Bulgu>()

        // 1) Tek geçişte: SHA-256, toplam boyut, içerik örneği.
        val ozetci = MessageDigest.getInstance("SHA-256")
        val ornek = ByteArrayOutputStream()
        var boyut = 0L
        ac().use { giris ->
            val tampon = ByteArray(64 * 1024)
            while (true) {
                val n = giris.read(tampon)
                if (n < 0) break
                ozetci.update(tampon, 0, n)
                if (ornek.size() < ICERIK_SINIRI) ornek.write(tampon, 0, minOf(n, ICERIK_SINIRI - ornek.size()))
                boyut += n
            }
        }
        val icerik = ornek.toByteArray()
        val sha256 = ozetci.digest().joinToString("") { "%02x".format(it) }
        val kismi = boyut > icerik.size

        // 2) Arşivse içindeki kayıt adları.
        var zipKayitlari: List<String>? = null
        var arsivSifreli = false
        var arsivKismi = false
        if (icerik.size >= 4 && icerik[0] == 0x50.toByte() && icerik[1] == 0x4B.toByte()) {
            // Yerel dosya başlığındaki "şifreli" biti (genel amaçlı bayrak, bit 0).
            if (icerik.size > 8 && icerik[2] == 0x03.toByte() && (icerik[6].toInt() and 0x01) == 1) arsivSifreli = true
            val liste = mutableListOf<String>()
            try {
                ZipInputStream(ac()).use { z ->
                    while (liste.size < ARSIV_KAYIT_SINIRI) {
                        val e = z.nextEntry ?: break
                        liste += e.name
                    }
                    if (liste.size >= ARSIV_KAYIT_SINIRI) arsivKismi = true
                }
            } catch (e: ZipException) {
                if (e.message?.contains("encrypt", ignoreCase = true) == true) arsivSifreli = true else arsivKismi = true
            } catch (e: Exception) {
                arsivKismi = true
            }
            zipKayitlari = liste
        }

        val tur = if (boyut == 0L) Tur.BOS else turuBelirle(icerik, zipKayitlari)
        val uzanti = uzantisi(ad)

        // 3) Ad hileleri
        if (ad.any { it in yonKarakterleri }) {
            b += Bulgu(
                Seviye.KIRMIZI, "Dosya adında gizli yön karakteri",
                "Adın bir kısmı ekranda ters yazılıyor; ör. \"faturaexe.pdf\" gibi görünen bir dosya aslında \".exe\" olabilir. Bu, kullanıcıyı kandırmak için kullanılan bir hiledir.",
            )
        }
        if (cifteUzanti.containsMatchIn(ad.trim())) {
            b += Bulgu(
                Seviye.KIRMIZI, "Çift uzantı: \"${ad.trim().takeLast(24)}\"",
                "Dosya belge ya da resim gibi görünüyor ama asıl uzantısı \".$uzanti\". Bu, program dosyalarını gizlemek için sık kullanılan bir yöntemdir.",
            )
        }

        // 4) Uzantı – içerik uyumu
        val beklenen = beklenenUzantilar[tur].orEmpty()
        if (uzanti.isNotEmpty() && tur != Tur.BOS && tur != Tur.BILINMIYOR && uzanti !in beklenen) {
            if (tur.tehlikeli && uzanti in masumUzantilar) {
                b += Bulgu(
                    Seviye.KIRMIZI, "Uzantısı \".$uzanti\" ama içeriği: ${tur.ad}",
                    "Dosya adı farklı bir tür olduğunu söylüyor. Gerçek içeriği gizlemek, zararlı dosyaların sık kullandığı bir yöntemdir. Açma.",
                )
            } else if (!(tur == Tur.METIN && uzanti !in masumUzantilar)) {
                b += Bulgu(
                    Seviye.BILGI, "Uzantı ile içerik farklı",
                    "Adı \".$uzanti\" ile bitiyor ama içerik ${tur.ad} gibi görünüyor. Çoğu zaman zararsız bir kayıt hatasıdır.",
                )
            }
        }

        // 5) Türe özgü göstergeler
        val metin by lazy { String(icerik, Charsets.ISO_8859_1) }
        when (tur) {
            Tur.APK -> {
                b += Bulgu(
                    Seviye.SARI, "Android uygulama paketi (APK)",
                    "Bu dosya açılırsa telefona uygulama yükler. Mesaj, e-posta ya da WhatsApp ile gelen APK'lar bankacılık dolandırıcılığında sık kullanılır. Yalnız güvendiğin kaynaktan yükle; mümkünse uygulamayı Google Play'den indir.",
                )
                if (apk != null) b += apkBulgulari(apk)
            }
            Tur.EXE, Tur.ELF, Tur.DEX, Tur.JAR -> b += Bulgu(
                Seviye.SARI, "Çalıştırılabilir program: ${tur.ad}",
                "Bu dosya bir belge değil, programdır. Telefonda kendiliğinden çalışmaz; ancak bir bilgisayara aktarılıp açılırsa zarar verebilir. Kimden geldiğinden emin değilsen sil.",
            )
            Tur.BETIK -> b += Bulgu(Seviye.SARI, "Komut dosyası", "Bu dosya bilgisayarda çalıştırılırsa komutlar yürütür. Kimden geldiğinden emin değilsen açma.")
            Tur.OFFICE -> {
                val makro = zipKayitlari.orEmpty().any { it.endsWith("vbaProject.bin", ignoreCase = true) }
                if (makro || uzanti in setOf("docm", "xlsm", "pptm", "dotm", "xltm", "ppsm")) {
                    b += Bulgu(
                        Seviye.SARI, "Makro içeren Office belgesi",
                        "Belgede makro (küçük program) var. Bilgisayarda açılırken \"İçeriği etkinleştir\" uyarısı çıkarsa onaylama; makrolar zararlı yazılım indirmek için sık kullanılır.",
                    )
                }
                if (zipKayitlari.orEmpty().any { it.contains("oleObject", ignoreCase = true) || it.contains("/embeddings/", ignoreCase = true) && calistirilabilirUzantilar.contains(uzantisi(it)) }) {
                    b += Bulgu(Seviye.BILGI, "Belgede gömülü nesne var", "Belgenin içine başka bir dosya gömülmüş. Belgede \"çift tıkla\" gibi bir yönlendirme varsa uyma.")
                }
            }
            Tur.OFFICE_ESKI -> {
                val utf16 = String(icerik, Charsets.UTF_16LE)
                if (metin.contains("_VBA_PROJECT") || utf16.contains("_VBA_PROJECT") || utf16.contains("Macros") || metin.contains("VBA_PROJECT")) {
                    b += Bulgu(
                        Seviye.SARI, "Makro içeren eski biçim Office belgesi",
                        "Belgede makro izleri var. Bilgisayarda açarken \"İçeriği etkinleştir\" uyarısını onaylama.",
                    )
                }
            }
            Tur.PDF -> {
                val js = Regex("""/(JavaScript|JS)\b""").containsMatchIn(metin)
                val launch = metin.contains("/Launch")
                val gomulu = metin.contains("/EmbeddedFile")
                val otomatik = metin.contains("/OpenAction") || Regex("""/AA\b""").containsMatchIn(metin)
                if (launch) b += Bulgu(Seviye.SARI, "PDF program başlatma komutu içeriyor (/Launch)", "PDF açıldığında başka bir dosyayı ya da programı çalıştırmaya çalışabilir. Normal belgelerde nadirdir.")
                if (js) b += Bulgu(Seviye.SARI, "PDF içinde JavaScript var", "Bazı formlar meşru olarak kullanır; ancak PDF tabanlı saldırılarda da sık görülür. Bilgisayardaki PDF okuyucunu güncel tut.")
                if (gomulu) b += Bulgu(Seviye.SARI, "PDF içinde gömülü dosya var", "PDF'nin içine başka bir dosya eklenmiş. PDF seni o dosyayı açmaya yönlendiriyorsa açma.")
                if (otomatik && !js && !launch) b += Bulgu(Seviye.BILGI, "PDF açılışta otomatik işlem tanımlıyor", "Çoğu zaman sayfa yakınlaştırma gibi zararsız ayarlardır.")
                if (Regex("""/[A-Za-z]*#[0-9A-Fa-f]{2}""").containsMatchIn(metin)) {
                    b += Bulgu(Seviye.BILGI, "PDF içinde kodlanmış komut adları", "Komut adları gizlenmiş olabilir; bu durumda yukarıdaki kontroller bazı işaretleri kaçırabilir.")
                }
            }
            Tur.HTML, Tur.SVG -> {
                val kucuk = metin.lowercase(Locale.ROOT)
                val betik = kucuk.contains("<script") || kucuk.contains("javascript:") || Regex("""\son[a-z]+\s*=""").containsMatchIn(kucuk)
                val sifreFormu = kucuk.contains("type=\"password\"") || kucuk.contains("type='password'") || kucuk.contains("type=password")
                if (sifreFormu) {
                    b += Bulgu(
                        Seviye.SARI, "Şifre isteyen yerel sayfa",
                        "Bu dosya tarayıcıda açılınca şifre girmeni isteyen bir form gösteriyor. E-postayla gelen bu tür ekler sahte giriş sayfası olarak sık kullanılır.",
                    )
                }
                if (betik) b += Bulgu(Seviye.SARI, "Betik (JavaScript) içeriyor", "Tarayıcıda açıldığında kod çalıştırabilir ya da seni başka bir siteye götürebilir.")
            }
            else -> Unit
        }
        if (tur != Tur.BETIK && uzanti in betikUzantilari) {
            b += Bulgu(
                Seviye.SARI, "Komut dosyası (.$uzanti)",
                "Bu tür dosyalar bilgisayarda açılınca komut çalıştırır. Belge ya da fatura diye gönderildiyse açma.",
            )
        }

        // 6) Arşiv içeriği
        if (zipKayitlari != null && tur != Tur.APK && tur != Tur.OFFICE && tur != Tur.JAR) {
            if (arsivSifreli) {
                b += Bulgu(
                    Seviye.SARI, "Parolalı arşiv",
                    "İçerik şifreli olduğu için denetlenemedi. Parolalı arşivler, güvenlik taramalarından kaçmak için sık kullanılır; parola mesajın içinde verilmişse ekstra dikkatli ol.",
                )
            }
            val tehlikeliIcerik = zipKayitlari.filter { uzantisi(it) in calistirilabilirUzantilar }
            if (tehlikeliIcerik.isNotEmpty()) {
                val gizli = tehlikeliIcerik.any { cifteUzanti.containsMatchIn(it) }
                b += Bulgu(
                    if (gizli) Seviye.KIRMIZI else Seviye.SARI, "Arşivde program dosyası var",
                    "İçinde ${tehlikeliIcerik.size} çalıştırılabilir dosya var: ${tehlikeliIcerik.take(3).joinToString { it.substringAfterLast('/') }}${if (tehlikeliIcerik.size > 3) " …" else ""}." +
                        if (gizli) " En az biri çift uzantıyla belge gibi gösterilmiş." else "",
                )
            }
            if (zipKayitlari.any { it.contains("../") || it.startsWith("/") }) {
                b += Bulgu(Seviye.SARI, "Arşivde hatalı klasör yolu", "Bazı dosyalar açıldığında hedef klasörün dışına yazılmaya çalışıyor. Bu, bilinen bir saldırı yöntemidir.")
            }
            if (zipKayitlari.any { uzantisi(it) in setOf("zip", "rar", "7z", "gz") }) {
                b += Bulgu(Seviye.BILGI, "Arşivin içinde başka arşiv var", "İç içe arşivler içerikleri gizlemek için kullanılabilir. CepAkıl iç arşivleri açmaz.")
            }
            if (arsivKismi) b += Bulgu(Seviye.BILGI, "Arşivin tamamı listelenemedi", "Arşiv çok büyük ya da kısmen bozuk; yalnız okunabilen kısım denetlendi.")
        }
        if (tur == Tur.RAR || tur == Tur.YEDIZ || tur == Tur.GZIP) {
            b += Bulgu(Seviye.BILGI, "Arşivin içi denetlenemedi", "CepAkıl şimdilik yalnız ZIP arşivlerinin içini listeleyebilir.")
        }
        if (tur == Tur.BOS) b += Bulgu(Seviye.BILGI, "Dosya boş", "Dosyada hiç veri yok.")
        if (tur == Tur.BILINMIYOR) b += Bulgu(Seviye.BILGI, "Dosya türü tanınmadı", "Bu türe özgü bir kontrol yapılamadı; yalnız ad ve uzantı denetlendi.")
        if (kismi && tur in setOf(Tur.PDF, Tur.OFFICE_ESKI, Tur.HTML, Tur.SVG)) {
            b += Bulgu(Seviye.BILGI, "Yalnız ilk ${ICERIK_SINIRI / 1024 / 1024} MB içerik arandı", "Dosya büyük olduğu için içerik aramaları dosyanın başıyla sınırlı tutuldu.")
        }

        val sirali = b.oneminGoreSirala()
        val seviye = sirali.enYuksekSeviye()
        val ozet = when (seviye) {
            Seviye.KIRMIZI -> "Tehlike göstergeleri bulundu. Bu dosyayı açmaman önerilir."
            Seviye.SARI -> "İncelemen gereken işaretler var. Kimden geldiğinden emin değilsen açma."
            else -> "Bilinen göstergelere göre risk bulunamadı. Bu, dosyanın temiz olduğu anlamına gelmez."
        }
        return Sonuc(ad, boyut, tur, seviye, ozet, sirali, sha256, kismi, if (tur == Tur.APK) apk else null)
    }

    private fun apkBulgulari(a: DosyaDenetleyici.ApkOzeti): List<Bulgu> {
        val b = mutableListOf<Bulgu>()
        val gruplar = a.izinler.mapNotNull { IzinSozlugu.tanim(it)?.grup }.toSet()
        val sms = IzinSozlugu.Grup.SMS in gruplar
        val ust = IzinSozlugu.Grup.UST_KATMAN in gruplar
        if (a.erisilebilirlikHizmeti && (sms || ust || a.cihazYoneticisi)) {
            b += Bulgu(
                Seviye.KIRMIZI, "Erişilebilirlik + ${if (sms) "SMS" else if (ust) "üst katman" else "cihaz yöneticisi"} birleşimi",
                "Bu paket erişilebilirlik hizmeti tanımlıyor ve ${if (sms) "SMS izinleri" else if (ust) "diğer uygulamaların üstünde gösterme" else "cihaz yöneticisi yetkisi"} istiyor. Bu birleşim bankacılık truva atlarında çok sık görülür. Kesin kanıt değildir ama yüklemen önerilmez.",
            )
        } else if (a.erisilebilirlikHizmeti) {
            b += Bulgu(Seviye.SARI, "Erişilebilirlik hizmeti tanımlıyor", "Yüklenirse senden erişilebilirlik izni isteyebilir. Bu izni yalnız gerçekten gerekli uygulamalara ver.")
        }
        if (a.cihazYoneticisi && !a.erisilebilirlikHizmeti) {
            b += Bulgu(Seviye.SARI, "Cihaz yöneticisi olmak istiyor", "Yüklenirse kendisini kaldırmayı zorlaştırabilecek bir yetki isteyebilir.")
        }
        if (a.bildirimDinleyici) {
            b += Bulgu(Seviye.SARI, "Bildirimleri okumak istiyor", "Yüklenirse gelen bildirimlerdeki doğrulama kodlarını okuyabilir.")
        }
        val hassas = gruplar.filter { it.hassas && it != IzinSozlugu.Grup.ERISILEBILIRLIK && it != IzinSozlugu.Grup.CIHAZ_YONETICISI && it != IzinSozlugu.Grup.BILDIRIM_ERISIMI }
        if (hassas.isNotEmpty()) {
            b += Bulgu(
                if (sms) Seviye.SARI else Seviye.BILGI, "İstediği hassas izinler",
                hassas.joinToString(", ") { it.ad } + ". Bir izin tek başına zararlı olduğunu göstermez; uygulamanın amacıyla uyumlu mu diye düşün.",
            )
        }
        return b
    }
}
