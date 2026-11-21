package com.cepakil.veri

import android.content.Context
import com.google.android.gms.common.moduleinstall.ModuleInstall
import com.google.android.gms.common.moduleinstall.ModuleInstallRequest
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning

/**
 * QR kod okuma: Google Play Hizmetleri'nin hazır kod okuyucusu kullanılır.
 * Kamera görüntüsünü Play Hizmetleri işler; CepAkıl kamera izni istemez ve
 * yalnız okunan metni (ör. bağlantıyı) alır. Okunan adres AÇILMAZ, yalnız denetlenir.
 */
object QrOkuyucu {

    fun oku(context: Context, basarili: (String) -> Unit, hata: (String) -> Unit) {
        val secenekler = GmsBarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
            .build()
        val okuyucu = try {
            GmsBarcodeScanning.getClient(context, secenekler)
        } catch (e: Exception) {
            hata("QR okuyucu bu telefonda kullanılamıyor (Google Play Hizmetleri gerekli)."); return
        }
        okuyucu.startScan()
            .addOnSuccessListener { kod ->
                val deger = kod.url?.url ?: kod.rawValue
                if (deger.isNullOrBlank()) hata("QR kodda okunabilir bir metin yok.") else basarili(deger)
            }
            .addOnCanceledListener { /* Kullanıcı vazgeçti: sessiz. */ }
            .addOnFailureListener {
                // Okuyucu modülü henüz inmemiş olabilir: indirilmesini iste.
                try {
                    ModuleInstall.getClient(context).installModules(ModuleInstallRequest.newBuilder().addApi(okuyucu).build())
                } catch (_: Exception) { }
                hata("QR okuyucu hazırlanıyor ya da açılamadı. Birkaç saniye sonra tekrar dene.")
            }
    }
}
