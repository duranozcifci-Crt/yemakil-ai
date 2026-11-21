package com.cepakil.analiz

import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.util.zip.ZipInputStream

/**
 * Bir APK'nın içindeki derlenmiş kodu (classes*.dex) telefonda, internetsiz
 * inceler.
 *
 * Nasıl: DEX dosyasının "metin tablosu" okunur. Uygulama Android'in bir
 * özelliğini (ör. SMS gönderme) kullanıyorsa, o özelliğin sınıf ve metot adları
 * bu tabloda açıkça yazılıdır. Kod karıştırılmış (obfuscation) olsa bile
 * Android'in kendi adları değiştirilemez; bu yüzden bu yöntem karıştırmaya
 * karşı dayanıklıdır.
 *
 * Sınırları: Kodun gerçekten çalışıp çalışmadığını bilemez (yalnız "bu yetenek
 * kodda var" der). Meşru kütüphaneler de bu adları içerebilir. Şifrelenmiş ya
 * da sonradan indirilen kodu göremez (bunun izi "gizli kod yükleme" olarak
 * gösterilir).
 */
object KodIncelemesi {

    private const val DEX_SINIRI = 64 * 1024 * 1024
    private const val TOPLAM_SINIR = 160L * 1024 * 1024

    /**
     * Koddan çıkarılabilen yetenekler. [kaliplar] içindeki gruplardan BİRİNİN
     * tüm parçaları kodda geçiyorsa yetenek var sayılır.
     */
    enum class Yetenek(val ad: String, val aciklama: String, val tekBasina: Seviye, val kaliplar: List<List<String>>) {
        EKRAN_KONTROLU(
            "Ekranı okuyup senin adına dokunma",
            "Erişilebilirlik hizmetiyle ekrandaki yazıları okuyup düğmelere kendisi basabilir.",
            Seviye.SARI,
            listOf(
                listOf("Landroid/accessibilityservice/AccessibilityService;", "performGlobalAction"),
                listOf("Landroid/accessibilityservice/AccessibilityService;", "dispatchGesture"),
                listOf("getRootInActiveWindow", "performAction"),
            ),
        ),
        SMS_OKUMA(
            "SMS okuma",
            "Gelen kısa mesajları (doğrulama kodları dahil) okuyabilir.",
            Seviye.SARI,
            listOf(listOf("content://sms"), listOf("createFromPdu"), listOf("getMessagesFromIntent")),
        ),
        SMS_ENGELLEME(
            "SMS'i senden gizleme",
            "Gelen mesajı sen görmeden yakalayıp gizleyebilir.",
            Seviye.SARI,
            listOf(listOf("abortBroadcast", "SMS_RECEIVED")),
        ),
        SMS_GONDERME(
            "SMS gönderme",
            "Senin adına kısa mesaj gönderebilir (ücretli numaralara da).",
            Seviye.SARI,
            listOf(
                listOf("Landroid/telephony/SmsManager;", "sendTextMessage"),
                listOf("Landroid/telephony/SmsManager;", "sendMultipartTextMessage"),
            ),
        ),
        UST_KATMAN(
            "Diğer uygulamaların üstünde pencere",
            "Başka uygulamaların üstüne ekran çizebilir; sahte giriş ekranı için kullanılabilir.",
            Seviye.BILGI,
            listOf(listOf("canDrawOverlays"), listOf("android.settings.action.MANAGE_OVERLAY_PERMISSION")),
        ),
        EKRAN_KAYDI(
            "Ekran kaydı",
            "Ekranda gördüklerini kaydedebilir ya da yayınlayabilir.",
            Seviye.SARI,
            listOf(listOf("Landroid/media/projection/MediaProjection")),
        ),
        SIMGE_GIZLEME(
            "Simgesini gizleme",
            "Kendi bileşenlerini açıp kapatabilir; bazı zararlılar bununla simgesini ana ekrandan gizler.",
            Seviye.BILGI,
            listOf(listOf("setComponentEnabledSetting")),
        ),
        GIZLI_KOD(
            "Sonradan kod yükleme",
            "Uygulamayla gelmeyen ek kodu çalışırken yükleyebilir. Koruma amaçlı da kullanılır; ama CepAkıl o kodu göremez.",
            Seviye.SARI,
            listOf(listOf("Ldalvik/system/DexClassLoader;"), listOf("Ldalvik/system/InMemoryDexClassLoader;")),
        ),
        KOMUT_CALISTIRMA(
            "Sistem komutu çalıştırma",
            "Telefonda doğrudan komut çalıştırabilir ya da \"root\" yetkisi arayabilir. Bankacılık uygulamaları da root kontrolü için kullanır.",
            Seviye.BILGI,
            listOf(listOf("/system/bin/su"), listOf("/system/xbin/su"), listOf("Ljava/lang/Runtime;", "exec")),
        ),
        CIHAZ_KILITLEME(
            "Telefonu kilitleme",
            "Cihaz yöneticisi olursa ekranı kilitleyebilir ya da şifreyi değiştirebilir.",
            Seviye.SARI,
            listOf(listOf("Landroid/app/admin/DevicePolicyManager;", "lockNow"), listOf("Landroid/app/admin/DevicePolicyManager;", "resetPassword")),
        ),
        ARAMA_KAYDI(
            "Arama kayıtlarını okuma",
            "Kimi aradığını ve kimin aradığını görebilir.",
            Seviye.BILGI,
            listOf(listOf("content://call_log"), listOf("Landroid/provider/CallLog\$Calls;")),
        ),
        KISILER(
            "Rehbere erişme",
            "Rehberindeki kişileri okuyabilir.",
            Seviye.BILGI,
            listOf(listOf("Landroid/provider/ContactsContract")),
        ),
        CIHAZ_KIMLIGI(
            "Telefon ve SIM kimliğini okuma",
            "Telefonun ya da SIM kartın kimlik numaralarını okumaya çalışabilir.",
            Seviye.BILGI,
            listOf(listOf("getDeviceId"), listOf("getSubscriberId"), listOf("getSimSerialNumber")),
        ),
        UYGULAMA_LISTESI(
            "Yüklü uygulamaları listeleme",
            "Telefonda hangi uygulamaların (ör. hangi bankanın) yüklü olduğunu görebilir.",
            Seviye.BILGI,
            listOf(listOf("getInstalledPackages"), listOf("getInstalledApplications")),
        ),
    }

