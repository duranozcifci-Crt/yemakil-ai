package com.cepakil.koruma

import android.content.Context

/** Koruma özelliklerinin açık/kapalı durumu (telefonda saklanır). */
class KorumaAyarlari(context: Context) {
    private val p = context.applicationContext.getSharedPreferences("koruma", Context.MODE_PRIVATE)

    /** Tehdit listelerini günde bir indirme. Varsayılan: kapalı; kullanıcı ilk açılışta onaylarsa açılır. */
    var tehditListeleri: Boolean
        get() = p.getBoolean("tehdit", false)
        set(v) = p.edit().putBoolean("tehdit", v).apply()

    var anlikKoruma: Boolean
        get() = p.getBoolean("anlik", false)
        set(v) = p.edit().putBoolean("anlik", v).apply()

    var webKoruma: Boolean
        get() = p.getBoolean("web", false)
        set(v) = p.edit().putBoolean("web", v).apply()

    /** Kullanıcının "bu siteye izin ver" dediği alan adları (web koruması engellemez). */
    var izinliSiteler: Set<String>
        get() = p.getStringSet("izinli", emptySet()).orEmpty()
        set(v) = p.edit().putStringSet("izinli", v).apply()

    /** İlk açılıştaki "tehdit listeleri indirilsin mi?" sorusu yanıtlandı mı? */
    var listeSoruldu: Boolean
        get() = p.getBoolean("liste_soruldu", false)
        set(v) = p.edit().putBoolean("liste_soruldu", v).apply()

    /** Web korumasının engellediği son siteler (en yeni başta, en çok 15). Yalnız telefonda durur. */
    val sonEngellenenler: List<String>
        get() = p.getString("son_engellenen", "").orEmpty().split('\n').filter { it.isNotBlank() }

    fun engellenenEkle(host: String) {
        val yeni = (listOf(host) + sonEngellenenler.filter { it != host }).take(15)
        p.edit().putString("son_engellenen", yeni.joinToString("\n")).apply()
    }

    fun engellenenleriTemizle() = p.edit().remove("son_engellenen").apply()

    /** Haftada bir arka planda tam kontrol ve (bir şey varsa) hatırlatma bildirimi. */
    var haftalikKontrol: Boolean
        get() = p.getBoolean("haftalik", false)
        set(v) = p.edit().putBoolean("haftalik", v).apply()

    /** Son güncellemede indirilemeyen listelerin adları (boşsa hepsi indi). */
    var inmeyenListeler: String
        get() = p.getString("inmeyen", "").orEmpty()
        set(v) = p.edit().putString("inmeyen", v).apply()

    /** Yayındaki en yeni sürümün numarası (yüklü olandan büyükse "yeni sürüm var" gösterilir). */
    var yayindakiSurum: Int
        get() = p.getInt("yayindaki_surum", 0)
        set(v) = p.edit().putInt("yayindaki_surum", v).apply()

    /** Bildirimi gönderilmiş son yeni sürüm (aynı sürüm için tekrar bildirim gitmesin). */
    var bildirilenSurum: Int
        get() = p.getInt("bildirilen_surum", 0)
        set(v) = p.edit().putInt("bildirilen_surum", v).apply()

    var sonGuncelleme: Long
        get() = p.getLong("son_guncelleme", 0)
        set(v) = p.edit().putLong("son_guncelleme", v).apply()

    var engellenenSayisi: Int
        get() = p.getInt("engellenen", 0)
        set(v) = p.edit().putInt("engellenen", v).apply()

}
