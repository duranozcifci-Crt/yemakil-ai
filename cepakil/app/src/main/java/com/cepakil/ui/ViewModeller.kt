package com.cepakil.ui

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.cepakil.analiz.CihazDegerlendirici
import com.cepakil.analiz.DosyaDenetleyici
import com.cepakil.analiz.Seviye
import com.cepakil.analiz.UygulamaDegerlendirici
import com.cepakil.analiz.YeniUygulamaTakibi
import com.cepakil.veri.CihazKaynagi
import com.cepakil.veri.DosyaKaynagi
import com.cepakil.veri.TaramaDeposu
import com.cepakil.veri.TaramaKaydi
import com.cepakil.veri.UygulamaKaynagi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Ana sayfa taraması: telefon ayarları + yüklü uygulamalar.
 * Tarama yalnız kullanıcı düğmeye bastığında çalışır; arka planda zamanlanmış
 * ya da gizli tarama YOKTUR.
 */
class TaramaViewModel(app: Application) : AndroidViewModel(app) {

    data class Durum(
        val kayit: TaramaKaydi? = null,
        val taraniyor: Boolean = false,
        val hata: String? = null,
        /** Son açılıştan beri yeni yüklenen / yeni hassas izin isteyen uygulamalar. */
        val degisiklikler: List<DegisiklikOzeti> = emptyList(),
    )

    data class DegisiklikOzeti(val sonuc: UygulamaDegerlendirici.Sonuc, val tur: YeniUygulamaTakibi.Tur, val yeniIzinler: Set<String>)

    private var bekleyenIz: Map<String, YeniUygulamaTakibi.Iz>? = null
    private var degisiklikDenetleniyor = false

    /**
     * CepAkıl açıldığında (ön plana geldiğinde) çağrılır. Arka planda çalışmaz.
     * İlk açılışta yalnız mevcut liste kaydedilir; hiçbir şey "yeni" sayılmaz.
     */
    fun degisiklikleriDenetle() {
        if (degisiklikDenetleniyor) return
        degisiklikDenetleniyor = true
        viewModelScope.launch {
            kaydiTazele()
            // Son bakıştan beri hiçbir uygulama yüklenmedi/güncellenmedi/kaldırılmadıysa ağır okuma yapılmaz.
            if (!withContext(Dispatchers.Default) { uygulamalar.degisiklikVarMi("ana") }) {
                degisiklikDenetleniyor = false
                return@launch
            }
            try {
                val sonuc = withContext(Dispatchers.Default) {
                    val liste = uygulamalar.tumUygulamalar(sistemDahil = false)
                    val simdiki = liste.associate { it.paket to YeniUygulamaTakibi.izCikar(it) }
                    val onceki = depo.uygulamaIzi()
                    if (onceki == null) {
                        depo.uygulamaIziKaydet(simdiki)
                        return@withContext null
                    }
                    val degisenler = YeniUygulamaTakibi.karsilastir(onceki, simdiki)
                    if (degisenler.isEmpty()) {
                        depo.uygulamaIziKaydet(simdiki)
                        return@withContext null
                    }
                    val bilgiler = liste.associateBy { it.paket }
                    simdiki to degisenler.mapNotNull { d ->
                        bilgiler[d.paket]?.let { DegisiklikOzeti(UygulamaDegerlendirici.degerlendir(it), d.tur, d.yeniIzinler) }
                    }.sortedByDescending { it.sonuc.seviye.agirlik }
                }
                if (sonuc == null) {
                    bekleyenIz = null
                    _durum.update { it.copy(degisiklikler = emptyList()) }
                } else {
                    bekleyenIz = sonuc.first
                    _durum.update { it.copy(degisiklikler = sonuc.second) }
                }
            } catch (e: Exception) {
                // Liste alınamadıysa sessizce geç; tam tarama hatayı ayrıca gösterir.
            } finally {
                degisiklikDenetleniyor = false
            }
        }
    }

    /** Son tarama kaydından, o günden beri kaldırılmış uygulamaları çıkarır. */
    /**
     * Ana sayfaya her dönüşte son tarama kaydını tazeler: listedeki uygulamalar
     * yeniden değerlendirilir (kaldırılan, izni geri alınan, artık sorun olmayan
     * düşer) ve telefon ayarları yeniden okunur (ör. ekran kilidi kurulduysa).
     * Arada yeni bir tarama bittiyse ona dokunulmaz.
     */
    private suspend fun kaydiTazele() {
        val k = _durum.value.kayit ?: return
        val yeni = try {
            withContext(Dispatchers.Default) {
                val uyg = k.uygulamalar.mapNotNull { eski ->
                    val b = uygulamalar.uygulama(eski.paket) ?: return@mapNotNull null
                    val s = UygulamaDegerlendirici.degerlendir(b)
                    if (s.seviye == Seviye.KIRMIZI || s.seviye == Seviye.SARI) TaramaKaydi.UygulamaOzeti(b.paket, b.ad, s.seviye, s.bulgular) else null
                }.sortedByDescending { it.seviye.agirlik }
                k.copy(uygulamalar = uyg, cihazBulgulari = CihazDegerlendirici.degerlendir(cihaz.oku()))
            }
        } catch (e: Exception) {
            return
        }
        if (yeni != k && _durum.value.kayit?.zaman == k.zaman) {
            depo.kaydet(yeni)
            _durum.update { if (it.kayit?.zaman == k.zaman) it.copy(kayit = yeni) else it }
        }
    }

