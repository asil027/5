/**
 * AURA COFFEE ROASTERS - ADMIN DASHBOARD JAVASCRIPT
 */

document.addEventListener('DOMContentLoaded', () => {
  initAdminClock();
  initOrdersManager();
  initCafeToggle();
  initMenuManager();
  initCafeSpecsManager();
  initCustomerInquiriesManager();
  initCustomerReviewsManager();
  initSupabaseModal();
});

/* 1. Live Admin Clock */
function initAdminClock() {
  const clockEl = document.getElementById('adminLiveClock');
  function tick() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const pktDate = new Date(utc + (3600000 * 5));
    if (clockEl) {
      clockEl.textContent = pktDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }) + ' PKT';
    }
  }
  tick();
  setInterval(tick, 1000);
}

/* 2. Live Orders Manager */
function initOrdersManager() {
  const tbody = document.getElementById('ordersTableBody');
  const searchInput = document.getElementById('orderSearchInput');
  const refreshBtn = document.getElementById('refreshOrdersBtn');
  const tabs = document.querySelectorAll('.order-tab');
  
  let ordersList = [];
  let currentFilter = 'all';

  function persistOrders() {
    localStorage.setItem('aura_orders', JSON.stringify(ordersList));
  }

  async function fetchOrders() {
    let apiOrders = null;
    if (window.AuraDB) {
      try {
        const dbOrders = await window.AuraDB.fetchOrders(null);
        if (dbOrders && Array.isArray(dbOrders) && dbOrders.length > 0) {
          apiOrders = dbOrders;
        }
      } catch (err) {}
    }
    if (!apiOrders) {
      try {
        const res = await fetch('/api/orders');
        if (res.ok) {
          apiOrders = await res.json();
        }
      } catch (e) {}
    }

    let localOrders = null;
    try {
      const saved = localStorage.getItem('aura_orders');
      if (saved) localOrders = JSON.parse(saved);
    } catch (e) {}

    if (apiOrders && Array.isArray(apiOrders)) {
      // Merge apiOrders with localOrders to ensure no placed order is lost
      const orderMap = new Map();
      apiOrders.forEach(o => orderMap.set(o.id, o));
      if (localOrders && Array.isArray(localOrders)) {
        localOrders.forEach(o => {
          if (!orderMap.has(o.id)) {
            orderMap.set(o.id, o);
            // Sync to backend in background
            fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(o)
            }).catch(() => {});
          }
        });
      }
      ordersList = Array.from(orderMap.values());
      persistOrders();
    } else if (localOrders && Array.isArray(localOrders) && localOrders.length > 0) {
      ordersList = localOrders;
    } else {
      ordersList = getLocalOrdersFallback();
      persistOrders();
    }
    renderOrders();
    updateKPIs();
  }

  function getLocalOrdersFallback() {
    return [
      {
        id: 'ORD-1082',
        customerName: 'Zainab Khalid',
        phone: '0301-7892341',
        orderType: 'Dine-in at Roastery',
        address: 'Table #4',
        coffee: 'Vanilla Latte',
        qty: 2,
        cupSize: 'Regular (12oz)',
        milk: 'Whole Milk',
        temperature: 'Hot & Steamy',
        sweetness: 'Standard Balanced (50%)',
        notes: 'Extra velvet foam please',
        total: 1200,
        status: 'Brewing',
        time: '18:42 PKT'
      },
      {
        id: 'ORD-1081',
        customerName: 'Hamza Malik',
        phone: '0300-8451290',
        orderType: 'Takeaway Pickup',
        address: 'Counter Pickup',
        coffee: 'Caramel Coffee',
        qty: 1,
        cupSize: 'Large (16oz)',
        milk: 'Oat Milk',
        temperature: 'Iced with Cubes',
        sweetness: 'Extra Sweet (100%)',
        notes: 'Extra caramel drizzle on glass walls',
        total: 1070,
        status: 'Ready for Pickup',
        time: '18:30 PKT'
      },
      {
        id: 'ORD-1080',
        customerName: 'Dr. Asad Raza',
        phone: '0321-6549870',
        orderType: 'Local Delivery (Faisalabad)',
        address: 'House 42, Street 15, Saifabad No. 1',
        coffee: 'Ethiopia Yirgacheffe (250g Beans)',
        qty: 1,
        cupSize: 'Whole Bean',
        milk: 'None',
        temperature: 'Room Temp',
        sweetness: 'None',
        notes: 'Please pack in freshness sealed pouch',
        total: 1450,
        status: 'Delivered',
        time: '17:15 PKT'
      }
    ];
  }

  function updateKPIs() {
    const totalRevenue = ordersList.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const activeOrders = ordersList.filter(o => o.status === 'Pending' || o.status === 'Brewing').length;

    const kpiRev = document.getElementById('kpiRevenue');
    const kpiTotal = document.getElementById('kpiTotalOrders');
    const kpiActive = document.getElementById('kpiActiveOrders');

    if (kpiRev) kpiRev.textContent = `Rs. ${totalRevenue.toLocaleString()}`;
    if (kpiTotal) kpiTotal.textContent = `${ordersList.length} Orders`;
    if (kpiActive) kpiActive.textContent = `${activeOrders} Order${activeOrders === 1 ? '' : 's'}`;

    // Update tab badges
    const countAll = document.getElementById('countAll');
    const countPending = document.getElementById('countPending');
    const countBrewing = document.getElementById('countBrewing');
    const countReady = document.getElementById('countReady');
    const countDelivered = document.getElementById('countDelivered');

    if (countAll) countAll.textContent = ordersList.length;
    if (countPending) countPending.textContent = ordersList.filter(o => o.status === 'Pending').length;
    if (countBrewing) countBrewing.textContent = ordersList.filter(o => o.status === 'Brewing').length;
    if (countReady) countReady.textContent = ordersList.filter(o => o.status === 'Ready for Pickup').length;
    if (countDelivered) countDelivered.textContent = ordersList.filter(o => o.status === 'Delivered').length;
  }

  function renderOrders() {
    if (!tbody) return;
    tbody.innerHTML = '';

    const query = searchInput?.value.toLowerCase().trim() || '';

    const filtered = ordersList.filter(order => {
      const matchFilter = (currentFilter === 'all') || (order.status === currentFilter);
      const matchSearch = !query || 
        order.customerName.toLowerCase().includes(query) ||
        order.phone.includes(query) ||
        order.coffee.toLowerCase().includes(query) ||
        order.id.toLowerCase().includes(query);
      return matchFilter && matchSearch;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2.5rem; color: var(--text-dim);">No orders found matching the criteria.</td></tr>`;
      return;
    }

    filtered.forEach(order => {
      const tr = document.createElement('tr');

      // Status class for styling dropdown
      const statusClass = (order.status || 'pending').toLowerCase().replace(/\s+/g, '-');

      // Clean phone for WhatsApp link
      let cleanPhone = order.phone.replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('0')) cleanPhone = '92' + cleanPhone.substring(1);
      if (!cleanPhone.startsWith('92')) cleanPhone = '92' + cleanPhone;

      const whatsappDirectUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Hello ${order.customerName}! This is Aura Coffee Roasters regarding your order #${order.id} for ${order.coffee}. Your current status is: ${order.status}.`
      )}`;

      tr.innerHTML = `
        <td>
          <span class="order-id-badge">#${order.id}</span>
          <span class="order-time-sub">${order.time || 'Today'}</span>
        </td>
        <td>
          <span class="customer-name">${escapeHtml(order.customerName)}</span>
          <span class="customer-phone">${escapeHtml(order.phone)}</span>
        </td>
        <td>
          <span class="order-type-tag">${escapeHtml(order.orderType)}</span>
          <span class="order-address-text">${escapeHtml(order.address || 'In-store Pickup')}</span>
        </td>
        <td>
          <span class="coffee-item-title">${escapeHtml(order.coffee)}</span>
          <span class="coffee-custom-sub">
            Size: ${escapeHtml(order.cupSize || 'Regular')} • Milk: ${escapeHtml(order.milk || 'Standard')} • Temp: ${escapeHtml(order.temperature || 'Hot')}
            ${order.notes ? `<br><em>Note: ${escapeHtml(order.notes)}</em>` : ''}
          </span>
        </td>
        <td>
          <span class="order-total-highlight">Rs. ${Number(order.total || 0).toLocaleString()}</span>
          <span class="order-qty-sub">Qty: ${order.qty || 1}</span>
        </td>
        <td>
          <select class="status-select ${statusClass}" data-id="${order.id}">
            <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Brewing" ${order.status === 'Brewing' ? 'selected' : ''}>Brewing</option>
            <option value="Ready for Pickup" ${order.status === 'Ready for Pickup' ? 'selected' : ''}>Ready for Pickup</option>
            <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered / Done</option>
          </select>
        </td>
        <td>
          <a href="${whatsappDirectUrl}" target="_blank" rel="noopener noreferrer" class="btn-row-whatsapp" title="Send WhatsApp update to customer">
            <svg class="wa-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.04 20.16C10.61 20.16 9.22 19.78 8 19.06L7.71 18.89L4.59 19.71L5.42 16.67L5.23 16.37C4.44 15.11 4.02 13.64 4.02 11.91C4.02 7.37 7.72 3.67 12.05 3.67M9.27 7.22C9.07 7.22 8.87 7.23 8.68 7.3C8.49 7.36 8.28 7.56 8.16 7.7C7.79 8.13 7.27 8.88 7.27 10.31C7.27 11.74 8.31 13.12 8.46 13.31C8.61 13.5 10.45 16.49 13.36 17.65C15.78 18.61 16.27 18.42 16.8 18.37C17.33 18.32 18.52 17.67 18.77 16.98C19.02 16.29 19.02 15.7 18.95 15.58C18.88 15.46 18.68 15.39 18.38 15.24C18.08 15.09 16.61 14.37 16.34 14.27C16.07 14.17 15.87 14.12 15.67 14.42C15.47 14.72 14.9 15.39 14.73 15.58C14.56 15.77 14.39 15.8 14.09 15.65C13.79 15.5 12.83 15.19 11.69 14.17C10.8 13.38 10.2 12.4 10.05 12.15C9.9 11.9 10.03 11.77 10.18 11.62C10.32 11.49 10.48 11.27 10.63 11.1C10.78 10.93 10.83 10.81 10.93 10.61C11.03 10.41 10.98 10.24 10.91 10.09C10.84 9.94 10.25 8.48 10 7.89C9.76 7.32 9.51 7.4 9.32 7.39L9.27 7.22Z"/>
            </svg>
            <span>WhatsApp</span>
          </a>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Attach status change events
    document.querySelectorAll('.status-select').forEach(select => {
      select.addEventListener('change', async (e) => {
        const orderId = e.target.getAttribute('data-id');
        const newStatus = e.target.value;
        await updateOrderStatus(orderId, newStatus);
      });
    });
  }

  async function updateOrderStatus(id, status) {
    const target = ordersList.find(o => o.id === id);
    if (target) {
      target.status = status;
      persistOrders();
      updateKPIs();
      renderOrders();
    }
    if (window.AuraDB) {
      window.AuraDB.updateOrderStatus(id, status).catch(() => {});
    }
    try {
      await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    } catch (e) {}
  }

  // Filter tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-status');
      renderOrders();
    });
  });

  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', renderOrders);
  }

  // Refresh button
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      fetchOrders();
    });
  }

  // Real-time synchronization across browser tabs when orders are placed
  window.addEventListener('storage', (e) => {
    if (e.key === 'aura_orders') {
      try {
        ordersList = JSON.parse(e.newValue || '[]');
        renderOrders();
        updateKPIs();
      } catch (err) {}
    }
  });

  window.addEventListener('aura_order_placed', () => {
    fetchOrders();
  });

  // Initial load
  fetchOrders();

  // Polling every 2.5 seconds for instant updates from server
  setInterval(fetchOrders, 2500);
}

