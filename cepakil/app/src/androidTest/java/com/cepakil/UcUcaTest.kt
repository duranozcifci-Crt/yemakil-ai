package com.cepakil

import android.graphics.Bitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.hasScrollAction
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.performScrollToNode
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.lifecycle.Lifecycle
import androidx.test.espresso.Espresso
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.FixMethodOrder
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TestWatcher
import org.junit.runner.Description
import org.junit.runner.RunWith
import org.junit.runners.MethodSorters
import java.io.File
import java.io.FileInputStream

/**
 * Sanal telefonda uçtan uca denetim. GitHub Actions her derlemede çalıştırır;
 * biri başarısız olursa APK yayımlanmaz. Ekran görüntüleri uygulamanın
 * files/ekran klasörüne yazılır ve derleme sistemi tarafından alınır.
 *
 * Ön koşul: com.cepakil.ornek (ornek modülü) "adb install" ile kurulmuş olmalı
 * (yükleyen = adb → mağaza dışı; SMS izni istiyor).
 */
@RunWith(AndroidJUnit4::class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
class UcUcaTest {

    @get:Rule(order = 0)
    val k = createAndroidComposeRule<MainActivity>()

    /** Test başarısız olursa o anki ekranın görüntüsünü alır (hatayı görerek düzeltmek için). */
    @get:Rule(order = 1)
    val izleyici = object : TestWatcher() {
        override fun failed(e: Throwable?, d: Description) {
            try { foto("HATA_${d.methodName}") } catch (_: Throwable) { }
        }
    }

    private val deneme = "CepAkıl Deneme Uygulaması"

    private fun foto(ad: String) {
        k.waitForIdle()
        val bmp = k.onRoot().captureToImage().asAndroidBitmap()
        val klasor = File(k.activity.filesDir, "ekran").apply { mkdirs() }
        File(klasor, "$ad.png").outputStream().use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    private fun var_(metin: String) = k.onAllNodesWithText(metin, substring = true).fetchSemanticsNodes().isNotEmpty()

    private fun bekle(metin: String, sure: Long = 30_000) = k.waitUntil(sure) { var_(metin) }

    private fun sekme(rota: String) {
        k.onNodeWithTag("sekme_$rota").performClick()
        k.waitForIdle()
    }

    private fun kabuk(komut: String): String {
        val pfd = InstrumentationRegistry.getInstrumentation().uiAutomation.executeShellCommand(komut)
        return FileInputStream(pfd.fileDescriptor).use { it.readBytes().decodeToString() }.also { pfd.close() }
    }

    @Test fun t1_anaSayfaTaramasi() {
        k.waitUntil(30_000) { var_("Taramayı başlat") || var_("Yeniden tara") }
        foto("1_ana_sayfa")
        k.onNode(hasText("Taramayı başlat").or(hasText("Yeniden tara"))).performClick()
        bekle("koruma puanı", 90_000)
        foto("2_tarama_sonucu")
    }

    @Test fun t2_magazaDisiUygulamaYakalanir() {
        sekme("uygulamalar")
        k.waitUntil(60_000) { var_("uygulama ·") }
        k.onAllNodes(hasSetTextAction()).onFirst().performTextInput("Deneme")
        Espresso.closeSoftKeyboard()
        bekle(deneme)
        foto("3_uygulamalar")
        k.onNodeWithText(deneme).performClick()
        bekle("Mağaza dışı")
        foto("4_uygulama_ayrintisi")
        // Bulgular listenin aşağısında olabilir: önce oraya kaydır.
        k.onAllNodes(hasScrollAction()).onFirst().performScrollToNode(hasText("Bilinen bir mağazadan yüklenmemiş", substring = true))
        bekle("Bilinen bir mağazadan yüklenmemiş")
        foto("4b_neden_isaretlendi")
    }

    @Test fun t3_kaldirilanUygulamaListedenDuser() {
        sekme("uygulamalar")
        k.waitUntil(60_000) { var_("uygulama ·") }
        k.onAllNodes(hasSetTextAction()).onFirst().performTextInput("Deneme")
        Espresso.closeSoftKeyboard()
        bekle(deneme)
        kabuk("pm uninstall com.cepakil.ornek")
        // Kullanıcı başka uygulamadan dönmüş gibi: ekran önce arka plana, sonra öne.
        k.activityRule.scenario.moveToState(Lifecycle.State.CREATED)
        k.activityRule.scenario.moveToState(Lifecycle.State.RESUMED)
        k.waitUntil(60_000) { !var_(deneme) }
        foto("5_kaldirildiktan_sonra")
    }

    @Test fun t4_dolandiricilikMesaji() {
        sekme("baglanti")
        k.onAllNodes(hasSetTextAction()).onFirst()
            .performTextInput("PTT: Gönderiniz adres eksikliği nedeniyle teslim edilemedi. 24 saat içinde ödeme yapın: ptt-kargo.top/ode")
        Espresso.closeSoftKeyboard()
        k.onNodeWithText("Kontrol et").performClick()
        bekle("Dolandırıcılık işaretleri var")
        foto("6_mesaj_kontrolu")
    }

    @Test fun t5_dosyaVeAyarlar() {
        sekme("dosya")
        bekle("Dosya seç")
        foto("7_dosya")
        sekme("ayarlar")
        bekle("Çevrimiçi tehdit veritabanı")
        bekle("Web koruması")
        foto("8_ayarlar")
    }

    /** Koruma özellikleri gerçekten çalışıyor mu: bildirim, web korumasının engellemesi ve iletmesi, izin listesi. */
    @Test fun t6_koruma() {
        val ctx = k.activity.applicationContext
        val a = com.cepakil.koruma.KorumaAyarlari(ctx)
        kabuk("pm grant com.cepakil android.permission.POST_NOTIFICATIONS")
        kabuk("appops set com.cepakil ACTIVATE_VPN allow")

        // 1) Anlık koruma uyarısı bildirim olarak görünüyor mu?
        com.cepakil.koruma.Bildirimler.uygulamaUyarisi(ctx, "com.cepakil.ornek", "Deneme Uyarisi", true, "Deneme")
        val nm = ctx.getSystemService(android.app.NotificationManager::class.java)
        k.waitUntil(15_000) {
            nm.activeNotifications.any { it.notification.extras.getCharSequence("android.title")?.contains("Deneme Uyarisi") == true }
        }
        nm.cancelAll()

        // 2) Web koruması: listedeki site engelleniyor, normal site açılıyor.
        val engelli = "cepakil-deneme-engelli.example"
        fun listeyiKur() {
            com.cepakil.analiz.TehditKaynagi.veritabani =
                com.cepakil.analiz.TehditVeritabani(emptySet(), setOf(engelli), emptySet(), 1L)
        }
        listeyiKur()
        org.junit.Assert.assertNull("VPN onayı verilemedi", android.net.VpnService.prepare(ctx))
        a.webKoruma = true
        com.cepakil.koruma.CepAkilVpn.baslat(ctx)
        k.waitUntil(20_000) { com.cepakil.koruma.CepAkilVpn.aktifMi(ctx) }
        Thread.sleep(1500)
        val once = a.engellenenSayisi
        repeat(4) {
            if (a.engellenenSayisi == once) {
                listeyiKur()
                kabuk("ping -c 1 -W 3 $engelli")
                Thread.sleep(1500)
            }
        }
        org.junit.Assert.assertTrue("Listedeki site engellenmedi", a.engellenenSayisi > once)
        org.junit.Assert.assertTrue(engelli in a.sonEngellenenler)
        val normal = kabuk("ping -c 1 -W 5 google.com")
        org.junit.Assert.assertTrue("Web koruması açıkken normal site çözülemedi: $normal", normal.contains("PING"))

        // 3) Ayarlar: korumanın açık göründüğü ve engellenen siteye izin verilebildiği.
        sekme("ana")
        sekme("ayarlar")
        bekle("Son engellenen siteler")
        k.onNodeWithText("İzin ver").performScrollTo()
        foto("9_koruma")
        k.onNodeWithText("İzin ver").performClick()
        k.waitUntil(10_000) { engelli in a.izinliSiteler }
        bekle("İzin verdiğin siteler")

        // Temizlik
        com.cepakil.koruma.CepAkilVpn.durdur(ctx)
        k.waitUntil(15_000) { !com.cepakil.koruma.CepAkilVpn.aktifMi(ctx) }
        a.webKoruma = false
        a.izinliSiteler = emptySet()
        a.engellenenleriTemizle()
        com.cepakil.analiz.TehditKaynagi.veritabani = null
    }
}
