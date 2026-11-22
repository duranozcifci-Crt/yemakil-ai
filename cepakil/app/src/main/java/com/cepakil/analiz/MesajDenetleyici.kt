package com.cepakil.analiz

import java.util.Locale

/**
 * SMS, WhatsApp ya da e-postayla gelen bir mesajın TAMAMINI dolandırıcılık
 * işaretleri açısından denetler (telefonda, internetsiz).
 *
 * Neden: Dolandırıcılık mesajlarının çoğu yalnız bağlantıdan anlaşılmaz; asıl
 * işaret, mesajın kurgusudur: aciliyet + kurum adı + para/kod isteği gibi.
 * Bu yüzden mesajdaki ifadeler kalıp gruplarına ayrılır, birleşimler
 * değerlendirilir ve içindeki her bağlantı ayrıca [BaglantiDenetleyici] ile
 * denetlenir.
 *
 * Sınırı: Kurallar Türkçe dolandırıcılık kalıplarına göre yazılmıştır; yeni
 * bir kurguyu tanımayabilir. İşaret bulunmazsa mesaj "güvenli" ilan edilmez.
 */
object MesajDenetleyici {

    data class Sonuc(
        val seviye: Seviye,
        val ozet: String,
        val bulgular: List<Bulgu>,
        val baglantilar: List<BaglantiDenetleyici.Sonuc>,
        val mesajMi: Boolean,
        val girdi: String = "",
    )

    enum class Kalip(val ad: String, val sozcukler: List<String>) {
        ACILIYET("Aciliyet baskısı", listOf(
            "acil", "hemen", "son gun", "son saat", "24 saat", "48 saat", "bugun icinde", "derhal", "en gec",
            "kapatilacak", "askiya", "bloke", "engellen", "iptal edilecek", "sure doluyor", "son uyari", "son firsat",
        )),
        PARA("Ödeme ya da para isteği", listOf(
            "odeme", "odeyin", "ucret", "borc", "ceza", "gumruk", "vergi", "aidat", "harc", "havale", "eft",
            "iban", "para gonder", "kart bilgi", "kredi karti", "tl yatir", "yatirin", "tahsil",
        )),
        ODUL("Ödül ya da hediye vaadi", listOf(
            "kazandiniz", "kazandin", "hediye", "odul", "cekilis", "bedava", "ucretsiz", "bonus", "puan kazan",
            "hediye ceki", "tebrikler", "sansli", "iade hakki", "para iadesi",
        )),
        KURUM("Kurum ya da yetkili adı", listOf(
            "e-devlet", "edevlet", "ptt", "kargo", "gonderiniz", "gonderi", "teslim edilemedi", "adres bilgi",
            "banka", "polis", "emniyet", "savcilik", "jandarma", "mahkeme", "icra", "sgk", "vergi dairesi",
            "turkcell", "vodafone", "turk telekom", "hgs", "ogs", "trafik cezasi", "masak", "bddk",
        )),
        KOD_ISTEME("Kod ya da şifre isteği", listOf(
            "dogrulama kodu", "onay kodu", "sms kodu", "guvenlik kodu", "tek kullanimlik", "gelen kodu",
            "sifreni", "sifrenizi", "parolani", "parolanizi", "sifre", "parola",
        )),
        YATIRIM("Yüksek kazanç ya da yatırım vaadi", listOf(
            "kripto", "bitcoin", "yatirim firsati", "garantili kazanc", "garanti getiri", "gunluk kazanc",
            "pasif gelir", "borsa uzmani", "sinyal grubu", "katlayin", "kat kazanc",
        )),
        IS_TEKLIFI("Kolay iş teklifi", listOf(
            "evden calis", "evden is", "begeni yap", "like at", "yorum yap kazan", "gorev basina",
            "part time", "ek gelir",
        )),
        YAKIN_TAKLIDI("Yakın taklidi", listOf(
            "telefonum bozuldu", "yeni numaram", "bu numaram", "anne ben", "baba ben", "numarami kaydet",
            "kimseye soyleme", "sonra anlatirim",
        )),
        UYGULAMA_YUKLE("Uygulama yükletme", listOf(
            ".apk", "uygulamayi indir", "uygulamayi yukle", "linkten indir", "guncellemeyi yukle", "destek uygulamasi",
            "anydesk", "teamviewer", "ekran paylas",
        )),
    }

    private val riskliKaliplar = setOf(Kalip.PARA, Kalip.ODUL, Kalip.YATIRIM, Kalip.IS_TEKLIFI, Kalip.YAKIN_TAKLIDI, Kalip.UYGULAMA_YUKLE)

