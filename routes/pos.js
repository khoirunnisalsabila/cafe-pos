
const express = require('express');
const crypto = require('crypto');
const db = require('../config/db');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

router.get('/pos', requireLogin, async (req, res) => {
  if (req.session.user.role !== 'kasir') {
    return res.status(403).send('Halaman POS hanya untuk Kasir.');
  }

  try {
    const [products] = await db.query(`
      SELECT p.id, p.nama_produk, p.harga_jual AS harga,
             p.stok, c.nama_kategori
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.stok > 0
      ORDER BY p.nama_produk ASC
    `);

    res.render('pos', {
      title: 'Transaksi POS',
      user: req.session.user,
      products
    });
  } catch (error) {
    console.error('POS error:', error);
    res.status(500).send('Gagal memuat produk POS.');
  }
});

router.post('/pos/checkout', requireLogin, async (req, res) => {
  if (req.session.user.role !== 'kasir') {
    return res.status(403).json({
      success: false,
      message: 'Hanya Kasir yang dapat memproses transaksi.'
    });
  }

  const { items, orderType, tableNumber, paymentMethod, discount, cashReceived } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Keranjang masih kosong.'
    });
  }

  if (!['Dine-In', 'Takeaway'].includes(orderType)) {
    return res.status(400).json({
      success: false,
      message: 'Tipe pesanan tidak valid.'
    });
  }

  if (orderType === 'Dine-In' && !String(tableNumber || '').trim()) {
    return res.status(400).json({
      success: false,
      message: 'Nomor meja wajib diisi untuk pesanan Dine-In.'
    });
  }

  if (!['Tunai', 'QRIS', 'Transfer'].includes(paymentMethod)) {
    return res.status(400).json({
      success: false,
      message: 'Metode pembayaran tidak valid.'
    });
  }

  const discountValue = Number(discount);
  const cashValue = Number(cashReceived);

  if (!Number.isFinite(discountValue) || discountValue < 0 ||
      !Number.isFinite(cashValue) || cashValue < 0) {
    return res.status(400).json({
      success: false,
      message: 'Nilai diskon atau pembayaran tidak valid.'
    });
  }

  const normalizedItems = new Map();

  for (const item of items) {
    const id = Number(item.id);
    const qty = Number(item.qty);

    if (!Number.isInteger(id) || id <= 0 ||
        !Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Produk atau jumlah barang tidak valid.'
      });
    }

    normalizedItems.set(id, (normalizedItems.get(id) || 0) + qty);
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    let subtotal = 0;
    const orderItems = [];

    for (const [productId, qty] of normalizedItems) {
      const [rows] = await connection.query(
        `SELECT id, nama_produk, harga_jual, stok
         FROM products WHERE id = ? FOR UPDATE`,
        [productId]
      );

      if (rows.length === 0) {
        throw new Error('Produk tidak ditemukan.');
      }

      const product = rows[0];

      if (product.stok < qty) {
        throw new Error(`Stok ${product.nama_produk} tidak mencukupi. Stok tersedia: ${product.stok}.`);
      }

      const price = Number(product.harga_jual);
      const lineSubtotal = price * qty;

      subtotal += lineSubtotal;
      orderItems.push({
        id: product.id,
        name: product.nama_produk,
        price,
        qty,
        subtotal: lineSubtotal
      });
    }

    const actualDiscount = Math.min(discountValue, subtotal);
    const taxable = subtotal - actualDiscount;
    const tax = Math.round(taxable * 0.10);
    const total = taxable + tax;

    const amountPaid = paymentMethod === 'Tunai' ? cashValue : total;

    if (amountPaid < total) {
      throw new Error('Uang yang dibayarkan belum mencukupi.');
    }

    const change = paymentMethod === 'Tunai' ? amountPaid - total : 0;
    const invoice = `TTK-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const userId = Number(req.session.user.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error('ID pengguna pada session tidak valid. Periksa routes/auth.js.');
    }

    const [result] = await connection.query(
      `INSERT INTO orders
       (invoice_number, user_id, tipe_pesanan, nomor_meja,
        total_subtotal, pajak_nominal, diskon_nominal, grand_total,
        metode_bayar, uang_dibayar, uang_kembali, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice,
        userId,
        orderType,
        orderType === 'Dine-In' ? String(tableNumber).trim() : null,
        subtotal,
        tax,
        actualDiscount,
        total,
        paymentMethod,
        amountPaid,
        change,
        'Selesai'
      ]
    );

    for (const item of orderItems) {
      await connection.query(
        `INSERT INTO order_details
         (order_id, product_id, harga_satuan, kuantiti, subtotal_baris, catatan_khusus)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [result.insertId, item.id, item.price, item.qty, item.subtotal, null]
      );

      await connection.query(
        'UPDATE products SET stok = stok - ? WHERE id = ?',
        [item.qty, item.id]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Transaksi berhasil disimpan.',
      receipt: {
        invoice,
        createdAt: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        cashier: req.session.user.nama_lengkap || req.session.user.username || 'Kasir',
        orderType,
        tableNumber: orderType === 'Dine-In' ? String(tableNumber).trim() : '-',
        items: orderItems,
        subtotal,
        discount: actualDiscount,
        tax,
        total,
        paymentMethod,
        amountPaid,
        change
      }
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Checkout error:', error);

    res.status(400).json({
      success: false,
      message: error.message || 'Transaksi gagal diproses.'
    });
  } finally {
    if (connection) connection.release();
  }
});


router.get('/riwayat-transaksi', requireLogin, async (req, res) => {
  if (req.session.user.role !== 'kasir') {
    return res.status(403).send('Halaman ini hanya untuk Kasir.');
  }

  try {
    const [transactions] = await db.query(
      `SELECT
        id,
        invoice_number,
        tipe_pesanan,
        nomor_meja,
        grand_total,
        metode_bayar,
        status,
        created_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC`,
      [req.session.user.id]
    );

    res.render('riwayat-transaksi', {
      title: 'Riwayat Transaksi',
      user: req.session.user,
      transactions
    });
  } catch (error) {
    console.error('Riwayat transaksi error:', error);
    res.status(500).send('Gagal memuat riwayat transaksi.');
  }
});

router.get('/riwayat-transaksi/:id', requireLogin, async (req, res) => {
  if (req.session.user.role !== 'kasir') {
    return res.status(403).send('Halaman ini hanya untuk Kasir.');
  }

  try {
    const [orders] = await db.query(
      `SELECT *
       FROM orders
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [req.params.id, req.session.user.id]
    );

    if (orders.length === 0) {
      return res.status(404).send('Transaksi tidak ditemukan.');
    }

    const [items] = await db.query(
      `SELECT
        p.nama_produk,
        od.harga_satuan,
        od.kuantiti,
        od.subtotal_baris
       FROM order_details od
       JOIN products p ON p.id = od.product_id
       WHERE od.order_id = ?`,
      [orders[0].id]
    );

    res.render('detail-transaksi', {
      title: 'Detail Transaksi',
      user: req.session.user,
      order: orders[0],
      items
    });
  } catch (error) {
    console.error('Detail transaksi error:', error);
    res.status(500).send('Gagal memuat detail transaksi.');
  }
});


module.exports = router;
