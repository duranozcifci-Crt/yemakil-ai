package com.cepakil.veri

import android.content.Context
import com.cepakil.analiz.CihazDegerlendirici
import com.cepakil.analiz.Seviye
import com.cepakil.analiz.UygulamaDegerlendirici

/** Tam tarama: telefon ayarları + yüklü uygulamalar. Hem "Taramayı başlat" hem haftalık kontrol kullanır. */
object Tarayici {
    /** Arka plan iş parçacığında çağrılmalı. Kaydı saklamaz; çağıran saklar. */
    fun tara(context: Context): TaramaKaydi {
        val sistemDahil = TaramaDeposu(context).sistemUygulamalariDahil
        val cihazBulgulari = CihazDegerlendirici.degerlendir(CihazKaynagi(context).oku())
        val liste = UygulamaKaynagi(context).tumUygulamalar(sistemDahil)
        val sonuclar = liste.map { UygulamaDegerlendirici.degerlendir(it) }
        return TaramaKaydi(
            zaman = System.currentTimeMillis(),
            cihazBulgulari = cihazBulgulari,
            uygulamalar = sonuclar
                .filter { it.seviye == Seviye.KIRMIZI || it.seviye == Seviye.SARI }
                .sortedByDescending { it.seviye.agirlik }
                .map { s -> TaramaKaydi.UygulamaOzeti(s.bilgi.paket, s.bilgi.ad, s.seviye, s.bulgular) },
            incelenenUygulamaSayisi = liste.size,
            sistemDahil = sistemDahil,
        )
    }
}