/* 3. Cafe Open/Closed Status Toggle Override */
function initCafeToggle() {
  const toggleBtn = document.getElementById('toggleCafeStatusBtn');
  const toggleText = document.getElementById('cafeToggleText');
  let isOpen = true;

  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    if (isOpen) {
      toggleBtn.className = 'status-toggle-btn open';
      if (toggleText) toggleText.textContent = 'OPEN (Accepting Orders)';
    } else {
      toggleBtn.className = 'status-toggle-btn closed';
      if (toggleText) toggleText.textContent = 'CLOSED (Paused)';
    }
  });
}

/* 4. Menu Items & Add/Remove Drink Manager */
function initMenuManager() {
  const grid = document.getElementById('menuAdminGrid');
  const addModal = document.getElementById('addDrinkModal');
  const openModalBtn = document.getElementById('openAddDrinkModalBtn');
  const closeModalBtn = document.getElementById('closeAddDrinkModalBtn');
  const cancelModalBtn = document.getElementById('cancelAddDrinkBtn');
  const addForm = document.getElementById('addDrinkForm');

  let menuList = [];

  const defaultMenu = [
    {
      id: "drink-1",
      name: "Vanilla Latte",
      price: 600,
      rating: "5.0",
      reviewsCount: 148,
      badge: "⭐ Customer Favorite",
      badgeClass: "gold-badge",
      category: "featured espresso",
      description: "Double shot of espresso combined with steamed velvety microfoam, infused with pure Madagascar vanilla extract and finished with master rosetta latte art.",
      tags: ["Espresso", "Madagascar Vanilla", "Velvet Milk"],
      image: "assets/images/vanilla-latte.jpg",
      inStock: true
    },
    {
      id: "drink-2",
      name: "Caramel Coffee",
      price: 500,
      rating: "5.0",
      reviewsCount: 192,
      badge: "🔥 Bestseller",
      badgeClass: "bestseller-badge",
      category: "featured iced espresso",
      description: "Artisanal layered macchiato featuring sweet cream milk, fresh espresso cascade, and decadent house-crafted butter caramel drizzle with crunchy roasted bean crumble.",
      tags: ["Artisan Caramel", "Cold / Hot", "Layered Macchiato"],
      image: "assets/images/caramel-coffee.jpg",
      inStock: true
    }
  ];

  function persistMenu() {
    localStorage.setItem('aura_menu', JSON.stringify(menuList));
    window.dispatchEvent(new CustomEvent('aura_menu_updated', { detail: menuList }));
  }

  async function fetchMenu() {
    if (window.AuraDB) {
      try {
        const dbItems = await window.AuraDB.fetchMenu(null);
        if (dbItems && Array.isArray(dbItems) && dbItems.length > 0) {
          menuList = dbItems;
          persistMenu();
          renderMenu();
          return;
        }
      } catch (err) {}
    }
    try {
      const res = await fetch('/api/menu');
      if (res.ok) {
        menuList = await res.json();
        persistMenu();
      } else {
        throw new Error('API request failed');
      }
    } catch (e) {
      console.warn('API fetch unavailable, using localStorage fallback:', e);
      const saved = localStorage.getItem('aura_menu');
      if (saved !== null) {
        try {
          menuList = JSON.parse(saved);
        } catch (err) {
          menuList = defaultMenu;
        }
      } else {
        menuList = defaultMenu;
        persistMenu();
      }
    }
    renderMenu();
  }

  function renderMenu() {
    if (!grid) return;
    grid.innerHTML = '';

    if (!menuList || menuList.length === 0) {
      grid.innerHTML = '<p style="color: var(--text-dim); padding: 1.5rem;">No drinks on menu. Click "+ Add New Drink" above.</p>';
      return;
    }

    menuList.forEach(item => {
      const row = document.createElement('div');
      row.className = 'menu-item-row';

      row.innerHTML = `
        <img src="${escapeHtml(item.image || 'assets/images/vanilla-latte.jpg')}" alt="${escapeHtml(item.name)}" class="menu-thumb" onerror="this.src='assets/images/vanilla-latte.jpg'">
        <div class="menu-row-info">
          <div class="menu-title-wrap">
            <h4>${escapeHtml(item.name)}</h4>
            ${item.badge ? `<span class="badge-tag gold">${escapeHtml(item.badge)}</span>` : ''}
          </div>
          <p>${escapeHtml(item.description || 'Specialty handcrafted cafe creation.')}</p>
        </div>
        <div class="menu-row-price">
          <label>Price (PKR):</label>
          <div class="price-input-box">
            <span>Rs.</span>
            <input type="number" value="${item.price}" data-id="${item.id}" class="menu-price-input">
          </div>
        </div>
        <div class="menu-row-status">
          <label class="switch">
            <input type="checkbox" ${item.inStock !== false ? 'checked' : ''} data-id="${item.id}" class="menu-stock-input">
            <span class="slider round"></span>
          </label>
          <span class="stock-text">${item.inStock !== false ? 'In Stock' : 'Sold Out'}</span>
        </div>
        <button class="btn-delete-drink" data-id="${item.id}" data-name="${escapeHtml(item.name)}" title="Remove ${escapeHtml(item.name)} from menu">
          🗑️
        </button>
      `;

      grid.appendChild(row);
    });

    // Attach Price Edit Handlers
    document.querySelectorAll('.menu-price-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const id = e.target.getAttribute('data-id');
        const newPrice = parseInt(e.target.value, 10);
        if (newPrice > 0) {
          await updateDrink(id, { price: newPrice });
        }
      });
    });

    // Attach Stock Toggle Handlers
    document.querySelectorAll('.menu-stock-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const id = e.target.getAttribute('data-id');
        const inStock = e.target.checked;
        const label = e.target.closest('.menu-row-status')?.querySelector('.stock-text');
        if (label) label.textContent = inStock ? 'In Stock' : 'Sold Out';
        await updateDrink(id, { inStock });
      });
    });

    // Attach Delete Drink Handlers
    document.querySelectorAll('.btn-delete-drink').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        if (confirm(`Are you sure you want to remove "${name}" from the menu?`)) {
          await deleteDrink(id);
        }
      });
    });
  }

  async function updateDrink(id, updates) {
    const target = menuList.find(m => m.id === id);
    if (target) {
      Object.assign(target, updates);
      persistMenu();
    }
    if (window.AuraDB) {
      window.AuraDB.updateMenuItem(id, updates).catch(() => {});
    }
    try {
      await fetch(`/api/menu/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.warn('Update API failed (offline/file protocol?):', e);
    }
  }

  async function deleteDrink(id) {
    menuList = menuList.filter(m => m.id !== id);
    persistMenu();
    renderMenu();

    if (window.AuraDB) {
      window.AuraDB.deleteMenuItem(id).catch(() => {});
    }
    try {
      await fetch(`/api/menu/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Delete API failed (offline/file protocol?):', e);
    }
  }

  // Modal Dialog Open/Close
  if (openModalBtn && addModal) {
    openModalBtn.addEventListener('click', () => {
      if (typeof addModal.showModal === 'function') {
        addModal.showModal();
      } else {
        addModal.setAttribute('open', '');
      }
    });
  }

  function closeAddModal() {
    if (typeof addModal.close === 'function') {
      addModal.close();
    } else {
      addModal.removeAttribute('open');
    }
  }

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeAddModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeAddModal);

  // Add Drink Form Submit
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      if (e && e.preventDefault) e.preventDefault();
      const name = document.getElementById('newDrinkName')?.value.trim();
      const price = parseInt(document.getElementById('newDrinkPrice')?.value, 10);
      const category = document.getElementById('newDrinkCategory')?.value || 'espresso';
      const badge = document.getElementById('newDrinkBadge')?.value.trim();
      const description = document.getElementById('newDrinkDesc')?.value.trim();
      const customImg = document.getElementById('newDrinkCustomImage')?.value.trim();
      const selectImg = document.getElementById('newDrinkImage')?.value || 'assets/images/vanilla-latte.jpg';
      const image = customImg || selectImg;

      if (!name || isNaN(price)) {
        alert('Please provide drink name and valid price.');
        return;
      }

      // Format category tags
      const catWord = category.split(' ')[0] || 'Coffee';
      const tags = [catWord.charAt(0).toUpperCase() + catWord.slice(1), 'Artisan Blend'];

      const newDrink = {
        id: 'drink-' + Date.now(),
        name,
        price,
        category,
        badge: badge || '⭐ New Item',
        badgeClass: badge?.includes('🔥') ? 'bestseller-badge' : 'gold-badge',
        description: description || 'Specialty handcrafted cafe creation prepared by master baristas.',
        image,
        inStock: true,
        rating: '5.0',
        reviewsCount: 1,
        tags
      };

      try {
        const res = await fetch('/api/menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newDrink)
        });

        if (res.ok) {
          const data = await res.json();
          if (data.item && data.item.id) {
            newDrink.id = data.item.id;
          }
        }
      } catch (err) {
        console.warn('API add failed, saving locally:', err);
      }

      if (window.AuraDB) {
        window.AuraDB.insertMenuItem(newDrink).catch(() => {});
      }

      menuList.push(newDrink);
      persistMenu();
      renderMenu();
      addForm.reset();
      closeAddModal();
    });
  }

  // Cross-tab sync
  window.addEventListener('storage', (e) => {
    if (e.key === 'aura_menu') {
      try {
        menuList = JSON.parse(e.newValue || '[]');
        renderMenu();
      } catch (err) {}
    }
  });

  fetchMenu();
}

