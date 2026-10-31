
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/users', requireAdmin, async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT id, username, nama_lengkap, role, status, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.render('users', {
      title: 'Pengguna',
      user: req.session.user,
      users
    });
  } catch (error) {
    console.error('Users error:', error);
    res.status(500).send('Gagal memuat data pengguna.');
  }
});

router.post('/users/add', requireAdmin, async (req, res) => {
  const { username, nama_lengkap, password, role } = req.body;

  if (
    !username?.trim() ||
    !nama_lengkap?.trim() ||
    typeof password !== 'string' ||
    password.length < 8 ||
    !['admin', 'kasir'].includes(role)
  ) {
    return res.status(400).send('Data tidak valid. Password minimal 8 karakter.');
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users (username, password_hash, nama_lengkap, role, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [username.trim(), passwordHash, nama_lengkap.trim(), role]
    );

    res.redirect('/users');
  } catch (error) {
    console.error('Add user error:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).send('Username sudah digunakan. Gunakan username lain.');
    }

    res.status(500).send('Gagal menambahkan pengguna.');
  }
});

router.post('/users/:id/update', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { nama_lengkap, role, password } = req.body;

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    !nama_lengkap?.trim() ||
    !['admin', 'kasir'].includes(role)
  ) {
    return res.status(400).send('Data pengguna tidak valid.');
  }

  if (id === Number(req.session.user.id) && role !== 'admin') {
    return res.status(400).send('Role akun yang sedang digunakan tidak dapat diubah.');
  }

  if (password && (typeof password !== 'string' || password.length < 8)) {
    return res.status(400).send('Password baru minimal 8 karakter.');
  }

  try {
    const [existing] = await db.query(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (!existing.length) {
      return res.status(404).send('Pengguna tidak ditemukan.');
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);

      await db.query(
        `UPDATE users
         SET nama_lengkap = ?, role = ?, password_hash = ?
         WHERE id = ?`,
        [nama_lengkap.trim(), role, passwordHash, id]
      );
    } else {
      await db.query(
        `UPDATE users SET nama_lengkap = ?, role = ? WHERE id = ?`,
        [nama_lengkap.trim(), role, id]
      );
    }

    res.redirect('/users');
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).send('Gagal memperbarui pengguna.');
  }
});

router.post('/users/:id/status', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;

  if (!Number.isInteger(id) || id <= 0 ||
      !['active', 'inactive'].includes(status)) {
    return res.status(400).send('Data status tidak valid.');
  }

  if (id === Number(req.session.user.id) && status === 'inactive') {
    return res.status(400).send('Akun yang sedang digunakan tidak dapat dinonaktifkan.');
  }

  try {
    const [result] = await db.query(
      'UPDATE users SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      const [existing] = await db.query(
        'SELECT id FROM users WHERE id = ?',
        [id]
      );

      if (!existing.length) {
        return res.status(404).send('Pengguna tidak ditemukan.');
      }
    }

    res.redirect('/users');
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).send('Gagal mengubah status pengguna.');
  }
});

module.exports = router;
