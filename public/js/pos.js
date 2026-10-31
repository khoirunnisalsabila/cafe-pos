
const cart = new Map();

const formatRupiah = value =>
  'Rp ' + Number(value || 0).toLocaleString('id-ID');

const productButtons = document.querySelectorAll('.add-product');
const cartItems = document.getElementById('cartItems');
const checkoutBtn = document.getElementById('checkoutBtn');
const discountInput = document.getElementById('discount');
const cashInput = document.getElementById('cashReceived');
const paymentMethodInput = document.getElementById('paymentMethod');
const orderTypeInput = document.getElementById('orderType');

let isProcessing = false;

productButtons.forEach(button => {
  button.addEventListener('click', () => {
    if (isProcessing) return;

    const id = button.dataset.id;
    const existing = cart.get(id);
    const stock = Number(button.dataset.stock);

    if (stock <= 0) {
      alert('Stok produk habis.');
      return;
    }

    if (existing && existing.qty >= stock) {
      alert('Jumlah melebihi stok yang tersedia.');
      return;
    }

    if (existing) {
      existing.qty += 1;
    } else {
      cart.set(id, {
        id,
        name: button.dataset.name,
        price: Number(button.dataset.price),
        stock,
        qty: 1
      });
    }

    renderCart();
  });
});

function renderCart() {
  cartItems.innerHTML = '';

  if (cart.size === 0) {
    cartItems.innerHTML = `
      <p class="text-muted text-center py-3" id="emptyCart">
        Belum ada produk dipilih.
      </p>
    `;

    calculateTotal();
    return;
  }

  cart.forEach(item => {
    const row = document.createElement('div');
    row.className = 'border-bottom py-3';

    const title = document.createElement('div');
    title.className = 'fw-semibold';
    title.textContent = item.name;

    const subtotal = document.createElement('div');
    subtotal.className = 'small text-muted mb-2';
    subtotal.textContent = formatRupiah(item.price * item.qty);

    const controls = document.createElement('div');
    controls.className = 'd-flex align-items-center gap-2';

    const minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'btn btn-outline-secondary btn-sm';
    minus.textContent = '−';

    minus.addEventListener('click', () => {
      if (isProcessing) return;

      item.qty -= 1;

      if (item.qty <= 0) {
        cart.delete(item.id);
      }

      renderCart();
    });

    const quantity = document.createElement('span');
    quantity.textContent = item.qty;

    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'btn btn-outline-secondary btn-sm';
    plus.textContent = '+';

    plus.addEventListener('click', () => {
      if (isProcessing) return;

      if (item.qty >= item.stock) {
        alert('Jumlah melebihi stok yang tersedia.');
        return;
      }

      item.qty += 1;
      renderCart();
    });

    controls.append(minus, quantity, plus);
    row.append(title, subtotal, controls);
    cartItems.appendChild(row);
  });

  calculateTotal();
}

function getTotals() {
  let subtotal = 0;

  cart.forEach(item => {
    subtotal += item.price * item.qty;
  });

  const discount = Math.max(
    0,
    Math.min(subtotal, Number(discountInput.value) || 0)
  );

  const tax = Math.round((subtotal - discount) * 0.10);
  const total = subtotal - discount + tax;

  return { subtotal, discount, tax, total };
}

function calculateTotal() {
  const { total, tax } = getTotals();

  document.getElementById('cartTotal').textContent =
    formatRupiah(total);

  document.getElementById('taxAmount').textContent =
    formatRupiah(tax);

  const cash = Number(cashInput.value) || 0;

  document.getElementById('changeAmount').textContent =
    formatRupiah(Math.max(0, cash - total));

  document.getElementById('cashSection').style.display =
    paymentMethodInput.value === 'Tunai' ? 'block' : 'none';
}

discountInput.addEventListener('input', calculateTotal);
cashInput.addEventListener('input', calculateTotal);
paymentMethodInput.addEventListener('change', calculateTotal);

