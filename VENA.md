# Proje: MacBI (Power BI Clone for macOS)

## 1. Proje Özeti
macOS üzerinde yerel (native) performansla çalışan, Power BI benzeri bir veri görselleştirme ve analiz aracı. 

## 2. Teknoloji Yığını (Tech Stack)
- **Framework:** Electron (macOS Masaüstü Uygulaması için)
- **Frontend:** React.js + TypeScript
- **Styling:** Tailwind CSS (Modern macOS UI görünümü)
- **Veri Motoru (Core):** DuckDB (Node.js sürümü) - Milyonlarca satırı Mac üzerinde işlemek için.
- **Grafik Kütüphanesi:** Recharts veya Apache ECharts (Dinamik ve interaktif grafikler).

## 3. Temel Kullanım Senaryosu (Use Case)
1. Kullanıcı bir **CSV veya Parquet** dosyasını uygulamaya sürükler.
2. **DuckDB** veriyi anında indeksler ve şemayı (kolonları) çıkarır.
3. Sol panelde kolon isimleri listelenir (Dimensions & Measures).
4. Kullanıcı kolonları orta alandaki **Canvas**'a sürükler.
5. Uygulama otomatik bir SQL sorgusu oluşturur ve sonucu bir **Grafik** olarak çizer.

## 4. Claude Code İçin İlk Görevler (Roadmap)

### Adım 1: Proje Kurulumu (Boilerplate)
- [x] Electron + React + TypeScript projesini oluştur.
- [x] Tailwind CSS konfigürasyonunu macOS standartlarına (San Francisco fontu, yuvarlatılmış köşeler) göre yap.
- [x] Ana pencere yapısını oluştur (Sidebar, Toolbar, Canvas).

### Adım 2: Veri Katmanı (DuckDB Entegrasyonu)
- [ ] `duckdb` kütüphanesini projeye ekle.
- [ ] Yerel bir CSV dosyasını okuyup DuckDB'ye tablo olarak kaydeden bir "Data Service" yaz.
- [ ] Tablo şemasını (kolon isimleri ve tipleri) döndüren bir API hazırla.

### Adım 3: Görselleştirme (UI)
- [ ] Sürükle-bırak (Drag & Drop) için `dnd-kit` veya `react-beautiful-dnd` ekle.
- [ ] Örnek bir Bar Chart bileşeni oluştur.
- [ ] SQL sorgusundan gelen veriyi grafiğe bağla.

## 5. macOS Spesifik Özellikler
- Karanlık Mod (Dark Mode) desteği.
- macOS Menü Çubuğu (Menu Bar) entegrasyonu.
- Apple Silicon (M1/M2/M3) için optimize edilmiş veri işleme.
