package com.cepakil.ui.bilesenler

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.cepakil.analiz.Bulgu
import com.cepakil.analiz.Seviye
import com.cepakil.ui.tema.DurumRenkleri
import com.cepakil.ui.tema.Durumlar

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
            Baglam.DOSYA -> DurumGorunumu(Durumlar.yesil(koyu), Icons.Filled.CheckCircle, "Gösterge yok")
            else -> if (seviye == Seviye.BILGI && baglam == Baglam.GENEL) {
                DurumGorunumu(Durumlar.gri(koyu), Icons.Filled.Info, "Bilgi")
            } else {
                DurumGorunumu(Durumlar.yesil(koyu), Icons.Filled.CheckCircle, "Sorun yok")
            }
        }
    }
}

/** Yuvarlak, açık renk zeminli simge (liste satırlarının başında). */
@Composable
fun TonluSimge(ikon: ImageVector, zemin: Color, renk: Color, boyut: Dp = 40.dp) {
    Box(
        Modifier.size(boyut).clip(CircleShape).background(zemin),
        contentAlignment = Alignment.Center,
    ) {
        Icon(ikon, contentDescription = null, tint = renk, modifier = Modifier.size(boyut * 0.55f))
    }
}

/** Küçük durum etiketi (hap biçiminde). */
@Composable
fun DurumRozeti(seviye: Seviye, baglam: Baglam = Baglam.GENEL) {
    val g = durumGorunumu(seviye, baglam)
    Surface(color = g.renk.zemin, contentColor = g.renk.yazi, shape = RoundedCornerShape(50)) {
        Row(Modifier.padding(start = 8.dp, end = 10.dp, top = 3.dp, bottom = 3.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(g.ikon, contentDescription = null, tint = g.renk.vurgu, modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(5.dp))
            Text(g.etiket, style = MaterialTheme.typography.labelMedium)
        }
    }
}

/** Genel amaçlı hap etiket (ör. "Google Play", "Sürüm 2.1"). */
@Composable
fun Etiket(metin: String, ikon: ImageVector? = null) {
    Surface(color = MaterialTheme.colorScheme.surfaceContainerHigh, contentColor = MaterialTheme.colorScheme.onSurfaceVariant, shape = RoundedCornerShape(50)) {
        Row(Modifier.padding(horizontal = 10.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            if (ikon != null) {
                Icon(ikon, contentDescription = null, modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(5.dp))
            }
            Text(metin, style = MaterialTheme.typography.labelMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

/** Ekranın üstündeki büyük durum kutusu. */
@Composable
fun DurumKarti(seviye: Seviye, baslik: String, aciklama: String?, baglam: Baglam = Baglam.GENEL, ikonOverride: ImageVector? = null) {
    val g = durumGorunumu(seviye, baglam)
    Card(
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = g.renk.zemin, contentColor = g.renk.yazi),
        modifier = Modifier.fillMaxWidth().semantics(mergeDescendants = true) { stateDescription = g.etiket },
    ) {
        Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            TonluSimge(ikonOverride ?: g.ikon, g.renk.vurgu, Color.White, 44.dp)
            Spacer(Modifier.width(14.dp))
            Column {
                Text(baslik, style = MaterialTheme.typography.titleMedium)
                if (aciklama != null) {
                    Spacer(Modifier.size(2.dp))
                    Text(aciklama, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}

/** Beyaz zeminli, kenarsız kart: satırları gruplamak için. */
@Composable
fun Grup(modifier: Modifier = Modifier, icerik: @Composable ColumnScope.() -> Unit) {
    Card(
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = modifier.fillMaxWidth(),
    ) { Column(content = icerik) }
}

/** Satırlar arası ince çizgi. Solda simge yoksa [girinti] 16.dp verilir. */
@Composable
fun GrupAyraci(girinti: Dp = 70.dp) = HorizontalDivider(Modifier.padding(start = girinti), color = MaterialTheme.colorScheme.outlineVariant)

/** Liste satırı: solda simge, ortada başlık + açıklama, sağda isteğe bağlı ek ve ok. */
@Composable
fun Satir(
    baslik: String,
    aciklama: String? = null,
    bas: (@Composable () -> Unit)? = null,
    son: (@Composable () -> Unit)? = null,
    ust: String? = null,
    onClick: (() -> Unit)? = null,
    aciklamaSatiri: Int = Int.MAX_VALUE,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(role = Role.Button, onClick = onClick) else Modifier)
            .heightIn(min = 56.dp)
            .padding(horizontal = 16.dp, vertical = 12.dp)
            .semantics(mergeDescendants = true) {},
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (bas != null) {
            bas()
            Spacer(Modifier.width(14.dp))
        }
        Column(Modifier.weight(1f)) {
            if (ust != null) Text(ust, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(baslik, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
            if (aciklama != null) {
                Spacer(Modifier.size(2.dp))
                Text(
                    aciklama, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = aciklamaSatiri, overflow = TextOverflow.Ellipsis,
                )
            }
        }
        if (son != null) {
            Spacer(Modifier.width(10.dp))
            son()
        }
        if (onClick != null) {
            Spacer(Modifier.width(4.dp))
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.outline)
        }
    }
}

/** Bir bulguyu, tek başına bir kart olarak gösterir. */
@Composable
fun BulguKarti(bulgu: Bulgu, baglam: Baglam = Baglam.GENEL, onClick: (() -> Unit)? = null, ust: String? = null) {
    Grup { BulguSatiri(bulgu, baglam, onClick, ust) }
}

/** Bir bulguyu grup içinde satır olarak gösterir. */
@Composable
fun BulguSatiri(bulgu: Bulgu, baglam: Baglam = Baglam.GENEL, onClick: (() -> Unit)? = null, ust: String? = null) {
    val g = durumGorunumu(bulgu.seviye, baglam)
    Satir(
        baslik = bulgu.baslik,
        aciklama = bulgu.aciklama,
        ust = ust,
        onClick = onClick,
        bas = { TonluSimge(g.ikon, g.renk.zemin, g.renk.vurgu) },
    )
}

/** Bulgu listesini tek kartta, satırlar arasında ayraçla gösterir. */
@Composable
fun BulguGrubu(bulgular: List<Bulgu>, baglam: Baglam = Baglam.GENEL) {
    if (bulgular.isEmpty()) return
    Grup {
        bulgular.forEachIndexed { i, b ->
            if (i > 0) GrupAyraci()
            BulguSatiri(b, baglam)
        }
    }
}

/** Sayı kutucuğu (ör. "142 · İncelenen uygulama"). */
@Composable
fun Kutucuk(sayi: String, etiket: String, modifier: Modifier = Modifier, renk: Color = MaterialTheme.colorScheme.onSurface) {
    Grup(modifier) {
        Column(Modifier.padding(horizontal = 14.dp, vertical = 12.dp).semantics(mergeDescendants = true) {}) {
            Text(sayi, style = MaterialTheme.typography.headlineSmall, color = renk)
            Text(etiket, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
        }
    }
}

@Composable
fun BuyukDugme(metin: String, onClick: () -> Unit, ikon: ImageVector? = null, etkin: Boolean = true, yukleniyor: Boolean = false, modifier: Modifier = Modifier) {
    Button(
        onClick = onClick,
        enabled = etkin && !yukleniyor,
        modifier = modifier.fillMaxWidth().heightIn(min = 54.dp),
        shape = MaterialTheme.shapes.medium,
        contentPadding = ButtonDefaults.ButtonWithIconContentPadding,
    ) {
        if (yukleniyor) {
            CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.5.dp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.width(10.dp))
        } else if (ikon != null) {
            Icon(ikon, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(10.dp))
        }
        Text(metin, style = MaterialTheme.typography.titleSmall)
    }
}

@Composable
fun IkincilDugme(metin: String, onClick: () -> Unit, ikon: ImageVector? = null, modifier: Modifier = Modifier) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.fillMaxWidth().heightIn(min = 50.dp),
        shape = MaterialTheme.shapes.medium,
        contentPadding = ButtonDefaults.ButtonWithIconContentPadding,
    ) {
        if (ikon != null) {
            Icon(ikon, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
        }
        Text(metin, style = MaterialTheme.typography.labelLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

/** Boş durum ve hata durumu için ortak görünüm. */
@Composable
fun BilgiDurumu(ikon: ImageVector, baslik: String, aciklama: String, eylemMetni: String? = null, eylem: (() -> Unit)? = null) {
    Column(
        Modifier.fillMaxWidth().padding(vertical = 28.dp, horizontal = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        TonluSimge(ikon, MaterialTheme.colorScheme.surfaceContainerHigh, MaterialTheme.colorScheme.onSurfaceVariant, 64.dp)
        Spacer(Modifier.size(4.dp))
        Text(baslik, style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { heading() })
        Text(
            aciklama, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
        if (eylemMetni != null && eylem != null) {
            Spacer(Modifier.size(6.dp))
            IkincilDugme(eylemMetni, eylem)
        }
    }
}

/**
 * "Bu kontrol neyi ölçer, neyi ölçmez" notu. Ekranı kalabalıklaştırmasın diye
 * kapalı gelir; dokununca açılır.
 */
@Composable
fun SinirNotu(metin: String, baslik: String = "Bu kontrolün sınırları", acik: Boolean = false) {
    var acikMi by rememberSaveable(baslik) { mutableStateOf(acik) }
    val donus by animateFloatAsState(if (acikMi) 180f else 0f, label = "ok")
    Grup {
        Row(
            Modifier
                .fillMaxWidth()
                .clickable(role = Role.Button) { acikMi = !acikMi }
                .heightIn(min = 52.dp)
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .semantics { stateDescription = if (acikMi) "Açık" else "Kapalı" },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Outlined.Info, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(12.dp))
            Text(baslik, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
            Icon(Icons.Filled.ExpandMore, contentDescription = null, tint = MaterialTheme.colorScheme.outline, modifier = Modifier.rotate(donus))
        }
        AnimatedVisibility(acikMi) {
            Text(
                metin, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 48.dp, end = 16.dp, bottom = 14.dp),
            )
        }
    }
}

@Composable
fun BolumBasligi(metin: String) {
    Text(
        metin,
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(start = 4.dp, top = 14.dp, bottom = 0.dp).semantics { heading() },
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UstCubuk(baslik: String, geri: (() -> Unit)? = null) {
    TopAppBar(
        // Dış Scaffold sistem çubuğu boşluğunu zaten bırakıyor; ikinci kez eklenmesin.
        windowInsets = WindowInsets(0, 0, 0, 0),
        colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
        title = { Text(baslik, style = MaterialTheme.typography.titleLarge, modifier = Modifier.semantics { heading() }) },
        navigationIcon = {
            if (geri != null) {
                IconButton(onClick = geri) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Geri") }
            }
        },
    )
}