    data class Sonuc(
        val yetenekler: Set<Yetenek>,
        val dexSayisi: Int,
        val okunamadi: Boolean,
        val kismi: Boolean,
    )

    const val SINIR_NOTU =
        "Kod incelemesi uygulamanın hangi Android özelliklerini kullanabileceğini gösterir; bu özellikleri gerçekten nasıl kullandığını göstermez. " +
            "Büyük ve meşru uygulamalarda bu yetenekler kullandıkları hazır kütüphanelerden de gelebilir. Şifrelenmiş ya da sonradan indirilen kod görülemez."

    private val dexAdi = Regex("""^classes\d*\.dex$""")

    private val tumParcalar: List<String> = Yetenek.entries.flatMap { y -> y.kaliplar.flatten() }.distinct()

    /** Her açıcı bir APK (ZIP) dosyası döndürmelidir (ör. base.apk ve bölünmüş parçalar). */
    fun incele(apklar: List<() -> InputStream>): Sonuc {
        val bulunan = HashSet<String>()
        var dexSayisi = 0
        var okunamadi = false
        var kismi = false
        var toplam = 0L
        for (ac in apklar) {
            try {
                ZipInputStream(ac()).use { z ->
                    while (true) {
                        val e = z.nextEntry ?: break
                        if (!dexAdi.matches(e.name)) continue
                        if (toplam >= TOPLAM_SINIR) { kismi = true; break }
                        val dex = sinirliOku(z, DEX_SINIRI)
                        if (dex == null) { kismi = true; continue }
                        toplam += dex.size
                        dexSayisi++
                        if (!metinTablosunuTara(dex, bulunan)) okunamadi = true
                    }
                }
            } catch (e: Exception) {
                okunamadi = true
            }
        }
        val yetenekler = Yetenek.entries.filter { y -> y.kaliplar.any { grup -> grup.all { it in bulunan } } }.toSet()
        return Sonuc(yetenekler, dexSayisi, okunamadi && dexSayisi == 0, kismi)
    }

    private fun sinirliOku(giris: InputStream, sinir: Int): ByteArray? {
        val cikti = ByteArrayOutputStream()
        val tampon = ByteArray(64 * 1024)
        while (true) {
            val n = giris.read(tampon)
            if (n < 0) break
            if (cikti.size() + n > sinir) return null
            cikti.write(tampon, 0, n)
        }
        return cikti.toByteArray()
    }

