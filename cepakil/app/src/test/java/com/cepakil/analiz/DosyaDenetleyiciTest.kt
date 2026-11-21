package com.cepakil.analiz

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class DosyaDenetleyiciTest {

    private fun denetle(ad: String, veri: ByteArray, apk: DosyaDenetleyici.ApkOzeti? = null) =
        DosyaDenetleyici.denetle(ad, { ByteArrayInputStream(veri) }, apk)

    private fun zip(vararg kayitlar: Pair<String, String>): ByteArray {
        val cikti = ByteArrayOutputStream()
        ZipOutputStream(cikti).use { z ->
            for ((ad, icerik) in kayitlar) {
                z.putNextEntry(ZipEntry(ad)); z.write(icerik.toByteArray()); z.closeEntry()
            }
        }
        return cikti.toByteArray()
    }

    @Test fun duzPdfRiskBulunamadiDer() {
        val s = denetle("rapor.pdf", "%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF".toByteArray())
        assertEquals(DosyaDenetleyici.Tur.PDF, s.tur)
        assertEquals(Seviye.YESIL, s.seviye)
        assertTrue(s.ozet.contains("temiz olduğu anlamına gelmez"))
        assertEquals(64, s.sha256.length)
    }

    @Test fun javascriptliPdfSari() {
        val s = denetle("form.pdf", "%PDF-1.4\n<< /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >>".toByteArray())
        assertEquals(Seviye.SARI, s.seviye)
    }

    @Test fun pdfGibiGorunenProgramKirmizi() {
        val s = denetle("fatura.pdf", byteArrayOf(0x4D, 0x5A, 0x90.toByte(), 0, 3, 0, 0, 0))
        assertEquals(DosyaDenetleyici.Tur.EXE, s.tur)
        assertEquals(Seviye.KIRMIZI, s.seviye)
    }

    @Test fun ciftUzantiKirmizi() {
        val s = denetle("fatura.pdf.apk", zip("AndroidManifest.xml" to "x", "classes.dex" to "dex\n"))
        assertEquals(DosyaDenetleyici.Tur.APK, s.tur)
        assertEquals(Seviye.KIRMIZI, s.seviye)
    }

    @Test fun yonKarakteriKirmizi() {
        assertEquals(Seviye.KIRMIZI, denetle("fatura‮fdp.exe", "merhaba".toByteArray()).seviye)
    }

    @Test fun apkSariVeTruvaBirlesimiKirmizi() {
        val veri = zip("AndroidManifest.xml" to "x", "classes.dex" to "dex\n", "resources.arsc" to "r")
        assertEquals(Seviye.SARI, denetle("uygulama.apk", veri).seviye)
        val truva = DosyaDenetleyici.ApkOzeti(
            "com.ornek", "1.0",
            listOf("android.permission.RECEIVE_SMS", "android.permission.READ_SMS"),
            erisilebilirlikHizmeti = true, cihazYoneticisi = false, bildirimDinleyici = false,
        )
        val s = denetle("uygulama.apk", veri, truva)
        assertEquals(Seviye.KIRMIZI, s.seviye)
        assertEquals("com.ornek", s.apk?.paket)
    }

    @Test fun makroluWordSari() {
        val veri = zip("[Content_Types].xml" to "x", "word/document.xml" to "x", "word/vbaProject.bin" to "x")
        val s = denetle("teklif.docm", veri)
        assertEquals(DosyaDenetleyici.Tur.OFFICE, s.tur)
        assertEquals(Seviye.SARI, s.seviye)
    }

    @Test fun makrosuzWordRiskYok() {
        val veri = zip("[Content_Types].xml" to "x", "word/document.xml" to "x")
        assertEquals(Seviye.YESIL, denetle("teklif.docx", veri).seviye)
    }

    @Test fun arsivIcindeGizliProgramKirmizi() {
        val veri = zip("belgeler/fatura.pdf.exe" to "MZ")
        assertEquals(Seviye.KIRMIZI, denetle("belgeler.zip", veri).seviye)
    }

    @Test fun arsivIcindeProgramSari() {
        assertEquals(Seviye.SARI, denetle("kurulum.zip", zip("setup.exe" to "MZ")).seviye)
    }

    @Test fun sifreIsteyenHtmlSari() {
        val html = "<html><body><form action='x'><input type=\"password\" name=p></form></body></html>"
        assertEquals(Seviye.SARI, denetle("ekstre.html", html.toByteArray()).seviye)
    }

    @Test fun pngResimYesil() {
        val png = byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0)
        assertEquals(Seviye.YESIL, denetle("foto.png", png).seviye)
    }

    @Test fun jpgAdliPngYalnizBilgi() {
        val png = byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0)
        assertEquals(Seviye.BILGI, denetle("foto.jpg", png).seviye)
    }

    @Test fun betikDosyasiSari() {
        assertEquals(Seviye.SARI, denetle("odeme.js", "var a = 1;".toByteArray()).seviye)
    }

    @Test fun bosDosya() {
        val s = denetle("bos.txt", ByteArray(0))
        assertEquals(DosyaDenetleyici.Tur.BOS, s.tur)
        assertEquals(0L, s.boyut)
    }

    @Test fun sha256DogruHesaplanir() {
        val s = denetle("a.txt", "abc".toByteArray())
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", s.sha256)
    }
}