    /** "Tamam, gördüm": şimdiki liste yeni karşılaştırma noktası olur. */
    fun degisiklikleriGordum() {
        bekleyenIz?.let { depo.uygulamaIziKaydet(it) }
        bekleyenIz = null
        _durum.update { it.copy(degisiklikler = emptyList()) }
    }

    private val depo = TaramaDeposu(app)
    private val uygulamalar = UygulamaKaynagi(app)
    private val cihaz = CihazKaynagi(app)

    private val _durum = MutableStateFlow(Durum(kayit = depo.sonTarama()))
    val durum: StateFlow<Durum> = _durum.asStateFlow()

    fun taramayiBaslat() {
        if (_durum.value.taraniyor) return
        _durum.update { it.copy(taraniyor = true, hata = null) }
        viewModelScope.launch {
            try {
                val kayit = withContext(Dispatchers.Default) { com.cepakil.veri.Tarayici.tara(getApplication()) }
                depo.kaydet(kayit)
                _durum.update { it.copy(kayit = kayit, taraniyor = false, hata = null) }
            } catch (e: Exception) {
                _durum.update { it.copy(taraniyor = false, hata = "Tarama tamamlanamadı. Lütfen tekrar dene. (${e.javaClass.simpleName})") }
            }
        }
    }

    /** Ayarlar'dan kayıt silindiğinde ekranı güncellemek için. */
    fun yenidenYukle() {
        _durum.update { it.copy(kayit = depo.sonTarama()) }
    }
}

class UygulamalarViewModel(app: Application) : AndroidViewModel(app) {

    sealed interface Durum {
        data object Yukleniyor : Durum
        data class Hazir(val sonuclar: List<UygulamaDegerlendirici.Sonuc>) : Durum
        data class Hata(val mesaj: String) : Durum
    }

    private val kaynak = UygulamaKaynagi(app)
    private val depo = TaramaDeposu(app)

    private val _durum = MutableStateFlow<Durum>(Durum.Yukleniyor)
    val durum: StateFlow<Durum> = _durum.asStateFlow()

    private val _sistemDahil = MutableStateFlow(depo.sistemUygulamalariDahil)
    val sistemDahil: StateFlow<Boolean> = _sistemDahil.asStateFlow()

    init { yukle() }

    fun sistemDahilDegistir(v: Boolean) {
        depo.sistemUygulamalariDahil = v
        _sistemDahil.value = v
        yukle()
    }

    /**
     * Ekrana her dönüldüğünde (ör. bir uygulama kaldırıldıktan sonra) listeyi
     * yükleme göstergesi olmadan yeniler.
     */
    fun sessizYenile() {
        if (_durum.value !is Durum.Hazir) return
        viewModelScope.launch {
            // Uygulamalarda değişiklik yoksa (ör. yalnız ayrıntı ekranından geri dönüldü) yeniden okunmaz.
            if (!withContext(Dispatchers.Default) { kaynak.degisiklikVarMi("liste") }) return@launch
            try {
                val sonuc = withContext(Dispatchers.Default) {
                    kaynak.tumUygulamalar(_sistemDahil.value).map { UygulamaDegerlendirici.degerlendir(it) }
                }
                _durum.value = Durum.Hazir(sonuc)
            } catch (e: Exception) {
                // Eski liste kalır.
            }
        }
    }

    fun yukle() {
        _durum.value = Durum.Yukleniyor
        viewModelScope.launch {
            withContext(Dispatchers.Default) { kaynak.degisiklikVarMi("liste") }
            _durum.value = try {
                val sonuc = withContext(Dispatchers.Default) {
                    kaynak.tumUygulamalar(_sistemDahil.value).map { UygulamaDegerlendirici.degerlendir(it) }
                }
                Durum.Hazir(sonuc)
            } catch (e: Exception) {
                Durum.Hata("Uygulama listesi alınamadı. Android bu bilgiyi vermemiş olabilir. (${e.javaClass.simpleName})")
            }
        }
    }
}

class DosyaViewModel(app: Application) : AndroidViewModel(app) {

    sealed interface Durum {
        data object Bos : Durum
        data object SecimIptal : Durum
        data object Inceleniyor : Durum
        data class Sonuc(val sonuc: DosyaDenetleyici.Sonuc) : Durum
        data class Hata(val mesaj: String) : Durum
    }

    private val kaynak = DosyaKaynagi(app).also { it.geciciDosyalariTemizle() }
    private val _durum = MutableStateFlow<Durum>(Durum.Bos)
    val durum: StateFlow<Durum> = _durum.asStateFlow()

    fun secildi(uri: Uri?) {
        if (uri == null) {
            _durum.value = Durum.SecimIptal
            return
        }
        _durum.value = Durum.Inceleniyor
        viewModelScope.launch {
            _durum.value = try {
                Durum.Sonuc(withContext(Dispatchers.IO) { kaynak.denetle(uri) })
            } catch (e: DosyaKaynagi.DosyaOkunamadi) {
                Durum.Hata(e.message ?: "Dosya okunamadı.")
            } catch (e: OutOfMemoryError) {
                Durum.Hata("Dosya bu telefonda incelenemeyecek kadar büyük.")
            } catch (e: Exception) {
                Durum.Hata("Dosya incelenirken bir hata oluştu. (${e.javaClass.simpleName})")
            }
        }
    }

    fun sifirla() { _durum.value = Durum.Bos }
}
