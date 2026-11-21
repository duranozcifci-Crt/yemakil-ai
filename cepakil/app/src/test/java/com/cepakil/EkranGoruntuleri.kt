package com.cepakil

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import com.android.resources.NightMode
import com.cepakil.analiz.Bulgu
import com.cepakil.analiz.KodIncelemesi
import com.cepakil.analiz.Seviye
import com.cepakil.analiz.UygulamaDegerlendirici
import com.cepakil.analiz.YeniUygulamaTakibi
import com.cepakil.ui.TaramaViewModel
import com.cepakil.ui.ekranlar.AnaEkranIcerik
import com.cepakil.ui.ekranlar.BaglantiEkrani
import com.cepakil.ui.ekranlar.UygulamaDetayIcerik
import com.cepakil.ui.tema.CepAkilTema
import com.cepakil.veri.TaramaKaydi
import com.cepakil.veri.UygulamaKaynagi
import org.junit.Rule
import org.junit.Test

/**
 * Tasarımı görmek için ekran görüntüleri (Paparazzi; cihaz gerekmez).
 * Çalıştırma: ./gradlew recordPaparazziDebug -Pgoruntu
 */
class EkranGoruntuleri {

    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_5.copy(screenHeight = 4200, softButtons = false),
        theme = "android:Theme.Material.Light.NoActionBar",
    )

    private val p = "android.permission."

    private fun ornekUygulama(ad: String, paket: String, yukleyen: String?, izinler: Map<String, Boolean>, erisilebilirlik: Boolean = false) =
        UygulamaDegerlendirici.degerlendir(
            UygulamaDegerlendirici.UygulamaBilgisi(
                paket = paket, ad = ad, sistemUygulamasi = false, yukleyen = yukleyen, hedefSdk = 34,
                izinler = izinler, erisilebilirlikAcik = erisilebilirlik, surum = "2.14.1",
            ),
        )

    private val okey = ornekUygulama("101 Okey Yalla", "com.yalla.okey101yalla", "com.android.vending",
        mapOf("${p}RECORD_AUDIO" to true, "${p}CAMERA" to false, "${p}READ_PHONE_STATE" to false, "${p}INTERNET" to true, "${p}VIBRATE" to true),
        ).let { it.copy(bilgi = it.bilgi.copy(kategori = UygulamaDegerlendirici.Kategori.OYUN)) }.let { UygulamaDegerlendirici.degerlendir(it.bilgi) }

    private val kargo = ornekUygulama("Kargo Takip", "com.kargo.takip.apk", null,
        mapOf("${p}READ_SMS" to true, "${p}RECEIVE_SMS" to true, "${p}SYSTEM_ALERT_WINDOW" to true), erisilebilirlik = true)

    private val kayit = TaramaKaydi(
        zaman = 1_795_270_000_000,
        cihazBulgulari = listOf(Bulgu(Seviye.SARI, "Güvenlik güncellemesi eski (7 ay)", "Son güvenlik yaması: 2026-04-01. Yazılım güncelleme bölümüne bak.")),
        uygulamalar = listOf(kargo, okey).map { TaramaKaydi.UygulamaOzeti(it.bilgi.paket, it.bilgi.ad, it.seviye, it.bulgular) },
        incelenenUygulamaSayisi = 87,
        sistemDahil = false,
    )

    @Composable
    private fun Ekran(icerik: @Composable () -> Unit) = CepAkilTema {
        Surface(color = MaterialTheme.colorScheme.background) { icerik() }
    }

    @Test fun anaSayfa_ilkAcilis() = paparazzi.snapshot {
        Ekran { AnaEkranIcerik(TaramaViewModel.Durum(), {}, {}, {}, {}, {}, {}) }
    }

    @Test fun anaSayfa_sonuclar() = paparazzi.snapshot {
        Ekran {
            AnaEkranIcerik(
                TaramaViewModel.Durum(
                    kayit = kayit,
                    degisiklikler = listOf(TaramaViewModel.DegisiklikOzeti(okey, YeniUygulamaTakibi.Tur.YENI_IZIN, setOf("${p}RECORD_AUDIO"))),
                ),
                {}, {}, {}, {}, {}, {},
            )
        }
    }

    @Test fun anaSayfa_karanlik() {
        paparazzi.unsafeUpdateConfig(deviceConfig = DeviceConfig.PIXEL_5.copy(screenHeight = 4200, softButtons = false, nightMode = NightMode.NIGHT))
        paparazzi.snapshot { Ekran { AnaEkranIcerik(TaramaViewModel.Durum(kayit = kayit), {}, {}, {}, {}, {}, {}) } }
    }

    @Test fun uygulamaAyrintisi() = paparazzi.snapshot {
        Ekran {
            UygulamaDetayIcerik(
                kargo,
                UygulamaKaynagi.Ayrinti(1_780_000_000_000, 1_790_000_000_000, null),
                KodIncelemesi.bulgular(
                    KodIncelemesi.Sonuc(
                        setOf(KodIncelemesi.Yetenek.EKRAN_KONTROLU, KodIncelemesi.Yetenek.SMS_OKUMA, KodIncelemesi.Yetenek.UYGULAMA_LISTESI),
                        1, okunamadi = false, kismi = false,
                    ),
                ),
                {}, {},
            )
        }
    }

    @Test fun baglantiKontrolu() = paparazzi.snapshot {
        Ekran { BaglantiEkrani("Kargonuz bekliyor: http://ptt-teslimat.click/ode") {} }
    }
}