    private val ibanDeseni = Regex("""\bTR\s?\d{2}(?:\s?\d{4}){5}\s?\d{2}\b""", RegexOption.IGNORE_CASE)
    private val baglantiDeseni = Regex(
        """(?i:\b(?:https?://|www\.)\S+)""" +
            """|(?<![@\w.\-])[a-z0-9][a-z0-9\-]{0,62}(?:\.[a-z0-9][a-z0-9\-]{0,62})*""" +
            """\.(?:com\.tr|net\.tr|org\.tr|gov\.tr|edu\.tr|bel\.tr|k12\.tr|av\.tr|gen\.tr|biz\.tr|info\.tr|web\.tr|""" +
            """com|net|org|info|xyz|top|click|link|site|online|shop|live|tr|me|ly|co|io|app)""" +
            """(?![a-z0-9\-]|\.[a-z0-9])(?:/\S*)?""",
    )

    /** Kod istemi: "kodu paylaşır mısınız" evet; "kimseyle paylaşmayınız" hayır (olumsuz ek). */
    private val istekFiili = Regex("""(paylas|ilet|gonder|soyle|bildir|yazar|okur|ver)(?!m[ae])(ir|in|ebilir|abilir|er|ar|\s|$|\b)""")
    private val kodUyarisi = Regex("""(kimseyle|kimseye|hicbir|hic kimse)[^.!?]{0,40}(paylasma|verme|soyleme|iletme)|paylasmayiniz|paylasmayin""")

    fun kodIstiyorMu(metin: String): Boolean {
        val s = sadelestir(metin)
        if (Kalip.KOD_ISTEME.sozcukler.none { s.contains(it) }) return false
        // Uyarı cümlelerini çıkar, kalan metinde istek fiili ara.
        val uyarisiz = kodUyarisi.replace(s, " ")
        return istekFiili.containsMatchIn(uyarisiz)
    }

    private fun resmiAdresMi(b: BaglantiDenetleyici.Sonuc): Boolean {
        val host = b.alanAdi ?: return false
        val kayitli = BaglantiDenetleyici.kayitliAlanAdi(host)
        if (kayitli in BaglantiDenetleyici.kisalticilar) return false
        return BaglantiDenetleyici.kurumlar.any { kayitli in it.resmi } || BaglantiDenetleyici.belgeliUzantiMi(kayitli)
    }

    /** Türkçe karakterleri sadeleştirir: "Ödemenizi Yapın" → "odemenizi yapin". */
    fun sadelestir(s: String): String = s.lowercase(Locale("tr"))
        .replace('ı', 'i').replace('ğ', 'g').replace('ü', 'u').replace('ş', 's').replace('ö', 'o').replace('ç', 'c')
        .replace('â', 'a').replace('î', 'i').replace('û', 'u')

    fun bulunanKaliplar(metin: String): Set<Kalip> {
        val s = sadelestir(metin)
        // Kısa sözcükler ("acil", "eft", "ptt") yalnız tam sözcük olarak sayılır: "açılış" ≠ "acil".
        return Kalip.entries.filter { k ->
            k.sozcukler.any { w -> if (w.length <= 4) Regex("""(^|[^a-z0-9])${Regex.escape(w)}($|[^a-z0-9])""").containsMatchIn(s) else s.contains(w) }
        }.toSet()
    }

    fun baglantilariAyikla(metin: String): List<String> =
        baglantiDeseni.findAll(metin).map { it.value.trimEnd('.', ',', ';', ':', '!', '?', ')', ']', '"', '\'', '»') }
            .filter { !it.contains('@') }.distinct().take(5).toList()

