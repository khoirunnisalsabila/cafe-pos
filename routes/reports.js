const express = require('express');
const PDFDocument = require('pdfkit');
const db = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function getFilters(query) {
  const today = new Date();
  const endDefault = today.toISOString().slice(0, 10);
  const startDefault = `${endDefault.slice(0, 7)}-01`;

  const start = /^\d{4}-\d{2}-\d{2}$/.test(query.start || '')
    ? query.start
    : startDefault;
  const end = /^\d{4}-\d{2}-\d{2}$/.test(query.end || '')
    ? query.end
    : endDefault;

  return {
    start,
    end,
    category: query.category || '',
    payment: query.payment || ''
  };
}

async function getReport(filters) {
  const conditions = [
    'DATE(o.created_at) >= ?',
    'DATE(o.created_at) <= ?'
  ];
  const params = [filters.start, filters.end];

  if (filters.category) {
    conditions.push('p.category_id = ?');
    params.push(Number(filters.category));
  }

  if (filters.payment) {
    conditions.push('o.metode_bayar = ?');
    params.push(filters.payment);
  }

  const where = conditions.join(' AND ');

  const [rows] = await db.query(`
    SELECT
      o.id,
      o.invoice_number,
      o.created_at,
      u.nama_lengkap AS kasir,
      o.tipe_pesanan,
      o.pajak_nominal,
      o.diskon_nominal,
      o.total_subtotal,
      o.grand_total,
      o.metode_bayar,
      o.status,
      COALESCE(SUM(od.kuantiti), 0) AS item_terjual,
      COALESCE(SUM(
        CASE
          WHEN o.status <> 'Dibatalkan'
          THEN od.kuantiti * COALESCE(p.harga_pokok, 0)
          ELSE 0
        END
      ), 0) AS total_modal
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    LEFT JOIN order_details od ON od.order_id = o.id
    LEFT JOIN products p ON p.id = od.product_id
    WHERE ${where}
    GROUP BY
      o.id, o.invoice_number, o.created_at, u.nama_lengkap,
      o.tipe_pesanan, o.pajak_nominal, o.diskon_nominal,
      o.total_subtotal, o.grand_total, o.metode_bayar, o.status
    ORDER BY o.created_at DESC
  `, params);

  const [categories] = await db.query(
    'SELECT id, nama_kategori FROM categories ORDER BY nama_kategori'
  );

  const [[summary]] = await db.query(`
    SELECT
      COALESCE(SUM(CASE WHEN o.status <> 'Dibatalkan' THEN o.grand_total ELSE 0 END), 0) AS total_omzet,
      COALESCE(SUM(CASE WHEN o.status <> 'Dibatalkan' THEN o.diskon_nominal ELSE 0 END), 0) AS total_diskon,
      COALESCE(SUM(CASE WHEN o.status <> 'Dibatalkan' THEN o.pajak_nominal ELSE 0 END), 0) AS total_pajak,
      COALESCE(AVG(CASE WHEN o.status <> 'Dibatalkan' THEN o.grand_total END), 0) AS rata_rata,
      COUNT(CASE WHEN o.status <> 'Dibatalkan' THEN 1 END) AS total_transaksi
    FROM orders o
    WHERE DATE(o.created_at) >= ?
      AND DATE(o.created_at) <= ?
      ${filters.payment ? 'AND o.metode_bayar = ?' : ''}
      ${filters.category ? `AND EXISTS (
        SELECT 1
        FROM order_details od2
        JOIN products p2 ON p2.id = od2.product_id
        WHERE od2.order_id = o.id AND p2.category_id = ?
      )` : ''}
  `, [
    filters.start,
    filters.end,
    ...(filters.payment ? [filters.payment] : []),
    ...(filters.category ? [Number(filters.category)] : [])
  ]);

  return { rows, categories, summary };
}

