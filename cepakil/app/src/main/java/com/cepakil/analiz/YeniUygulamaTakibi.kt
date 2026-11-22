package com.cepakil.analiz

/**
 * CepAkıl'ın son açılışından bu yana yeni yüklenen ya da güncellemeyle yeni
 * hassas izin isteyen uygulamaları bulur.
 *
 * Arka planda çalışmaz: karşılaştırma yalnız CepAkıl açıldığında yapılır. İz
 * olarak her uygulama için yalnız son güncelleme zamanı ve istediği hassas
 * izinlerin adları saklanır (telefonda).
 */
object YeniUygulamaTakibi {

    data class Iz(val guncelleme: Long, val hassasIzinler: Set<String>)

    enum class Tur { YENI, YENI_IZIN }

    data class Degisiklik(val paket: String, val tur: Tur, val yeniIzinler: Set<String> = emptySet())

    fun izCikar(u: UygulamaDegerlendirici.UygulamaBilgisi): Iz =
        Iz(u.sonGuncelleme, u.izinler.keys.filter { IzinSozlugu.tanim(it)?.grup?.hassas == true }.toSet())

    fun karsilastir(onceki: Map<String, Iz>, simdiki: Map<String, Iz>): List<Degisiklik> =
        simdiki.mapNotNull { (paket, iz) ->
            val eski = onceki[paket]
            when {
                eski == null -> Degisiklik(paket, Tur.YENI)
                else -> {
                    // İzin ADLARI değil GRUPLARI karşılaştırılır: READ_EXTERNAL_STORAGE → READ_MEDIA_IMAGES
                    // ya da kaba → kesin konum gibi Android sürümü kaynaklı ad değişiklikleri "yeni izin" sayılmaz.
                    val eskiGruplar = gruplar(eski.hassasIzinler)
                    iz.hassasIzinler.filter { IzinSozlugu.tanim(it)?.grup !in eskiGruplar }.toSet()
                        .takeIf { it.isNotEmpty() }?.let { Degisiklik(paket, Tur.YENI_IZIN, it) }
                }
            }
        }

    private fun gruplar(izinler: Set<String>) = izinler.mapNotNull { IzinSozlugu.tanim(it)?.grup }.toSet()

    /** "android.permission.RECORD_AUDIO" listesi → "Mikrofon, SMS" */
    fun izinGruplari(izinler: Set<String>): String =
        izinler.mapNotNull { IzinSozlugu.tanim(it)?.grup?.ad }.distinct().joinToString()
}
