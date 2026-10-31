
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const router = express.Router();

router.post('/login', async (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';

  try {
    const [users] = await db.execute(
      `SELECT id, username, password_hash, nama_lengkap, role, status
       FROM users
       WHERE username = ?
       LIMIT 1`,
      [username]
    );

    if (users.length === 0) {
      return res.status(401).render('login', {
        error: 'Username atau password salah.'
      });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword || user.status !== 'active') {
      return res.status(401).render('login', {
        error: 'Username atau password salah.'
      });
    }

    // Buat sesi baru setelah login berhasil
    req.session.regenerate((err) => {
      if (err) {
        console.error(err);

        return res.status(500).render('login', {
          error: 'Gagal membuat sesi. Silakan coba lagi.'
        });
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        nama_lengkap: user.nama_lengkap,
        role: user.role
      };

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error(saveErr);

          return res.status(500).render('login', {
            error: 'Gagal menyimpan sesi. Silakan coba lagi.'
          });
        }

        // Arahkan pengguna sesuai role
        if (user.role === 'admin') {
          return res.redirect('/dashboard');
        }

        if (user.role === 'kasir') {
          return res.redirect('/pos');
        }

        // Tolak role yang tidak dikenali
        req.session.destroy(() => {
          return res.status(403).render('login', {
            error: 'Role akun tidak dikenali.'
          });
        });
      });
    });
  } catch (error) {
    console.error(error);

    return res.status(500).render('login', {
      error: 'Terjadi kesalahan server. Coba lagi.'
    });
  }
});

module.exports = router;