/* 5. Roastery Operations & Location Specs Manager */
const DEFAULT_SPECS = {
  weekdayHours: 'Monday – Saturday: 11:00 AM – 10:00 PM PKT',
  sundayHours: 'Sunday: Closed (Weekly Roaster Maintenance)',
  address: 'Street 15, Saifabad No. 1, Faisalabad, Punjab, Pakistan',
  hotline: '+92 300 1234567',
  rawPhone: '923001234567',
  email: 'info@auraroasters.com'
};

function initCafeSpecsManager() {
  const modal = document.getElementById('editSpecsModal');
  const openBtn = document.getElementById('openEditSpecsBtn');
  const closeBtn = document.getElementById('closeEditSpecsModalBtn');
  const cancelBtn = document.getElementById('cancelEditSpecsBtn');
  const form = document.getElementById('editSpecsForm');
  const resetBtn = document.getElementById('resetSpecsDefaultBtn');

  const elWeekday = document.getElementById('adminWeekdayHours');
  const elSunday = document.getElementById('adminSundayHours');
  const elAddress = document.getElementById('adminAddressText');
  const elHotline = document.getElementById('adminHotlineText');
  const elEmail = document.getElementById('adminEmailText');

  const inputWeekday = document.getElementById('specWeekdayHours');
  const inputSunday = document.getElementById('specSundayHours');
  const inputAddress = document.getElementById('specAddress');
  const inputHotline = document.getElementById('specHotline');
  const inputRawPhone = document.getElementById('specRawPhone');
  const inputEmail = document.getElementById('specEmail');

  function getSpecs() {
    try {
      const saved = localStorage.getItem('aura_cafe_settings');
      if (saved) return Object.assign({}, DEFAULT_SPECS, JSON.parse(saved));
    } catch (e) {}
    return DEFAULT_SPECS;
  }

  function renderSpecs() {
    const s = getSpecs();
    if (elWeekday) elWeekday.textContent = s.weekdayHours;
    if (elSunday) elSunday.textContent = s.sundayHours;
    if (elAddress) elAddress.textContent = s.address;
    if (elHotline) elHotline.textContent = s.hotline;
    if (elEmail) elEmail.textContent = s.email;
  }

  function populateForm() {
    const s = getSpecs();
    if (inputWeekday) inputWeekday.value = s.weekdayHours;
    if (inputSunday) inputSunday.value = s.sundayHours;
    if (inputAddress) inputAddress.value = s.address;
    if (inputHotline) inputHotline.value = s.hotline;
    if (inputRawPhone) inputRawPhone.value = s.rawPhone;
    if (inputEmail) inputEmail.value = s.email;
  }

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      populateForm();
      modal.showModal();
    });
  }

  function closeModal() {
    if (modal) modal.close();
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset operational details to original defaults?')) {
        localStorage.setItem('aura_cafe_settings', JSON.stringify(DEFAULT_SPECS));
        window.dispatchEvent(new CustomEvent('aura_settings_updated', { detail: DEFAULT_SPECS }));
        renderSpecs();
        populateForm();
        closeModal();
      }
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const updated = {
        weekdayHours: inputWeekday.value.trim() || DEFAULT_SPECS.weekdayHours,
        sundayHours: inputSunday.value.trim() || DEFAULT_SPECS.sundayHours,
        address: inputAddress.value.trim() || DEFAULT_SPECS.address,
        hotline: inputHotline.value.trim() || DEFAULT_SPECS.hotline,
        rawPhone: inputRawPhone.value.trim().replace(/\D/g, '') || DEFAULT_SPECS.rawPhone,
        email: inputEmail.value.trim() || DEFAULT_SPECS.email
      };
      localStorage.setItem('aura_cafe_settings', JSON.stringify(updated));
      if (window.AuraDB) {
        window.AuraDB.saveCafeSettings(updated).catch(() => {});
      }
      window.dispatchEvent(new CustomEvent('aura_settings_updated', { detail: updated }));
      renderSpecs();
      closeModal();
      alert('✓ Cafe operational specs updated and synced to customer website!');
    });
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'aura_cafe_settings') renderSpecs();
  });

  if (window.AuraDB) {
    window.AuraDB.fetchCafeSettings(DEFAULT_SPECS).then(s => {
      if (s) {
        localStorage.setItem('aura_cafe_settings', JSON.stringify(s));
        renderSpecs();
      }
    }).catch(() => {});
  }

  renderSpecs();
}

