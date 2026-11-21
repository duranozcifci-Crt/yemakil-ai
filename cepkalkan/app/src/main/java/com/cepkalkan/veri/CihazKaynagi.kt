package com.cepkalkan.veri

import android.app.KeyguardManager
import android.content.Context
import android.os.Build
import android.provider.Settings
import com.cepkalkan.analiz.CihazDegerlendirici.CihazBilgisi
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
        )
    }
}
