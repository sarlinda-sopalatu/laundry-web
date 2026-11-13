/**
 * catalog.js
 * ------------------------------------------------------------------
 * Konversi langsung dari `src/constants/catalog.js` (React Native).
 * Berisi:
 *  - Tipe layanan & tarif
 *  - Paket kecepatan & multiplier
 *  - Katalog barang satuan / dry clean
 *  - Status & metode pembayaran
 *  - Voucher demo
 *  - Fungsi harga (calculatePrice) dan format Rupiah
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';

  const SERVICE_TYPES = [
    {
      id: 'kiloan',
      name: 'Kiloan',
      description: 'Dihitung per kilogram',
      unit: 'kg',
      price: 7000,
      icon: '⚖️',
    },
    {
      id: 'satuan',
      name: 'Satuan',
      description: 'Dihitung per item/barang',
      unit: 'pcs',
      price: 15000,
      icon: '👕',
    },
    {
      id: 'dry_clean',
      name: 'Cuci Kering (Dry Clean)',
      description: 'Pembersihan tanpa air',
      unit: 'pcs',
      price: 25000,
      icon: '🧥',
    },
    {
      id: 'cuci_setrika',
      name: 'Cuci Setrika',
      description: 'Cuci + setrika rapi',
      unit: 'kg',
      price: 10000,
      icon: '🧼',
    },
    {
      id: 'setrika_saja',
      name: 'Setrika Saja',
      description: 'Hanya disetrika',
      unit: 'kg',
      price: 6000,
      icon: '🔥',
    },
  ];

  const SPEED_PACKAGES = [
    {
      id: 'reguler',
      name: 'Reguler',
      description: '2-3 hari',
      days: 3,
      multiplier: 1,
      icon: '🐢',
    },
    {
      id: 'kilat',
      name: 'Kilat',
      description: '1 hari',
      days: 1,
      multiplier: 1.25,
      icon: '⚡',
    },
    {
      id: 'express',
      name: 'Express',
      description: 'Beberapa jam (6 jam)',
      days: 0,
      hours: 6,
      multiplier: 1.5,
      icon: '🚀',
    },
  ];

  const ITEM_CATALOG = [
    { id: 'karpet', name: 'Karpet', icon: '🟫', price: 50000 },
    { id: 'selimut', name: 'Selimut', icon: '🛏️', price: 30000 },
    { id: 'gaun', name: 'Gaun', icon: '👗', price: 35000 },
    { id: 'sepatu', name: 'Sepatu', icon: '👟', price: 25000 },
    { id: 'helm', name: 'Helm', icon: '🪖', price: 20000 },
    { id: 'jas', name: 'Jas', icon: '🤵', price: 40000 },
    { id: 'bed_cover', name: 'Bed Cover', icon: '🛌', price: 45000 },
    { id: 'tas', name: 'Tas', icon: '👜', price: 20000 },
  ];

  const PAYMENT_STATUSES = ['Belum Bayar', 'DP/Uang Muka', 'Lunas'];

  const PAYMENT_METHODS = [
    'Tunai',
    'Transfer Bank',
    'QRIS',
    'Saldo/Deposit Pelanggan',
  ];

  // Voucher demo: kode -> { type, value, minSpend, description }
  const VOUCHERS = {
    HEMAT10: {
      type: 'percent',
      value: 10,
      minSpend: 50000,
      description: 'Diskon 10% min. 50rb',
    },
    LAUNDRY5K: {
      type: 'fixed',
      value: 5000,
      minSpend: 30000,
      description: 'Potongan Rp5.000 min. 30rb',
    },
    SETIA15: {
      type: 'percent',
      value: 15,
      minSpend: 100000,
      description: 'Diskon 15% min. 100rb',
    },
  };

  const getServiceById = (id) => SERVICE_TYPES.find((s) => s.id === id);
  const getSpeedById = (id) => SPEED_PACKAGES.find((s) => s.id === id);
  const getItemById = (id) => ITEM_CATALOG.find((i) => i.id === id);

  const formatRupiah = (value) =>
    'Rp ' + Math.round(value || 0).toLocaleString('id-ID');

  /**
   * Hitung total harga dari data order.
   * Rumus sama persis dengan versi React Native:
   *   subtotal = harga layanan/item × kuantitas × multiplier paket
   *   diskon   = voucher + diskon manual (maksimal sebesar subtotal)
   */
  const calculatePrice = (order) => {
    const service = getServiceById(order.serviceId);
    const speed = getSpeedById(order.speedId) || SPEED_PACKAGES[0];
    if (!service) return { subtotal: 0, discount: 0, total: 0 };

    let subtotal = 0;

    if (service.id === 'satuan' || service.id === 'dry_clean') {
      const item = getItemById(order.itemId);
      const basePrice = item ? item.price : service.price;
      subtotal = basePrice * (order.quantity || 0);
    } else {
      subtotal = service.price * (order.weight || 0);
    }

    subtotal = subtotal * speed.multiplier;

    let discount = order.manualDiscount || 0;
    if (order.voucherCode && VOUCHERS[order.voucherCode]) {
      const v = VOUCHERS[order.voucherCode];
      if (!v.minSpend || subtotal >= v.minSpend) {
        discount +=
          v.type === 'percent' ? (subtotal * v.value) / 100 : v.value;
      }
    }

    discount = Math.min(discount, subtotal);
    const total = Math.max(subtotal - discount, 0);

    return {
      subtotal: Math.round(subtotal),
      discount: Math.round(discount),
      total: Math.round(total),
    };
  };

  window.Catalog = {
    SERVICE_TYPES,
    SPEED_PACKAGES,
    ITEM_CATALOG,
    PAYMENT_STATUSES,
    PAYMENT_METHODS,
    VOUCHERS,
    getServiceById,
    getSpeedById,
    getItemById,
    formatRupiah,
    calculatePrice,
  };
})();
