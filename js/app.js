/**
 * app.js
 * ------------------------------------------------------------------
 * Aplikasi Laundry Kilat versi web.
 *
 * Konversi dari aplikasi React Native:
 *  - React Navigation  -> navigasi screen berbasis class (showScreen)
 *  - OrderContext      -> objek `App.order`
 *  - expo-sqlite       -> LaundryDB (localStorage) di storage.js
 *  - expo-image-picker -> <input type="file" capture="environment">
 *  - expo-print        -> window.print() pada jendela baru
 *  - expo-sharing      -> dialog cetak browser ("Simpan sebagai PDF")
 *  - Linking WhatsApp  -> https://wa.me/...
 *  - react-native-qrcode-svg -> qrcodejs (js/vendor/qrcode.min.js)
 *  - Alert             -> dialog kustom
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';

  const {
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
  } = window.Catalog;

  const DB = window.LaundryDB;

  // =================================================================
  // UTILITAS
  // =================================================================

  const $ = (id) => document.getElementById(id);

  const ESC_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  const esc = (value) =>
    String(value === null || value === undefined ? '' : value).replace(
      /[&<>"']/g,
      (ch) => ESC_MAP[ch]
    );

  const pad2 = (n) => String(n).padStart(2, '0');

  const toLocalYMD = (date) =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

  const parseYMD = (value) => {
    const parts = String(value || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return null;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const BULAN_SINGKAT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];

  function formatTanggalFull(value) {
    const date = parseYMD(value);
    if (!date) return value || '-';
    return `${HARI[date.getDay()]}, ${date.getDate()} ${BULAN[date.getMonth()]} ${date.getFullYear()}`;
  }

  function formatTanggalShort(value) {
    const date = parseYMD(value);
    if (!date) return value || '-';
    return `${date.getDate()} ${BULAN_SINGKAT[date.getMonth()]} ${date.getFullYear()}`;
  }

  const num = (value) => {
    const parsed = parseFloat(String(value || '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const int = (value) => {
    const parsed = parseInt(String(value || '').replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const STATUS_COLORS = {
    Diproses: '#F39C12',
    Selesai: '#27AE60',
    Diambil: '#2E86C1',
  };

  const QUICK_NOTES = [
    'Jangan pakai pemutih',
    'Lipat dua saja',
    'Noda membandel di kerah',
    'Pisahkan pakaian putih',
    'Warna mudah luntur',
    'Kancing lepas',
  ];

  // =================================================================
  // STATE APLIKASI (pengganti OrderContext)
  // =================================================================

  function createEmptyOrder() {
    return {
      customerId: null,
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      needsPickup: false,

      serviceId: null,
      speedId: null,
      itemId: null,

      weight: 0,
      quantity: 0,

      photoUri: null,
      notes: '',

      voucherCode: '',
      manualDiscount: 0,
      paymentStatus: 'Belum Bayar',
      paymentMethod: 'Tunai',
      paidAmount: 0,

      entryDate: null,
      estimatedDate: null,
      estimatedTime: '',

      savedOrderId: null,
    };
  }

  const App = {
    screen: 'home',
    history: [],
    params: {},

    order: createEmptyOrder(),

    customerForm: {
      search: '',
      name: '',
      phone: '',
      address: '',
      pickup: false,
    },

    serviceDraft: {
      serviceId: null,
      speedId: null,
      itemId: null,
    },

    quantity: {
      weight: '',
      pcs: '',
    },

    quality: {
      photoUri: null,
      notes: '',
      tags: [],
      active: false,
    },

    calc: {
      voucherInput: '',
      appliedVoucher: '',
      manualDiscount: '',
      paymentStatus: 'Belum Bayar',
      paymentMethod: 'Tunai',
      paidAmount: '',
    },

    schedule: {
      entryDate: '',
      estimatedDate: '',
      estimatedTime: '',
    },

    receipt: {
      data: null,
      fromHistory: false,
      orderId: null,
      status: 'Diproses',
    },

    tag: {
      data: null,
    },
  };

  function resetOrder() {
    App.order = createEmptyOrder();
    App.params = {};
    App.customerForm = { search: '', name: '', phone: '', address: '', pickup: false };
    App.serviceDraft = { serviceId: null, speedId: null, itemId: null };
    App.quantity = { weight: '', pcs: '' };
    App.quality = { photoUri: null, notes: '', tags: [], active: false };
    App.calc = {
      voucherInput: '',
      appliedVoucher: '',
      manualDiscount: '',
      paymentStatus: 'Belum Bayar',
      paymentMethod: 'Tunai',
      paidAmount: '',
    };
    App.schedule = { entryDate: '', estimatedDate: '', estimatedTime: '' };
    App.receipt = { data: null, fromHistory: false, orderId: null, status: 'Diproses' };
    App.tag = { data: null };
  }

  // =================================================================
  // NAVIGASI (pengganti React Navigation)
  // =================================================================

  const SCREEN_META = {
    home: { title: 'Beranda', header: false },
    customer: { title: 'Input Data Pelanggan', header: true },
    service: { title: 'Detail Layanan', header: true },
    quantity: { title: 'Kuantitas & Ukuran', header: true },
    quality: { title: 'Quality Control', header: true },
    calculation: { title: 'Kalkulasi & Pembayaran', header: true },
    scheduling: { title: 'Penjadwalan', header: true },
    receipt: { title: 'Nota Laundry', header: true },
    tag: { title: 'Label Cucian', header: true },
  };

  const SCREEN_ENTER = {
    home: renderHome,
    customer: enterCustomer,
    service: enterService,
    quantity: enterQuantity,
    quality: enterQuality,
    calculation: enterCalculation,
    scheduling: enterScheduling,
    receipt: enterReceipt,
    tag: enterTag,
  };

  function showScreen(name, params = {}) {
    App.screen = name;
    App.params = params;

    document.querySelectorAll('.screen').forEach((section) => {
      section.classList.toggle('active', section.id === `screen-${name}`);
    });

    const meta = SCREEN_META[name] || SCREEN_META.home;
    const header = $('app-header');
    header.classList.toggle('hidden', !meta.header);
    $('header-title').textContent = meta.title;
    $('btn-back').classList.toggle('hidden', !meta.header);

    const active = document.getElementById(`screen-${name}`);
    if (active) active.scrollTop = 0;

    const enter = SCREEN_ENTER[name];
    if (enter) enter(params);
  }

  function navigate(name, params = {}) {
    App.history.push({ screen: App.screen, params: App.params });
    showScreen(name, params);
  }

  function goBack() {
    const previous = App.history.pop();
    if (previous) {
      showScreen(previous.screen, previous.params);
    } else {
      showScreen('home');
    }
  }

  function goHome(clearHistory = false) {
    if (clearHistory) App.history = [];
    showScreen('home');
  }

  // =================================================================
  // TOAST & DIALOG (pengganti Alert)
  // =================================================================

  let toastTimer = null;

  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function showDialog(title, message) {
    $('dialog-title').textContent = title;
    $('dialog-message').textContent = message;
    $('dialog-overlay').classList.remove('hidden');
    window.setTimeout(() => $('dialog-ok').focus(), 30);
  }

  function hideDialog() {
    $('dialog-overlay').classList.add('hidden');
  }

  // =================================================================
  // SCREEN 1 — BERANDA
  // =================================================================

  function renderHome() {
    const orders = DB.getOrders();
    const today = toLocalYMD(new Date());

    const todayRevenue = orders
      .filter((order) => {
        const date =
          order.created_date ||
          (order.created_at ? String(order.created_at).slice(0, 10) : '');
        return date === today;
      })
      .reduce((sum, order) => sum + (Number(order.total) || 0), 0);

    $('stat-total-orders').textContent = String(orders.length);
    $('stat-revenue').textContent = formatRupiah(todayRevenue);

    $('orders-empty').classList.toggle('hidden', orders.length > 0);

    $('orders-list').innerHTML = orders
      .map((order) => {
        const service = getServiceById(order.service_id);
        const speed = getSpeedById(order.speed_id);
        const status = order.status || 'Diproses';
        const statusColor = STATUS_COLORS[status] || '#95A5A6';
        const qty = order.weight
          ? `${order.weight} kg`
          : `${order.quantity} pcs`;

        return `
          <button class="order-card" type="button" data-order-id="${esc(order.id)}">
            <div class="order-header">
              <span class="order-number">${esc(order.order_number)}</span>
              <span class="status-badge" style="background-color:${statusColor}">
                ${esc(status)}
              </span>
            </div>
            <div class="order-customer">${esc(order.customer_name || '-')}</div>
            <div class="order-detail">
              ${esc(service ? service.name : '-')} •
              ${esc(speed ? speed.name : '-')} • ${esc(qty)}
            </div>
            <div class="order-footer">
              <span class="order-total">${formatRupiah(order.total)}</span>
              <span class="order-payment">${esc(order.payment_status || '-')}</span>
            </div>
          </button>`;
      })
      .join('');
  }

  // =================================================================
  // SCREEN 2 — PELANGGAN
  // =================================================================

  function enterCustomer() {
    const form = App.customerForm;
    $('customer-search').value = form.search;
    $('cust-name').value = form.name;
    $('cust-phone').value = form.phone;
    $('cust-address').value = form.address;
    $('cust-pickup').checked = form.pickup;
    renderCustomers();
  }

  function renderCustomers() {
    const query = App.customerForm.search.trim().toLowerCase();
    const customers = DB.getCustomers();
    const filtered = query
      ? customers.filter(
          (customer) =>
            String(customer.name || '').toLowerCase().includes(query) ||
            String(customer.phone || '').includes(query)
        )
      : customers;

    $('customers-list').innerHTML = filtered
      .map((customer) => {
        const initial = String(customer.name || '?').charAt(0).toUpperCase();
        return `
          <button class="customer-card" type="button" data-customer-id="${esc(customer.id)}">
            <div class="avatar">${esc(initial)}</div>
            <div class="customer-info">
              <div class="customer-name">${esc(customer.name)}</div>
              <div class="customer-phone">${esc(customer.phone)}</div>
              ${
                customer.address
                  ? `<div class="customer-address">${esc(customer.address)}</div>`
                  : ''
              }
            </div>
            <div class="chevron">›</div>
          </button>`;
      })
      .join('');

    const empty = $('customers-empty');
    empty.classList.toggle('hidden', filtered.length > 0);
    empty.textContent = query
      ? 'Pelanggan tidak ditemukan.'
      : 'Belum ada pelanggan tersimpan.';
  }

  function selectCustomer(customer) {
    App.order = {
      ...App.order,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address || '',
      needsPickup: customer.is_pickup_default === 1,
    };
    navigate('service');
  }

  function selectWalkIn() {
    App.order = {
      ...App.order,
      customerId: null,
      customerName: 'Pelanggan Walk-in',
      customerPhone: '',
      customerAddress: '',
      needsPickup: false,
    };
    navigate('service');
  }

  function submitNewCustomer() {
    const form = App.customerForm;
    const name = form.name.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();

    if (!name || !phone) {
      showDialog('Error', 'Nama dan nomor WhatsApp wajib diisi.');
      return;
    }
    if (form.pickup && !address) {
      showDialog(
        'Error',
        'Alamat wajib diisi jika memilih layanan antar-jemput.'
      );
      return;
    }

    try {
      const added = DB.addCustomer({
        name,
        phone,
        address,
        isPickupDefault: form.pickup,
      });

      App.order = {
        ...App.order,
        customerId: added.id,
        customerName: added.name,
        customerPhone: added.phone,
        customerAddress: added.address,
        needsPickup: form.pickup,
      };

      App.customerForm = {
        search: '',
        name: '',
        phone: '',
        address: '',
        pickup: false,
      };

      navigate('service');
    } catch (e) {
      showDialog('Gagal', 'Tidak dapat menyimpan pelanggan.');
    }
  }

  // =================================================================
  // SCREEN 3 — LAYANAN
  // =================================================================

  function enterService() {
    // Sinkronkan pilihan dari order (misalnya saat kembali dari layar lain).
    App.serviceDraft = {
      serviceId: App.order.serviceId,
      speedId: App.order.speedId,
      itemId: App.order.itemId,
    };

    $('service-customer-name').textContent =
      App.order.customerName || 'Walk-in';
    $('service-customer-phone').textContent = App.order.customerPhone || '';
    $('service-customer-phone').classList.toggle(
      'hidden',
      !App.order.customerPhone
    );

    renderServiceGrid();
    renderSpeedGrid();
    renderItemSection();
  }

  function serviceNeedsItem() {
    return (
      App.serviceDraft.serviceId === 'satuan' ||
      App.serviceDraft.serviceId === 'dry_clean'
    );
  }

  function renderServiceGrid() {
    $('service-grid').innerHTML = SERVICE_TYPES.map((service) => {
      const active = App.serviceDraft.serviceId === service.id;
      return `
        <button class="service-card ${active ? 'active' : ''}" type="button"
          data-service-id="${esc(service.id)}">
          <div class="service-icon">${service.icon}</div>
          <div class="service-name">${esc(service.name)}</div>
          <div class="service-price">${formatRupiah(service.price)}/${esc(service.unit)}</div>
          <div class="service-desc">${esc(service.description)}</div>
        </button>`;
    }).join('');
  }

  function renderSpeedGrid() {
    $('speed-row').innerHTML = SPEED_PACKAGES.map((speed) => {
      const active = App.serviceDraft.speedId === speed.id;
      return `
        <button class="speed-card ${active ? 'active' : ''}" type="button"
          data-speed-id="${esc(speed.id)}">
          <div class="service-icon">${speed.icon}</div>
          <div class="speed-name">${esc(speed.name)}</div>
          <div class="speed-desc">${esc(speed.description)}</div>
          <div class="speed-mult">x${speed.multiplier}</div>
        </button>`;
    }).join('');
  }

  function renderItemSection() {
    const needsItem = serviceNeedsItem();
    $('item-section').classList.toggle('hidden', !needsItem);

    if (!needsItem) {
      $('item-grid').innerHTML = '';
      return;
    }

    $('item-grid').innerHTML = ITEM_CATALOG.map((item) => {
      const active = App.serviceDraft.itemId === item.id;
      return `
        <button class="item-card ${active ? 'active' : ''}" type="button"
          data-item-id="${esc(item.id)}">
          <div class="item-icon">${item.icon}</div>
          <div class="item-name">${esc(item.name)}</div>
          <div class="item-price">${formatRupiah(item.price)}</div>
        </button>`;
    }).join('');
  }

  function proceedFromService() {
    const draft = App.serviceDraft;

    if (!draft.serviceId) {
      showDialog('Peringatan', 'Silakan pilih tipe layanan.');
      return;
    }
    if (!draft.speedId) {
      showDialog('Peringatan', 'Silakan pilih paket kecepatan.');
      return;
    }
    if (serviceNeedsItem() && !draft.itemId) {
      showDialog('Peringatan', 'Silakan pilih jenis barang.');
      return;
    }

    App.order = {
      ...App.order,
      serviceId: draft.serviceId,
      speedId: draft.speedId,
      itemId: serviceNeedsItem() ? draft.itemId : null,
    };

    navigate('quantity');
  }

  // =================================================================
  // SCREEN 4 — KUANTITAS
  // =================================================================

  function currentServiceIsKiloan() {
    const service = getServiceById(App.order.serviceId);
    return service ? service.unit === 'kg' : false;
  }

  function updateEstimateDisplay() {
    const isKiloan = currentServiceIsKiloan();
    const weightNum = num(App.quantity.weight);
    const pcsNum = int(App.quantity.pcs);

    const estimate = calculatePrice({
      ...App.order,
      weight: isKiloan ? weightNum : 0,
      quantity: isKiloan ? 0 : pcsNum,
    });

    $('estimate-value').textContent = formatRupiah(estimate.subtotal);
  }

  function enterQuantity() {
    const service = getServiceById(App.order.serviceId);
    const speed = getSpeedById(App.order.speedId);
    const item = getItemById(App.order.itemId);

    $('quantity-summary').innerHTML = `
      <div class="summary-title">
        ${service ? service.icon : ''} ${esc(service ? service.name : '-')}
      </div>
      <div class="summary-line">
        Paket: ${speed ? speed.icon : ''} ${esc(speed ? speed.name : '-')}
        (${esc(speed ? speed.description : '-')})
      </div>
      ${
        item
          ? `<div class="summary-line">Barang: ${item.icon} ${esc(item.name)}</div>`
          : ''
      }
    `;

    App.quantity.weight = App.order.weight ? String(App.order.weight) : '';
    App.quantity.pcs = App.order.quantity ? String(App.order.quantity) : '';

    const isKiloan = currentServiceIsKiloan();

    $('weight-card').classList.toggle('hidden', !isKiloan);
    $('quantity-card').classList.toggle('hidden', isKiloan);

    $('input-weight').value = App.quantity.weight;
    $('input-quantity').value = App.quantity.pcs;
    $('input-pcs').value = App.quantity.pcs;
    $('input-pcs').readOnly = !isKiloan;
    $('pcs-hint').classList.toggle('hidden', isKiloan);

    updateEstimateDisplay();
  }

  function proceedFromQuantity() {
    const isKiloan = currentServiceIsKiloan();
    const weightNum = num(App.quantity.weight);
    const pcsNum = int(App.quantity.pcs);

    if (isKiloan && weightNum <= 0) {
      showDialog('Peringatan', 'Berat cucian wajib diisi lebih dari 0 kg.');
      return;
    }
    if (!isKiloan && pcsNum <= 0) {
      showDialog('Peringatan', 'Jumlah barang wajib diisi lebih dari 0 pcs.');
      return;
    }

    App.order = {
      ...App.order,
      weight: isKiloan ? weightNum : 0,
      quantity: pcsNum,
    };

    navigate('quality');
  }

  // =================================================================
  // SCREEN 5 — QUALITY CONTROL
  // =================================================================

  function enterQuality() {
    if (!App.quality.active) {
      App.quality.photoUri = App.order.photoUri || null;
      App.quality.notes = App.order.notes || '';
      App.quality.tags = [];
      App.quality.active = true;
    }

    $('quality-notes').value = App.quality.notes;
    renderQualityPhoto();
    renderConditionChips();
  }

  function renderQualityPhoto() {
    const hasPhoto = !!App.quality.photoUri;
    const preview = $('photo-preview');

    preview.classList.toggle('hidden', !hasPhoto);
    $('photo-placeholder').classList.toggle('hidden', hasPhoto);
    $('btn-remove-photo').classList.toggle('hidden', !hasPhoto);

    if (hasPhoto) {
      preview.src = App.quality.photoUri;
    } else {
      preview.removeAttribute('src');
    }
  }

  function renderConditionChips() {
    $('condition-chips').innerHTML = QUICK_NOTES.map((tag) => {
      const active = App.quality.tags.includes(tag);
      return `
        <button class="chip ${active ? 'active' : ''}" type="button"
          data-tag="${esc(tag)}">${esc(tag)}</button>`;
    }).join('');
  }

  function toggleConditionTag(tag) {
    const tags = App.quality.tags;
    App.quality.tags = tags.includes(tag)
      ? tags.filter((t) => t !== tag)
      : [...tags, tag];
    renderConditionChips();
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      if (!file || !String(file.type || '').startsWith('image/')) {
        reject(new Error('File bukan gambar'));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Gagal membaca file'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('Gambar tidak valid'));
        image.onload = () => {
          const maxSide = 1000;
          const scale = Math.min(
            1,
            maxSide / Math.max(image.width, image.height)
          );
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));

          const ctx = canvas.getContext('2d');
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.68));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function handlePhotoFile(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;

    compressImage(file)
      .then((dataUrl) => {
        App.quality.photoUri = dataUrl;
        renderQualityPhoto();
        showToast('Foto berhasil ditambahkan.');
      })
      .catch(() => {
        showDialog('Gagal', 'Foto tidak dapat dibaca. Coba file lain.');
      });
  }

  function proceedFromQuality() {
    const combinedNotes = [
      ...App.quality.tags,
      App.quality.notes.trim(),
    ]
      .filter(Boolean)
      .join(', ');

    App.order = {
      ...App.order,
      photoUri: App.quality.photoUri,
      notes: combinedNotes,
    };

    navigate('calculation');
  }

  // =================================================================
  // SCREEN 6 — KALKULASI & PEMBAYARAN
  // =================================================================

  function enterCalculation() {
    App.calc = {
      voucherInput: App.order.voucherCode || '',
      appliedVoucher: App.order.voucherCode || '',
      manualDiscount: App.order.manualDiscount
        ? String(App.order.manualDiscount)
        : '',
      paymentStatus: App.order.paymentStatus || 'Belum Bayar',
      paymentMethod: App.order.paymentMethod || 'Tunai',
      paidAmount: App.order.paidAmount ? String(App.order.paidAmount) : '',
    };

    $('voucher-code').value = App.calc.voucherInput;
    $('manual-discount').value = App.calc.manualDiscount;
    $('paid-amount').value = App.calc.paidAmount;

    renderPaymentStatus();
    renderPaymentMethods();
    renderVoucherUi();
    renderPricing();
  }

  function getPricing() {
    return calculatePrice({
      ...App.order,
      voucherCode: App.calc.appliedVoucher,
      manualDiscount: int(App.calc.manualDiscount),
    });
  }

  function priceRow(label, value, extraClass = '') {
    return `
      <div class="price-row">
        <span class="price-label">${esc(label)}</span>
        <span class="price-value ${extraClass}">${esc(value)}</span>
      </div>`;
  }

  function renderPricing() {
    const service = getServiceById(App.order.serviceId);
    const speed = getSpeedById(App.order.speedId);
    const item = getItemById(App.order.itemId);
    const pricing = getPricing();

    const rows = [
      priceRow(
        'Layanan',
        `${service ? service.name : '-'} (${speed ? speed.name : '-'})`
      ),
      item ? priceRow('Barang', item.name) : '',
      priceRow(
        App.order.weight ? 'Berat' : 'Jumlah',
        App.order.weight
          ? `${App.order.weight} kg`
          : `${App.order.quantity} pcs`
      ),
      priceRow('Subtotal', formatRupiah(pricing.subtotal)),
      priceRow('Diskon', `- ${formatRupiah(pricing.discount)}`, 'price-orange'),
    ];

    $('pricing-rows').innerHTML = rows.join('');
    $('total-value').textContent = formatRupiah(pricing.total);

    const note = $('discount-note');
    if (pricing.discount > 0) {
      note.textContent = `Diskon ${formatRupiah(pricing.discount)} diterapkan`;
      note.classList.remove('hidden');
    } else {
      note.textContent = '';
      note.classList.add('hidden');
    }

    updateRemainingHint();
  }

  function renderVoucherUi() {
    const applied = App.calc.appliedVoucher;
    const text = $('voucher-applied');

    if (applied && VOUCHERS[applied]) {
      text.textContent = `Voucher ${applied} aktif (${VOUCHERS[applied].description})`;
      text.classList.remove('hidden');
      $('voucher-hint').classList.add('hidden');
    } else {
      text.textContent = '';
      text.classList.add('hidden');
      $('voucher-hint').classList.remove('hidden');
    }
  }

  function applyVoucher() {
    const code = App.calc.voucherInput.trim().toUpperCase();

    if (!code) {
      App.calc.appliedVoucher = '';
      renderVoucherUi();
      renderPricing();
      return;
    }

    if (!VOUCHERS[code]) {
      showDialog('Voucher tidak valid', 'Kode voucher tidak ditemukan.');
      return;
    }

    const voucher = VOUCHERS[code];
    const pricing = getPricing();

    if (voucher.minSpend && pricing.subtotal < voucher.minSpend) {
      showDialog(
        'Belum memenuhi syarat',
        `Voucher memerlukan minimal belanja ${formatRupiah(voucher.minSpend)}.`
      );
      return;
    }

    App.calc.appliedVoucher = code;
    App.calc.voucherInput = code;
    $('voucher-code').value = code;

    renderVoucherUi();
    renderPricing();
    showToast(`Voucher diterapkan: ${voucher.description}`);
  }

  function renderPaymentStatus() {
    $('payment-status-row').innerHTML = PAYMENT_STATUSES.map((status) => {
      const active = App.calc.paymentStatus === status;
      return `
        <button class="status-btn ${active ? 'active' : ''}" type="button"
          data-payment-status="${esc(status)}">${esc(status)}</button>`;
    }).join('');

    $('dp-block').classList.toggle(
      'hidden',
      App.calc.paymentStatus !== 'DP/Uang Muka'
    );

    updateRemainingHint();
  }

  function renderPaymentMethods() {
    $('payment-method-grid').innerHTML = PAYMENT_METHODS.map((method) => {
      const active = App.calc.paymentMethod === method;
      return `
        <button class="method-btn ${active ? 'active' : ''}" type="button"
          data-payment-method="${esc(method)}">${esc(method)}</button>`;
    }).join('');
  }

  function updateRemainingHint() {
    const pricing = getPricing();
    const remaining = pricing.total - int(App.calc.paidAmount);
    $('remaining-hint').textContent = `Sisa tagihan: ${formatRupiah(
      Math.max(remaining, 0)
    )}`;
  }

  function proceedFromCalculation() {
    const pricing = getPricing();

    if (App.calc.paymentStatus === 'DP/Uang Muka') {
      const dp = int(App.calc.paidAmount);
      if (dp <= 0 || dp >= pricing.total) {
        showDialog(
          'DP tidak valid',
          'Masukkan nominal DP lebih dari 0 dan kurang dari total.'
        );
        return;
      }
    }

    let paidAmount = 0;
    if (App.calc.paymentStatus === 'Lunas') paidAmount = pricing.total;
    if (App.calc.paymentStatus === 'DP/Uang Muka')
      paidAmount = int(App.calc.paidAmount);

    App.order = {
      ...App.order,
      voucherCode: App.calc.appliedVoucher,
      manualDiscount: int(App.calc.manualDiscount),
      paymentStatus: App.calc.paymentStatus,
      paymentMethod: App.calc.paymentMethod,
      paidAmount,
    };

    navigate('scheduling');
  }

  // =================================================================
  // SCREEN 7 — PENJADWALAN
  // =================================================================

  function rowHtml(label, value) {
    return `
      <div class="info-row">
        <span class="info-label">${esc(label)}</span>
        <span class="info-value">${esc(value)}</span>
      </div>`;
  }

  function computeSchedule(entryDate, speed) {
    if (speed && speed.hours) {
      const today = toLocalYMD(new Date());
      const now = new Date();
      const base =
        entryDate === today
          ? now
          : new Date(`${entryDate}T00:00:00`);
      const finish = new Date(base.getTime() + speed.hours * 3600 * 1000);

      return {
        entryDate,
        estimatedDate: toLocalYMD(finish),
        estimatedTime: `${pad2(finish.getHours())}:${pad2(
          finish.getMinutes()
        )}`,
      };
    }

    const days = (speed && speed.days) || 2;
    const base = new Date(`${entryDate}T00:00:00`);
    const finish = new Date(base.getTime());
    finish.setDate(finish.getDate() + days);

    return {
      entryDate,
      estimatedDate: toLocalYMD(finish),
      estimatedTime: '14:00',
    };
  }

  function enterScheduling() {
    const service = getServiceById(App.order.serviceId);
    const speed = getSpeedById(App.order.speedId);
    const item = getItemById(App.order.itemId);

    const entryDate = App.order.entryDate || toLocalYMD(new Date());
    App.schedule = computeSchedule(entryDate, speed);

    const summaryRows = [
      rowHtml('Pelanggan', App.order.customerName || 'Walk-in'),
      rowHtml('Layanan', service ? service.name : '-'),
      rowHtml(
        'Paket',
        `${speed ? speed.name : '-'} (${speed ? speed.description : '-'})`
      ),
      item ? rowHtml('Barang', item.name) : '',
      rowHtml(
        'Kuantitas',
        App.order.weight
          ? `${App.order.weight} kg`
          : `${App.order.quantity} pcs`
      ),
      App.order.notes ? rowHtml('Catatan', App.order.notes) : '',
      App.order.needsPickup
        ? rowHtml('Antar-jemput', App.order.customerAddress || 'Ya')
        : '',
    ];

    $('schedule-summary').innerHTML = summaryRows.join('');
    $('entry-date-label').textContent = formatTanggalFull(entryDate);

    $('estimate-date-label').textContent = formatTanggalFull(
      App.schedule.estimatedDate
    );
    $('estimate-time-label').textContent = `Pukul ${App.schedule.estimatedTime}`;
    $('estimate-note-label').textContent = `Dihitung otomatis dari paket ${
      speed ? speed.name : 'Reguler'
    } (${speed ? speed.description : '2-3 hari'})`;

    $('pickup-card').classList.toggle('hidden', !App.order.needsPickup);
    $('pickup-address').textContent =
      App.order.customerAddress || 'Alamat belum diisi';
  }

  function buildOrderPayload(pricing) {
    return {
      customerId: App.order.customerId,
      customerName: App.order.customerName,
      customerPhone: App.order.customerPhone,
      customerAddress: App.order.customerAddress,
      needsPickup: App.order.needsPickup,
      serviceId: App.order.serviceId,
      speedId: App.order.speedId,
      itemId: App.order.itemId,
      weight: App.order.weight,
      quantity: App.order.quantity,
      photoUri: App.order.photoUri,
      notes: App.order.notes,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      total: pricing.total,
      paymentStatus: App.order.paymentStatus,
      paymentMethod: App.order.paymentMethod,
      paidAmount: App.order.paidAmount,
      entryDate: App.schedule.entryDate,
      estimatedDate: App.schedule.estimatedDate,
      estimatedTime: App.schedule.estimatedTime,
    };
  }

  function saveCurrentOrder() {
    const pricing = calculatePrice(App.order);
    const payload = buildOrderPayload(pricing);

    try {
      if (App.order.savedOrderId) {
        // Pengguna kembali mengubah data setelah nota pertama dibuat.
        // Perbarui pesanan yang sama agar tidak terjadi duplikasi.
        DB.updateOrder(App.order.savedOrderId, {
          customer_name: payload.customerName,
          customer_phone: payload.customerPhone,
          customer_address: payload.customerAddress,
          needs_pickup: payload.needsPickup ? 1 : 0,
          service_id: payload.serviceId,
          speed_id: payload.speedId,
          item_id: payload.itemId,
          weight: payload.weight,
          quantity: payload.quantity,
          photo_uri: payload.photoUri || '',
          notes: payload.notes || '',
          subtotal: payload.subtotal,
          discount: payload.discount,
          total: payload.total,
          payment_status: payload.paymentStatus,
          payment_method: payload.paymentMethod,
          paid_amount: payload.paidAmount,
          entry_date: payload.entryDate,
          estimated_date: payload.estimatedDate,
          estimated_time: payload.estimatedTime,
        });
        return App.order.savedOrderId;
      }

      const saved = DB.createOrder(payload);
      App.order = { ...App.order, savedOrderId: saved.id };
      return saved.id;
    } catch (e) {
      console.error('Gagal menyimpan pesanan:', e);
      showDialog(
        'Gagal menyimpan',
        'Penyimpanan browser penuh atau tidak tersedia. Hapus foto/riwayat lama lalu coba lagi.'
      );
      return null;
    }
  }

  function proceedFromScheduling() {
    App.order = {
      ...App.order,
      entryDate: App.schedule.entryDate,
      estimatedDate: App.schedule.estimatedDate,
      estimatedTime: App.schedule.estimatedTime,
    };

    const orderId = saveCurrentOrder();
    if (!orderId) return;

    navigate('receipt', { orderId, isNew: true });
  }

  // =================================================================
  // SCREEN 8 — NOTA
  // =================================================================

  function mapSavedOrder(saved) {
    return {
      orderNumber: saved.order_number,
      customerName: saved.customer_name,
      customerPhone: saved.customer_phone,
      customerAddress: saved.customer_address,
      serviceId: saved.service_id,
      speedId: saved.speed_id,
      itemId: saved.item_id,
      weight: Number(saved.weight) || 0,
      quantity: Number(saved.quantity) || 0,
      notes: saved.notes,
      subtotal: Number(saved.subtotal) || 0,
      discount: Number(saved.discount) || 0,
      total: Number(saved.total) || 0,
      paymentStatus: saved.payment_status,
      paymentMethod: saved.payment_method,
      paidAmount: Number(saved.paid_amount) || 0,
      entryDate: saved.entry_date,
      estimatedDate: saved.estimated_date,
      estimatedTime: saved.estimated_time,
      needsPickup: saved.needs_pickup === 1,
      status: saved.status || 'Diproses',
    };
  }

  function mapDraftOrder() {
    return {
      orderNumber: App.order.orderNumber || '(menyimpan...)',
      customerName: App.order.customerName,
      customerPhone: App.order.customerPhone,
      customerAddress: App.order.customerAddress,
      serviceId: App.order.serviceId,
      speedId: App.order.speedId,
      itemId: App.order.itemId,
      weight: App.order.weight,
      quantity: App.order.quantity,
      notes: App.order.notes,
      subtotal: getPricing().subtotal,
      discount: getPricing().discount,
      total: getPricing().total,
      paymentStatus: App.order.paymentStatus,
      paymentMethod: App.order.paymentMethod,
      paidAmount: App.order.paidAmount,
      entryDate: App.order.entryDate,
      estimatedDate: App.order.estimatedDate,
      estimatedTime: App.order.estimatedTime,
      needsPickup: App.order.needsPickup,
      status: 'Diproses',
    };
  }

  function enterReceipt(params) {
    const fromHistory = !!params.fromHistory;

    const saved = params.orderId ? DB.getOrderById(params.orderId) : null;
    const data = saved ? mapSavedOrder(saved) : mapDraftOrder();

    App.receipt = {
      data,
      fromHistory,
      orderId: params.orderId || null,
      status: data.status || 'Diproses',
    };

    renderReceipt();
  }

  function renderReceipt() {
    const receipt = App.receipt;
    const data = receipt.data;
    if (!data) return;

    const service = getServiceById(data.serviceId);
    const speed = getSpeedById(data.speedId);
    const item = getItemById(data.itemId);

    // Status bar hanya tampil untuk nota dari riwayat.
    $('receipt-status-bar').classList.toggle('hidden', !receipt.fromHistory);
    $('receipt-status-value').textContent = receipt.status;

    $('receipt-number').textContent = data.orderNumber || '-';
    $('receipt-date').textContent = formatTanggalShort(data.entryDate);
    $('receipt-customer').textContent = data.customerName || 'Walk-in';

    const phoneRow = $('receipt-phone-row');
    phoneRow.classList.toggle('hidden', !data.customerPhone);
    $('receipt-phone').textContent = data.customerPhone || '-';

    $('receipt-service').textContent = service ? service.name : '-';
    $('receipt-speed').textContent = speed ? speed.name : '-';

    const itemRow = $('receipt-item-row');
    itemRow.classList.toggle('hidden', !item);
    $('receipt-item').textContent = item ? item.name : '-';

    $('receipt-qty-label').textContent = data.weight ? 'Berat' : 'Jumlah';
    $('receipt-qty-value').textContent = data.weight
      ? `${data.weight} kg`
      : `${data.quantity} pcs`;

    const pcsRow = $('receipt-pcs-row');
    const showPcs = Number(data.weight) > 0 && Number(data.quantity) > 0;
    pcsRow.classList.toggle('hidden', !showPcs);
    $('receipt-pcs-value').textContent = `${data.quantity} pcs`;

    $('receipt-subtotal').textContent = formatRupiah(data.subtotal);
    $('receipt-discount').textContent = `- ${formatRupiah(data.discount)}`;
    $('receipt-total').textContent = formatRupiah(data.total);
    $('receipt-payment-status').textContent = data.paymentStatus || '-';
    $('receipt-payment-method').textContent = data.paymentMethod || '-';

    const remainingRow = $('receipt-remaining-row');
    const isDp = data.paymentStatus === 'DP/Uang Muka';
    remainingRow.classList.toggle('hidden', !isDp);
    $('receipt-remaining').textContent = formatRupiah(
      data.total - data.paidAmount
    );

    $('receipt-estimate').textContent = `${formatTanggalShort(
      data.estimatedDate
    )} • ${data.estimatedTime || '-'}`;

    const notesBlock = $('receipt-notes-block');
    notesBlock.classList.toggle('hidden', !data.notes);
    $('receipt-notes').textContent = data.notes || '';

    // Tombol perubahan status hanya untuk nota dari riwayat.
    const statusButton = $('btn-status-action');
    statusButton.classList.add('hidden');
    statusButton.onclick = null;

    if (
      receipt.fromHistory &&
      receipt.orderId &&
      (receipt.status === 'Diproses' || receipt.status === 'Selesai')
    ) {
      const isDone = receipt.status === 'Selesai';
      const nextStatus = isDone ? 'Diambil' : 'Selesai';

      statusButton.textContent = isDone
        ? 'Tandai Sudah Diambil'
        : 'Tandai Selesai';
      statusButton.style.backgroundColor = isDone
        ? 'var(--primary)'
        : 'var(--success)';
      statusButton.classList.remove('hidden');
      statusButton.onclick = () => {
        DB.updateOrderStatus(receipt.orderId, nextStatus);
        App.receipt.status = nextStatus;
        renderReceipt();
        showToast(
          nextStatus === 'Selesai'
            ? 'Pesanan ditandai selesai.'
            : 'Pesanan ditandai sudah diambil.'
        );
      };
    }

    $('btn-finish').textContent = receipt.fromHistory
      ? 'Kembali ke Beranda'
      : 'Selesai & Kembali ke Beranda';
  }

  // ---------- Cetak nota ----------

  function buildReceiptHtml(data) {
    const service = getServiceById(data.serviceId);
    const speed = getSpeedById(data.speedId);
    const item = getItemById(data.itemId);
    const qty = data.weight
      ? `${data.weight} kg`
      : `${data.quantity} pcs`;

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Nota ${esc(data.orderNumber)}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Courier New', Courier, monospace; font-size: 11.5px; color: #000; margin: 0; }
    h1 { font-size: 16px; text-align: center; margin: 0 0 3px; letter-spacing: .6px; }
    .center { text-align: center; font-size: 10.5px; line-height: 1.5; }
    .line { border-top: 1px dashed #000; margin: 7px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 2.5px 0; vertical-align: top; }
    td.r { text-align: right; }
    .total td { font-weight: bold; font-size: 13px; padding-top: 5px; }
    .box { border: 1px dashed #000; padding: 6px; text-align: center; margin-top: 2px; }
    .small { font-size: 10px; }
  </style>
</head>
<body>
  <h1>LAUNDRY KILAT</h1>
  <div class="center">Jl. Contoh No. 123, Kota Anda<br />Telp: 0812-3456-7890</div>
  <div class="line"></div>
  <table>
    <tr><td>No. Resi</td><td class="r"><b>${esc(data.orderNumber || '-')}</b></td></tr>
    <tr><td>Tanggal</td><td class="r">${esc(formatTanggalShort(data.entryDate))}</td></tr>
    <tr><td>Pelanggan</td><td class="r">${esc(data.customerName || 'Walk-in')}</td></tr>
    ${data.customerPhone ? `<tr><td>Telepon</td><td class="r">${esc(data.customerPhone)}</td></tr>` : ''}
  </table>
  <div class="line"></div>
  <table>
    <tr><td>Layanan</td><td class="r">${esc(service ? service.name : '-')}</td></tr>
    <tr><td>Paket</td><td class="r">${esc(speed ? speed.name : '-')}</td></tr>
    ${item ? `<tr><td>Barang</td><td class="r">${esc(item.name)}</td></tr>` : ''}
    <tr><td>${data.weight ? 'Berat' : 'Jumlah'}</td><td class="r">${esc(qty)}</td></tr>
    ${data.weight > 0 && data.quantity > 0 ? `<tr><td>Jumlah Pcs</td><td class="r">${esc(data.quantity)} pcs</td></tr>` : ''}
  </table>
  <div class="line"></div>
  <table>
    <tr><td>Subtotal</td><td class="r">${formatRupiah(data.subtotal)}</td></tr>
    <tr><td>Diskon</td><td class="r">- ${formatRupiah(data.discount)}</td></tr>
    <tr class="total"><td>TOTAL</td><td class="r">${formatRupiah(data.total)}</td></tr>
    <tr><td>Pembayaran</td><td class="r">${esc(data.paymentStatus || '-')}</td></tr>
    <tr><td>Metode</td><td class="r">${esc(data.paymentMethod || '-')}</td></tr>
    ${data.paymentStatus === 'DP/Uang Muka' ? `<tr><td>Sisa Tagihan</td><td class="r"><b>${formatRupiah(data.total - data.paidAmount)}</b></td></tr>` : ''}
  </table>
  <div class="line"></div>
  <div class="box">Estimasi Selesai<br /><b>${esc(formatTanggalShort(data.estimatedDate))} • ${esc(data.estimatedTime || '-')}</b></div>
  ${data.notes ? `<div class="line"></div><div class="small"><b>Catatan:</b><br />${esc(data.notes)}</div>` : ''}
  <div class="line"></div>
  <div class="center">Terima kasih telah menggunakan<br />layanan kami</div>
</body>
</html>`;
  }

  function printHtml(html) {
    const win = window.open('', '_blank', 'width=420,height=640');
    if (!win) {
      showDialog(
        'Pop-up diblokir',
        'Izinkan pop-up di browser untuk mencetak nota atau label.'
      );
      return;
    }

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();

    window.setTimeout(() => {
      try {
        win.print();
      } catch (e) {
        console.warn('Gagal membuka dialog cetak:', e);
      }
    }, 350);
  }

  function handlePrintReceipt() {
    if (!App.receipt.data) return;
    printHtml(buildReceiptHtml(App.receipt.data));
  }

  function handlePdfReceipt() {
    if (!App.receipt.data) return;
    // Buka jendela cetak langsung di dalam gesture klik agar tidak diblokir
    // pop-up blocker. Pengguna memilih "Simpan sebagai PDF" di dialog cetak.
    showToast('Pada dialog cetak, pilih “Simpan sebagai PDF”.');
    printHtml(buildReceiptHtml(App.receipt.data));
  }

  function handleWhatsAppReceipt() {
    const data = App.receipt.data;
    if (!data) return;

    const lines = [
      '*NOTA LAUNDRY KILAT*',
      `No. Resi: ${data.orderNumber || '-'}`,
      `Pelanggan: ${data.customerName || '-'}`,
      `Layanan: ${
        (getServiceById(data.serviceId) || {}).name || '-'
      } (${(getSpeedById(data.speedId) || {}).name || '-'})`,
      `Estimasi Selesai: ${formatTanggalShort(data.estimatedDate)} ${
        data.estimatedTime || ''
      }`,
      `Total: ${formatRupiah(data.total)}`,
      `Status: ${data.paymentStatus || '-'}`,
      '',
      'Terima kasih telah menggunakan layanan kami.',
    ];

    const text = encodeURIComponent(lines.join('\n'));
    const cleanPhone = String(data.customerPhone || '').replace(/[^0-9]/g, '');
    const normalized = cleanPhone.startsWith('0')
      ? `62${cleanPhone.slice(1)}`
      : cleanPhone;

    const url = normalized
      ? `https://wa.me/${normalized}?text=${text}`
      : `https://wa.me/?text=${text}`;

    window.open(url, '_blank', 'noopener');
  }

  function goToTagFromReceipt() {
    const data = App.receipt.data;
    if (!data) return;

    const service = getServiceById(data.serviceId);
    const speed = getSpeedById(data.speedId);

    navigate('tag', {
      orderNumber: data.orderNumber,
      customerName: data.customerName || 'Walk-in',
      serviceName: service ? service.name : '-',
      speedName: speed ? speed.name : '-',
      estimatedDate: data.estimatedDate,
      weight: data.weight,
      quantity: data.quantity,
    });
  }

  function finishReceipt() {
    resetOrder();
    goHome(true);
  }

  // =================================================================
  // SCREEN 9 — LABEL CUCIAN
  // =================================================================

  function enterTag(params) {
    const data = {
      orderNumber: params.orderNumber || '-',
      customerName: params.customerName || 'Walk-in',
      serviceName: params.serviceName || '-',
      speedName: params.speedName || '-',
      estimatedDate: params.estimatedDate || '-',
      weight: Number(params.weight) || 0,
      quantity: Number(params.quantity) || 0,
    };

    App.tag.data = data;

    $('tag-resi').textContent = data.orderNumber;
    $('tag-name').textContent = data.customerName;
    $('tag-service').textContent = `${data.serviceName} • ${data.speedName}`;
    $('tag-qty').textContent = data.weight
      ? `${data.weight} kg`
      : `${data.quantity} pcs`;
    $('tag-estimate').textContent = `Est: ${formatTanggalShort(
      data.estimatedDate
    )}`;

    renderQrCode({
      resi: data.orderNumber,
      nama: data.customerName,
      layanan: data.serviceName,
      estimasi: data.estimatedDate,
    });
  }

  function renderQrCode(payload) {
    const box = $('qr-code');
    box.innerHTML = '';

    if (!window.QRCode) {
      box.innerHTML = '<p class="qr-fallback">QR tidak tersedia.</p>';
      return;
    }

    new window.QRCode(box, {
      text: JSON.stringify(payload),
      width: 120,
      height: 120,
      colorDark: '#1F618D',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel
        ? window.QRCode.CorrectLevel.H
        : 2,
    });
  }

  function getQrDataUrl() {
    // qrcodejs menampilkan QR sebagai <img> (data URI) dan menyembunyikan
    // canvas di beberapa browser. Prioritaskan elemen yang terlihat.
    const image = document.querySelector('#qr-code img');
    if (image && image.src && image.src.startsWith('data:')) {
      return image.src;
    }
    const canvas = document.querySelector('#qr-code canvas');
    if (canvas) {
      try {
        return canvas.toDataURL('image/png');
      } catch (e) {
        console.warn('Gagal membaca canvas QR:', e);
      }
    }
    return '';
  }

  function buildTagHtml(data, qrDataUrl) {
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Label ${esc(data.orderNumber)}</title>
  <style>
    @page { size: 58mm 40mm; margin: 2mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: #000; }
    .tag {
      width: 54mm;
      border: 1px solid #000;
      border-radius: 2mm;
      padding: 1.5mm;
      display: flex;
      gap: 2mm;
      align-items: center;
    }
    .qr img { width: 18mm; height: 18mm; display: block; }
    .info { flex: 1; font-size: 7pt; line-height: 1.35; }
    .resi { font-size: 9pt; font-weight: bold; }
    .name { font-size: 8pt; font-weight: bold; }
    .muted { color: #444; }
  </style>
</head>
<body>
  <div class="tag">
    <div class="qr">${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" />` : ''}</div>
    <div class="info">
      <div class="resi">${esc(data.orderNumber)}</div>
      <div class="name">${esc(data.customerName)}</div>
      <div class="muted">${esc(data.serviceName)} • ${esc(data.speedName)}</div>
      <div class="muted">${data.weight > 0 ? `${esc(data.weight)} kg` : `${esc(data.quantity)} pcs`}</div>
      <div class="muted">Est: ${esc(formatTanggalShort(data.estimatedDate))}</div>
    </div>
  </div>
</body>
</html>`;
  }

  function handlePrintLabel() {
    if (!App.tag.data) return;
    printHtml(buildTagHtml(App.tag.data, getQrDataUrl()));
  }

  function handlePdfLabel() {
    if (!App.tag.data) return;
    showToast('Pada dialog cetak, pilih “Simpan sebagai PDF”.');
    printHtml(buildTagHtml(App.tag.data, getQrDataUrl()));
  }

  function tagBackHome() {
    resetOrder();
    goHome(true);
  }

  // =================================================================
  // EVENT BINDING
  // =================================================================

  function bindEvents() {
    // Header & dialog
    $('btn-back').addEventListener('click', goBack);

    $('dialog-ok').addEventListener('click', hideDialog);
    $('dialog-overlay').addEventListener('click', (event) => {
      if (event.target === $('dialog-overlay')) hideDialog();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hideDialog();
    });

    // ---------------- Home ----------------
    $('btn-new-order').addEventListener('click', () => {
      resetOrder();
      App.history = [];
      navigate('customer');
    });

    $('orders-list').addEventListener('click', (event) => {
      const card = event.target.closest('[data-order-id]');
      if (!card) return;
      navigate('receipt', {
        orderId: card.dataset.orderId,
        fromHistory: true,
      });
    });

    // ---------------- Customer ----------------
    $('customer-search').addEventListener('input', (event) => {
      App.customerForm.search = event.target.value;
      renderCustomers();
    });
    $('cust-name').addEventListener('input', (event) => {
      App.customerForm.name = event.target.value;
    });
    $('cust-phone').addEventListener('input', (event) => {
      App.customerForm.phone = event.target.value;
    });
    $('cust-address').addEventListener('input', (event) => {
      App.customerForm.address = event.target.value;
    });
    $('cust-pickup').addEventListener('change', (event) => {
      App.customerForm.pickup = event.target.checked;
    });

    $('btn-walkin').addEventListener('click', selectWalkIn);
    $('btn-save-customer').addEventListener('click', submitNewCustomer);

    $('customers-list').addEventListener('click', (event) => {
      const card = event.target.closest('[data-customer-id]');
      if (!card) return;
      const customer = DB.getCustomers().find(
        (item) => String(item.id) === card.dataset.customerId
      );
      if (customer) selectCustomer(customer);
    });

    // ---------------- Service ----------------
    $('service-grid').addEventListener('click', (event) => {
      const card = event.target.closest('[data-service-id]');
      if (!card) return;
      App.serviceDraft.serviceId = card.dataset.serviceId;
      renderServiceGrid();
      renderItemSection();
    });

    $('speed-row').addEventListener('click', (event) => {
      const card = event.target.closest('[data-speed-id]');
      if (!card) return;
      App.serviceDraft.speedId = card.dataset.speedId;
      renderSpeedGrid();
    });

    $('item-grid').addEventListener('click', (event) => {
      const card = event.target.closest('[data-item-id]');
      if (!card) return;
      App.serviceDraft.itemId = card.dataset.itemId;
      renderItemSection();
    });

    $('btn-service-next').addEventListener('click', proceedFromService);

    // ---------------- Quantity ----------------
    $('input-weight').addEventListener('input', (event) => {
      event.target.value = event.target.value.replace(/[^0-9.,]/g, '');
      App.quantity.weight = event.target.value;
      updateEstimateDisplay();
    });

    $('input-quantity').addEventListener('input', (event) => {
      event.target.value = event.target.value.replace(/[^0-9]/g, '');
      App.quantity.pcs = event.target.value;
      $('input-pcs').value = event.target.value;
      updateEstimateDisplay();
    });

    $('input-pcs').addEventListener('input', (event) => {
      if (event.target.readOnly) return;
      event.target.value = event.target.value.replace(/[^0-9]/g, '');
      App.quantity.pcs = event.target.value;
      updateEstimateDisplay();
    });

    $('btn-quantity-next').addEventListener('click', proceedFromQuantity);

    // ---------------- Quality ----------------
    $('btn-camera').addEventListener('click', () => $('camera-input').click());
    $('btn-gallery').addEventListener('click', () => $('gallery-input').click());

    $('camera-input').addEventListener('change', (event) =>
      handlePhotoFile(event.target)
    );
    $('gallery-input').addEventListener('change', (event) =>
      handlePhotoFile(event.target)
    );

    $('btn-remove-photo').addEventListener('click', () => {
      App.quality.photoUri = null;
      renderQualityPhoto();
    });

    $('condition-chips').addEventListener('click', (event) => {
      const chip = event.target.closest('[data-tag]');
      if (!chip) return;
      toggleConditionTag(chip.dataset.tag);
    });

    $('quality-notes').addEventListener('input', (event) => {
      App.quality.notes = event.target.value;
    });

    $('btn-quality-next').addEventListener('click', proceedFromQuality);

    // ---------------- Calculation ----------------
    $('voucher-code').addEventListener('input', (event) => {
      App.calc.voucherInput = event.target.value;
    });
    $('manual-discount').addEventListener('input', (event) => {
      event.target.value = event.target.value.replace(/[^0-9]/g, '');
      App.calc.manualDiscount = event.target.value;
      renderPricing();
    });
    $('btn-apply-voucher').addEventListener('click', applyVoucher);

    $('payment-status-row').addEventListener('click', (event) => {
      const button = event.target.closest('[data-payment-status]');
      if (!button) return;
      App.calc.paymentStatus = button.dataset.paymentStatus;
      renderPaymentStatus();
    });

    $('paid-amount').addEventListener('input', (event) => {
      event.target.value = event.target.value.replace(/[^0-9]/g, '');
      App.calc.paidAmount = event.target.value;
      updateRemainingHint();
    });

    $('payment-method-grid').addEventListener('click', (event) => {
      const button = event.target.closest('[data-payment-method]');
      if (!button) return;
      App.calc.paymentMethod = button.dataset.paymentMethod;
      renderPaymentMethods();
    });

    $('btn-calculation-next').addEventListener('click', proceedFromCalculation);

    // ---------------- Scheduling ----------------
    $('btn-scheduling-next').addEventListener('click', proceedFromScheduling);

    // ---------------- Receipt ----------------
    $('btn-print').addEventListener('click', handlePrintReceipt);
    $('btn-pdf').addEventListener('click', handlePdfReceipt);
    $('btn-wa').addEventListener('click', handleWhatsAppReceipt);
    $('btn-tag').addEventListener('click', goToTagFromReceipt);
    $('btn-finish').addEventListener('click', finishReceipt);

    // ---------------- Tag ----------------
    $('btn-print-label').addEventListener('click', handlePrintLabel);
    $('btn-label-pdf').addEventListener('click', handlePdfLabel);
    $('btn-tag-home').addEventListener('click', tagBackHome);

    // Sinkronkan beranda antar-tab browser.
    window.addEventListener('storage', () => {
      if (App.screen === 'home') renderHome();
    });
  }

  // =================================================================
  // START
  // =================================================================

  document.addEventListener('DOMContentLoaded', () => {
    DB.init();
    bindEvents();
    showScreen('home');
  });
})();
