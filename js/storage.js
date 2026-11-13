/**
 * storage.js
 * ------------------------------------------------------------------
 * Pengganti `src/services/Database.js` (expo-sqlite) untuk versi web.
 *
 * Di React Native data disimpan di SQLite. Di browser, data disimpan
 * di localStorage dengan struktur yang sama (snake_case) supaya
 * seluruh logika layar tetap identik.
 *
 * Key localStorage:
 *   laundrykilat.customers.v1  -> array pelanggan
 *   laundrykilat.orders.v1     -> array pesanan
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';

  const CUSTOMERS_KEY = 'laundrykilat.customers.v1';
  const ORDERS_KEY = 'laundrykilat.orders.v1';

  const pad2 = (n) => String(n).padStart(2, '0');

  const toLocalYMD = (date) =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

  function read(key) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Gagal membaca localStorage:', e);
      return [];
    }
  }

  function write(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function init() {
    if (window.localStorage.getItem(CUSTOMERS_KEY) === null) {
      write(CUSTOMERS_KEY, []);
    }
    if (window.localStorage.getItem(ORDERS_KEY) === null) {
      write(ORDERS_KEY, []);
    }
  }

  function nextId(list) {
    return list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  }

  // ---------------- CUSTOMERS ----------------

  function getCustomers() {
    return read(CUSTOMERS_KEY).sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), 'id')
    );
  }

  function addCustomer({ name, phone, address = '', isPickupDefault = false }) {
    const list = read(CUSTOMERS_KEY);
    const customer = {
      id: nextId(list),
      name: String(name).trim(),
      phone: String(phone).trim(),
      address: String(address).trim(),
      is_pickup_default: isPickupDefault ? 1 : 0,
      created_at: new Date().toISOString(),
    };
    list.push(customer);
    write(CUSTOMERS_KEY, list);
    return customer;
  }

  function updateCustomer({ id, name, phone, address }) {
    const list = read(CUSTOMERS_KEY);
    const index = list.findIndex((c) => String(c.id) === String(id));
    if (index === -1) return false;
    list[index] = {
      ...list[index],
      name: String(name || '').trim(),
      phone: String(phone || '').trim(),
      address: String(address || '').trim(),
    };
    write(CUSTOMERS_KEY, list);
    return true;
  }

  // ---------------- ORDERS ----------------

  function getOrders() {
    return read(ORDERS_KEY).sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
  }

  function getOrderById(id) {
    return (
      read(ORDERS_KEY).find((o) => String(o.id) === String(id)) || null
    );
  }

  function generateOrderNumber() {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const prefix = `LDY-${yy}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
    const todaysOrders = read(ORDERS_KEY).filter((o) =>
      String(o.order_number || '').startsWith(prefix)
    );
    const seq = String(todaysOrders.length + 1).padStart(4, '0');
    return `${prefix}-${seq}`;
  }

  function createOrder(data) {
    const list = read(ORDERS_KEY);
    const now = new Date();
    const order = {
      id: nextId(list),
      order_number: data.orderNumber || generateOrderNumber(),
      customer_id: data.customerId || null,
      customer_name: data.customerName || '',
      customer_phone: data.customerPhone || '',
      customer_address: data.customerAddress || '',
      needs_pickup: data.needsPickup ? 1 : 0,
      service_id: data.serviceId || null,
      speed_id: data.speedId || null,
      item_id: data.itemId || null,
      weight: Number(data.weight) || 0,
      quantity: Number(data.quantity) || 0,
      photo_uri: data.photoUri || '',
      notes: data.notes || '',
      subtotal: Number(data.subtotal) || 0,
      discount: Number(data.discount) || 0,
      total: Number(data.total) || 0,
      payment_status: data.paymentStatus || 'Belum Bayar',
      payment_method: data.paymentMethod || 'Tunai',
      paid_amount: Number(data.paidAmount) || 0,
      entry_date: data.entryDate || '',
      estimated_date: data.estimatedDate || '',
      estimated_time: data.estimatedTime || '',
      status: 'Diproses',
      created_at: now.toISOString(),
      created_date: toLocalYMD(now),
    };

    list.push(order);

    try {
      write(ORDERS_KEY, list);
    } catch (e) {
      // Kuota localStorage penuh (biasanya karena foto base64).
      // Simpan pesanan tanpa foto agar transaksi tetap tercatat.
      console.warn('Kuota penyimpanan penuh, foto tidak disimpan.', e);
      order.photo_uri = '';
      write(ORDERS_KEY, list);
    }

    return order;
  }

  function updateOrderStatus(id, status) {
    const list = read(ORDERS_KEY);
    const index = list.findIndex((o) => String(o.id) === String(id));
    if (index === -1) return false;
    list[index] = { ...list[index], status };
    write(ORDERS_KEY, list);
    return true;
  }

  function updateOrder(id, patch) {
    const list = read(ORDERS_KEY);
    const index = list.findIndex((o) => String(o.id) === String(id));
    if (index === -1) return false;
    list[index] = { ...list[index], ...patch };
    write(ORDERS_KEY, list);
    return true;
  }

  function resetAll() {
    write(CUSTOMERS_KEY, []);
    write(ORDERS_KEY, []);
  }

  window.LaundryDB = {
    init,
    getCustomers,
    addCustomer,
    updateCustomer,
    getOrders,
    getOrderById,
    generateOrderNumber,
    createOrder,
    updateOrderStatus,
    updateOrder,
    resetAll,
  };
})();
