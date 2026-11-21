package com.cepakil.analiz

import java.io.InputStream
import java.util.Locale
import java.util.zip.ZipInputStream

/**
 * Bir uygulamanın APK dosyalarının içinde, şirketin iletişim e-posta adreslerini
 * arar (veri silme talebini doğru adrese göndermek için). Telefonda, internetsiz.
 *
 * Nereye bakar: derlenmiş kod (classes*.dex), kaynak tablosu (resources.arsc)
 * ve küçük metin dosyaları (assets içindeki json/html/txt/xml).
 * Hazır kütüphanelerin (Google, Facebook, reklam SDK'ları…) adresleri elenir;
 * uygulamanın kendi alan adına ve "privacy/kvkk/gdpr/destek" gibi adlara öncelik verilir.
 *
 * Sınırı: Adres uygulamanın içinde yazılı değilse bulunamaz. Bulunan adresin
 * doğru birim olduğu kesin değildir; kullanıcı göndermeden önce görür.
 */
object EpostaBulucu {

    private val epostaDeseni = Regex("""[A-Za-z0-9][A-Za-z0-9._%+\-]{0,63}@[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,24}""")

    /** Kütüphane, örnek ya da sistem adresleri (silme talebi için anlamsız). */
    private val elenenAlanlar = listOf(
        "example.", "domain.com", "email.com", "mail.com", "test.com", "yourcompany", "company.com",
        "google.com", "googlemail.com", "android.com", "gstatic.com", "firebase", "facebook.com", "fb.com",
        "apache.org", "w3.org", "mozilla.org", "jetbrains.com", "kotlinlang.org", "oracle.com", "sun.com",
        "squareup.com", "github.com", "sentry.io", "bugsnag.com", "crashlytics.com", "unity3d.com", "unity.com",
        "applovin.com", "adjust.com", "appsflyer.com", "ironsrc.com", "vungle.com", "chartboost.com",
        "mopub.com", "inmobi.com", "mintegral.com", "pangle", "bytedance.com", "tapjoy.com", "onesignal.com",
        "branch.io", "amplitude.com", "mixpanel.com", "braze.com", "airbnb.com", "microsoft.com", "apple.com",
        "jquery", "sentry.", "localhost", "noreply", "no-reply",
    )
    private val elenenUzantilar = setOf("png", "jpg", "jpeg", "gif", "webp", "svg", "js", "css", "so", "xml", "json", "html")

    private val oncelikliAdlar = listOf("kvkk", "privacy", "gizlilik", "gdpr", "dpo", "dataprotection", "data", "legal", "hukuk")
    private val iletisimAdlari = listOf("support", "destek", "help", "yardim", "contact", "iletisim", "info", "bilgi", "hello", "feedback", "cs")

    private const val DOSYA_SINIRI = 64 * 1024 * 1024

    /** Bulunan adresler, en uygun olan önce. En fazla [enFazla] adres. */
    fun bul(apklar: List<() -> InputStream>, paket: String, enFazla: Int = 5): List<String> {
        val bulunan = LinkedHashSet<String>()
        for (ac in apklar) {
            try {
                ZipInputStream(ac()).use { z ->
                    while (true) {
                        val e = z.nextEntry ?: break
                        val ad = e.name
                        val ilgili = Regex("""^classes\d*\.dex$""").matches(ad) || ad == "resources.arsc" ||
                            (ad.startsWith("assets/") && Regex("""\.(json|html?|txt|xml|properties)$""", RegexOption.IGNORE_CASE).containsMatchIn(ad))
                        if (!ilgili) continue
                        val veri = sinirliOku(z) ?: continue
                        metindenTopla(veri, bulunan)
                    }
                }
            } catch (e: Exception) {
                // Okunamayan parça atlanır.
            }
        }
        return sirala(bulunan, paket).take(enFazla)
    }

    private fun sinirliOku(giris: InputStream): ByteArray? {
        val cikti = java.io.ByteArrayOutputStream()
        val tampon = ByteArray(64 * 1024)
        while (true) {
            val n = giris.read(tampon)
            if (n < 0) break
            if (cikti.size() + n > DOSYA_SINIRI) return null
            cikti.write(tampon, 0, n)
        }
        return cikti.toByteArray()
    }

    /** Hem tek baytlı (UTF-8/dex) hem iki baytlı (UTF-16, kaynak tablosu) metinleri tarar. */
    fun metindenTopla(veri: ByteArray, bulunan: MutableSet<String>) {
        val tekBayt = String(veri, Charsets.ISO_8859_1)
        epostaDeseni.findAll(tekBayt).forEach { bulunan += it.value.lowercase(Locale.ROOT) }
        // UTF-16LE: her karakterin arkasında 0 baytı — sıfırları atıp yeniden tara.
        if (veri.size >= 4) {
            val sb = StringBuilder(veri.size / 2)
            var i = 0
            while (i + 1 < veri.size) {
                if (veri[i + 1] == 0.toByte() && veri[i] != 0.toByte()) sb.append((veri[i].toInt() and 0xFF).toChar()) else sb.append(' ')
                i += 2
            }
            epostaDeseni.findAll(sb).forEach { bulunan += it.value.lowercase(Locale.ROOT) }
        }
    }

    fun sirala(adresler: Collection<String>, paket: String): List<String> {
        val paketParcalari = paket.lowercase(Locale.ROOT).split('.', '_')
            .filter { it.length >= 3 && it !in setOf("com", "net", "org", "app", "android", "mobile", "www", "apps") }
        return adresler
            .map { it.trim('.', '-') }
            .filter { a ->
                val alan = a.substringAfter('@')
                val uzanti = alan.substringAfterLast('.')
                elenenAlanlar.none { e ->
                    // "mail.com" gibi tam alan adları yalnız kendisi ya da alt alanıyla eşleşir (gmail.com elenmez);
                    // "firebase", "example." gibi parçalar her yerde aranır.
                    val tamAlan = e.contains('.') && !e.endsWith('.')
                    (if (tamAlan) alan == e || alan.endsWith(".$e") else alan.contains(e)) || a.substringBefore('@').contains(e)
                } &&
                    uzanti !in elenenUzantilar && !a.substringBefore('@').all { it.isDigit() } &&
                    // Şifrelenmiş koddan gelen rastgele parçaları ("n@y.tc") ele: yerel kısım ≥ 2, alan adı ≥ 3 harf.
                    a.substringBefore('@').length >= 2 && alan.substringBeforeLast('.').substringAfterLast('.').length >= 3 &&
                    uzanti.all { it.isLetter() }
            }
            .distinct()
            .sortedByDescending { a -> puan(a, paketParcalari) }
            // Yalnız güvenilir adaylar: uygulamanın kendi alan adı ya da adında iletişim/gizlilik kelimesi geçen adres.
            .filter { puan(it, paketParcalari) >= 20 }
    }

    private fun puan(a: String, paketParcalari: List<String>): Int {
        val yerel = a.substringBefore('@')
        val alan = a.substringAfter('@')
        val alanAdi = alan.substringBeforeLast('.')
        var p = 10
        // Uygulamanın kendi alan adı (ör. com.yalla.okey → yalla.com) en güçlü işaret.
        val kok = alanAdi.substringAfterLast('.')
        if (paketParcalari.any { alanAdi.contains(it) || (kok.length >= 3 && it.contains(kok)) }) p += 50
        if (oncelikliAdlar.any { yerel.contains(it) }) p += 30
        else if (iletisimAdlari.any { yerel.contains(it) }) p += 15
        if (alan in setOf("gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "yandex.com")) p -= 5
        return p
    }
}
