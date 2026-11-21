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
import com.cepakil.ui.CepAkilUygulamasi
import com.cepakil.ui.tema.CepAkilTema

class MainActivity : ComponentActivity() {

    /** "Paylaş > CepAkıl" ile gelen metin (bağlantı). */
    private var paylasilan by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        if (savedInstanceState == null) paylasilan = paylasilanMetin(intent)
        setContent {
            CepAkilTema {
                CepAkilUygulamasi(paylasilan) { paylasilan = null }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        paylasilanMetin(intent)?.let { paylasilan = it }
    }

    private fun paylasilanMetin(i: Intent?): String? =
        if (i?.action == Intent.ACTION_SEND && i.type == "text/plain") i.getStringExtra(Intent.EXTRA_TEXT)?.take(4000) else null
}
