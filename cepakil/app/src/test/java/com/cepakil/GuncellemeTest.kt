package com.cepakil

import com.cepakil.koruma.Guncelleme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class GuncellemeTest {
    @Test fun surumCozulur() {
        assertEquals(58, Guncelleme.surumCoz("cbcd8f02782c1f67 success 0.2.58\n"))
        assertNull(Guncelleme.surumCoz("cbcd8f02782c1f67 failure 0.2.59"))
        assertNull(Guncelleme.surumCoz("<html>giriş sayfası</html>"))
        assertNull(Guncelleme.surumCoz(""))
        assertNull(Guncelleme.surumCoz("abc success 0.2.x"))
    }
}
