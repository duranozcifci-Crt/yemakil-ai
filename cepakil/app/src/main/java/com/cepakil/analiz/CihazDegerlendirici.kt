package com.cepakil.analiz

import java.time.LocalDate
import java.time.format.DateTimeParseException
import java.time.temporal.ChronoUnit

/** Telefonun genel güvenlik ayarlarını (okunabilenleri) değerlendirir. */
object CihazDegerlendirici {

    data class CihazBilgisi(
        /** Ekran kilidi (PIN, desen, şifre) var mı? Okunamadıysa null. */
        val ekranKilidi: Boolean?,
        val androidApi: Int,
        val androidSurumu: String,
        /** Build.VERSION.SECURITY_PATCH, ör. "2026-09-05". */
        val guvenlikYamasi: String?,
        val gelistiriciSecenekleri: Boolean?,
        val usbHataAyiklama: Boolean?,
        val bugun: LocalDate,
        /** Bağlı Wi-Fi ağının şifreleme türü; Wi-Fi'ye bağlı değilse YOK. */
        val wifi: WifiGuvenlik = WifiGuvenlik.YOK,
        /** Kullanıcının elle eklediği güvenlik (CA) sertifikası sayısı. */
        val kullaniciSertifikalari: Int = 0,
        /** Açık olan ve mağaza dışından yüklenmiş klavyelerin adları. */
        val magazaDisiKlavyeler: List<String> = emptyList(),
    )

    enum class WifiGuvenlik { YOK, ACIK, OWE, WEP, WPA_KISISEL, WPA3, KURUMSAL, BILINMIYOR }

    fun degerlendir(c: CihazBilgisi): List<Bulgu> {
        val b = mutableListOf<Bulgu>()

        when (c.ekranKilidi) {
            false -> b += Bulgu(
                Seviye.KIRMIZI, "Ekran kilidi yok",
                "Telefonun kaybolur ya da çalınırsa içindeki her şeye erişilebilir. PIN, desen ya da şifre koyman önerilir.",
            )
            null -> b += Bulgu(Seviye.BILGI, "Ekran kilidi okunamadı", "Ekran kilidinin açık olup olmadığını Ayarlar > Güvenlik bölümünden kontrol et.")
            true -> Unit
        }

        val yama = c.guvenlikYamasi?.let {
            try { LocalDate.parse(it) } catch (e: DateTimeParseException) { null }
        }
        if (yama != null) {
            val gun = ChronoUnit.DAYS.between(yama, c.bugun)
            val ay = gun / 30
            when {
                gun > 730 -> b += Bulgu(
                    Seviye.SARI, "Güvenlik güncellemesi çok eski ($ay ay)",
                    "Son güvenlik yaması: ${c.guvenlikYamasi}. Telefonun artık güncelleme almıyor olabilir. Bilinen açıklar kapatılmamış olabilir; bankacılık gibi işlemlerde ekstra dikkatli ol.",
                )
                gun > 180 -> b += Bulgu(
                    Seviye.SARI, "Güvenlik güncellemesi eski ($ay ay)",
                    "Son güvenlik yaması: ${c.guvenlikYamasi}. Ayarlar > Sistem > Yazılım güncelleme bölümünden yeni güncelleme olup olmadığına bak.",
                )
            }
        } else {
            b += Bulgu(Seviye.BILGI, "Güvenlik yaması tarihi okunamadı", "Ayarlar > Telefon hakkında bölümünden güvenlik yaması tarihine bakabilirsin.")
        }

        if (c.androidApi < 29) {
            b += Bulgu(
                Seviye.SARI, "Eski Android sürümü (${c.androidSurumu})",
                "Android 10'dan eski sürümler artık güvenlik güncellemesi almıyor. Mümkünse telefonu güncelle; güncellenemiyorsa yalnız güvendiğin uygulamaları kullan.",
            )
        }

        when (c.wifi) {
            WifiGuvenlik.ACIK -> b += Bulgu(
                Seviye.SARI, "Şifresiz Wi-Fi ağına bağlısın",
                "Bu ağda gönderdiğin bilgiler başkaları tarafından görülebilir ve ağ sahte olabilir. Bankacılık gibi işlemleri mobil veriyle yap; bu ağı kullanman gerekiyorsa yalnız HTTPS sitelerini aç.",
            )
            WifiGuvenlik.WEP -> b += Bulgu(
                Seviye.SARI, "Wi-Fi ağı çok eski şifreleme kullanıyor (WEP)",
                "WEP dakikalar içinde kırılabilir; ağ neredeyse şifresiz sayılır. Ağ senin ise modem ayarlarından WPA2 ya da WPA3'e geç.",
            )
            WifiGuvenlik.OWE -> b += Bulgu(
                Seviye.BILGI, "Şifresiz ama trafiği korunan Wi-Fi (Enhanced Open)",
                "Trafiğin şifrelenir ama ağa herkes katılabilir. Ağın gerçekten beklediğin yer olduğundan emin ol.",
            )
            else -> Unit
        }

        if (c.kullaniciSertifikalari > 0) {
            b += Bulgu(
                Seviye.SARI, "Telefona elle güvenlik sertifikası eklenmiş (${c.kullaniciSertifikalari})",
                "Bu tür bir sertifika, internet trafiğinin (şifreli olsa bile) başkası tarafından görülmesine olanak verebilir. " +
                    "İş telefonu ya da şirket ağı için eklendiyse normaldir; tanımıyorsan Ayarlar > Güvenlik > Şifreleme ve kimlik bilgileri > Kullanıcı sertifikaları bölümünden kaldır.",
            )
        }
        if (c.magazaDisiKlavyeler.isNotEmpty()) {
            b += Bulgu(
                Seviye.SARI, "Mağaza dışından yüklenmiş klavye açık",
                "${c.magazaDisiKlavyeler.joinToString()} klavyesi açık. Klavyeler yazdığın her şeyi (şifreler dahil) görebilir; tanımıyorsan Ayarlar > Genel yönetim > Klavye listesinden kapat.",
            )
        }

        if (c.usbHataAyiklama == true) {
            b += Bulgu(
                Seviye.SARI, "USB hata ayıklama açık",
                "Telefon bir bilgisayara bağlandığında derin erişime izin verilebilir. Geliştirici değilsen Geliştirici seçeneklerinden kapat.",
            )
        } else if (c.gelistiriciSecenekleri == true) {
            b += Bulgu(Seviye.BILGI, "Geliştirici seçenekleri açık", "Tek başına risk değildir. Kullanmıyorsan kapatabilirsin.")
        }

        return b.oneminGoreSirala()
    }
}