router.get('/reports', requireAdmin, async (req, res) => {
  try {
    const filters = getFilters(req.query);
    if (filters.start > filters.end) {
      return res.status(400).send('Tanggal awal tidak boleh melebihi tanggal akhir.');
    }

    const report = await getReport(filters);
    const [payments] = await db.query(
      'SELECT DISTINCT metode_bayar FROM orders WHERE metode_bayar IS NOT NULL ORDER BY metode_bayar'
    );

    res.render('reports', {
      title: 'Laporan',
      user: req.session.user,
      filters,
      ...report,
      payments
    });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).send('Gagal memuat laporan. Periksa terminal VS Code.');
  }
});

router.get('/reports/export.csv', requireAdmin, async (req, res) => {
  try {
    const filters = getFilters(req.query);
    if (filters.start > filters.end) {
      return res.status(400).send('Rentang tanggal tidak valid.');
    }

    const { rows } = await getReport(filters);
    const escapeCsv = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = [
      ['No. Faktur', 'Tanggal & Jam', 'Kasir', 'Tipe Pesanan', 'Item Terjual', 'Pajak', 'Grand Total', 'Status'],
      ...rows.map(row => [
        row.invoice_number,
        new Date(row.created_at).toLocaleString('id-ID'),
        row.kasir,
        row.tipe_pesanan,
        row.item_terjual,
        row.pajak_nominal,
        row.grand_total,
        row.status
      ])
    ];

    const csv = '\uFEFF' + lines.map(line => line.map(escapeCsv).join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="laporan-penjualan.csv"');
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).send('Gagal mengekspor CSV.');
  }
});

router.get('/reports/export.pdf', requireAdmin, async (req, res) => {
  try {
    const filters = getFilters(req.query);
    if (filters.start > filters.end) {
      return res.status(400).send('Rentang tanggal tidak valid.');
    }

    const { rows, summary } = await getReport(filters);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="laporan-penjualan.pdf"');

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    doc.pipe(res);

    const money = value => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

    doc.fontSize(18).text('TITIK TEMU KOPI', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(13).text('Laporan Penjualan', { align: 'center' });
    doc.fontSize(9).text(`Periode: ${filters.start} s.d. ${filters.end}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(9).text(
      `Omzet: ${money(summary.total_omzet)}    Diskon: ${money(summary.total_diskon)}    Pajak: ${money(summary.total_pajak)}    Rata-rata transaksi: ${money(summary.rata_rata)}`
    );
    doc.moveDown();

    const columns = [
      { title: 'No. Faktur', x: 30, width: 95 },
      { title: 'Tanggal & Jam', x: 125, width: 100 },
      { title: 'Kasir', x: 225, width: 90 },
      { title: 'Tipe', x: 315, width: 65 },
      { title: 'Item', x: 380, width: 45 },
      { title: 'Pajak', x: 425, width: 90 },
      { title: 'Grand Total', x: 515, width: 110 },
      { title: 'Status', x: 625, width: 90 }
    ];

    let y = doc.y;
    const drawHeader = () => {
      doc.font('Helvetica-Bold').fontSize(8);
      columns.forEach(col => doc.text(col.title, col.x, y, { width: col.width, ellipsis: true }));
      y += 18;
      doc.moveTo(30, y).lineTo(785, y).stroke();
      y += 7;
      doc.font('Helvetica').fontSize(7.5);
    };

    drawHeader();

    for (const row of rows) {
      if (y > 530) {
        doc.addPage();
        y = 30;
        drawHeader();
      }

      const values = [
        row.invoice_number,
        new Date(row.created_at).toLocaleString('id-ID'),
        row.kasir || '-',
        row.tipe_pesanan,
        row.item_terjual,
        money(row.pajak_nominal),
        money(row.grand_total),
        row.status
      ];

      columns.forEach((col, index) => {
        doc.text(String(values[index] ?? '-'), col.x, y, {
          width: col.width - 4,
          height: 28,
          ellipsis: true
        });
      });

      y += 22;
    }

    if (!rows.length) {
      doc.text('Tidak ada transaksi untuk filter yang dipilih.', 30, y);
    }

    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    if (!res.headersSent) res.status(500).send('Gagal mengekspor PDF.');
  }
});

module.exports = router;
