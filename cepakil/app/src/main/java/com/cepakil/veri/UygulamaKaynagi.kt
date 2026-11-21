package com.cepakil.veri

import android.accessibilityservice.AccessibilityServiceInfo
import android.app.AppOpsManager
import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import android.os.Build
import android.provider.Telephony
import android.view.accessibility.AccessibilityManager
import androidx.core.app.NotificationManagerCompat
import com.cepakil.analiz.UygulamaDegerlendirici
import com.cepakil.analiz.UygulamaDegerlendirici.Kategori
import com.cepakil.analiz.UygulamaDegerlendirici.UygulamaBilgisi

/**
 * Yüklü uygulamaları Android'in herkese açık PackageManager arayüzüyle okur.
 *
 * Okunanlar: ad, sürüm, istenen izinler ve verilip verilmedikleri, yükleyen
 * uygulama, hedef Android sürümü, açık erişilebilirlik / cihaz yöneticisi /
 * bildirim erişimi hizmetleri. Uygulamaların verilerine ya da koduna ERİŞİLMEZ.
 */
class UygulamaKaynagi(private val context: Context) {

    private val pm: PackageManager = context.packageManager

    /** Taramada tek seferde alınan, uygulamalar arası ortak bilgiler. */
    private data class Ortam(
        val erisilebilirlik: Set<String>,
        val cihazYoneticileri: Set<String>,
        val bildirimDinleyiciler: Set<String>,
        val varsayilanSms: String?,
    )

    private fun ortam(): Ortam {
        val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
        val erisilebilirlik = guvenli(emptySet()) {
            am?.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
                ?.mapNotNull { it.resolveInfo?.serviceInfo?.packageName }?.toSet() ?: emptySet()
        }
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
        val yoneticiler = guvenli(emptySet()) { dpm?.activeAdmins?.map { it.packageName }?.toSet() ?: emptySet() }
        val dinleyiciler = guvenli(emptySet()) { NotificationManagerCompat.getEnabledListenerPackages(context) }
        val sms = guvenli(null) { Telephony.Sms.getDefaultSmsPackage(context) }
        return Ortam(erisilebilirlik, yoneticiler, dinleyiciler, sms)
    }

    /**
     * Tüm uygulamalar. [sistemDahil] false ise yalnız kullanıcının yüklediği
     * (ve güncellenmiş sistem uygulaması olmayan) uygulamalar döner.
     */
    fun tumUygulamalar(sistemDahil: Boolean): List<UygulamaBilgisi> {
        val o = ortam()
        val uygulamalar = if (Build.VERSION.SDK_INT >= 33) {
            pm.getInstalledApplications(PackageManager.ApplicationInfoFlags.of(0))
        } else {
            @Suppress("DEPRECATION") pm.getInstalledApplications(0)
        }
        return uygulamalar
            .asSequence()
            .filter { it.packageName != context.packageName }
            .filter { sistemDahil || !sistemMi(it) }
            .mapNotNull { bilgiOlustur(it, o) }
            .sortedBy { it.ad.lowercase() }
            .toList()
    }

    fun uygulama(paket: String): UygulamaBilgisi? {
        val ai = guvenli(null) {
            if (Build.VERSION.SDK_INT >= 33) pm.getApplicationInfo(paket, PackageManager.ApplicationInfoFlags.of(0))
            else @Suppress("DEPRECATION") pm.getApplicationInfo(paket, 0)
        } ?: return null
        return bilgiOlustur(ai, ortam())
    }

    fun simge(paket: String): Drawable? = guvenli(null) { pm.getApplicationIcon(paket) }

    /** Ek bilgiler (yalnız ayrıntı ekranında gösterilir). */
    data class Ayrinti(val ilkYukleme: Long, val sonGuncelleme: Long, val yukleyenAdi: String?)

    fun ayrinti(paket: String, yukleyen: String?): Ayrinti? {
        val pi = paketBilgisi(paket, 0) ?: return null
        val yukleyenAdi = yukleyen?.let { y ->
            guvenli(y) {
                val ai = if (Build.VERSION.SDK_INT >= 33) pm.getApplicationInfo(y, PackageManager.ApplicationInfoFlags.of(0))
                else @Suppress("DEPRECATION") pm.getApplicationInfo(y, 0)
                pm.getApplicationLabel(ai).toString()
            }
        }
        return Ayrinti(pi.firstInstallTime, pi.lastUpdateTime, yukleyenAdi)
    }

