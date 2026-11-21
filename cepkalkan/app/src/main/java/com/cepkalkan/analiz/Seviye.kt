package com.cepkalkan.analiz

/**
 * Bir bulgunun ne kadar dikkat gerektirdiği.
 *
 * Bu paket (analiz) bilerek Android'e bağımlı değildir: tüm kurallar
 * bilgisayarda birim testleriyle denetlenebilir.
 */
enum class Seviye(val agirlik: Int) {
    /** Güçlü tehlike göstergesi. Yine de kesin kanıt değildir. */
    KIRMIZI(3),

    /** İncelenmesi önerilen işaret. */
    SARI(2),

    /** Risk sayılmayan, bilgi amaçlı not. */
    BILGI(1),

    /** Dikkat çeken bir işaret bulunamadı. */
    YESIL(0);
}

data class Bulgu(
    val seviye: Seviye,
    val baslik: String,
    val aciklama: String,
)

/** Bulgular arasındaki en yüksek seviye; bulgu yoksa YESIL. */
fun List<Bulgu>.enYuksekSeviye(): Seviye =
    maxByOrNull { it.seviye.agirlik }?.seviye ?: Seviye.YESIL

/** Önce kırmızı, sonra sarı, sonra bilgi notları. */
fun List<Bulgu>.oneminGoreSirala(): List<Bulgu> =
    sortedByDescending { it.seviye.agirlik }