/* 6. Customer Live Chat & Inquiries Manager */
const DEFAULT_INQUIRIES = [
  {
    id: "inq-101",
    customerName: "Usman Tariq",
    contact: "0300-9876543",
    message: "Do you have fresh Ethiopia Yirgacheffe whole beans in stock today? Looking for 500g pouch.",
    time: "Today, 06:15 PM PKT",
    reply: "Yes Usman! We have freshly roasted batches from this morning. You can pick it up or we can deliver to you."
  },
  {
    id: "inq-102",
    customerName: "Ayesha Bilal",
    contact: "ayesha.b@gmail.com",
    message: "Can I reserve an outdoor table for 4 persons this evening around 8:00 PM?",
    time: "Today, 07:30 PM PKT",
    reply: null
  }
];

function initCustomerInquiriesManager() {
  const container = document.getElementById('inquiriesContainer');
  const refreshBtn = document.getElementById('refreshInquiriesBtn');

  function getInquiries() {
    try {
      const saved = localStorage.getItem('aura_customer_chats');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    localStorage.setItem('aura_customer_chats', JSON.stringify(DEFAULT_INQUIRIES));
    return DEFAULT_INQUIRIES;
  }

  function saveInquiries(list) {
    localStorage.setItem('aura_customer_chats', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('aura_chats_updated', { detail: list }));
  }

  function renderInquiries() {
    if (!container) return;
    const inquiries = getInquiries();
    container.innerHTML = '';

    if (!inquiries || inquiries.length === 0) {
      container.innerHTML = '<p style="color: var(--text-dim); padding: 1.5rem; text-align: center;">No customer inquiries right now. Inquiries from the website chat widget will show here in real-time.</p>';
      return;
    }

    inquiries.forEach((inq, idx) => {
      const card = document.createElement('div');
      card.className = 'inquiry-card';
      const initials = inq.customerName ? inq.customerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CU';

      card.innerHTML = `
        <div class="inquiry-header">
          <div class="inquiry-sender">
            <div class="sender-avatar">${escapeHtml(initials)}</div>
            <div>
              <span class="sender-name">${escapeHtml(inq.customerName || 'Website Visitor')}</span>
              ${inq.contact ? `<span class="sender-contact">📞 ${escapeHtml(inq.contact)}</span>` : ''}
            </div>
          </div>
          <span class="inquiry-time">${escapeHtml(inq.time || 'Recent')}</span>
        </div>
        <div class="inquiry-body">
          "${escapeHtml(inq.message)}"
        </div>
        ${inq.reply ? `
          <div class="inquiry-reply-thread">
            <div class="inquiry-reply-label">✓ Head Barista / Admin Reply:</div>
            <div class="inquiry-reply-text">${escapeHtml(inq.reply)}</div>
          </div>
        ` : ''}
        <div class="inquiry-actions">
          <input type="text" class="inquiry-reply-input" placeholder="${inq.reply ? 'Update reply to customer...' : 'Type reply to customer...'}" data-idx="${idx}" value="${inq.reply ? escapeHtml(inq.reply) : ''}">
          <button class="btn-send-reply" data-idx="${idx}">Send Reply</button>
          ${inq.contact && inq.contact.replace(/\D/g, '').length >= 10 ? `
            <a href="https://wa.me/${inq.contact.replace(/\D/g, '')}?text=${encodeURIComponent('Hello ' + inq.customerName + ', thank you for reaching out to Aura Coffee Roasters!')}" target="_blank" class="btn-whatsapp-chat">
              <span>Chat WhatsApp</span>
            </a>
          ` : ''}
          <button class="btn-dismiss-inquiry" data-idx="${idx}">Dismiss</button>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('.btn-send-reply').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const input = container.querySelector(`.inquiry-reply-input[data-idx="${idx}"]`);
        if (input && input.value.trim()) {
          const list = getInquiries();
          const targetInq = list[idx];
          targetInq.reply = input.value.trim();
          saveInquiries(list);
          if (window.AuraDB && targetInq.id) {
            window.AuraDB.updateInquiryReply(targetInq.id, targetInq.reply).catch(() => {});
          }
          renderInquiries();
        }
      });
    });

    container.querySelectorAll('.btn-dismiss-inquiry').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const list = getInquiries();
        const removed = list.splice(idx, 1);
        saveInquiries(list);
        if (window.AuraDB && removed[0] && removed[0].id) {
          window.AuraDB.deleteInquiry(removed[0].id).catch(() => {});
        }
        renderInquiries();
      });
    });
  }

  if (refreshBtn) refreshBtn.addEventListener('click', renderInquiries);
  window.addEventListener('storage', (e) => {
    if (e.key === 'aura_customer_chats') renderInquiries();
  });
  window.addEventListener('aura_chats_updated', renderInquiries);

  if (window.AuraDB) {
    window.AuraDB.fetchInquiries(DEFAULT_INQUIRIES).then(inqs => {
      if (inqs && inqs.length > 0) {
        localStorage.setItem('aura_customer_chats', JSON.stringify(inqs));
        renderInquiries();
      }
    }).catch(() => {});
  }

  renderInquiries();
}

/* 7. Customer Star Reviews Manager */
const DEFAULT_REVIEWS = [
  {
    id: "rev-1",
    name: "Zainab Khalid",
    tag: "Regular Customer • Faisalabad",
    rating: 5,
    coffee: "Vanilla Latte",
    quote: "The Vanilla Latte here is in a league of its own. Not overly sweet, beautifully textured milk, and the Madagascar vanilla complements the espresso without hiding the roast.",
    date: "Oct 24, 2026"
  },
  {
    id: "rev-2",
    name: "Hamza Malik",
    tag: "Coffee Enthusiast",
    rating: 5,
    coffee: "Caramel Coffee",
    quote: "The Caramel Coffee is absolute perfection. Beautiful layers, deep espresso, and the salted caramel drizzle is rich. Plus, ordering through WhatsApp is lightning quick!",
    date: "Oct 25, 2026"
  },
  {
    id: "rev-3",
    name: "Dr. Asad Raza",
    tag: "Home Brewer",
    rating: 5,
    coffee: "Ethiopia Yirgacheffe Beans",
    quote: "Finally a true third-wave roastery in Saifabad. Bought a bag of the Ethiopia Yirgacheffe for my V60 at home and it brews with unbelievable floral and peach notes.",
    date: "Oct 26, 2026"
  }
];

function initCustomerReviewsManager() {
  const grid = document.getElementById('reviewsAdminGrid');
  const avgRatingEl = document.getElementById('adminAvgRating');
  const totalCountEl = document.getElementById('adminTotalReviewsCount');

  function getReviews() {
    try {
      const saved = localStorage.getItem('aura_customer_reviews');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    localStorage.setItem('aura_customer_reviews', JSON.stringify(DEFAULT_REVIEWS));
    return DEFAULT_REVIEWS;
  }

  function saveReviews(list) {
    localStorage.setItem('aura_customer_reviews', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('aura_reviews_updated', { detail: list }));
  }

  function renderReviews() {
    if (!grid) return;
    const reviews = getReviews();
    grid.innerHTML = '';

    if (!reviews || reviews.length === 0) {
      grid.innerHTML = '<p style="color: var(--text-dim); padding: 1.5rem;">No reviews submitted yet.</p>';
      if (avgRatingEl) avgRatingEl.textContent = '5.0';
      if (totalCountEl) totalCountEl.textContent = '(0 Reviews)';
      return;
    }

    const totalScore = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    const avg = (totalScore / reviews.length).toFixed(1);
    if (avgRatingEl) avgRatingEl.textContent = avg;
    if (totalCountEl) totalCountEl.textContent = `(${reviews.length} Review${reviews.length === 1 ? '' : 's'})`;

    reviews.forEach((r, idx) => {
      const card = document.createElement('div');
      card.className = 'admin-review-card';
      const stars = '★'.repeat(r.rating || 5) + '☆'.repeat(Math.max(0, 5 - (r.rating || 5)));

      card.innerHTML = `
        <div class="review-card-top">
          <div class="review-card-stars">${stars}</div>
          ${r.coffee ? `<span class="review-card-brew">${escapeHtml(r.coffee)}</span>` : ''}
        </div>
        <div class="admin-review-quote">
          "${escapeHtml(r.quote)}"
        </div>
        <div class="admin-review-author">
          <div>
            <div class="review-author-name">${escapeHtml(r.name)}</div>
            <div class="review-author-tag">${escapeHtml(r.tag || 'Verified Customer')} • ${escapeHtml(r.date || 'Recent')}</div>
          </div>
          <button class="btn-delete-review" data-idx="${idx}" title="Delete review">🗑️ Remove</button>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll('.btn-delete-review').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        if (confirm('Delete this customer review?')) {
          const list = getReviews();
          const removed = list.splice(idx, 1);
          saveReviews(list);
          if (window.AuraDB && removed[0] && removed[0].id) {
            window.AuraDB.deleteReview(removed[0].id).catch(() => {});
          }
          renderReviews();
        }
      });
    });
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'aura_customer_reviews') renderReviews();
  });
  window.addEventListener('aura_reviews_updated', renderReviews);

  if (window.AuraDB) {
    window.AuraDB.fetchReviews(DEFAULT_REVIEWS).then(revs => {
      if (revs && revs.length > 0) {
        localStorage.setItem('aura_customer_reviews', JSON.stringify(revs));
        renderReviews();
      }
    }).catch(() => {});
  }

  renderReviews();
}