    private fun sistemMi(ai: ApplicationInfo) =
        (ai.flags and ApplicationInfo.FLAG_SYSTEM) != 0 || (ai.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0

    private fun paketBilgisi(paket: String, bayraklar: Int): PackageInfo? = guvenli(null) {
        if (Build.VERSION.SDK_INT >= 33) pm.getPackageInfo(paket, PackageManager.PackageInfoFlags.of(bayraklar.toLong()))
        else @Suppress("DEPRECATION") pm.getPackageInfo(paket, bayraklar)
    }

    private fun bilgiOlustur(ai: ApplicationInfo, o: Ortam): UygulamaBilgisi? {
        val paket = ai.packageName
        val pi = paketBilgisi(paket, PackageManager.GET_PERMISSIONS) ?: return null
        val izinler = buildMap {
            val adlar = pi.requestedPermissions ?: emptyArray()
            val bayraklar = pi.requestedPermissionsFlags ?: IntArray(0)
            adlar.forEachIndexed { i, ad ->
                val verildi = i < bayraklar.size && (bayraklar[i] and PackageInfo.REQUESTED_PERMISSION_GRANTED) != 0
                put(ad, verildi)
            }
        }
        val yukleyen = guvenli(null) {
            if (Build.VERSION.SDK_INT >= 30) pm.getInstallSourceInfo(paket).installingPackageName
            else @Suppress("DEPRECATION") pm.getInstallerPackageName(paket)
        }
        val bilinmeyenKaynak = if ("android.permission.REQUEST_INSTALL_PACKAGES" in izinler) {
            islemIzniAcikMi("android:request_install_packages", ai.uid, paket)
        } else null

        return UygulamaBilgisi(
            paket = paket,
            ad = pm.getApplicationLabel(ai).toString(),
            sistemUygulamasi = sistemMi(ai),
            yukleyen = yukleyen,
            hedefSdk = ai.targetSdkVersion,
            izinler = izinler,
            kategori = kategori(ai.category),
            erisilebilirlikAcik = paket in o.erisilebilirlik,
            cihazYoneticisiAcik = paket in o.cihazYoneticileri,
            bildirimErisimiAcik = paket in o.bildirimDinleyiciler,
            varsayilanSmsUygulamasi = paket == o.varsayilanSms,
            bilinmeyenKaynakIzni = bilinmeyenKaynak,
            surum = pi.versionName,
        )
    }

    /**
     * Başka bir uygulamanın özel izin durumunu okumayı dener. Bazı Android
     * sürümleri ve üreticiler buna izin vermez; o zaman null döner ve arayüz
     * "durumu ayarlardan kontrol et" der.
     */
    private fun islemIzniAcikMi(islem: String, uid: Int, paket: String): Boolean? = guvenli(null) {
        val aom = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mod = if (Build.VERSION.SDK_INT >= 29) aom.unsafeCheckOpNoThrow(islem, uid, paket)
        else @Suppress("DEPRECATION") aom.checkOpNoThrow(islem, uid, paket)
        mod == AppOpsManager.MODE_ALLOWED
    }

    private fun kategori(c: Int): Kategori = when (c) {
        ApplicationInfo.CATEGORY_GAME -> Kategori.OYUN
        ApplicationInfo.CATEGORY_AUDIO -> Kategori.SES
        ApplicationInfo.CATEGORY_VIDEO -> Kategori.VIDEO
        ApplicationInfo.CATEGORY_IMAGE -> Kategori.FOTOGRAF
        ApplicationInfo.CATEGORY_SOCIAL -> Kategori.SOSYAL
        ApplicationInfo.CATEGORY_NEWS -> Kategori.HABER
        ApplicationInfo.CATEGORY_MAPS -> Kategori.HARITA
        ApplicationInfo.CATEGORY_PRODUCTIVITY -> Kategori.VERIMLILIK
        else -> if (Build.VERSION.SDK_INT >= 31 && c == ApplicationInfo.CATEGORY_ACCESSIBILITY) Kategori.ERISILEBILIRLIK else Kategori.BILINMIYOR
    }

    companion object {
        fun degerlendir(liste: List<UygulamaBilgisi>) = liste.map { UygulamaDegerlendirici.degerlendir(it) }
    }
}

/** Android çağrılarında beklenmedik hataları (SecurityException vb.) yutup varsayılanı döndürür. */
internal inline fun <T> guvenli(varsayilan: T, blok: () -> T): T = try {
    blok()
} catch (e: Exception) {
    varsayilan
}
