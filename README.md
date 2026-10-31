# Titik Temu Kopi --- Sistem Point of Sale (POS)

Aplikasi Point of Sale (POS) berbasis web untuk membantu operasional
kafe **Titik Temu Kopi**, mulai dari pengelolaan produk dan stok,
transaksi kasir, hingga laporan penjualan.

## Fitur

### Admin

-   Dashboard ringkasan operasional.
-   Mengelola data produk dan stok.
-   Mengelola pengguna serta peran dan status akun.
-   Melihat laporan penjualan dengan filter tanggal, kategori, dan
    metode pembayaran.
-   Mengekspor laporan ke CSV yang dapat dibuka di Microsoft Excel dan
    PDF.

### Kasir

-   Memilih produk dan membuat transaksi.
-   Menghitung subtotal, diskon, pajak PB1, total pembayaran, dan
    kembalian.
-   Memproses pembayaran tunai, QRIS, atau transfer.
-   Melihat riwayat transaksi yang dibuat oleh kasir.

### Hak akses

Aplikasi membedakan hak akses **Admin** dan **Kasir**. Admin mengelola
data dan laporan, sedangkan Kasir menangani transaksi. Halaman dibatasi
berdasarkan peran pengguna.

## Teknologi

-   Node.js
-   Express.js
-   EJS
-   MySQL
-   Bootstrap
-   JavaScript
-   `express-session` untuk sesi login
-   `bcryptjs` untuk hashing kata sandi
-   `pdfkit` untuk pembuatan laporan PDF

## Persyaratan

Pastikan perangkat sudah memiliki: - Node.js dan npm - MySQL Server -
Database client seperti phpMyAdmin atau MySQL Workbench (opsional)

## Instalasi dan Menjalankan Aplikasi

1.  **Siapkan database MySQL.**

    Buat database bernama `db_pos_kafe`, lalu impor atau jalankan skema
    tabel yang digunakan oleh project. Tabel utama aplikasi meliputi
    `users`, `categories`, `products`, `orders`, dan `order_details`.

2.  **Pasang dependensi.**

    Buka terminal di folder project, lalu jalankan:

    ``` bash
    npm install
    ```

3.  **Buat file `.env`** di folder utama project:

    ``` env
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=
    DB_NAME=db_pos_kafe
    SESSION_SECRET=ganti_dengan_secret_yang_aman
    PORT=3000
    ```

    Sesuaikan konfigurasi database dengan MySQL di perangkat Anda.
    Jangan membagikan file `.env` atau memasukkannya ke repositori
    publik.

4.  **Jalankan aplikasi.**

    Gunakan perintah start yang tersedia di `package.json`. Jika script
    `start` sudah disiapkan:

    ``` bash
    npm start
    ```

    Jika belum ada script start, jalankan:

    ``` bash
    node app.js
    ```

5.  **Buka aplikasi** di browser:

    <http://localhost:3000>

## Akun Demo

Jika akun demo sudah dibuat di database, gunakan kredensial berikut:

  Peran   Username   Password
  ------- ---------- ------------
  Admin   `admin`    `admin123`
  Kasir   `kasir`    `kasir123`

## Struktur Folder

``` text
cafe-pos/
├── app.js
├── package.json
├── .env
├── config/
│   └── db.js
├── middleware/
│   └── auth.js
├── routes/
│   ├── auth.js
│   ├── pos.js
│   ├── products.js
│   ├── users.js
│   └── reports.js
├── views/
│   ├── login.ejs
│   ├── dashboard.ejs
│   ├── pos.ejs
│   ├── products.ejs
│   ├── users.ejs
│   ├── reports.ejs
│   ├── riwayat-transaksi.ejs
│   ├── detail-transaksi.ejs
│   └── partials/
└── public/
    ├── css/
    │   └── style.css
    └── js/
        └── pos.js
```

## Alur Transaksi

1.  Kasir login ke aplikasi.
2.  Kasir memilih produk dan jumlahnya.
3.  Sistem menghitung subtotal, diskon, pajak, dan total.
4.  Kasir memilih metode pembayaran dan memasukkan nominal pembayaran
    jika menggunakan tunai.
5.  Sistem menyimpan transaksi dan detail item, lalu memperbarui stok
    produk.
6.  Admin dapat memeriksa ringkasan dan laporan penjualan melalui
    halaman laporan.

## Catatan

-   Pastikan layanan MySQL aktif sebelum menjalankan aplikasi.
-   Nama kolom dan skema database harus sesuai dengan query yang
    digunakan di project.
-   Sesuaikan nama script di `package.json` apabila berbeda dari
    instruksi di atas.
-   README ini mendokumentasikan fitur dan struktur project berdasarkan
    implementasi yang tersedia; periksa kembali konfigurasi lokal
    sebelum melakukan deployment.
