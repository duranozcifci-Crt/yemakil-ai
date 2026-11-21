package com.cepakil.ui.ekranlar

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.ContentPaste
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.cepakil.analiz.BaglantiDenetleyici
import com.cepakil.analiz.Seviye
import com.cepakil.ui.bilesenler.Baglam
import com.cepakil.ui.bilesenler.BilgiDurumu
import com.cepakil.ui.bilesenler.BolumBasligi
import com.cepakil.ui.bilesenler.BulguKarti
import com.cepakil.ui.bilesenler.BuyukDugme
import com.cepakil.ui.bilesenler.DurumKarti
import com.cepakil.ui.bilesenler.IkincilDugme
import com.cepakil.ui.bilesenler.SinirNotu
import com.cepakil.ui.bilesenler.UstCubuk

/**
 * Bağlantı kontrolü tamamen cihazda, bağlantı AÇILMADAN yapılır. Uygulamanın
 * internet izni olmadığı için hiçbir adres dışarı sorulmaz.
 */
@Composable
fun BaglantiEkrani(paylasilan: String?, paylasilanKullanildi: () -> Unit) {
    var metin by rememberSaveable { mutableStateOf("") }
    var sonuc by rememberSaveable(stateSaver = sonucKaydedici) { mutableStateOf<BaglantiDenetleyici.Sonuc?>(null) }
    val pano = LocalClipboardManager.current
    val klavye = LocalSoftwareKeyboardController.current

    val denetle = {
        klavye?.hide()
        sonuc = BaglantiDenetleyici.denetle(metin)
    }

    // "Paylaş > CepAkıl" ile gelen bağlantı: kutuya yaz ve hemen denetle.
    LaunchedEffect(paylasilan) {
        if (!paylasilan.isNullOrBlank()) {
            metin = paylasilan
            sonuc = BaglantiDenetleyici.denetle(paylasilan)
            paylasilanKullanildi()
        }
    }

    Column(Modifier.fillMaxSize()) {
        UstCubuk("Bağlantı Kontrolü")
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Text(
                    "SMS, WhatsApp ya da e-postayla gelen bir bağlantıyı buraya yapıştır. Bağlantı açılmaz; yalnız adresin yazılışı incelenir.",
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
            item {
                OutlinedTextField(
                    value = metin,
                    onValueChange = { metin = it; sonuc = null },
                    label = { Text("Bağlantı (ör. https://…)") },
                    leadingIcon = { Icon(Icons.Filled.Link, contentDescription = null) },
                    trailingIcon = {
                        if (metin.isNotEmpty()) {
                            IconButton(onClick = { metin = ""; sonuc = null }) { Icon(Icons.Filled.Clear, contentDescription = "Temizle") }
                        }
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Search, autoCorrectEnabled = false),
                    keyboardActions = KeyboardActions(onSearch = { if (metin.isNotBlank()) denetle() }),
                    minLines = 2,
                    maxLines = 5,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Pano yalnız kullanıcı bu düğmeye bastığında okunur.
                    IkincilDugme("Panodan yapıştır", {
                        pano.getText()?.text?.let { metin = it; sonuc = null }
                    }, ikon = Icons.Filled.ContentPaste, modifier = Modifier.weight(1f))
                }
            }
            item {
                BuyukDugme("Kontrol et", denetle, ikon = Icons.Filled.Search, etkin = metin.isNotBlank())
            }

            val s = sonuc
            if (s == null) {
                item {
                    BilgiDurumu(
                        Icons.Filled.Link, "Kontrol edilecek bağlantı yok",
                        "Başka bir uygulamada bağlantıya uzun basıp \"Paylaş > CepAkıl\" seçeneğiyle de buraya gönderebilirsin.",
                    )
                }
            } else {
                item {
                    val baslik = when (s.seviye) {
                        Seviye.KIRMIZI -> "Tehlike göstergeleri var"
                        Seviye.SARI -> "Dikkat gerektiren işaretler var"
                        else -> "Kesin sonuç verilemiyor"
                    }
                    Column(Modifier.semantics { liveRegion = LiveRegionMode.Polite }) {
                        DurumKarti(s.seviye, baslik, s.ozet.substringAfter(". ", s.ozet), Baglam.BAGLANTI)
                    }
                }
                s.alanAdi?.let { alan ->
                    item {
                        BilgiSatirlari(listOf("Gideceği site" to alan, "Kayıtlı alan adı" to BaglantiDenetleyici.kayitliAlanAdi(alan)))
                    }
                }
                if (s.bulgular.isNotEmpty()) {
                    item { BolumBasligi("Bulunan işaretler") }
                    item { com.cepakil.ui.bilesenler.BulguGrubu(s.bulgular, Baglam.BAGLANTI) }
                }
                item {
                    SinirNotu(
                        "Emin değilsen bağlantıyı açma. Kurumun resmi uygulamasını ya da adresini kendin yazarak gir. " +
                            "Bankalar, kargo firmaları ve e-Devlet SMS ile şifre, kart bilgisi ya da ödeme istemez.",
                        "Ne yapmalı?",
                    )
                }
            }
            item { SinirNotu(BaglantiDenetleyici.SINIR_NOTU) }
        }
    }
}

/** Ekran döndürülünce sonuç kaybolmasın: girilen metinden yeniden hesaplanır. */
private val sonucKaydedici = androidx.compose.runtime.saveable.Saver<BaglantiDenetleyici.Sonuc?, String>(
    save = { it?.girilen ?: "" },
    restore = { if (it.isEmpty()) null else BaglantiDenetleyici.denetle(it) },
)
