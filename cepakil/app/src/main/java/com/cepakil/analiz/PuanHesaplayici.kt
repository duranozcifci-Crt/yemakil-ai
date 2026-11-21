package com.cepakil.analiz

/**
 * Ana sayfadaki 0–100 arası "koruma puanı".
 *
 * Bir güvenlik garantisi DEĞİLDİR: yalnız CepAkıl'ın kontrol edebildiklerinin
 * (ekran kilidi, güncellemeler, işaretlenen uygulamalar…) özetidir. Kırmızı bir
 * işaret varken puan 59'u, sarı varken 84'ü geçmez; böylece renk ile puan
 * birbiriyle çelişmez.
 */
object PuanHesaplayici {

    data class Puan(val deger: Int, val kesintiler: List<Pair<String, Int>>)

    fun hesapla(cihaz: List<Bulgu>, uygulamaSeviyeleri: List<Seviye>): Puan {
        val k = mutableListOf<Pair<String, Int>>()
        cihaz.forEach { b ->
            val kesinti = when {
                b.baslik.startsWith("Ekran kilidi yok") -> 30
                b.baslik.contains("çok eski", ignoreCase = true) -> 15
                b.seviye == Seviye.KIRMIZI -> 20
                b.seviye == Seviye.SARI -> 8
                else -> 0
            }
            if (kesinti > 0) k += b.baslik to kesinti
        }
        val kirmizi = uygulamaSeviyeleri.count { it == Seviye.KIRMIZI }
        val sari = uygulamaSeviyeleri.count { it == Seviye.SARI }
        if (kirmizi > 0) k += "$kirmizi uygulama öncelikli incelenmeli" to minOf(36, kirmizi * 12)
        if (sari > 0) k += "$sari uygulama incelenmeli" to minOf(15, sari * 3)

        var puan = 100 - k.sumOf { it.second }
        val enYuksek = (cihaz.map { it.seviye } + uygulamaSeviyeleri).maxByOrNull { it.agirlik }
        if (enYuksek == Seviye.KIRMIZI) puan = minOf(puan, 59)
        if (enYuksek == Seviye.SARI) puan = minOf(puan, 84)
        return Puan(puan.coerceIn(0, 100), k.sortedByDescending { it.second })
    }
}