    /**
     * DEX metin tablosunu okur; aranan parçalardan geçenleri [bulunan]'a ekler.
     * Biçim: başlıkta 0x38 = metin sayısı, 0x3C = metin kimlikleri konumu; her
     * kimlik bir metin verisine işaret eder (ULEB128 uzunluk + MUTF-8 + 0).
     */
    fun metinTablosunuTara(dex: ByteArray, bulunan: MutableSet<String>): Boolean {
        if (dex.size < 0x70 || dex[0] != 'd'.code.toByte() || dex[1] != 'e'.code.toByte() || dex[2] != 'x'.code.toByte()) return false
        fun u32(o: Int): Long = if (o < 0 || o + 4 > dex.size) -1 else
            ((dex[o].toLong() and 0xFF) or ((dex[o + 1].toLong() and 0xFF) shl 8) or
                ((dex[o + 2].toLong() and 0xFF) shl 16) or ((dex[o + 3].toLong() and 0xFF) shl 24))
        val sayi = u32(0x38)
        val konum = u32(0x3C)
        if (sayi < 0 || konum < 0 || konum + sayi * 4 > dex.size) return false
        for (i in 0 until sayi.toInt()) {
            var p = u32(konum.toInt() + i * 4).toInt()
            if (p <= 0 || p >= dex.size) continue
            // ULEB128 uzunluk (UTF-16 birimi); atla.
            var guvenlik = 0
            while (p < dex.size && (dex[p].toInt() and 0x80) != 0 && guvenlik++ < 5) p++
            p++
            val bas = p
            while (p < dex.size && dex[p] != 0.toByte() && p - bas < 2048) p++
            if (p - bas < 3) continue
            val metin = String(dex, bas, p - bas, Charsets.ISO_8859_1)
            for (parca in tumParcalar) if (parca !in bulunan && metin.contains(parca)) bulunan += parca
        }
        return true
    }

    /** Bulunan yetenekleri, birleşimleri de dikkate alarak bulgulara çevirir. */
    fun bulgular(s: Sonuc): List<Bulgu> {
        val b = mutableListOf<Bulgu>()
        if (s.okunamadi) {
            b += Bulgu(Seviye.BILGI, "Kod okunamadı", "Uygulamanın kod dosyası açılamadı ya da tanınmayan biçimde. Kod incelemesi yapılamadı.")
            return b
        }
        if (s.dexSayisi == 0) {
            b += Bulgu(Seviye.BILGI, "Kod dosyası bulunamadı", "Bu pakette derlenmiş kod yok ya da kod ayrı parçalarda. Kod incelemesi yapılamadı.")
            return b
        }
        val y = s.yetenekler
        val kontrol = Yetenek.EKRAN_KONTROLU in y
        val sms = Yetenek.SMS_OKUMA in y || Yetenek.SMS_ENGELLEME in y
        if (kontrol && (sms || Yetenek.UST_KATMAN in y)) {
            b += Bulgu(
                Seviye.KIRMIZI, "Kodda bankacılık truva atı kalıbı",
                "Kod, ekranı okuyup senin adına dokunma ile birlikte ${if (sms) "SMS okuma/gizleme" else "diğer uygulamaların üstünde pencere açma"} yeteneği içeriyor. " +
                    "Bu birleşim banka bilgisi ve doğrulama kodu çalan zararlılarda çok sık görülür. Kesin kanıt değildir; uygulamayı tanımıyorsan kaldır.",
            )
        }
        if (Yetenek.SIMGE_GIZLEME in y && (sms || kontrol)) {
            b += Bulgu(
                Seviye.KIRMIZI, "Kendini gizleyip mesaj ya da ekran okuma",
                "Kod hem simgesini gizleyebiliyor hem de ${if (sms) "SMS'leri" else "ekranı"} okuyabiliyor. Zararlıların kendini kullanıcıdan saklamak için kullandığı bir birleşim.",
            )
        }
        if (Yetenek.CIHAZ_KILITLEME in y && kontrol) {
            b += Bulgu(
                Seviye.KIRMIZI, "Telefonu kilitleyip ekranı kontrol etme",
                "Kod hem telefonu kilitleyebiliyor hem de ekranı kontrol edebiliyor. Fidye isteyen zararlılarda görülen bir birleşim.",
            )
        }
        y.filter { it.tekBasina == Seviye.SARI }.forEach { b += Bulgu(Seviye.SARI, "Kodda: ${it.ad}", it.aciklama) }
        val diger = y.filter { it.tekBasina == Seviye.BILGI }
        if (diger.isNotEmpty()) {
            b += Bulgu(Seviye.BILGI, "Koddaki diğer yetenekler", diger.joinToString("; ") { "${it.ad}: ${it.aciklama}" })
        }
        if (s.kismi) b += Bulgu(Seviye.BILGI, "Kodun bir kısmı incelendi", "Uygulama çok büyük olduğu için kodun tamamı okunamadı.")
        return b.oneminGoreSirala()
    }
}
