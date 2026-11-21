package com.cepakil.veri

import android.content.Context
import com.cepakil.analiz.Bulgu
import com.cepakil.analiz.Seviye
import com.cepakil.analiz.YeniUygulamaTakibi
import org.json.JSONArray
import org.json.JSONObject

/** Bir tam taramanın kaydı. Yalnız bu telefonda saklanır. */
data class TaramaKaydi(
    val zaman: Long,
    val cihazBulgulari: List<Bulgu>,
    val uygulamalar: List<UygulamaOzeti>,
    val incelenenUygulamaSayisi: Int,
    val sistemDahil: Boolean,
) {
    data class UygulamaOzeti(val paket: String, val ad: String, val seviye: Seviye, val bulgular: List<Bulgu>)

    val genelSeviye: Seviye
        get() = (cihazBulgulari.map { it.seviye } + uygulamalar.map { it.seviye })
            .maxByOrNull { it.agirlik } ?: Seviye.YESIL
}

/**
 * Son taramayı ve ayarları SharedPreferences'ta (uygulamanın özel klasörü)
 * saklar. Buluta yedekleme kapalıdır (bkz. veri_aktarim_kurallari.xml).
 */
class TaramaDeposu(context: Context) {
    private val prefs = context.getSharedPreferences("cepakil", Context.MODE_PRIVATE)

    var sistemUygulamalariDahil: Boolean
        get() = prefs.getBoolean("sistem_dahil", false)
        set(v) { prefs.edit().putBoolean("sistem_dahil", v).apply() }

    fun sonTarama(): TaramaKaydi? = try {
        prefs.getString("son_tarama", null)?.let { cozumle(JSONObject(it)) }
    } catch (e: Exception) {
        null // Bozuk kayıt: yokmuş gibi davran.
    }

    fun kaydet(k: TaramaKaydi) {
        prefs.edit().putString("son_tarama", yaz(k).toString()).apply()
    }

    fun sil() {
        prefs.edit().remove("son_tarama").remove("uygulama_izi").apply()
    }

    /** Yeni uygulama takibi için son görülen uygulama listesi. İlk açılışta null. */
    fun uygulamaIzi(): Map<String, YeniUygulamaTakibi.Iz>? = try {
        prefs.getString("uygulama_izi", null)?.let { m ->
            val o = JSONObject(m)
            o.keys().asSequence().associateWith { k ->
                val a = o.getJSONArray(k)
                val izinler = a.getJSONArray(1)
                YeniUygulamaTakibi.Iz(a.getLong(0), (0 until izinler.length()).map { izinler.getString(it) }.toSet())
            }
        }
    } catch (e: Exception) {
        null
    }

    fun uygulamaIziKaydet(iz: Map<String, YeniUygulamaTakibi.Iz>) {
        val o = JSONObject()
        iz.forEach { (p, v) -> o.put(p, JSONArray().put(v.guncelleme).put(JSONArray(v.hassasIzinler.toList()))) }
        prefs.edit().putString("uygulama_izi", o.toString()).apply()
    }

    private fun bulgularYaz(b: List<Bulgu>) = JSONArray().apply {
        b.forEach { put(JSONObject().put("s", it.seviye.name).put("b", it.baslik).put("a", it.aciklama)) }
    }

    private fun bulgularOku(a: JSONArray) = (0 until a.length()).map {
        val o = a.getJSONObject(it)
        Bulgu(Seviye.valueOf(o.getString("s")), o.getString("b"), o.getString("a"))
    }

    private fun yaz(k: TaramaKaydi) = JSONObject().apply {
        put("zaman", k.zaman)
        put("sayi", k.incelenenUygulamaSayisi)
        put("sistem", k.sistemDahil)
        put("cihaz", bulgularYaz(k.cihazBulgulari))
        put("uyg", JSONArray().apply {
            k.uygulamalar.forEach {
                put(JSONObject().put("p", it.paket).put("ad", it.ad).put("s", it.seviye.name).put("b", bulgularYaz(it.bulgular)))
            }
        })
    }

    private fun cozumle(o: JSONObject): TaramaKaydi {
        val uyg = o.getJSONArray("uyg")
        return TaramaKaydi(
            zaman = o.getLong("zaman"),
            cihazBulgulari = bulgularOku(o.getJSONArray("cihaz")),
            uygulamalar = (0 until uyg.length()).map {
                val u = uyg.getJSONObject(it)
                TaramaKaydi.UygulamaOzeti(u.getString("p"), u.getString("ad"), Seviye.valueOf(u.getString("s")), bulgularOku(u.getJSONArray("b")))
            },
            incelenenUygulamaSayisi = o.getInt("sayi"),
            sistemDahil = o.optBoolean("sistem", false),
        )
    }
}
