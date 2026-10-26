/**
 * AURA COFFEE ROASTERS - ADMIN DASHBOARD JAVASCRIPT
 */

document.addEventListener('DOMContentLoaded', () => {
  initAdminClock();
  initOrdersManager();
  initCafeToggle();
  initMenuManager();
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
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        apiOrders = await res.json();
      }
    } catch (e) {}

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

function escapeHtml(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
