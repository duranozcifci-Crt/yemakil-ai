package com.cepakil.analiz

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class KodVeTakipTest {

    /** Yalnız metin tablosu olan küçük, geçerli biçimde bir DEX üretir. */
    private fun dex(vararg metinler: String): ByteArray {
        val basliK = 0x70
        val kimlikler = basliK
        var veri = kimlikler + metinler.size * 4
        val cikti = ByteArray(veri + metinler.sumOf { it.length + 2 } + 8)
        "dex\n035\u0000".forEachIndexed { i, c -> cikti[i] = c.code.toByte() }
        fun yaz(o: Int, v: Int) { for (k in 0..3) cikti[o + k] = (v shr (8 * k)).toByte() }
        yaz(0x38, metinler.size); yaz(0x3C, kimlikler)
        metinler.forEachIndexed { i, m ->
            yaz(kimlikler + i * 4, veri)
            cikti[veri++] = m.length.toByte() // ULEB128 (kısa metinlerde tek bayt)
            m.forEach { cikti[veri++] = it.code.toByte() }
            cikti[veri++] = 0
        }
        return cikti
    }

    private fun apk(dex: ByteArray): ByteArray {
        val c = ByteArrayOutputStream()
        ZipOutputStream(c).use { z ->
            z.putNextEntry(ZipEntry("AndroidManifest.xml")); z.write(1); z.closeEntry()
            z.putNextEntry(ZipEntry("classes.dex")); z.write(dex); z.closeEntry()
        }
        return c.toByteArray()
    }

    private fun incele(vararg metinler: String) =
        KodIncelemesi.incele(listOf({ ByteArrayInputStream(apk(dex(*metinler))) }))

    @Test fun zararsizKodYetenekYok() {
        val s = incele("Landroid/app/Activity;", "onCreate", "setContentView")
        assertEquals(1, s.dexSayisi)
        assertTrue(s.yetenekler.isEmpty())
        assertTrue(KodIncelemesi.bulgular(s).isEmpty())
    }

    @Test fun smsGondermeBulunur() {
        val s = incele("Landroid/telephony/SmsManager;", "sendTextMessage")
        assertEquals(setOf(KodIncelemesi.Yetenek.SMS_GONDERME), s.yetenekler)
        assertEquals(Seviye.SARI, KodIncelemesi.bulgular(s).enYuksekSeviye())
    }

    @Test fun yalnizMetotAdiYetmez() {
        // SmsManager sınıfı olmadan "sendTextMessage" (ör. kendi sohbet sınıfı) sayılmaz.
        assertTrue(incele("sendTextMessage", "Lcom/ornek/Sohbet;").yetenekler.isEmpty())
    }

    @Test fun bankacilikTruvaKalibiKirmizi() {
        val s = incele(
            "Landroid/accessibilityservice/AccessibilityService;", "performGlobalAction",
            "content://sms/inbox", "setComponentEnabledSetting",
        )
        assertEquals(Seviye.KIRMIZI, KodIncelemesi.bulgular(s).enYuksekSeviye())
    }

    @Test fun bozukDexOkunamadi() {
        val c = ByteArrayOutputStream()
        ZipOutputStream(c).use { z -> z.putNextEntry(ZipEntry("classes.dex")); z.write("dex\nbozuk".toByteArray()); z.closeEntry() }
        val s = KodIncelemesi.incele(listOf({ ByteArrayInputStream(c.toByteArray()) }))
        assertTrue(s.yetenekler.isEmpty())
    }

    @Test fun apkDosyaKontrolundeKodBulgusu() {
        val veri = apk(dex("Landroid/accessibilityservice/AccessibilityService;", "dispatchGesture", "createFromPdu"))
        val s = DosyaDenetleyici.denetle("uygulama.apk", { ByteArrayInputStream(veri) })
        assertEquals(Seviye.KIRMIZI, s.seviye)
    }

    private val p = "android.permission."

    @Test fun yeniUygulamaVeYeniIzin() {
        val onceki = mapOf(
            "a" to YeniUygulamaTakibi.Iz(1, setOf("${p}CAMERA")),
            "b" to YeniUygulamaTakibi.Iz(1, emptySet()),
        )
        val simdiki = mapOf(
            "a" to YeniUygulamaTakibi.Iz(2, setOf("${p}CAMERA", "${p}RECORD_AUDIO")),
            "b" to YeniUygulamaTakibi.Iz(2, emptySet()),
            "c" to YeniUygulamaTakibi.Iz(3, emptySet()),
        )
        val d = YeniUygulamaTakibi.karsilastir(onceki, simdiki).associateBy { it.paket }
        assertEquals(2, d.size)
        assertEquals(YeniUygulamaTakibi.Tur.YENI_IZIN, d["a"]?.tur)
        assertEquals("Mikrofon", YeniUygulamaTakibi.izinGruplari(d["a"]!!.yeniIzinler))
        assertEquals(YeniUygulamaTakibi.Tur.YENI, d["c"]?.tur)
    }

    @Test fun kaldirilanVeDegismeyenSessiz() {
        val onceki = mapOf("a" to YeniUygulamaTakibi.Iz(1, setOf("${p}CAMERA")), "x" to YeniUygulamaTakibi.Iz(1, emptySet()))
        val simdiki = mapOf("a" to YeniUygulamaTakibi.Iz(5, setOf("${p}CAMERA")))
        assertTrue(YeniUygulamaTakibi.karsilastir(onceki, simdiki).isEmpty())
    }
}
