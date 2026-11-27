package com.cepakil.koruma

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.VpnService

/**
 * Telefon yeniden başladığında (ya da CepAkıl güncellendiğinde): kullanıcı web korumasını açık
 * bırakmışsa ve VPN onayı hâlâ duruyorsa korumayı yeniden başlatır; arka plan işlerini yeniden kurar.
 */
class AcilisAlici : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        val ctx = context.applicationContext
        try { Planlayici.uygula(ctx) } catch (_: Exception) { }
        val a = KorumaAyarlari(ctx)
        if (a.webKoruma && !CepAkilVpn.aktifMi(ctx)) {
            val onayVar = try { VpnService.prepare(ctx) == null } catch (_: Exception) { false }
            if (onayVar) CepAkilVpn.arkaPlandanBaslat(ctx)
        }
    }
}