    fun denetle(hamMetin: String): Sonuc {
        val metin = hamMetin.trim()
        val baglantilar = baglantilariAyikla(metin)
        // Yalnız bir bağlantı yapıştırıldıysa: bağlantı kontrolü.
        val yalnizBaglanti = baglantilar.size == 1 && metin.length <= baglantilar[0].length + 2 && !metin.contains(' ')
        val baglantiSonuclari = baglantilar.map { BaglantiDenetleyici.denetle(it) }
        if (yalnizBaglanti || metin.isEmpty()) {
            val b = baglantiSonuclari.firstOrNull() ?: BaglantiDenetleyici.denetle(metin)
            return Sonuc(b.seviye, b.ozet, b.bulgular, listOf(b), mesajMi = false, girdi = metin)
        }

        val kodVar = Kalip.KOD_ISTEME in bulunanKaliplar(metin)
        val kodIstegi = kodIstiyorMu(metin)
        val k = bulunanKaliplar(metin) - Kalip.KOD_ISTEME + (if (kodIstegi) setOf(Kalip.KOD_ISTEME) else emptySet())
        val iban = ibanDeseni.containsMatchIn(metin)
        // Bağlantılar resmi adrese gidiyorsa (ör. turkcell.com.tr) "bağlantılı" kurallar kırmızı vermez.
        val hepsiResmi = baglantiSonuclari.isNotEmpty() && baglantiSonuclari.all { resmiAdresMi(it) && it.seviye.agirlik < Seviye.SARI.agirlik }
        val linkVar = baglantilar.isNotEmpty() && !hepsiResmi
        val linkSeviye = baglantiSonuclari.map { it.seviye }.maxByOrNull { it.agirlik } ?: Seviye.YESIL
        val b = mutableListOf<Bulgu>()

        // Güçlü birleşimler (kırmızı)
        if (Kalip.KOD_ISTEME in k) {
            b += Bulgu(Seviye.KIRMIZI, "Senden kod ya da şifre isteniyor",
                "Bankalar, operatörler, kargo firmaları ve devlet kurumları SMS ile gelen kodu ya da şifreni ASLA istemez. Bu kodu kimseyle paylaşma.")
        } else if (kodVar && linkVar) {
            b += Bulgu(Seviye.KIRMIZI, "Kod ile birlikte bağlantı",
                "Mesajda bir doğrulama kodu ve bir bağlantı birlikte var. Gerçek doğrulama mesajları seni bir siteye kod girmeye yönlendirmez; bağlantıyı açma.")
        } else if (kodVar) {
            b += Bulgu(Seviye.BILGI, "Normal bir doğrulama mesajına benziyor",
                "Bu, bankanın ya da bir hizmetin gönderdiği tek kullanımlık kod mesajı gibi görünüyor. Kodu yalnız kendin, kendi başlattığın işlemde kullan; seni arayan ya da yazan kimseyle paylaşma.")
        }
        if (hepsiResmi) {
            b += Bulgu(Seviye.BILGI, "Bağlantı resmi adrese gidiyor",
                "Mesajdaki bağlantı ${baglantiSonuclari.mapNotNull { it.alanAdi }.joinToString()} adresine gidiyor; bu, kurumun bilinen resmi adresi. Yine de işlemi kurumun uygulamasından yapmak en güvenlisi.")
        }
        if (Kalip.KURUM in k && linkVar && (Kalip.PARA in k || Kalip.ACILIYET in k)) {
            b += Bulgu(Seviye.KIRMIZI, "Kurum adıyla bağlantılı ödeme/acele çağrısı",
                "Mesaj bir kurum adı kullanıp bağlantıya tıklayarak ödeme ya da işlem yapmanı istiyor. Kargo, e-Devlet, PTT ve ceza dolandırıcılıklarının en yaygın kurgusu budur. Bağlantıyı açma; işlemi kurumun resmi uygulamasından kendin kontrol et.")
        }
        if (Kalip.ODUL in k && (linkVar || Kalip.PARA in k)) {
            b += Bulgu(Seviye.KIRMIZI, "Ödül karşılığı bağlantı ya da ödeme",
                "\"Kazandınız\" deyip bağlantıya tıklatma ya da \"kargo/vergi ücreti\" isteme, hediye dolandırıcılığının bilinen kurgusudur.")
        }
        if (Kalip.YAKIN_TAKLIDI in k && (Kalip.PARA in k || iban)) {
            b += Bulgu(Seviye.KIRMIZI, "Yakınını taklit edip para isteme",
                "\"Telefonum bozuldu, bu yeni numaram\" diyerek para isteyen mesajlar çok yaygındır. Para göndermeden önce kişiyi eski numarasından ARA.")
        }
        if (Kalip.UYGULAMA_YUKLE in k && (Kalip.KURUM in k || Kalip.ODUL in k || linkVar)) {
            b += Bulgu(Seviye.KIRMIZI, "Uygulama yükletmeye çalışıyor",
                "Mesaj bir uygulama (APK) ya da uzaktan erişim programı yüklemeni istiyor. Banka hesabını ele geçirmenin en sık yolu budur. Yükleme.")
        }
        if (iban && Kalip.ACILIYET in k) {
            b += Bulgu(Seviye.KIRMIZI, "Acele IBAN'a para gönderme isteği",
                "Mesajda bir IBAN var ve hemen ödeme yapman isteniyor. Kişiyi ya da kurumu bildiğin numaradan arayıp doğrulamadan para gönderme.")
        }
        if ((Kalip.YATIRIM in k || Kalip.IS_TEKLIFI in k) && (linkVar || Kalip.PARA in k || iban)) {
            b += Bulgu(Seviye.KIRMIZI, "Kolay kazanç vaadi",
                "Garantili kazanç, kripto ya da \"beğeni yap para kazan\" teklifleri, önce küçük kazanç gösterip sonra büyük para isteyen dolandırıcılıklardır.")
        }

        // Tek başına işaretler. Gündelik mesajlarda da geçebilecekleri için ("hemen geliyorum",
        // "kargon geldi") yalnız birden fazla işaret ya da bağlantıyla birlikteyse "incele" sayılır.
        val kirmiziVar = b.isNotEmpty()
        val tekliSeviye = when {
            kirmiziVar -> Seviye.BILGI
            linkVar || iban -> Seviye.SARI
            // Bağlantı yoksa: en az bir "riskli" istek (para, ödül, yükletme…) ve bir işaret daha.
            k.size >= 2 && k.any { it in riskliKaliplar } -> Seviye.SARI
            else -> Seviye.BILGI
        }
        k.filter { it != Kalip.KOD_ISTEME }.forEach { kalip -> b += Bulgu(tekliSeviye, kalip.ad, aciklama(kalip)) }
        if (iban && b.none { it.baslik.contains("IBAN") }) {
            b += Bulgu(Seviye.SARI, "Mesajda IBAN var", "Bu IBAN'a para göndermeden önce alıcıyı bildiğin bir yoldan doğrula.")
        }

        // Bağlantıların kendi sonuçları
        baglantiSonuclari.forEach { s ->
            if (s.seviye.agirlik >= Seviye.SARI.agirlik) {
                b += Bulgu(s.seviye, "Bağlantı: ${s.alanAdi ?: s.girilen.take(40)}", s.bulgular.firstOrNull { it.seviye == s.seviye }?.aciklama ?: s.ozet)
            }
        }

        val sirali = b.oneminGoreSirala()
        val seviye = sirali.enYuksekSeviye().let { if (it == Seviye.YESIL) Seviye.BILGI else it }
        val ozet = when (seviye) {
            Seviye.KIRMIZI -> "Bu mesaj bilinen bir dolandırıcılık kurgusuna benziyor. Bağlantıyı açma, kod paylaşma, para gönderme."
            Seviye.SARI -> "Dikkat gerektiren işaretler var. Göndereni bildiğin bir yoldan doğrulamadan işlem yapma."
            else -> "Kesin sonuç verilemiyor. Bilinen dolandırıcılık işaretlerine rastlanmadı; bu, mesajın güvenli olduğu anlamına gelmez."
        }
        return Sonuc(seviye, ozet, sirali, baglantiSonuclari, mesajMi = true, girdi = metin)
    }

