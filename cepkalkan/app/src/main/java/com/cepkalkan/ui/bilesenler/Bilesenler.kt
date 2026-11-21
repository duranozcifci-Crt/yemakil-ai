package com.cepkalkan.ui.bilesenler

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.cepkalkan.analiz.Bulgu
import com.cepkalkan.analiz.Seviye
import com.cepkalkan.ui.tema.DurumRenkleri
import com.cepkalkan.ui.tema.Durumlar

/** Aynı seviye farklı bölümlerde farklı söylenir: bağlantılar asla "güvenli" denmez. */
enum class Baglam { GENEL, UYGULAMA, DOSYA, BAGLANTI }

data class DurumGorunumu(val renk: DurumRenkleri, val ikon: ImageVector, val etiket: String)

@Composable
fun durumGorunumu(seviye: Seviye, baglam: Baglam = Baglam.GENEL): DurumGorunumu {
    val koyu = isSystemInDarkTheme()
    return when (seviye) {
        Seviye.KIRMIZI -> DurumGorunumu(Durumlar.kirmizi(koyu), Icons.Filled.Error, "Öncelikli incele")
        Seviye.SARI -> DurumGorunumu(Durumlar.sari(koyu), Icons.Filled.Warning, "İncele")
        Seviye.BILGI, Seviye.YESIL -> when (baglam) {
            Baglam.BAGLANTI -> DurumGorunumu(Durumlar.gri(koyu), Icons.AutoMirrored.Filled.Help, "Kesin sonuç yok")
            Baglam.DOSYA -> DurumGorunumu(Durumlar.yesil(koyu), Icons.Filled.CheckCircle, "Gösterge bulunamadı")
            else -> if (seviye == Seviye.BILGI && baglam == Baglam.GENEL) {
                DurumGorunumu(Durumlar.gri(koyu), Icons.Filled.Info, "Bilgi")
            } else {
                DurumGorunumu(Durumlar.yesil(koyu), Icons.Filled.CheckCircle, "Dikkat çeken işaret yok")
            }
        }
    }
}

@Composable
fun DurumRozeti(seviye: Seviye, baglam: Baglam = Baglam.GENEL) {
    val g = durumGorunumu(seviye, baglam)
    Surface(color = g.renk.zemin, contentColor = g.renk.yazi, shape = RoundedCornerShape(50)) {
        Row(Modifier.padding(horizontal = 10.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(g.ikon, contentDescription = null, tint = g.renk.vurgu, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(6.dp))
            Text(g.etiket, style = MaterialTheme.typography.labelLarge)
        }
    }
}

/** Ekranın üstündeki büyük durum kutusu. */
@Composable
fun DurumKarti(seviye: Seviye, baslik: String, aciklama: String?, baglam: Baglam = Baglam.GENEL, ikonOverride: ImageVector? = null) {
    val g = durumGorunumu(seviye, baglam)
    Card(
        colors = CardDefaults.cardColors(containerColor = g.renk.zemin, contentColor = g.renk.yazi),
        modifier = Modifier.fillMaxWidth().semantics(mergeDescendants = true) {},
    ) {
        Row(Modifier.padding(20.dp), verticalAlignment = Alignment.Top) {
            Icon(ikonOverride ?: g.ikon, contentDescription = g.etiket, tint = g.renk.vurgu, modifier = Modifier.size(40.dp))
            Spacer(Modifier.width(16.dp))
            Column {
                Text(baslik, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                if (aciklama != null) {
                    Spacer(Modifier.padding(top = 6.dp))
                    Text(aciklama, style = MaterialTheme.typography.bodyLarge)
                }
            }
        }
    }
}

@Composable
fun BulguKarti(bulgu: Bulgu, baglam: Baglam = Baglam.GENEL, onClick: (() -> Unit)? = null, ust: String? = null) {
    val g = durumGorunumu(bulgu.seviye, baglam)
    val icerik: @Composable () -> Unit = {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.Top) {
            Icon(g.ikon, contentDescription = g.etiket, tint = g.renk.vurgu, modifier = Modifier.size(28.dp))
            Spacer(Modifier.width(12.dp))
            Column {
                if (ust != null) Text(ust, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(bulgu.baslik, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.padding(top = 4.dp))
                Text(bulgu.aciklama, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
    val renkler = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f))
    val m = Modifier.fillMaxWidth().semantics(mergeDescendants = true) {}
    if (onClick != null) Card(onClick = onClick, colors = renkler, modifier = m) { icerik() }
    else Card(colors = renkler, modifier = m) { icerik() }
}

@Composable
fun BuyukDugme(metin: String, onClick: () -> Unit, ikon: ImageVector? = null, etkin: Boolean = true, yukleniyor: Boolean = false, modifier: Modifier = Modifier) {
    Button(
        onClick = onClick,
        enabled = etkin && !yukleniyor,
        modifier = modifier.fillMaxWidth().heightIn(min = 56.dp),
        shape = RoundedCornerShape(16.dp),
    ) {
        if (yukleniyor) {
            CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 3.dp, color = MaterialTheme.colorScheme.onPrimary)
        } else if (ikon != null) {
            Icon(ikon, contentDescription = null)
        }
        Spacer(Modifier.width(10.dp))
        Text(metin, style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
fun IkincilDugme(metin: String, onClick: () -> Unit, ikon: ImageVector? = null, modifier: Modifier = Modifier) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.fillMaxWidth().heightIn(min = 52.dp),
        shape = RoundedCornerShape(16.dp),
    ) {
        if (ikon != null) {
            Icon(ikon, contentDescription = null)
            Spacer(Modifier.width(10.dp))
        }
        Text(metin, style = MaterialTheme.typography.titleSmall)
    }
}

/** Boş durum ve hata durumu için ortak görünüm. */
@Composable
fun BilgiDurumu(ikon: ImageVector, baslik: String, aciklama: String, eylemMetni: String? = null, eylem: (() -> Unit)? = null) {
    Column(
        Modifier.fillMaxWidth().padding(vertical = 32.dp, horizontal = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(ikon, contentDescription = null, modifier = Modifier.size(56.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(baslik, style = MaterialTheme.typography.titleLarge, modifier = Modifier.semantics { heading() })
        Text(aciklama, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (eylemMetni != null && eylem != null) {
            Spacer(Modifier.padding(top = 4.dp))
            IkincilDugme(eylemMetni, eylem)
        }
    }
}

/** "Bu kontrol neyi ölçer, neyi ölçmez" kutusu. Her kontrol ekranında gösterilir. */
@Composable
fun SinirNotu(metin: String, baslik: String = "Bu kontrolün sınırları") {
    Surface(
        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f),
        contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth().semantics(mergeDescendants = true) {},
    ) {
        Row(Modifier.padding(14.dp)) {
            Icon(Icons.Filled.Info, contentDescription = null, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(10.dp))
            Column {
                Text(baslik, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Text(metin, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Composable
fun BolumBasligi(metin: String) {
    Text(
        metin,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(top = 12.dp, bottom = 2.dp).semantics { heading() },
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UstCubuk(baslik: String, geri: (() -> Unit)? = null) {
    TopAppBar(
        // Dış Scaffold sistem çubuğu boşluğunu zaten bırakıyor; ikinci kez eklenmesin.
        windowInsets = WindowInsets(0, 0, 0, 0),
        title = { Text(baslik, style = MaterialTheme.typography.titleLarge) },
        navigationIcon = {
            if (geri != null) {
                IconButton(onClick = geri) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Geri") }
            }
        },
    )
}
