package com.cepakil.veri

import android.app.KeyguardManager
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiInfo
import android.os.Build
import com.cepakil.analiz.CihazDegerlendirici
import android.provider.Settings
import com.cepakil.analiz.CihazDegerlendirici.CihazBilgisi
import java.time.LocalDate

/** Telefonun izin gerektirmeden okunabilen güvenlik ayarları. */
class CihazKaynagi(private val context: Context) {

    fun oku(): CihazBilgisi {
        val km = context.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
        val cr = context.contentResolver
        return CihazBilgisi(
            ekranKilidi = guvenli(null) { km?.isDeviceSecure },
            androidApi = Build.VERSION.SDK_INT,
            androidSurumu = Build.VERSION.RELEASE ?: Build.VERSION.SDK_INT.toString(),
            guvenlikYamasi = Build.VERSION.SECURITY_PATCH?.takeIf { it.isNotBlank() },
            gelistiriciSecenekleri = guvenli(null) { Settings.Global.getInt(cr, Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) == 1 },
            usbHataAyiklama = guvenli(null) { Settings.Global.getInt(cr, Settings.Global.ADB_ENABLED, 0) == 1 },
            bugun = LocalDate.now(),
            wifi = wifiGuvenligi(),
            kullaniciSertifikalari = kullaniciSertifikalari(),
            magazaDisiKlavyeler = magazaDisiKlavyeler(),
        )
    }

    /** Kullanıcının elle eklediği CA sertifikaları ("user:" ile başlayanlar). İzin gerekmez. */
    private fun kullaniciSertifikalari(): Int = guvenli(0) {
        val ks = java.security.KeyStore.getInstance("AndroidCAStore").apply { load(null) }
        ks.aliases().toList().count { it.startsWith("user:") }
    }

    /** Açık klavyelerden sistem/üretici olmayan ve mağazadan gelmeyenler. */
    private fun magazaDisiKlavyeler(): List<String> = guvenli(emptyList()) {
        val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as? android.view.inputmethod.InputMethodManager
            ?: return emptyList()
        val kaynak = UygulamaKaynagi(context)
        imm.enabledInputMethodList.map { it.packageName }.distinct().mapNotNull { p ->
            val u = kaynak.uygulama(p) ?: return@mapNotNull null
            if (u.sistemUygulamasi || u.ureticiUygulamasi || com.cepakil.analiz.UygulamaDegerlendirici.magazadanMi(u.yukleyen)) null else u.ad
        }
    }

    /** Bağlı Wi-Fi ağının şifreleme türü (Android 12+). Ağ adı ve konum okunmaz. */
    private fun wifiGuvenligi(): CihazDegerlendirici.WifiGuvenlik = guvenli(CihazDegerlendirici.WifiGuvenlik.BILINMIYOR) {
        val cm = context.getSystemService(ConnectivityManager::class.java) ?: return CihazDegerlendirici.WifiGuvenlik.BILINMIYOR
        val ag = cm.activeNetwork ?: return CihazDegerlendirici.WifiGuvenlik.YOK
        val nc = cm.getNetworkCapabilities(ag) ?: return CihazDegerlendirici.WifiGuvenlik.YOK
        if (!nc.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) return CihazDegerlendirici.WifiGuvenlik.YOK
        if (Build.VERSION.SDK_INT < 31) return CihazDegerlendirici.WifiGuvenlik.BILINMIYOR
        val wi = nc.transportInfo as? WifiInfo ?: return CihazDegerlendirici.WifiGuvenlik.BILINMIYOR
        when (wi.currentSecurityType) {
            WifiInfo.SECURITY_TYPE_OPEN -> CihazDegerlendirici.WifiGuvenlik.ACIK
            WifiInfo.SECURITY_TYPE_OWE -> CihazDegerlendirici.WifiGuvenlik.OWE
            WifiInfo.SECURITY_TYPE_WEP -> CihazDegerlendirici.WifiGuvenlik.WEP
            WifiInfo.SECURITY_TYPE_PSK, WifiInfo.SECURITY_TYPE_WAPI_PSK -> CihazDegerlendirici.WifiGuvenlik.WPA_KISISEL
            WifiInfo.SECURITY_TYPE_SAE -> CihazDegerlendirici.WifiGuvenlik.WPA3
            WifiInfo.SECURITY_TYPE_EAP, WifiInfo.SECURITY_TYPE_EAP_WPA3_ENTERPRISE,
            WifiInfo.SECURITY_TYPE_EAP_WPA3_ENTERPRISE_192_BIT, WifiInfo.SECURITY_TYPE_WAPI_CERT,
            -> CihazDegerlendirici.WifiGuvenlik.KURUMSAL
            else -> CihazDegerlendirici.WifiGuvenlik.BILINMIYOR
        }
    }
}
