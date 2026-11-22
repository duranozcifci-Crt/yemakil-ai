package com.cepakil

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.lifecycleScope
import com.cepakil.koruma.Bildirimler
import com.cepakil.koruma.CepAkilVpn
import com.cepakil.koruma.KorumaAyarlari
import com.cepakil.koruma.Planlayici
import com.cepakil.koruma.TehditGuncelleyici
import com.cepakil.ui.CepAkilUygulamasi
import com.cepakil.ui.tema.CepAkilTema
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    /** "Paylaş > CepAkıl" ile gelen metin. */
    private var paylasilan by mutableStateOf<String?>(null)

    /** Anlık koruma bildiriminden gelen uygulama paketi. */
    private var acilacakPaket by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        if (savedInstanceState == null) gelenIstek(intent)
        korumayiHazirla()
        setContent {
            CepAkilTema {
                CepAkilUygulamasi(paylasilan, { paylasilan = null }, acilacakPaket, { acilacakPaket = null })
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        gelenIstek(intent)
    }

    private fun gelenIstek(i: Intent?) {
        if (i == null) return
        if (i.action == Intent.ACTION_SEND && i.type == "text/plain") {
            i.getStringExtra(Intent.EXTRA_TEXT)?.take(4000)?.let { paylasilan = it }
        }
        i.getStringExtra(Bildirimler.EK_PAKET)?.let { acilacakPaket = it }
    }

    /** Bildirim kanalları, arka plan işleri ve telefondaki tehdit listesi kopyası. */
    private fun korumayiHazirla() {
        Bildirimler.kanallariKur(this)
        Planlayici.uygula(this)
        val a = KorumaAyarlari(this)
        if (a.tehditListeleri && a.sonGuncelleme == 0L) Planlayici.simdiGuncelle(this)
        // Web koruması açık bırakılmış ama telefon yeniden başlamışsa (ve VPN izni hâlâ varsa) yeniden başlat.
        if (a.webKoruma && !CepAkilVpn.aktifMi(this) && android.net.VpnService.prepare(this) == null) CepAkilVpn.baslat(this)
        lifecycleScope.launch(Dispatchers.IO) { TehditGuncelleyici.yukle(applicationContext) }
    }
}
