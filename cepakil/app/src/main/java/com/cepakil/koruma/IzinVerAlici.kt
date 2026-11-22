package com.cepakil.koruma

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat

/** Bildirimdeki "Bu siteye izin ver": alan adı web korumasının izin listesine eklenir. */
class IzinVerAlici : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val host = intent.getStringExtra(EK_HOST) ?: return
        val a = KorumaAyarlari(context)
        a.izinliSiteler = a.izinliSiteler + host
        NotificationManagerCompat.from(context).cancel(7000 + (host.hashCode() and 0x3FF))
    }

    companion object { const val EK_HOST = "host" }
}
