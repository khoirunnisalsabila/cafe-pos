require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./config/db');

const { requireLogin, requireAdmin } = require('./middleware/auth');

const app = express();

const authRoutes = require('./routes/auth');
const posRoutes = require('./routes/pos');

const productRoutes = require('./routes/products');

const userRoutes = require('./routes/users');

const reportRoutes = require('./routes/reports');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 4
  }
}));

app.use(authRoutes);
app.use(posRoutes);
app.use(productRoutes);
app.use(userRoutes);
app.use(reportRoutes);

app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('login', { error: null });
});


app.get('/dashboard', requireAdmin, async (req, res) => {

  try {
    const [[sales]] = await db.query(`
      SELECT
        COALESCE(SUM(grand_total), 0) AS omzet,
        COUNT(*) AS total_transaksi,
        COALESCE(AVG(grand_total), 0) AS rata_rata
      FROM orders
      WHERE DATE(created_at) = CURDATE()
        AND status <> 'Dibatalkan'
    `);

    const [[products]] = await db.query(
      'SELECT COUNT(*) AS total_produk FROM products'
    );

    const [recentOrders] = await db.query(`
      SELECT
        o.id, o.invoice_number, o.grand_total, o.status,
        o.metode_bayar, o.created_at, u.nama_lengkap
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
      LIMIT 7
    `);

    const [chartRows] = await db.query(`
      SELECT
        HOUR(created_at) AS jam,
        SUM(grand_total) AS omzet
      FROM orders
      WHERE DATE(created_at) = CURDATE()
        AND status <> 'Dibatalkan'
      GROUP BY HOUR(created_at)
      ORDER BY jam
    `);

    
    const [[totalOmzet]] = await db.query(`
      SELECT COALESCE(SUM(grand_total), 0) AS total
      FROM orders
      WHERE status <> 'Dibatalkan'
    `);

    const [bestSelling] = await db.query(`
      SELECT p.nama_produk, SUM(od.kuantiti) AS total_terjual
      FROM order_details od
      JOIN products p ON p.id = od.product_id
      JOIN orders o ON o.id = od.order_id
      WHERE o.status <> 'Dibatalkan'
      GROUP BY p.id, p.nama_produk
      ORDER BY total_terjual DESC
      LIMIT 5
    `);

    const [lowStock] = await db.query(`
      SELECT nama_produk, stok, unit
      FROM products
      WHERE stok <= 5
      ORDER BY stok ASC
      LIMIT 10
    `);

    res.render('dashboard', {
        title: 'Dashboard',
        user: req.session.user,
        totalOmzet: Number(totalOmzet.total),
        bestSelling,
        lowStock,
      stats: {
        omzet: Number(sales.omzet),
        totalTransaksi: Number(sales.total_transaksi),
        rataRata: Number(sales.rata_rata),
        totalProduk: Number(products.total_produk)
      },
      recentOrders,
      chartLabels: chartRows.map(row =>
        String(row.jam).padStart(2, '0') + ':00'
      ),
      chartData: chartRows.map(row => Number(row.omzet))
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send(
      'Gagal memuat dashboard. Periksa terminal VS Code.'
    );
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DATABASE() AS nama_database');
    res.json({ status: 'OK', database: rows[0].nama_database });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'Gagal', message: 'Koneksi database gagal.' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Titik Temu Kopi berjalan di http://localhost:${PORT}`);
});
