package com.cepkalkan.veri

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import com.cepkalkan.analiz.DosyaDenetleyici
import java.io.File
import java.io.FileNotFoundException
import java.util.zip.ZipInputStream

/**
 * Kullanıcının sistem dosya seçiciyle (Storage Access Framework) seçtiği TEK
 * dosyayı okur. Depolama izni gerekmez: Android yalnız seçilen dosyaya geçici
 * okuma yetkisi verir.
 *
 * Dosya hiçbir yere gönderilmez. Yalnız APK dosyalarında, Android'in paket
 * okuyucusu dosya yolu istediği için uygulamanın kendi önbelleğine geçici bir
 * kopya alınır ve denetim biter bitmez silinir.
 */
class DosyaKaynagi(private val context: Context) {

    class DosyaOkunamadi(mesaj: String) : Exception(mesaj)

    fun denetle(uri: Uri): DosyaDenetleyici.Sonuc {
        val cr = context.contentResolver
        var ad = "adsız dosya"
        try {
            cr.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
                if (c.moveToFirst() && !c.isNull(0)) ad = c.getString(0)
            }
        } catch (e: SecurityException) {
            throw DosyaOkunamadi("Bu dosyayı okuma yetkisi alınamadı. Dosyayı yeniden seçmeyi dene.")
        }

        val ac = {
            try {
                cr.openInputStream(uri) ?: throw DosyaOkunamadi("Dosya açılamadı.")
            } catch (e: FileNotFoundException) {
                throw DosyaOkunamadi("Dosya bulunamadı ya da artık erişilemiyor.")
            } catch (e: SecurityException) {
                throw DosyaOkunamadi("Bu dosyayı okuma yetkisi yok. Dosyayı yeniden seçmeyi dene.")
            }
        }

        val apk = if (apkAdayi(ac)) apkOzeti(ac) else null
        return DosyaDenetleyici.denetle(ad, ac, apk)
    }

    private fun apkAdayi(ac: () -> java.io.InputStream): Boolean = guvenli(false) {
        ZipInputStream(ac()).use { z ->
            var sayac = 0
            while (sayac++ < 5000) {
                val e = z.nextEntry ?: break
                if (e.name == "AndroidManifest.xml") return@use true
            }
            false
        }
    }

    /** APK'yı geçici olarak önbelleğe kopyalar, PackageManager ile okur ve kopyayı siler. */
    private fun apkOzeti(ac: () -> java.io.InputStream): DosyaDenetleyici.ApkOzeti? {
        val gecici = File(context.cacheDir, "inceleme-${System.nanoTime()}.apk")
        return try {
            ac().use { giris -> gecici.outputStream().use { giris.copyTo(it) } }
            val bayrak = PackageManager.GET_PERMISSIONS or PackageManager.GET_SERVICES or PackageManager.GET_RECEIVERS
            val pi = if (Build.VERSION.SDK_INT >= 33) {
                context.packageManager.getPackageArchiveInfo(gecici.path, PackageManager.PackageInfoFlags.of(bayrak.toLong()))
            } else {
                @Suppress("DEPRECATION") context.packageManager.getPackageArchiveInfo(gecici.path, bayrak)
            } ?: return null
            val hizmetIzinleri = pi.services?.mapNotNull { it.permission }.orEmpty()
            val aliciIzinleri = pi.receivers?.mapNotNull { it.permission }.orEmpty()
            DosyaDenetleyici.ApkOzeti(
                paket = pi.packageName,
                surum = pi.versionName,
                izinler = pi.requestedPermissions?.toList().orEmpty(),
                erisilebilirlikHizmeti = Manifest.permission.BIND_ACCESSIBILITY_SERVICE in hizmetIzinleri,
                cihazYoneticisi = Manifest.permission.BIND_DEVICE_ADMIN in aliciIzinleri,
                bildirimDinleyici = Manifest.permission.BIND_NOTIFICATION_LISTENER_SERVICE in hizmetIzinleri,
            )
        } catch (e: Exception) {
            null
        } finally {
            gecici.delete()
        }
    }

    /** Önceki bir çökme sonrası kalmış olabilecek geçici kopyaları temizler. */
    fun geciciDosyalariTemizle() {
        context.cacheDir.listFiles { f -> f.name.startsWith("inceleme-") }?.forEach { it.delete() }
    }
}