/* 8. Supabase Database Connection Modal & Status */
function initSupabaseModal() {
  const modal = document.getElementById('supabaseConfigModal');
  const openBtn = document.getElementById('openSupabaseModalBtn');
  const closeBtn = document.getElementById('closeSupabaseModalBtn');
  const cancelBtn = document.getElementById('cancelSupabaseBtn');
  const form = document.getElementById('supabaseConfigForm');
  const urlInput = document.getElementById('inputSupabaseUrl');
  const keyInput = document.getElementById('inputSupabaseKey');
  const testBtn = document.getElementById('btnTestSupabase');
  const testResult = document.getElementById('supabaseTestResult');
  const statusDot = document.getElementById('supabaseStatusDot');
  const statusText = document.getElementById('supabaseStatusText');

  async function updateBadge() {
    if (!window.AuraDB) return;
    const creds = window.AuraDB.getConfig();
    if (!creds.isConfigured) {
      if (statusDot) statusDot.style.background = '#9ca3af';
      if (statusText) statusText.textContent = 'Supabase: Setup';
      return;
    }
    const res = await window.AuraDB.checkConnection();
    if (res.connected) {
      if (statusDot) statusDot.style.background = '#10b981';
      if (statusText) statusText.textContent = 'Supabase: Connected 🟢';
    } else {
      if (statusDot) statusDot.style.background = '#f59e0b';
      if (statusText) statusText.textContent = 'Supabase: Check DB ⚠️';
    }
  }

  function populate() {
    if (!window.AuraDB) return;
    const creds = window.AuraDB.getConfig();
    if (urlInput && creds.url && creds.url !== 'https://YOUR_PROJECT_ID.supabase.co') {
      urlInput.value = creds.url;
    }
    if (keyInput && creds.key && creds.key !== 'YOUR_SUPABASE_ANON_KEY') {
      keyInput.value = creds.key;
    }
    if (testResult) testResult.style.display = 'none';
  }

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      populate();
      modal.showModal();
    });
  }

  function closeModal() {
    if (modal) modal.close();
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      const url = urlInput ? urlInput.value.trim() : '';
      const key = keyInput ? keyInput.value.trim() : '';
      if (!url || !key) {
        if (testResult) {
          testResult.style.display = 'block';
          testResult.style.background = 'rgba(239, 68, 68, 0.15)';
          testResult.style.color = '#f87171';
          testResult.textContent = '⚠️ Please enter both Project URL and Anon/Publishable Key first.';
        }
        return;
      }
      if (window.AuraDB) window.AuraDB.setCredentials(url, key);
      if (testResult) {
        testResult.style.display = 'block';
        testResult.style.background = 'rgba(255, 255, 255, 0.05)';
        testResult.style.color = '#e5e7eb';
        testResult.textContent = '⏳ Testing connection to Supabase database...';
      }
      const res = await window.AuraDB.checkConnection();
      if (res.connected) {
        testResult.style.background = 'rgba(16, 185, 129, 0.15)';
        testResult.style.color = '#10b981';
        testResult.textContent = '✓ Successfully connected to Supabase database tables!';
        updateBadge();
      } else {
        testResult.style.background = 'rgba(239, 68, 68, 0.15)';
        testResult.style.color = '#f87171';
        testResult.textContent = '❌ Connection failed: ' + res.reason + ' (Ensure supabase_schema.sql was run in SQL Editor)';
        updateBadge();
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = urlInput ? urlInput.value.trim() : '';
      const key = keyInput ? keyInput.value.trim() : '';
      if (window.AuraDB) {
        window.AuraDB.setCredentials(url, key);
      }
      closeModal();
      await updateBadge();
      alert('✓ Supabase credentials saved! Syncing data...');
      location.reload();
    });
  }

  updateBadge();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
