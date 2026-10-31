
const express = require('express');
const db = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/products', requireAdmin, async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT p.id, p.kode_produk, p.nama_produk, p.category_id,
             c.nama_kategori, p.harga_jual, p.harga_pokok,
             p.stok, p.unit
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY p.nama_produk ASC
    `);

    const [categories] = await db.query(
      'SELECT id, nama_kategori FROM categories ORDER BY nama_kategori ASC'
    );

    res.render('products', {
      title: 'Produk & Stok',
      user: req.session.user,
      products,
      categories,
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Products error:', error);
    res.status(500).send('Gagal memuat data produk. Periksa terminal.');
  }
});

router.post('/products/add', requireAdmin, async (req, res) => {
  const { kode_produk, nama_produk, category_id, harga_jual, harga_pokok, stok, unit } = req.body;

  const jual = Number(harga_jual);
  const pokok = Number(harga_pokok);
  const jumlahStok = Number(stok);
  const kategori = Number(category_id);

  if (!kode_produk?.trim() || !nama_produk?.trim() ||
      !Number.isInteger(kategori) || kategori <= 0 ||
      !Number.isFinite(jual) || jual < 0 ||
      !Number.isFinite(pokok) || pokok < 0 ||
      !Number.isInteger(jumlahStok) || jumlahStok < 0 ||
      !unit?.trim()) {
    return res.status(400).send('Data produk tidak valid. Periksa kembali isian.');
  }

  try {
    await db.query(
      `INSERT INTO products
       (kode_produk, nama_produk, category_id, harga_jual, harga_pokok, stok, unit)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [kode_produk.trim(), nama_produk.trim(), kategori, jual, pokok, jumlahStok, unit.trim()]
    );

    res.redirect('/products');
  } catch (error) {
    console.error('Add product error:', error);
    res.status(400).send('Gagal menambahkan produk. Pastikan kode produk belum digunakan dan kategori tersedia.');
  }
});

router.post('/products/:id/update', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { kode_produk, nama_produk, category_id, harga_jual, harga_pokok, stok, unit } = req.body;

  const jual = Number(harga_jual);
  const pokok = Number(harga_pokok);
  const jumlahStok = Number(stok);
  const kategori = Number(category_id);

  if (!Number.isInteger(id) || id <= 0 ||
      !kode_produk?.trim() || !nama_produk?.trim() ||
      !Number.isInteger(kategori) || kategori <= 0 ||
      !Number.isFinite(jual) || jual < 0 ||
      !Number.isFinite(pokok) || pokok < 0 ||
      !Number.isInteger(jumlahStok) || jumlahStok < 0 ||
      !unit?.trim()) {
    return res.status(400).send('Data produk tidak valid. Periksa kembali isian.');
  }

  try {
    const [result] = await db.query(
      `UPDATE products
       SET kode_produk = ?, nama_produk = ?, category_id = ?,
           harga_jual = ?, harga_pokok = ?, stok = ?, unit = ?
       WHERE id = ?`,
      [kode_produk.trim(), nama_produk.trim(), kategori, jual, pokok, jumlahStok, unit.trim(), id]
    );

    if (result.affectedRows === 0) {
      const [rows] = await db.query('SELECT id FROM products WHERE id = ?', [id]);
      if (rows.length === 0) return res.status(404).send('Produk tidak ditemukan.');
    }

    res.redirect('/products');
  } catch (error) {
    console.error('Update product error:', error);
    res.status(400).send('Gagal memperbarui produk. Pastikan kode produk belum digunakan dan kategori tersedia.');
  }
});

router.post('/products/:id/delete', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).send('ID produk tidak valid.');
  }

  try {
    await db.query('DELETE FROM products WHERE id = ?', [id]);
    res.redirect('/products');
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(400).send('Produk tidak dapat dihapus karena mungkin sudah digunakan dalam transaksi.');
  }
});

module.exports = router;