document.getElementById('searchProduct').addEventListener('input', event => {
  const keyword = event.target.value.toLowerCase();

  document.querySelectorAll('.product-item').forEach(item => {
    item.style.display =
      item.dataset.name.toLowerCase().includes(keyword) ? '' : 'none';
  });
});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function printReceipt(receipt) {
  const rows = receipt.items.map(item => `
    <tr>
      <td>${escapeHtml(item.name)} × ${item.qty}</td>
      <td style="text-align:right; white-space:nowrap">
        ${formatRupiah(item.subtotal)}
      </td>
    </tr>
  `).join('');

  const receiptWindow = window.open('', '_blank', 'width=400,height=650');

  if (!receiptWindow) {
    alert(
      'Transaksi sudah tersimpan, tetapi pop-up cetak diblokir. ' +
      'Izinkan pop-up browser untuk mencetak struk.'
    );
    return;
  }

  receiptWindow.document.open();
  receiptWindow.document.write(`
    <!doctype html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Struk ${escapeHtml(receipt.invoice)}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 320px;
          margin: 20px auto;
          padding: 0 8px;
          font-size: 12px;
          color: #000;
        }
        h3, p { text-align: center; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 5px 0; vertical-align: top; }
        .line { border-top: 1px dashed #333; margin: 10px 0; }
        .total { font-weight: bold; }
        .print-button {
          width: 100%;
          padding: 10px;
          margin-top: 15px;
          cursor: pointer;
        }
        @media print {
          .print-button { display: none; }
          body { margin: 0 auto; padding: 0; }
        }
      </style>
    </head>
    <body>
      <h3>TITIK TEMU KOPI</h3>
      <p>Struk Pembayaran</p>
      <div class="line"></div>
      <p style="text-align:left">Invoice: ${escapeHtml(receipt.invoice)}</p>
      <p style="text-align:left">Waktu: ${escapeHtml(receipt.createdAt)}</p>
      <p style="text-align:left">Kasir: ${escapeHtml(receipt.cashier)}</p>
      <p style="text-align:left">Pesanan: ${escapeHtml(receipt.orderType)}</p>
      ${receipt.orderType === 'Dine-In'
        ? `<p style="text-align:left">Meja: ${escapeHtml(receipt.tableNumber)}</p>`
        : ''}
      <div class="line"></div>
      <table>${rows}</table>
      <div class="line"></div>
      <table>
        <tr><td>Subtotal</td><td style="text-align:right">${formatRupiah(receipt.subtotal)}</td></tr>
        <tr><td>Diskon</td><td style="text-align:right">${formatRupiah(receipt.discount)}</td></tr>
        <tr><td>PB1 (10%)</td><td style="text-align:right">${formatRupiah(receipt.tax)}</td></tr>
        <tr class="total"><td>Total</td><td style="text-align:right">${formatRupiah(receipt.total)}</td></tr>
        <tr><td>Metode</td><td style="text-align:right">${escapeHtml(receipt.paymentMethod)}</td></tr>
        <tr><td>Dibayar</td><td style="text-align:right">${formatRupiah(receipt.amountPaid)}</td></tr>
        <tr><td>Kembalian</td><td style="text-align:right">${formatRupiah(receipt.change)}</td></tr>
      </table>
      <div class="line"></div>
      <p>Terima kasih atas kunjungan Anda!</p>
      <button class="print-button" onclick="window.print()">Cetak Struk</button>
    </body>
    </html>
  `);
  receiptWindow.document.close();

  receiptWindow.onload = () => {
    receiptWindow.focus();
    receiptWindow.print();
  };
}

function resetCartAfterCheckout() {
  cart.clear();

  discountInput.value = 0;
  cashInput.value = 0;
  orderTypeInput.value = 'Take Away';
  paymentMethodInput.value = 'Tunai';

  document.getElementById('searchProduct').value = '';

  document.querySelectorAll('.product-item').forEach(item => {
    item.style.display = '';
  });

  renderCart();
  calculateTotal();
}

checkoutBtn.addEventListener('click', async () => {
  if (isProcessing) return;

  if (cart.size === 0) {
    alert('Pilih minimal satu produk.');
    return;
  }

  const orderType = orderTypeInput.value;
  const paymentMethod = paymentMethodInput.value;
  let tableNumber = '';

  if (orderType === 'Dine In') {
    tableNumber = prompt('Masukkan nomor meja:');

    if (tableNumber === null || !tableNumber.trim()) {
      alert('Nomor meja wajib diisi untuk Dine-In.');
      return;
    }

    tableNumber = tableNumber.trim();
  }

  const { total } = getTotals();
  const cashReceived = Number(cashInput.value) || 0;

  if (paymentMethod === 'Tunai' && cashReceived < total) {
    alert('Uang yang dibayarkan belum mencukupi.');
    return;
  }

  const items = Array.from(cart.values()).map(item => ({
    id: item.id,
    qty: item.qty
  }));

  isProcessing = true;
  checkoutBtn.disabled = true;
  checkoutBtn.textContent = 'Memproses...';

  try {
    const response = await fetch('/pos/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items,
        orderType: orderType === 'Dine In' ? 'Dine-In' : 'Takeaway',
        tableNumber,
        paymentMethod,
        discount: Number(discountInput.value) || 0,
        cashReceived
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Transaksi gagal disimpan.');
    }

    const receipt = data.receipt;

    resetCartAfterCheckout();

    printReceipt(receipt);

    alert('Transaksi berhasil disimpan!\nInvoice: ' + receipt.invoice);
  } catch (error) {
    alert(error.message || 'Terjadi kesalahan saat memproses transaksi.');
  } finally {
    isProcessing = false;
    checkoutBtn.disabled = false;
    checkoutBtn.innerHTML =
      '<i class="bi bi-check-circle me-1"></i> Proses Transaksi';
  }
});

renderCart();
calculateTotal();
