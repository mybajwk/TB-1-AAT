**Tugas** Besar

IF4031 **\-** Arsitektur Aplikasi Terdistribusi

Dipersiapkan oleh

Asisten IF4031  
(Iya, asistennya hanya ada 1)


**Waktu Mulai**

Senin, 8 Desember 2025, 22:00 WIB

**Waktu Akhir**

Minggu, 4 Januari 2026, 23.59 WIB

# Changelog

- Aturan terkait kontribusi anggota kelompok
- Revisi _deadline_

# Latar Belakang

# Teknis Pengerjaan

Berikut merupakan teknis pengerjaan tugas besar:

- Tugas besar dikerjakan secara berkelompok, dengan masing-masing kelompok terdiri atas 3 anggota. Kelompok yang terdiri atas 4 anggota dapat dibentuk hanya apabila jumlah anggota kelas tidak habis dibagi 3, dan seluruh kelompok lain di sheets sudah memiliki 3 anggota.
  - Isi kelompok pada [sheets pemilihan kelompok](https://docs.google.com/spreadsheets/d/1Slc98oGkLpbt8bOP12vmAyOIlxIjEBMH8lvc9ALuAWM/edit?usp=sharing). Pastikan kelompok sudah tertulis sebelum 11 Desember 2025, pukul 23.59.
  - Peserta kuliah yang tidak tercantum pada _sheets_ pada akhir masa pengisian kelompok akan dikelompokkan satu sama lain, atau disebarkan ke kelompok-kelompok lain yang sudah terdaftar.
  - Setiap anggota kelompok wajib berkontribusi ke tugas besar.
- Tuliskan seluruh pertanyaan terkait tugas besar pada [sheets QnA](https://docs.google.com/spreadsheets/d/1nFRRegzDj290UhKlzBR8IgVI_m3N0QnS2RoH9dqgJPg/edit?usp=sharing). Apabila pertanyaan belum dijawab setelah 24 jam, silahkan hubungi asisten melalui akun-akun berikut:
  - (LINE/Discord) pkmntrainerfrost. atau
  - (Teams) <23525044@mahasiswa.itb.ac.id>
- Diperbolehkan untuk menggunakan LLM untuk membantu menuliskan dokumen rancangan, dengan syarat penggunaannya dideklarasikan di laporan. Diperbolehkan juga untuk menggunakan LLM untuk melakukan implementasi, selama kode yang dihasilkan dipahami, dan penggunaan LLM diakui dan dituliskan pada kode.
  - **Catatan penting:** Jika diketahui terdapat bagian laporan atau kode yang sama dengan hasil pekerjaan lain maupun _repository_ di internet, maka akan dianggap melakukan kecurangan. Alasan menggunakan bantuan LLM akan diabaikan.
- Segala kecurangan baik sengaja dan tidak disengaja akan ditindaklanjuti, yang dapat berakibat sanksi akademik ke setiap pihak yang terlibat

# Spesifikasi Tugas

Tujuan pada tugas besar ini adalah merancang sebuah arsitektur aplikasi terdistribusi, serta mengimplementasikan _proof-of-concept_ sederhana. Implementasi _proof-of-concept_ dilakukan terhadap satu fungsionalitas atau kualitas saja yang dianggap paling penting.

## 3.0. Background: Aplikasi Pelaporan Warga

Aplikasi yang akan kalian rancang dan implementasi adalah aplikasi yang memungkinkan warga suatu kota (dengan jumlah penduduk sekitar 2,5 juta) untuk **melaporkan permasalahan-permasalahan di lingkungannya** kepada pihak yang berwenang. Laporan-laporan ini dapat terkait dengan berbagai jenis masalah, seperti kriminalitas, kebersihan, kesehatan, perawatan fasilitas, dan seterusnya. Masalah-masalah yang dilaporkan kemudian akan diteruskan (hanya) ke pihak yang terkait; contohnya, masalah terkait kerusakan fasilitas umum hanya akan diteruskan kepada lembaga sarana prasarana, **dan tidak diteruskan kepada pihak lainnya**.

Mengingat bahwa aplikasi seperti ini perlu menangani berbagai jenis masalah - serta daerah dan jumlah pengguna yang cukup besar - terdapat suatu "keharusan" untuk menggunakan arsitektur bersifat terdistribusi (misalnya _microservice_) dibandingkan arsitektur bersifat monolitik. Terdapat beberapa tantangan yang perlu dijawab dalam proses perancangan. Tantangan-tantangan ini dapat berkaitan dengan fungsionalitas secara langsung, atau terkait dengan kualitas aplikasi secara keseluruhan. Pada tugas ini, tantangan-tantangan yang perlu kalian selesaikan sudah diberikan pada bagian selanjutnya dalam bentuk pernyataan-pernyataan klien.

## 3.1. Kebutuhan Aplikasi

Berikut adalah kebutuhan-kebutuhan fungsional yang perlu dipenuhi oleh aplikasi yang akan kalian rancang:

- Aplikasi dapat digunakan oleh warga untuk melaporkan masalah-masalah di lingkungan sekitarnya dalam bentuk laporan tertulis; laporan mungkin dilengkapi oleh lokasi dan multimedia; laporan boleh bersifat publik (dapat dilihat oleh seluruh warga), privat (hanya dapat dilihat pelapor dan penerima), atau anonim (seperti privat, tetapi penerima tidak dapat mengetahui identitas pelapor; digunakan untuk _whistleblowing_).
- Aplikasi dapat digunakan oleh warga untuk mengelola laporan-laporan yang telah ia buat serta melihat status penyelesaiannya.
- Aplikasi dapat digunakan oleh warga untuk melihat laporan-laporan lain yang bersifat publik serta memberikan _upvote_ ke laporan-laporan yang ingin didukung.
- Aplikasi dapat memberikan notifikasi kepada pelapor ketika terdapat kemajuan pada penyelesaian laporan-laporannya.
- Aplikasi dapat digunakan oleh pihak berwenang untuk memantau dan membantu merespon masalah-masalah yang dilaporkan oleh warga, dan terkait dengan kewenangannya, secara _real-time_.
- Aplikasi dapat digunakan oleh pihak berwenang untuk melakukan analisis data terkait masalah-masalah yang dilaporkan.
- Aplikasi dapat digunakan oleh pihak berwenang untuk meneruskan laporan-laporan yang terkait dengan kewenangannya ke aplikasi-aplikasi atau sistem-sistem eksternal yang sudah ada.
- Aplikasi dapat mengeskalasi laporan-laporan ke pihak dengan kewenangan lebih tinggi apabila tidak berhasil ditangani dalam waktu tertentu.
- Aplikasi dapat digunakan oleh kewenangan tertinggi untuk memantau kinerja bawahan-bawahannya dalam menanggapi masalah-masalah yang dilaporkan oleh warga.

Sementara itu, berikut adalah kebutuhan-kebutuhan non-fungsional atau **kualitas-kualitas** yang wajib dipenuhi oleh sistem:

- **Keamanan (_security_)**
  - Aplikasi harus mampu memisahkan masalah-masalah yang dilaporkan oleh warga berdasarkan jenisnya. Pihak penerima laporan hanya dapat melihat masalah yang berada di bawah wewenangnya; sebagai contoh, departemen kebersihan hanya dapat melihat masalah kebersihan dan tidak dapat melihat masalah departemen lainnya.
  - Aplikasi harus mampu menyediakan kemampuan untuk memberikan laporan secara anonim jika diinginkan pelapor, sehingga pelapor tidak dapat dilacak identitasnya.
  - Aplikasi harus mampu memvalidasi identitas pelapor dan memastikan identitas tersebut tidak dipalsukan.
  - Aplikasi harus mampu menghilangkan (menyembunyikan) seluruh data pribadi pembuat sebuah laporan anonim.
  - Aplikasi harus mampu menjaga keamanan data pengguna serta data laporan baik saat dikirimkan (_in-transit_) maupun saat disimpan (_at-rest_).
- **Keandalan (_reliability_)**
  - Aplikasi harus mampu memastikan bahwa kegagalan suatu (_instance_) fungsionalitas atau komponen tidak menyebabkan kegagalan (total) keseluruhan aplikasi.
- **Skalabilitas (_scalability_)**
  - Aplikasi harus mampu menangani lonjakan beban pengguna yang bersifat mendadak dan tidak terduga.
  - Aplikasi harus mampu mengurangi jumlah sumber daya yang digunakan ketika beban tidak terlalu besar.
- **Kinerja (_performance_)**
  - Aplikasi harus mampu memberikan _response time_ yang memuaskan.
- **Observabilitas (_observability_)**
  - Aplikasi harus mampu memungkinkan tim infrastruktur untuk memantau dan menganalisis kinerja sistem secara keseluruhan serta melacak pergerakan lalu lintas antar komponen
  - Aplikasi harus mampu memungkinkan tim keamanan untuk memantau lalu lintas yang diterima sistem dengan tetap mempertahankan privasi pengguna

##

**Good Luck, Have Fun ;)**

# Pengumpulan dan Deliverables

Berikut adalah _deliverables-deliverables_ yang perlu kalian kumpulkan:

- Dokumen perancangan sistem, yang setidaknya berisi:
  - Halaman sampul (_cover_) yang setidaknya berisi nama kelompok, nama dan NIM setiap anggota kelompok, nama aplikasi, serta gambar bebas.
  - Tabel kontribusi setiap anggota kelompok.
  - Deskripsi umum sistem yang dirancang.
  - Diagram arsitektur sistem serta penjelasannya
  - Daftar teknologi terpilih untuk setiap komponen sistem, beserta dengan **alasan pemilihan masing-masing teknologi**.
  - Pemilihan fungsionalitas dan kualitas yang akan diimplementasi pada _proof-of-concept_, beserta dengan **alasan pemilihannya**. Silahkan pilih fungsionalitas (atau fungsionalitas-fungsionalitas) beserta kualitas (atau kualitas-kualitas) yang **dianggap paling kritis** serta **mampu menggambarkan sistem secara keseluruhan**.
  - Penjelasan hasil implementasi _proof-of-concept_ yang dilengkapi dengan tautan kepada sumber kode beserta gambar-gambar yang dokumentasi.
  - Seluruh asumsi (bila ada) yang diambil dalam membuat rancangan.
- (Tautan) sumber kode implementasi _proof-of-concept_.
  - Cukup lakukan implementasi terhadap fungsionalitas dan kualitas yang telah dipilih sebelumnya.
  - Pastikan terdapat **instruksi untuk menjalankan aplikasi**.
- (Tautan) video demonstrasi aplikasi yang diunggah ke YouTube atau Google Drive.
  - Seluruh anggota kelompok wajib hadir pada video demonstrasi, yang menggantikan demonstrasi secara sinkron.
  - Video demonstrasi harus menunjukkan fungsionalitas-fungsionalitas dan kualitas-kualitas yang diimplementasi, beserta dengan penjelasannya.
  - Video demonstrasi maksimal berdurasi 10 menit.

Seluruh _deliverables_ dikumpulkan melalui forms pengumpulan sebelum _deadline_.

# Penilaian dan Bonus

Penilaian akan dilakukan menggunakan **submisi terakhir pada _forms_**, dengan rubrik sebagai berikut:

- **(60) Dokumen perancangan sistem**
  - (5) Penulisan dan kelengkapan dokumen
  - (5) Deskripsi umum
  - (15) Diagram arsitektur
  - (15) Pemilihan teknologi
  - (15) Pemilihan fungsionalitas dan kualitas
  - (5) Penjelasan dan dokumentasi hasil implementasi
- **(30) Implementasi _proof-of-concept_**
- **(10) Video demonstrasi**

Selain itu, berikut merupakan tugas-tugas tambahan yang dapat dilakukan untuk memberikan nilai bonus:

- (5) Melakukan pemilihan alternatif teknologi yang didukung dengan data, penelitian, dan atau proses pemilihan yang lengkap dan runut.
- (10) Melakukan _deployment_ terhadap aplikasi

Perlu dicatat bahwa nilai maksimum tugas adalah 100, dan poin bonus hanya dapat membantu "menambal" nilai yang tidak sempurna.


~

[夕暮れに頬が染まって](https://www.youtube.com/watch?v=oc3NUetF9UA)

[色付いた町が心煽る](https://www.youtube.com/watch?v=oc3NUetF9UA)

[特別な夜に言葉を紡ぐ](https://www.youtube.com/watch?v=oc3NUetF9UA)

~  
Duke