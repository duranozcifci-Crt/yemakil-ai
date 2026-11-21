package com.cepkalkan

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.cepkalkan.ui.CepKalkanUygulamasi
import com.cepkalkan.ui.tema.CepKalkanTema

class MainActivity : ComponentActivity() {

    /** "Paylaş > CepKalkan" ile gelen metin (bağlantı). */
    private var paylasilan by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        if (savedInstanceState == null) paylasilan = paylasilanMetin(intent)
        setContent {
            CepKalkanTema {
                CepKalkanUygulamasi(paylasilan) { paylasilan = null }
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
