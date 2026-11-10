# YemAkıl — çalışma notları

- Uygulama: `index.html` + `veri.js` (açıklama/bilgi tabloları) + `saglik.js` (hastalık rehberi, aşı) (PWA, GitHub Pages `main` dalından yayınlanır).
- Yayın kuralları: `test/YAYIN.md` — her değişiklikten önce okuyun.
- Fiyat panosu verisi `fiyatlar.json`: `.github/workflows/fiyat.yml` her iş günü (22:17 UTC) `tools/fiyat_guncelle.mjs` ile CBOT vadeli fiyatlarını çekip `main`'e kendisi commit eder (bot commitleri normaldir; dalı çekerken birleştirin).
- Öz-denetim: `node test/selftest.js index.html` (GitHub Actions'ta da her push/PR'da çalışır) → tamamı geçerse kullanıcı onayıyla otomatik olarak `main`'e birleştirilir (YAYIN.md madde 6–8).
- Kullanıcıyla Türkçe, teknik olmayan bir dille konuşun.
- Referans (kararlı) sürümler — geri dönüş noktaları; bu dallara asla yazmayın:
  - `kararli-v122` (V122, 198/198 test) — **güncel referans**: V113 + bölüm bazlı denetim düzeltmeleri (V114), hastalık rehberi (süt, besi, küçükbaş, buzağı; tedavi seçenekleri dozsuz) ve aşı programı/takvimi (V115–V117), veri güvenliği ve yedekleme, dönem uyumlu ürün seçimi (V118), eşik tutarlılığı ve veteriner düzeltmeleri (V119), NRC 2001 düve / AFRC 1993 kuzu büyüme modelleri (V120), GitHub Actions öz-denetimi (V121), tek referans tablosu REF, saha kaydı ve KM tüketimi ayarı, veri.js/saglik.js bölmesi, hata bildir (V122). Deneme sürümü kullanılmıyor.
  - `kararli-v113` (V113, 160/160 test): V112 + karbonhidrat parçaları (şeker, nişasta, by-pass nişasta, çözünür lif, sindirilebilir/sindirilemeyen NDF), yem başına nişasta yıkılımı INRA 2018 tablolarından (feedtables.com; lignin Feedipedia), asidoz riski ve çözücü bu değerlerle, çözücüde risk sınırları için ara gevşetme adımı.
  - `kararli-v112` (V112, 155/155 test): V109 + NASEM 2021 rumen modeli (mikrobiyal protein, NDF/nişasta sindirimi, MP ihtiyacı), yem başına protein parçaları (A/B/C, kd; Feedipedia ölçümleri, kaynaklı) ile yem başına bypass protein, sindirilebilir lizin/metiyonin, yem düzenleyicide kendi analiz girişi. Geçiş hızı NASEM sabit (Seo 2006 doğrulanamadı).
  - `kararli-v109` (V109, 147/147 test): V105 + besi sağlık riskleri (asidoz/apse, şişme, idrar taşı, PEM, sıcak stresi), çiftlik yemi sağlık ve yem güvenliği riskleri (üre, gossipol, aflatoksin, yasal sınırlar), etiket okuma iyileştirmeleri (42 etiketlik derlem, %99,7), premiks rasyon toplamı/yasal sınır kontrolü, etiketten çiftlik rasyonuna ekleme ve birlikte değerlendirme.
  - `kararli-v105` (V105, 118/118 test): V104 + sağmal inek sağlık ve döl riskleri (asidoz/SARA, ketozis, döl tutma–kızgınlık; kaynaklı eşikler, dozlu öneriler), risk odaklı tek tuş çözüm, MUN/doğumdaki kondisyon/sıcaklık girdileri.
  - `kararli-v104` (V104, 108/108 test): tek tuşla tam çözüm (ek tablo + katkı planı), çiftlik rasyonuna dönüş, premiks aktarımı, sıfırdan karışımda fabrika yemleri.
  - `kararli-v100` (V100, 83/83 test) — bağımsız denetim düzeltmeleri.
  Kullanıcı "vXXX'e geri dön" derse `main`'i ilgili dalın içeriğine döndüren yeni bir commit yapın (geçmişi silmeden).
