package com.cepakil.ui.tema

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color

private val Acik = lightColorScheme(
    primary = Color(0xFF0B4F6C),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFC6E7FF),
    onPrimaryContainer = Color(0xFF001E2C),
    secondary = Color(0xFF4E616D),
    background = Color(0xFFF8F9FC),
    surface = Color(0xFFF8F9FC),
    surfaceVariant = Color(0xFFE1E6EC),
    onSurfaceVariant = Color(0xFF3F484F),
)

private val Koyu = darkColorScheme(
    primary = Color(0xFF8ACEF5),
    onPrimary = Color(0xFF00344A),
    primaryContainer = Color(0xFF004C69),
    onPrimaryContainer = Color(0xFFC6E7FF),
    secondary = Color(0xFFB5C9D7),
    background = Color(0xFF111418),
    surface = Color(0xFF111418),
    surfaceVariant = Color(0xFF3F484F),
    onSurfaceVariant = Color(0xFFBFC8D0),
)

/**
 * Durum renkleri. Renk hiçbir zaman tek başına anlam taşımaz: her durumda
 * simge ve yazılı etiket de gösterilir (renk körlüğü ve ekran okuyucular için).
 * Yazı/zemin çiftleri WCAG AA (≥4.5:1) karşıtlığını sağlayacak şekilde seçildi.
 */
@Immutable
data class DurumRenkleri(val zemin: Color, val yazi: Color, val vurgu: Color)

object Durumlar {
    fun kirmizi(koyu: Boolean) = if (koyu) DurumRenkleri(Color(0xFF5C1A16), Color(0xFFFFDAD5), Color(0xFFFFB4AB))
    else DurumRenkleri(Color(0xFFFCE4E1), Color(0xFF7A1610), Color(0xFFB3261E))

    fun sari(koyu: Boolean) = if (koyu) DurumRenkleri(Color(0xFF4A3800), Color(0xFFFFE08A), Color(0xFFF2C14E))
    else DurumRenkleri(Color(0xFFFFF1C7), Color(0xFF5C4300), Color(0xFF8A6500))

    fun yesil(koyu: Boolean) = if (koyu) DurumRenkleri(Color(0xFF0F3D22), Color(0xFFC4F0D2), Color(0xFF7DD99C))
    else DurumRenkleri(Color(0xFFDDF4E4), Color(0xFF14532D), Color(0xFF1E7B44))

    fun gri(koyu: Boolean) = if (koyu) DurumRenkleri(Color(0xFF2E3338), Color(0xFFE0E4E8), Color(0xFFB8C0C8))
    else DurumRenkleri(Color(0xFFE8ECF0), Color(0xFF2E3A44), Color(0xFF55636F))
}

@Composable
fun CepAkilTema(icerik: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (isSystemInDarkTheme()) Koyu else Acik, content = icerik)
}
