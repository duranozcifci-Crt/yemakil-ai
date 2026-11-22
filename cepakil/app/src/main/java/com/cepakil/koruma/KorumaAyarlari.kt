package com.cepakil.koruma

import android.content.Context

/** Koruma özelliklerinin açık/kapalı durumu (telefonda saklanır). */
class KorumaAyarlari(context: Context) {
    private val p = context.applicationContext.getSharedPreferences("koruma", Context.MODE_PRIVATE)

    /** Tehdit listelerini günde bir indirme. Varsayılan: açık (yalnız herkese açık listeler indirilir). */
    var tehditListeleri: Boolean
        get() = p.getBoolean("tehdit", true)
        set(v) = p.edit().putBoolean("tehdit", v).apply()

    var anlikKoruma: Boolean
        get() = p.getBoolean("anlik", false)
        set(v) = p.edit().putBoolean("anlik", v).apply()

    var mesajTarama: Boolean
        get() = p.getBoolean("mesaj", false)
        set(v) = p.edit().putBoolean("mesaj", v).apply()

    var webKoruma: Boolean
        get() = p.getBoolean("web", false)
        set(v) = p.edit().putBoolean("web", v).apply()

    /** Kullanıcının "bu siteye izin ver" dediği alan adları (web koruması engellemez). */
    var izinliSiteler: Set<String>
        get() = p.getStringSet("izinli", emptySet()).orEmpty()
        set(v) = p.edit().putStringSet("izinli", v).apply()

    var sonGuncelleme: Long
        get() = p.getLong("son_guncelleme", 0)
        set(v) = p.edit().putLong("son_guncelleme", v).apply()

    var engellenenSayisi: Int
        get() = p.getInt("engellenen", 0)
        set(v) = p.edit().putInt("engellenen", v).apply()

    var yakalananMesajSayisi: Int
        get() = p.getInt("mesaj_sayi", 0)
        set(v) = p.edit().putInt("mesaj_sayi", v).apply()
}