    private fun aciklama(k: Kalip): String = when (k) {
        Kalip.ACILIYET -> "Mesaj seni acele ettirmeye çalışıyor. Dolandırıcılar düşünmeden işlem yapman için süre baskısı kurar."
        Kalip.PARA -> "Mesaj ödeme, ceza ya da para transferinden söz ediyor. Ödemeyi yalnız kurumun resmi uygulamasından yap."
        Kalip.ODUL -> "Beklemediğin bir ödül ya da hediye vaadi var. Gerçek kampanyalar senden ücret ya da kart bilgisi istemez."
        Kalip.KURUM -> "Mesaj bir kurum adı kullanıyor. Kurumların adı kolayca taklit edilebilir; gönderen numarayı ve bağlantıyı kontrol et."
        Kalip.KOD_ISTEME -> "Kod ya da şifre isteniyor."
        Kalip.YATIRIM -> "Yatırım ya da kripto kazancı vaadi var. Garantili kazanç diye bir şey yoktur."
        Kalip.IS_TEKLIFI -> "Kolay iş teklifi var. \"Görev başına ödeme\" dolandırıcılıkları önce küçük para verip sonra büyük para ister."
        Kalip.YAKIN_TAKLIDI -> "Bir yakının gibi yazılmış olabilir. Emin olmak için kişiyi bildiğin numarasından ara."
        Kalip.UYGULAMA_YUKLE -> "Bir uygulama ya da uzaktan erişim programı yüklemenden söz ediyor. Bunu yalnız tanıdığın biri için yap."
    }
}
