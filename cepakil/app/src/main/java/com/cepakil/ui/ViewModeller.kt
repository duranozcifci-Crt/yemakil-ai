package com.cepakil.ui

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.cepakil.analiz.CihazDegerlendirici
import com.cepakil.analiz.DosyaDenetleyici
import com.cepakil.analiz.Seviye
import com.cepakil.analiz.UygulamaDegerlendirici
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

    data class Durum(val kayit: TaramaKaydi? = null, val taraniyor: Boolean = false, val hata: String? = null)

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
                val kayit = withContext(Dispatchers.Default) {
                    val sistemDahil = depo.sistemUygulamalariDahil
                    val cihazBulgulari = CihazDegerlendirici.degerlendir(cihaz.oku())
                    val liste = uygulamalar.tumUygulamalar(sistemDahil)
                    val sonuclar = liste.map { UygulamaDegerlendirici.degerlendir(it) }
                    TaramaKaydi(
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
                depo.kaydet(kayit)
                _durum.value = Durum(kayit = kayit)
            } catch (e: Exception) {
                _durum.update { it.copy(taraniyor = false, hata = "Tarama tamamlanamadı. Lütfen tekrar dene. (${e.javaClass.simpleName})") }
            }
        }
    }

    /** Ayarlar'dan kayıt silindiğinde ekranı güncellemek için. */
    fun yenidenYukle() {
        _durum.value = Durum(kayit = depo.sonTarama())
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

    fun yukle() {
        _durum.value = Durum.Yukleniyor
        viewModelScope.launch {
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
