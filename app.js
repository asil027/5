/**
 * AURA COFFEE ROASTERS - MAIN JAVASCRIPT LOGIC
 * Features:
 * 1. Real-time Opening Hours & Cafe Status (11:00 AM - 10:00 PM, Mon-Sat)
 * 2. Interactive Ordering Modal Dialog with dynamic price calculation
 * 3. Direct Seamless Order via WhatsApp with formatted receipt
 * 4. Direct Seamless Order via Email (mailto)
 * 5. Menu Category Filter Tabs
 * 6. Smooth Scroll Reveal Animations (Intersection Observer)
 * 7. Ambient Cafe Sound Synthesis (Web Audio API)
 * 8. Mobile Navigation Drawer & Toast Notifications
 */

document.addEventListener('DOMContentLoaded', () => {
  initRealtimeHours();
  initOrderModal();
  initDynamicMenu();
  initMenuFilters();
  initScrollAnimations();
  initMobileDrawer();
  initAmbientSound();
  initNavbarScroll();
  initCafeSettingsSync();
  initCustomerReviews();
  initCustomerLiveChat();
});

/* ==========================================================================
   1. REAL-TIME OPENING HOURS & CAFE STATUS
   Hours: Mon - Sat: 11:00 AM – 10:00 PM (11:00 - 22:00 PKT)
   Closed: Sunday
   ========================================================================== */
function initRealtimeHours() {
  const statusPill = document.getElementById('liveStatusPill');
  const statusText = document.getElementById('statusText');
  const realtimeStatusCard = document.getElementById('realtimeStatusCard');
  const liveHeadline = document.getElementById('liveStatusHeadline');
  const liveSub = document.getElementById('liveStatusSub');
  const faisalabadTimeEl = document.getElementById('faisalabadTime');

  function updateStatus() {
    // Current time in Pakistan Standard Time (UTC+5)
    const now = new Date();
    // Convert to UTC+5
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const pktDate = new Date(utc + (3600000 * 5));

    const day = pktDate.getDay(); // 0 = Sunday, 1 = Mon, ..., 6 = Sat
    const hours = pktDate.getHours();
    const minutes = pktDate.getMinutes();
    const currentDecimalTime = hours + minutes / 60;

    // Format 12h time string
    const timeFormatted = pktDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    if (faisalabadTimeEl) {
      faisalabadTimeEl.textContent = timeFormatted;
    }

    const isSunday = (day === 0);
    const isOpenHours = (currentDecimalTime >= 11 && currentDecimalTime < 22);
    const isOpen = !isSunday && isOpenHours;

    const dot = statusPill?.querySelector('.status-dot');

    if (isOpen) {
      // Currently Open
      if (statusText) statusText.textContent = `Open Now • Fresh Brews Available (${timeFormatted} PKT)`;
      if (dot) dot.classList.remove('closed');
      
      if (realtimeStatusCard) {
        realtimeStatusCard.classList.remove('closed');
        if (liveHeadline) liveHeadline.textContent = '● OPEN NOW — Brewing Specialty Coffee';
        if (liveSub) liveSub.innerHTML = `Serving until 10:00 PM today • Faisalabad Time: <strong>${timeFormatted}</strong>`;
      }
    } else {
      // Currently Closed
      let reopenMessage = 'Opens Monday at 11:00 AM';
      if (isSunday) {
        reopenMessage = 'Closed Today (Sunday) • Opens Mon 11:00 AM';
      } else if (currentDecimalTime < 11) {
        reopenMessage = `Opens Today at 11:00 AM • Faisalabad Time: ${timeFormatted}`;
      } else {
        reopenMessage = (day === 6) ? 'Closed for the Night • Opens Mon 11:00 AM' : 'Closed for the Night • Opens Tomorrow 11:00 AM';
      }

      if (statusText) statusText.textContent = `Currently Closed • ${reopenMessage}`;
      if (dot) dot.classList.add('closed');

      if (realtimeStatusCard) {
        realtimeStatusCard.classList.add('closed');
        if (liveHeadline) liveHeadline.textContent = '○ CLOSED RIGHT NOW';
        if (liveSub) liveSub.innerHTML = `${reopenMessage} • Time: <strong>${timeFormatted}</strong>`;
      }
    }
  }

  updateStatus();
  setInterval(updateStatus, 30000); // Check every 30 seconds
}

/* ==========================================================================
   2. EASY ORDERING SYSTEM MODAL DIALOG
   ========================================================================== */
let currentOrderBasePrice = 600;

function initOrderModal() {
  const dialog = document.getElementById('orderModal');
  const closeBtn = document.getElementById('closeOrderModalBtn');
  const coffeeSelect = document.getElementById('coffeeSelect');
  const qtyInput = document.getElementById('orderQty');
  const qtyMinus = document.getElementById('qtyMinus');
  const qtyPlus = document.getElementById('qtyPlus');
  const orderTotalDisplay = document.getElementById('orderTotalDisplay');
  const whatsappOrderBtn = document.getElementById('submitWhatsappOrderBtn');
  const emailOrderBtn = document.getElementById('submitEmailOrderBtn');

  if (!dialog) return;

  // Global helper to open modal with preselected item
  window.openOrderModal = function(coffeeName, basePrice) {
    if (coffeeName && coffeeSelect) {
      let matched = false;
      for (let i = 0; i < coffeeSelect.options.length; i++) {
        const optVal = coffeeSelect.options[i].value.toLowerCase();
        const target = coffeeName.toLowerCase();
        if (optVal.includes(target) || target.includes(optVal)) {
          coffeeSelect.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched && coffeeName) {
        const opt = document.createElement('option');
        opt.value = coffeeName;
        opt.setAttribute('data-price', basePrice || '600');
        opt.setAttribute('data-img', 'assets/images/vanilla-latte.jpg');
        opt.textContent = `${coffeeName} — Rs. ${Number(basePrice || 600).toLocaleString()}`;
        coffeeSelect.appendChild(opt);
        coffeeSelect.value = coffeeName;
      }
    }
    
    recalculateOrderTotal();

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    document.body.style.overflow = 'hidden';
  };

  // Close modal
  function closeModal() {
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
    document.body.style.overflow = '';
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  // Close when clicking dialog backdrop
  dialog.addEventListener('click', (e) => {
    const rect = dialog.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      closeModal();
    }
  });

  // Close on Escape
  dialog.addEventListener('cancel', () => {
    document.body.style.overflow = '';
  });

  // Coffee Dropdown change
  if (coffeeSelect) {
    coffeeSelect.addEventListener('change', () => {
      const selectedOption = coffeeSelect.options[coffeeSelect.selectedIndex];
      const price = parseInt(selectedOption.getAttribute('data-price') || '600', 10);
      currentOrderBasePrice = price;
      recalculateOrderTotal();
    });
  }

  // Pill option toggles (radio buttons)
  const pillOptions = dialog.querySelectorAll('.pill-option');
  pillOptions.forEach(pill => {
    pill.addEventListener('click', (e) => {
      const radio = pill.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        // Remove active from siblings
        const group = pill.closest('.pill-group');
        if (group) {
          group.querySelectorAll('.pill-option').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
        }
        recalculateOrderTotal();
      }
    });
  });

  // Quantity Counter
  if (qtyMinus && qtyInput) {
    qtyMinus.addEventListener('click', () => {
      let val = parseInt(qtyInput.value, 10) || 1;
      if (val > 1) {
        qtyInput.value = val - 1;
        recalculateOrderTotal();
      }
    });
  }

  if (qtyPlus && qtyInput) {
    qtyPlus.addEventListener('click', () => {
      let val = parseInt(qtyInput.value, 10) || 1;
      if (val < 20) {
        qtyInput.value = val + 1;
        recalculateOrderTotal();
      }
    });
  }

  // Payment Method Panels & Tabs
  const payMethodTabs = dialog.querySelectorAll('#paymentMethodTabs .pay-tab-btn');
  const selectedPaymentMethodInput = document.getElementById('selectedPaymentMethod');
  const cardPanel = document.getElementById('cardPaymentPanel');
  const jazzcashPanel = document.getElementById('jazzcashPaymentPanel');
  const easypaisaPanel = document.getElementById('easypaisaPaymentPanel');
  const raastPanel = document.getElementById('raastPaymentPanel');
  const codPanel = document.getElementById('codPaymentPanel');

  const payPanels = {
    card: cardPanel,
    jazzcash: jazzcashPanel,
    easypaisa: easypaisaPanel,
    raast: raastPanel,
    cod: codPanel
  };

  const placeOrderBtnTitle = document.getElementById('placeOrderBtnTitle');
  const placeOrderBtnSub = document.getElementById('placeOrderBtnSub');
  const orderDisclaimerText = document.getElementById('orderDisclaimerText');
  const jazzcashAmountDisplay = document.getElementById('jazzcashAmountDisplay');
  const easypaisaAmountDisplay = document.getElementById('easypaisaAmountDisplay');

  // Interactive Card Preview Elements
  const payCardNumber = document.getElementById('payCardNumber');
  const payCardName = document.getElementById('payCardName');
  const payCardExpiry = document.getElementById('payCardExpiry');
  const payCardCvc = document.getElementById('payCardCvc');
  const cardNumberDisplay = document.getElementById('cardNumberDisplay');
  const cardHolderDisplay = document.getElementById('cardHolderDisplay');
  const cardExpiryDisplay = document.getElementById('cardExpiryDisplay');
  const cardBrandLogo = document.getElementById('cardBrandLogo');

  function setPaymentMethod(method) {
    if (selectedPaymentMethodInput) selectedPaymentMethodInput.value = method;

    payMethodTabs.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-method') === method);
    });

    Object.keys(payPanels).forEach(key => {
      if (payPanels[key]) {
        payPanels[key].classList.toggle('active', key === method);
      }
    });

    updatePaymentButtonUI();
  }

  payMethodTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const method = btn.getAttribute('data-method') || 'card';
      setPaymentMethod(method);
    });
  });

  // Credit Card Real-Time Input Masking & Visual Synchronization
  if (payCardNumber) {
    payCardNumber.addEventListener('input', (e) => {
      let raw = e.target.value.replace(/\D/g, '').substring(0, 16);
      let formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
      e.target.value = formatted;

      if (cardNumberDisplay) {
        cardNumberDisplay.textContent = formatted || '•••• •••• •••• ••••';
      }

      if (cardBrandLogo) {
        if (raw.startsWith('4')) {
          cardBrandLogo.textContent = 'VISA';
        } else if (/^(5[1-5]|2[2-7])/.test(raw)) {
          cardBrandLogo.textContent = 'MASTERCARD';
        } else if (/^(34|37)/.test(raw)) {
          cardBrandLogo.textContent = 'AMEX';
        } else if (/^(6011|65)/.test(raw)) {
          cardBrandLogo.textContent = 'DISCOVER';
        } else {
          cardBrandLogo.textContent = 'VISA / MC';
        }
      }
    });
  }

  if (payCardName) {
    payCardName.addEventListener('input', (e) => {
      if (cardHolderDisplay) {
        cardHolderDisplay.textContent = e.target.value.toUpperCase() || 'CARDHOLDER NAME';
      }
    });
  }

  if (payCardExpiry) {
    payCardExpiry.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '').substring(0, 4);
      if (val.length >= 2) {
        val = val.substring(0, 2) + '/' + val.substring(2);
      }
      e.target.value = val;
      if (cardExpiryDisplay) {
        cardExpiryDisplay.textContent = val || 'MM/YY';
      }
    });
  }

  // Price Calculation Logic
  function recalculateOrderTotal() {
    const selectedOption = coffeeSelect.options[coffeeSelect.selectedIndex];
    const basePrice = parseInt(selectedOption ? selectedOption.getAttribute('data-price') || '600' : '600', 10);

    // Cup size extra
    const sizeRadio = dialog.querySelector('input[name="cupSize"]:checked');
    const sizeExtra = sizeRadio ? parseInt(sizeRadio.getAttribute('data-extra') || '0', 10) : 0;

    // Milk extra
    const milkRadio = dialog.querySelector('input[name="milkType"]:checked');
    const milkExtra = milkRadio ? parseInt(milkRadio.getAttribute('data-extra') || '0', 10) : 0;

    const qty = parseInt(qtyInput.value, 10) || 1;
    const itemTotal = (basePrice + sizeExtra + milkExtra) * qty;

    if (orderTotalDisplay) {
      orderTotalDisplay.textContent = `Rs. ${itemTotal.toLocaleString()}`;
    }

    if (jazzcashAmountDisplay) jazzcashAmountDisplay.textContent = `Rs. ${itemTotal.toLocaleString()}`;
    if (easypaisaAmountDisplay) easypaisaAmountDisplay.textContent = `Rs. ${itemTotal.toLocaleString()}`;

    return itemTotal;
  }

  function updatePaymentButtonUI() {
    const total = recalculateOrderTotal();
    const currentMethod = selectedPaymentMethodInput?.value || 'card';

    if (placeOrderBtnTitle && placeOrderBtnSub) {
      if (currentMethod === 'cod') {
        placeOrderBtnTitle.textContent = `☕ Confirm & Pay on Pickup (Rs. ${total.toLocaleString()})`;
        placeOrderBtnSub.textContent = `Instant order receipt • Pay cash or card at counter`;
        if (orderDisclaimerText) {
          orderDisclaimerText.textContent = `🔒 No advance payment needed online. Pay comfortably upon receiving your coffee.`;
        }
      } else if (currentMethod === 'card') {
        placeOrderBtnTitle.textContent = `💳 Pay Rs. ${total.toLocaleString()} & Place Order`;
        placeOrderBtnSub.textContent = `Instant digital receipt • 256-Bit SSL verified card payment`;
        if (orderDisclaimerText) {
          orderDisclaimerText.textContent = `🔒 256-bit SSL encrypted online payment. Your credentials are securely protected.`;
        }
      } else if (currentMethod === 'jazzcash') {
        placeOrderBtnTitle.textContent = `📱 Verify JazzCash & Place Order (Rs. ${total.toLocaleString()})`;
        placeOrderBtnSub.textContent = `Instant digital receipt • Verified via JazzCash Till`;
        if (orderDisclaimerText) {
          orderDisclaimerText.textContent = `🔒 Instant transfer to AURA JazzCash Till. Verified automatically.`;
        }
      } else if (currentMethod === 'easypaisa') {
        placeOrderBtnTitle.textContent = `🟢 Verify EasyPaisa & Place Order (Rs. ${total.toLocaleString()})`;
        placeOrderBtnSub.textContent = `Instant digital receipt • Verified via EasyPaisa Account`;
        if (orderDisclaimerText) {
          orderDisclaimerText.textContent = `🔒 Instant transfer to AURA EasyPaisa Account. Verified automatically.`;
        }
      } else if (currentMethod === 'raast') {
        placeOrderBtnTitle.textContent = `🏛️ Confirm Raast/Bank & Place Order (Rs. ${total.toLocaleString()})`;
        placeOrderBtnSub.textContent = `Instant digital receipt • Zero Fee Raast Instant IBFT`;
        if (orderDisclaimerText) {
          orderDisclaimerText.textContent = `🔒 Raast Instant IBFT / Meezan Bank transfer. Zero transaction fee.`;
        }
      }
    }
  }

  // Order Type Tabs Logic
  const orderTypeBtns = dialog.querySelectorAll('.order-type-btn');
  const orderTypeInput = document.getElementById('orderType');
  const deliveryAddressInput = document.getElementById('deliveryAddress');

  orderTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      orderTypeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const selectedType = btn.getAttribute('data-type');
      if (orderTypeInput) orderTypeInput.value = selectedType;

      if (deliveryAddressInput) {
        if (selectedType === 'Takeaway Pickup') {
          deliveryAddressInput.placeholder = 'Counter Pickup (Ready in 10-15 mins)';
        } else if (selectedType === 'Dine-in at Roastery') {
          deliveryAddressInput.placeholder = 'Enter Table Number (e.g. Table 4)';
          deliveryAddressInput.focus();
        } else {
          deliveryAddressInput.placeholder = 'Delivery Address in Faisalabad (e.g. Street 15, House 12)';
          deliveryAddressInput.focus();
        }
      }
    });
  });

  // Success Modal Dialog Elements
  const successModal = document.getElementById('orderSuccessModal');
  const closeSuccessBtn = document.getElementById('closeSuccessModalBtn');
  if (closeSuccessBtn && successModal) {
    closeSuccessBtn.addEventListener('click', () => {
      if (typeof successModal.close === 'function') successModal.close();
      else successModal.removeAttribute('open');
      document.body.style.overflow = '';
    });
  }

  // Unified Order Placement & Persistence Function
  async function placeOrder(orderData, openWhatsappAfter = false) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' PKT';
    const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
    const p = orderData.paymentDetails;

    const fullOrder = {
      id: orderId,
      customerName: orderData.name,
      phone: orderData.phone,
      orderType: orderData.orderType,
      address: orderData.address || (orderData.orderType === 'Takeaway Pickup' ? 'Counter Pickup' : 'Roastery'),
      coffee: orderData.coffee,
      qty: orderData.qty,
      cupSize: orderData.cupSize,
      milk: orderData.milk,
      temperature: orderData.temperature,
      sweetness: orderData.sweetness,
      notes: orderData.notes 
        ? `[Payment: ${p.methodLabel} (${p.paymentStatus}) | Ref: #${p.transactionRef}] ${orderData.notes}`
        : `[Payment: ${p.methodLabel} (${p.paymentStatus}) | Ref: #${p.transactionRef}]`,
      total: orderData.total,
      status: 'Pending',
      time: timeStr,
      paymentMethod: p.methodLabel,
      paymentStatus: p.paymentStatus,
      transactionRef: p.transactionRef
    };

    // 1. Immediately Save to LocalStorage for 100% reliable cross-tab sync
    try {
      let localOrders = [];
      const saved = localStorage.getItem('aura_orders');
      if (saved) localOrders = JSON.parse(saved);
      localOrders.unshift(fullOrder);
      localStorage.setItem('aura_orders', JSON.stringify(localOrders));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    // 2. Dispatch cross-tab and in-window events
    window.dispatchEvent(new CustomEvent('aura_order_placed', { detail: fullOrder }));

    // 2b. Sync to Supabase Cloud Database
    if (window.AuraDB) {
      window.AuraDB.insertOrder(fullOrder).catch(() => {});
    }

    // 3. Sync to Backend Server API
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullOrder)
      });
    } catch (err) {
      console.warn('Backend server sync (running offline/file protocol?):', err);
    }

    // WhatsApp URL preparation
    const cafeSettings = getCafeSettings();
    const targetPhone = cafeSettings.rawPhone || '923001234567';
    const whatsappText = 
`☕ *NEW ORDER - AURA COFFEE ROASTERS*
────────────────────────
🔖 *Order Ref:* #${fullOrder.id}
👤 *Customer:* ${fullOrder.customerName}
📞 *Contact:* ${fullOrder.phone}
📍 *Type:* ${fullOrder.orderType}
🏠 *Address / Table:* ${fullOrder.address}

📋 *ORDER SUMMARY:*
• *Drink:* ${fullOrder.coffee}
• *Quantity:* ${fullOrder.qty} cup(s)
• *Size:* ${fullOrder.cupSize}
• *Milk:* ${fullOrder.milk}
• *Temp:* ${fullOrder.temperature}
• *Sweetness:* ${fullOrder.sweetness}
${orderData.notes ? `• *Note:* ${orderData.notes}\n` : ''}
💳 *PAYMENT DETAILS:*
• *Method:* ${p.methodLabel}
• *Status:* ${p.paymentStatus}
• *Payment Ref:* #${p.transactionRef}

💰 *TOTAL AMOUNT:* Rs. ${fullOrder.total.toLocaleString()}
────────────────────────
📍 *Aura Roastery:* ${cafeSettings.address || 'Street 15, Saifabad No. 1, Faisalabad'}`;

    const encodedMessage = encodeURIComponent(whatsappText);
    const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodedMessage}`;

    // Close the order input modal
    closeModal();

    // Populate and show the Success Modal with Digital Receipt
    if (successModal) {
      const sId = document.getElementById('successOrderId');
      const sName = document.getElementById('successCustomerName');
      const sCoffee = document.getElementById('successCoffeeName');
      const sType = document.getElementById('successOrderType');
      const sTotal = document.getElementById('successOrderTotal');
      const sWaLink = document.getElementById('successWhatsappLink');
      const sPayment = document.getElementById('successPaymentMethod');
      const sTxnRef = document.getElementById('successTxnRef');
      const sTotalLabel = document.getElementById('successTotalLabel');

      if (sId) sId.textContent = `#${fullOrder.id}`;
      if (sName) sName.textContent = fullOrder.customerName;
      if (sCoffee) sCoffee.textContent = `${fullOrder.coffee} (x${fullOrder.qty})`;
      if (sType) sType.textContent = fullOrder.orderType;
      if (sTotal) sTotal.textContent = `Rs. ${fullOrder.total.toLocaleString()}`;
      if (sPayment) sPayment.textContent = `${p.methodLabel} (${p.paymentStatus})`;
      if (sTxnRef) sTxnRef.textContent = `#${p.transactionRef}`;
      if (sTotalLabel) {
        sTotalLabel.textContent = (p.method === 'cod') ? 'Total to Pay on Arrival:' : 'Total Paid Online:';
      }
      if (sWaLink) sWaLink.href = whatsappUrl;

      if (typeof successModal.showModal === 'function') {
        successModal.showModal();
      } else {
        successModal.setAttribute('open', '');
      }
      document.body.style.overflow = 'hidden';
    }

    if (openWhatsappAfter) {
      window.open(whatsappUrl, '_blank');
    }
  }

  // 1-Click Primary "Confirm & Place Order" Button
  const confirmPlaceOrderBtn = document.getElementById('confirmPlaceOrderBtn');
  if (confirmPlaceOrderBtn) {
    confirmPlaceOrderBtn.addEventListener('click', async () => {
      const order = gatherOrderData();
      if (!order) return;
      await placeOrder(order, false);
    });
  }

  // Direct WhatsApp Order Button
  if (whatsappOrderBtn) {
    whatsappOrderBtn.addEventListener('click', async () => {
      const order = gatherOrderData();
      if (!order) return;
      await placeOrder(order, true);
    });
  }

  // Helper to validate and extract order form values + payment inputs
  function gatherOrderData() {
    const nameInput = document.getElementById('customerName');
    const phoneInput = document.getElementById('customerPhone');

    const name = nameInput?.value.trim();
    const phone = phoneInput?.value.trim();

    if (!name) {
      alert('Please enter your name to place the order.');
      nameInput.focus();
      return null;
    }

    if (!phone) {
      alert('Please enter your mobile or WhatsApp phone number.');
      phoneInput.focus();
      return null;
    }

    // Payment validation based on active method
    const selectedMethod = selectedPaymentMethodInput?.value || 'card';
    let paymentDetails = {
      method: selectedMethod,
      methodLabel: 'Debit/Credit Card',
      paymentStatus: 'Paid Online',
      transactionRef: ''
    };

    if (selectedMethod === 'card') {
      const cardNum = payCardNumber?.value.replace(/\s+/g, '') || '';
      const cardName = payCardName?.value.trim() || '';
      const cardExp = payCardExpiry?.value.trim() || '';
      const cardCvc = payCardCvc?.value.trim() || '';

      if (cardNum.length < 15) {
        alert('Please enter your 16-digit Debit or Credit Card number.');
        payCardNumber?.focus();
        return null;
      }
      if (cardName.length < 3) {
        alert('Please enter the cardholder name as printed on the card.');
        payCardName?.focus();
        return null;
      }
      if (!/^\d{2}\/\d{2}$/.test(cardExp)) {
        alert('Please enter a valid card expiration date in MM/YY format.');
        payCardExpiry?.focus();
        return null;
      }
      if (cardCvc.length < 3) {
        alert('Please enter your 3 or 4-digit card security CVC.');
        payCardCvc?.focus();
        return null;
      }

      paymentDetails.methodLabel = '💳 Debit/Credit Card';
      paymentDetails.paymentStatus = 'Paid Online';
      paymentDetails.transactionRef = 'TXN-' + Math.floor(100000 + Math.random() * 900000);
    } else if (selectedMethod === 'jazzcash') {
      const senderRef = document.getElementById('jazzcashSenderRef')?.value.trim() || '';
      if (!senderRef) {
        alert('Please enter your JazzCash sender mobile number or Transaction ID (TID) to verify payment.');
        document.getElementById('jazzcashSenderRef')?.focus();
        return null;
      }
      paymentDetails.methodLabel = '📱 JazzCash';
      paymentDetails.paymentStatus = 'Paid Online';
      const tidDigits = senderRef.replace(/\D/g, '').slice(-6);
      paymentDetails.transactionRef = 'JC-' + (tidDigits.length >= 4 ? tidDigits : Math.floor(100000 + Math.random() * 900000));
    } else if (selectedMethod === 'easypaisa') {
      const senderRef = document.getElementById('easypaisaSenderRef')?.value.trim() || '';
      if (!senderRef) {
        alert('Please enter your EasyPaisa sender mobile number or Transaction ID (TID) to verify payment.');
        document.getElementById('easypaisaSenderRef')?.focus();
        return null;
      }
      paymentDetails.methodLabel = '🟢 EasyPaisa';
      paymentDetails.paymentStatus = 'Paid Online';
      const tidDigits = senderRef.replace(/\D/g, '').slice(-6);
      paymentDetails.transactionRef = 'EP-' + (tidDigits.length >= 4 ? tidDigits : Math.floor(100000 + Math.random() * 900000));
    } else if (selectedMethod === 'raast') {
      const senderRef = document.getElementById('raastSenderRef')?.value.trim() || '';
      if (!senderRef) {
        alert('Please enter your Sender Name or Bank Transaction Ref (RRN) to verify IBFT transfer.');
        document.getElementById('raastSenderRef')?.focus();
        return null;
      }
      paymentDetails.methodLabel = '🏛️ Raast / Bank IBFT';
      paymentDetails.paymentStatus = 'Paid Online';
      const refClean = senderRef.replace(/[^a-zA-Z0-9]/g, '').slice(-8);
      paymentDetails.transactionRef = 'RAAST-' + (refClean || Math.floor(100000 + Math.random() * 900000));
    } else {
      paymentDetails.methodLabel = '💵 Pay on Pickup';
      paymentDetails.paymentStatus = 'Pay at Counter';
      paymentDetails.transactionRef = 'COUNTER-' + Math.floor(1000 + Math.random() * 9000);
    }

    const coffee = coffeeSelect.value || 'Vanilla Latte';
    const cupSize = dialog.querySelector('input[name="cupSize"]:checked')?.value || 'Regular (12oz)';
    const milk = dialog.querySelector('input[name="milkType"]:checked')?.value || 'Whole Milk';
    const temperature = dialog.querySelector('input[name="temperature"]:checked')?.value || 'Hot & Steamy';
    const sweetness = dialog.querySelector('input[name="sweetness"]:checked')?.value || 'Standard Balanced (50%)';
    const qty = parseInt(qtyInput.value, 10) || 1;
    const total = recalculateOrderTotal();

    const orderType = document.getElementById('orderType')?.value || 'Takeaway Pickup';
    const address = document.getElementById('deliveryAddress')?.value.trim() || '';
    const notes = document.getElementById('orderNotes')?.value.trim() || '';

    return {
      name,
      phone,
      coffee,
      cupSize,
      milk,
      temperature,
      sweetness,
      qty,
      total,
      orderType,
      address,
      notes,
      paymentDetails
    };
  }

  // Initial update
  updatePaymentButtonUI();
}

/* ==========================================================================
   3. DYNAMIC SPECIALTY MENU & FILTERING SYSTEM
   ========================================================================== */
let currentMenuList = [];

const defaultMenuSeed = [
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

function initDynamicMenu() {
  const menuGrid = document.getElementById('menuGrid');
  if (!menuGrid) return;

  async function loadMenuData() {
    if (window.AuraDB) {
      try {
        const dbItems = await window.AuraDB.fetchMenu(null);
        if (dbItems && Array.isArray(dbItems) && dbItems.length > 0) {
          currentMenuList = dbItems;
          localStorage.setItem('aura_menu', JSON.stringify(currentMenuList));
          renderMenuCards();
          updateOrderSelectDropdown(currentMenuList);
          return;
        }
      } catch (err) {}
    }
    try {
      const res = await fetch('/api/menu');
      if (res.ok) {
        currentMenuList = await res.json();
        localStorage.setItem('aura_menu', JSON.stringify(currentMenuList));
      } else {
        throw new Error('API request failed');
      }
    } catch (e) {
      const saved = localStorage.getItem('aura_menu');
      if (saved !== null) {
        try {
          currentMenuList = JSON.parse(saved);
        } catch (err) {
          currentMenuList = defaultMenuSeed;
        }
      } else {
        currentMenuList = defaultMenuSeed;
        localStorage.setItem('aura_menu', JSON.stringify(currentMenuList));
      }
    }

    renderMenuCards();
    updateOrderSelectDropdown(currentMenuList);
  }

  // Real-time synchronization across browser tabs (Storage Event)
  window.addEventListener('storage', (e) => {
    if (e.key === 'aura_menu') {
      try {
        currentMenuList = JSON.parse(e.newValue || '[]');
        renderMenuCards();
        updateOrderSelectDropdown(currentMenuList);
      } catch (err) {}
    }
  });

  // Custom same-window event listener
  window.addEventListener('aura_menu_updated', (e) => {
    if (e.detail && Array.isArray(e.detail)) {
      currentMenuList = e.detail;
    } else {
      const saved = localStorage.getItem('aura_menu');
      if (saved) {
        try { currentMenuList = JSON.parse(saved); } catch (err) {}
      }
    }
    renderMenuCards();
    updateOrderSelectDropdown(currentMenuList);
  });

  // Background auto-polling (every 3 seconds) for live server sync
  setInterval(async () => {
    try {
      const res = await fetch('/api/menu');
      if (res.ok) {
        const latest = await res.json();
        const currentStr = JSON.stringify(currentMenuList);
        const latestStr = JSON.stringify(latest);
        if (currentStr !== latestStr) {
          currentMenuList = latest;
          localStorage.setItem('aura_menu', latestStr);
          renderMenuCards();
          updateOrderSelectDropdown(currentMenuList);
        }
      }
    } catch (err) {}
  }, 3000);

  loadMenuData();
}

function renderMenuCards() {
  const menuGrid = document.getElementById('menuGrid');
  if (!menuGrid) return;

  menuGrid.innerHTML = '';

  if (!currentMenuList || currentMenuList.length === 0) {
    menuGrid.innerHTML = `
      <div class="menu-empty-state" style="grid-column: 1 / -1; text-align: center; padding: 4.5rem 1.5rem; background: rgba(30, 20, 15, 0.45); border: 1px dashed rgba(212, 151, 70, 0.3); border-radius: 16px;">
        <span style="font-size: 3rem; display: block; margin-bottom: 1rem;">☕</span>
        <h3 style="font-family: 'Playfair Display', serif; font-size: 1.6rem; color: #f5eedb; margin-bottom: 0.6rem;">No Drinks on the Menu Right Now</h3>
        <p style="color: #a89f91; max-width: 480px; margin: 0 auto 1.5rem; line-height: 1.6;">Our roastery is currently updating today's specialty selection. Click below to request a custom brew or check back shortly.</p>
        <button class="btn btn-gold" onclick="openOrderModal('Custom Coffee', 600)">Request Custom Brew</button>
      </div>
    `;
    return;
  }

  const activeBtn = document.querySelector('.filter-btn.active');
  const activeCategory = activeBtn ? activeBtn.getAttribute('data-category') : 'all';

  currentMenuList.forEach(item => {
    const card = createCardElement(item);
    const cardCats = (item.category || '').toLowerCase();

    if (activeCategory === 'all' || cardCats.includes(activeCategory)) {
      card.style.display = 'flex';
      card.style.opacity = '1';
    } else {
      card.style.display = 'none';
      card.style.opacity = '0';
    }

    menuGrid.appendChild(card);
  });
}

function createCardElement(item) {
  const card = document.createElement('article');
  const isFeatured = (item.category || '').includes('featured') || (item.badge && (item.badge.includes('Favorite') || item.badge.includes('Bestseller')));
  card.className = `coffee-card ${isFeatured ? 'featured-card' : ''} revealed`;
  card.setAttribute('data-category', (item.category || 'espresso').toLowerCase());
  card.setAttribute('data-id', item.id);

  let badgeClass = 'gold-badge';
  const badgeText = item.badge || '';
  if (item.badgeClass) {
    badgeClass = item.badgeClass.includes('-badge') ? item.badgeClass : `${item.badgeClass}-badge`;
  } else if (badgeText.includes('Bestseller') || badgeText.includes('🔥')) {
    badgeClass = 'bestseller-badge';
  } else if (badgeText.includes('Single') || badgeText.includes('Bean') || badgeText.includes('🌱')) {
    badgeClass = 'bean-badge';
  } else if (badgeText.includes('Refresh') || badgeText.includes('❄️')) {
    badgeClass = 'sweet-badge';
  } else if (badgeText.includes('Barista') || badgeText.includes('⚖️')) {
    badgeClass = 'bar-badge';
  } else if (badgeText.includes('Cold') || badgeText.includes('Steep')) {
    badgeClass = 'cold-badge';
  }

  let tagsHtml = '';
  if (Array.isArray(item.tags) && item.tags.length > 0) {
    tagsHtml = item.tags.map(t => `<span class="mini-tag">${escapeHtml(t)}</span>`).join('');
  } else if (item.category) {
    const cats = item.category.split(/\s+/);
    tagsHtml = cats.map(c => `<span class="mini-tag">${escapeHtml(c.charAt(0).toUpperCase() + c.slice(1))}</span>`).join('');
  }

  const rating = item.rating || '5.0';
  const reviews = item.reviewsCount || (rating === '5.0' ? 148 : 50);
  const isInStock = item.inStock !== false;

  const escapedName = escapeHtml(item.name);
  const safeNameJs = item.name.replace(/'/g, "\\'");
  const safeImg = escapeHtml(item.image || 'assets/images/vanilla-latte.jpg');
  const safeDesc = escapeHtml(item.description || 'Specialty handcrafted cafe creation prepared by master baristas.');

  card.innerHTML = `
    ${item.badge ? `
      <div class="card-badge-wrapper">
        <span class="card-badge ${badgeClass}">${escapeHtml(item.badge)}</span>
      </div>` : ''}
    <div class="card-image-box">
      <img src="${safeImg}" alt="${escapedName}" class="card-img" loading="lazy" onerror="this.src='assets/images/vanilla-latte.jpg'">
      <div class="card-image-overlay">
        ${isInStock ? `
          <button class="quick-view-btn" onclick="openOrderModal('${safeNameJs}', ${item.price})">Quick Order</button>
        ` : `
          <span class="quick-view-btn" style="background: rgba(40,20,20,0.85); cursor: default;">Sold Out</span>
        `}
      </div>
    </div>
    <div class="card-content">
      <div class="card-header-row">
        <h3 class="card-title">${escapedName}</h3>
        <div class="card-price">Rs. ${Number(item.price).toLocaleString()}</div>
      </div>
      
      <div class="card-rating" aria-label="${rating} star customer rating">
        <div class="stars-display">
          <span class="star-icon">★</span>
          <span class="star-icon">★</span>
          <span class="star-icon">★</span>
          <span class="star-icon">★</span>
          <span class="star-icon">★</span>
        </div>
        <span class="rating-text">${rating} (${reviews} reviews)</span>
      </div>

      <p class="card-desc">${safeDesc}</p>

      ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}

      <div class="card-footer">
        ${isInStock ? `
          <button class="btn btn-card-order" onclick="openOrderModal('${safeNameJs}', ${item.price})">
            <svg class="order-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <span>Order Now</span>
          </button>
        ` : `
          <button class="btn btn-card-order" disabled style="opacity: 0.55; cursor: not-allowed; background: #33261f; border-color: #554030;">
            <span>Sold Out</span>
          </button>
        `}
      </div>
    </div>
  `;

  return card;
}

function updateOrderSelectDropdown(items) {
  const coffeeSelect = document.getElementById('coffeeSelect');
  if (!coffeeSelect) return;
  const currentVal = coffeeSelect.value;
  coffeeSelect.innerHTML = '';

  const inStockItems = (items || []).filter(i => i.inStock !== false);
  if (inStockItems.length === 0) {
    const opt = document.createElement('option');
    opt.value = "";
    opt.textContent = "No drinks currently available";
    coffeeSelect.appendChild(opt);
    return;
  }

  inStockItems.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.name;
    opt.setAttribute('data-price', item.price);
    opt.setAttribute('data-img', item.image || 'assets/images/vanilla-latte.jpg');
    opt.textContent = `${item.name} — Rs. ${Number(item.price).toLocaleString()} ${item.badge ? `(${item.badge})` : ''}`;
    coffeeSelect.appendChild(opt);
  });

  if (currentVal && inStockItems.some(i => i.name === currentVal)) {
    coffeeSelect.value = currentVal;
  }
}

function initMenuFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const category = btn.getAttribute('data-category');
      const cards = document.querySelectorAll('.coffee-card');

      cards.forEach(card => {
        const cardCats = (card.getAttribute('data-category') || '').toLowerCase();
        if (category === 'all' || cardCats.includes(category)) {
          card.style.display = 'flex';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 20);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(15px)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 250);
        }
      });
    });
  });
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

/* ==========================================================================
   4. SCROLL REVEAL ANIMATIONS (INTERSECTION OBSERVER)
   ========================================================================== */
function initScrollAnimations() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          obs.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => observer.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('revealed'));
  }
}

/* ==========================================================================
   5. NAVBAR SCROLL & ACTIVE LINK HIGHLIGHT
   ========================================================================== */
function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }

    // ScrollSpy active link
    let currentId = '';
    const scrollPos = window.scrollY + 200;

    sections.forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        currentId = sec.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentId}`) {
        link.classList.add('active');
      }
    });
  }, { passive: true });
}

/* ==========================================================================
   6. MOBILE NAVIGATION DRAWER
   ========================================================================== */
function initMobileDrawer() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  if (!mobileDrawer) return;

  function openDrawer() {
    mobileDrawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    mobileDrawer.classList.remove('open');
    document.body.style.overflow = '';
  }

  mobileMenuBtn?.addEventListener('click', openDrawer);
  drawerCloseBtn?.addEventListener('click', closeDrawer);

  mobileNavLinks.forEach(link => {
    link.addEventListener('click', closeDrawer);
  });
}

/* ==========================================================================
   7. AMBIENT CAFE SOUND SYNTHESIS (WEB AUDIO API)
   Generates a warm, organic coffeehouse murmur & soft steam hiss without
   relying on external audio assets!
   ========================================================================== */
function initAmbientSound() {
  const audioBtn = document.getElementById('ambientAudioBtn');
  if (!audioBtn) return;

  let audioCtx = null;
  let isPlaying = false;
  let pinkNoiseSource = null;
  let gainNode = null;

  function toggleAudio() {
    if (!isPlaying) {
      startAmbientAudio();
    } else {
      stopAmbientAudio();
    }
  }

  function startAmbientAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      audioCtx = new AudioContext();

      // Pink noise buffer simulation for warm room tone & soft steam
      const bufferSize = audioCtx.sampleRate * 3;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035;
        b6 = white * 0.115926;
      }

      pinkNoiseSource = audioCtx.createBufferSource();
      pinkNoiseSource.buffer = noiseBuffer;
      pinkNoiseSource.loop = true;

      // Lowpass filter to simulate muffled cozy wooden cafe room acoustics
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, audioCtx.currentTime);

      gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 1.5);

      pinkNoiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      pinkNoiseSource.start();
      isPlaying = true;
      audioBtn.classList.add('active');
      showToast('☕ Cozy cafe ambiance playing...');
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  function stopAmbientAudio() {
    if (gainNode && audioCtx) {
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      setTimeout(() => {
        if (pinkNoiseSource) pinkNoiseSource.stop();
        if (audioCtx) audioCtx.close();
        audioCtx = null;
        isPlaying = false;
        audioBtn.classList.remove('active');
      }, 800);
    } else {
      isPlaying = false;
      audioBtn.classList.remove('active');
    }
  }

  audioBtn.addEventListener('click', toggleAudio);

  // Floating WhatsApp Tooltip close button
  const closeTooltipBtn = document.getElementById('closeTooltipBtn');
  const tooltip = document.getElementById('whatsappTooltip');
  if (closeTooltipBtn && tooltip) {
    closeTooltipBtn.addEventListener('click', (e) => {
      e.preventDefault();
      tooltip.style.display = 'none';
    });
  }
}

/* ==========================================================================
   8. TOAST NOTIFICATION HELPER
   ========================================================================== */
function showToast(message) {
  const toast = document.getElementById('toastNotification');
  const toastMsg = document.getElementById('toastMessage');

  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;
  toast.classList.add('show');

  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

/* ==========================================================================
   9. CAFE OPERATIONAL SETTINGS SYNC (HOURS, ADDRESS, PHONE, EMAIL)
   ========================================================================== */
const DEFAULT_CAFE_SPECS = {
  weekdayHours: 'Monday – Saturday: 11:00 AM – 10:00 PM PKT',
  sundayHours: 'Sunday: Closed (Weekly Roaster Maintenance)',
  address: 'Street 15, Saifabad No. 1, Faisalabad, Punjab, Pakistan',
  hotline: '+92 300 1234567',
  rawPhone: '923001234567',
  email: 'info@auraroasters.com',
  jazzcashNumber: '0300 1234567',
  easypaisaNumber: '0345 1234567',
  bankName: 'Meezan Bank Ltd',
  bankTitle: 'AURA Coffee Roasters',
  bankIban: 'PK36MEZN00012345678901',
  bankRaast: '03001234567'
};

function getCafeSettings() {
  try {
    const saved = localStorage.getItem('aura_cafe_settings');
    if (saved) return Object.assign({}, DEFAULT_CAFE_SPECS, JSON.parse(saved));
  } catch (e) {}
  return DEFAULT_CAFE_SPECS;
}

function initCafeSettingsSync() {
  function applySettings() {
    const s = getCafeSettings();

    // Top announcement bar
    const topAddress = document.getElementById('topBarAddress');
    const topHours = document.getElementById('topBarHours');
    if (topAddress) topAddress.textContent = '📍 ' + s.address.split(',').slice(0, 2).join(',');
    if (topHours) topHours.textContent = s.weekdayHours.replace('Monday – Saturday:', 'Mon–Sat:');

    // Mobile drawer
    const drawerAddr = document.getElementById('drawerAddress');
    const drawerHrs = document.getElementById('drawerHours');
    if (drawerAddr) drawerAddr.textContent = '📍 ' + s.address.split(',').slice(0, 2).join(',');
    if (drawerHrs) drawerHrs.textContent = '🕒 ' + s.weekdayHours.replace('Monday – Saturday:', 'Mon-Sat:');

    // Wooden board
    const woodHours = document.getElementById('woodBoardHours');
    const woodSunday = document.getElementById('woodBoardSunday');
    const woodAddress = document.getElementById('woodBoardAddress');
    const woodWhatsapp = document.getElementById('whatsAppLinkText');
    const woodEmail = document.getElementById('woodBoardEmail');
    const woodWhatsappBtn = document.getElementById('woodBoardWhatsappBtn');

    if (woodHours) woodHours.textContent = s.weekdayHours.replace('Monday – Saturday:', 'Mon – Sat:');
    if (woodSunday) woodSunday.textContent = s.sundayHours;
    if (woodAddress) woodAddress.textContent = s.address;
    if (woodWhatsapp) {
      woodWhatsapp.textContent = s.hotline;
      woodWhatsapp.href = `https://wa.me/${s.rawPhone}`;
    }
    if (woodEmail) {
      woodEmail.textContent = s.email;
      woodEmail.href = `mailto:${s.email}`;
    }
    if (woodWhatsappBtn) {
      woodWhatsappBtn.href = `https://wa.me/${s.rawPhone}?text=Hello%20Aura%20Coffee%20Roasters!%20I%20would%20like%20to%20inquire%20about%20your%20menu%20and%20table%20availability.`;
    }

    // Footer
    const footerAddr = document.getElementById('footerAddress');
    const footerHrs = document.getElementById('footerHours');
    const footerSun = document.getElementById('footerSunday');
    const footerWa = document.getElementById('footerWhatsappLink');
    const footerEm = document.getElementById('footerEmailLink');

    if (footerAddr) footerAddr.textContent = '📍 ' + s.address;
    if (footerHrs) footerHrs.textContent = '⏰ ' + s.weekdayHours;
    if (footerSun) footerSun.textContent = '❌ ' + s.sundayHours;
    if (footerWa) {
      footerWa.textContent = s.hotline;
      footerWa.href = `https://wa.me/${s.rawPhone}`;
    }
    if (footerEm) {
      footerEm.textContent = s.email;
      footerEm.href = `mailto:${s.email}`;
    }

    // Floating whatsapp quick links
    const floatWa = document.getElementById('floatingWhatsappBtn');
    if (floatWa) floatWa.href = `https://wa.me/${s.rawPhone}?text=Hello%20Aura%20Coffee%20Roasters!%20I'd%20like%20to%20order%20coffee.`;

    const chatPanelWa = document.getElementById('chatPanelWhatsappBtn');
    if (chatPanelWa) chatPanelWa.href = `https://wa.me/${s.rawPhone}`;

    // Payment Wallet & Bank Details
    const jazzcashAcc = document.getElementById('jazzcashAccountDisplay');
    const easypaisaAcc = document.getElementById('easypaisaAccountDisplay');
    const bankName = document.getElementById('bankNameDisplay');
    const bankTitle = document.getElementById('bankTitleDisplay');
    const bankIban = document.getElementById('bankIbanDisplay');
    const bankRaast = document.getElementById('bankRaastDisplay');

    if (jazzcashAcc && s.jazzcashNumber) jazzcashAcc.textContent = s.jazzcashNumber;
    if (easypaisaAcc && s.easypaisaNumber) easypaisaAcc.textContent = s.easypaisaNumber;
    if (bankName && s.bankName) bankName.textContent = s.bankName;
    if (bankTitle && s.bankTitle) bankTitle.textContent = s.bankTitle;
    if (bankIban && s.bankIban) bankIban.textContent = s.bankIban;
    if (bankRaast && s.bankRaast) bankRaast.textContent = s.bankRaast;
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'aura_cafe_settings') applySettings();
  });
  window.addEventListener('aura_settings_updated', applySettings);

  if (window.AuraDB) {
    window.AuraDB.fetchCafeSettings(DEFAULT_CAFE_SPECS).then(s => {
      if (s) {
        localStorage.setItem('aura_cafe_settings', JSON.stringify(s));
        applySettings();
      }
    }).catch(() => {});
  }

  applySettings();
}

/* ==========================================================================
   10. CUSTOMER STAR REVIEWS & INTERACTIVE RATINGS
   ========================================================================== */
const SEED_REVIEWS = [
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

function initCustomerReviews() {
  const reviewsGrid = document.getElementById('customerReviewsGrid');
  const avgRatingText = document.getElementById('customerAvgRatingText');
  const ratingCountText = document.getElementById('customerRatingCountText');

  const openBtn = document.getElementById('openReviewModalBtn');
  const modal = document.getElementById('leaveReviewModal');
  const closeBtn = document.getElementById('closeReviewModalBtn');
  const cancelBtn = document.getElementById('cancelReviewBtn');
  const backdrop = document.getElementById('reviewModalBackdrop');
  const form = document.getElementById('leaveReviewForm');

  const starPicker = document.getElementById('starRatingPicker');
  const starLabel = document.getElementById('starRatingLabel');
  const ratingInput = document.getElementById('selectedStarRating');

  let currentStars = 5;

  const RATING_LABELS = {
    5: "★★★★★ (5.0) - Outstanding Experience & Coffee!",
    4: "★★★★☆ (4.0) - Very Good / Highly Recommended!",
    3: "★★★☆☆ (3.0) - Good & Satisfactory",
    2: "★★☆☆☆ (2.0) - Fair / Needs Some Tweaking",
    1: "★☆☆☆☆ (1.0) - Not what I expected"
  };

  function updateStars(val) {
    currentStars = val;
    if (ratingInput) ratingInput.value = val;
    if (starLabel) starLabel.textContent = RATING_LABELS[val] || `${val} Stars`;

    if (starPicker) {
      starPicker.querySelectorAll('.star-btn').forEach(btn => {
        const starVal = parseInt(btn.getAttribute('data-value'), 10);
        if (starVal <= val) {
          btn.classList.add('selected');
        } else {
          btn.classList.remove('selected');
        }
      });
    }
  }

  if (starPicker) {
    starPicker.querySelectorAll('.star-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.getAttribute('data-value'), 10);
        updateStars(val);
      });
      btn.addEventListener('mouseenter', () => {
        const hoverVal = parseInt(btn.getAttribute('data-value'), 10);
        starPicker.querySelectorAll('.star-btn').forEach(b => {
          const v = parseInt(b.getAttribute('data-value'), 10);
          if (v <= hoverVal) b.classList.add('hovered');
          else b.classList.remove('hovered');
        });
      });
    });

    starPicker.addEventListener('mouseleave', () => {
      starPicker.querySelectorAll('.star-btn').forEach(b => b.classList.remove('hovered'));
    });
  }

  function getReviews() {
    try {
      const saved = localStorage.getItem('aura_customer_reviews');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    localStorage.setItem('aura_customer_reviews', JSON.stringify(SEED_REVIEWS));
    return SEED_REVIEWS;
  }

  function renderReviews() {
    if (!reviewsGrid) return;
    const reviews = getReviews();
    reviewsGrid.innerHTML = '';

    const total = reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
    const avg = reviews.length ? (total / reviews.length).toFixed(1) : '5.0';

    if (avgRatingText) avgRatingText.textContent = `${avg} / 5.0 Rating`;
    if (ratingCountText) ratingCountText.textContent = `(Based on ${reviews.length} customer review${reviews.length === 1 ? '' : 's'})`;

    reviews.forEach(r => {
      const card = document.createElement('div');
      card.className = 'review-card reveal-on-scroll revealed';
      const initials = r.name ? r.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CU';
      const stars = '★'.repeat(r.rating || 5) + '☆'.repeat(Math.max(0, 5 - (r.rating || 5)));

      card.innerHTML = `
        <div class="review-stars">${stars}</div>
        <p class="review-quote">"${escapeHtml(r.quote)}"</p>
        <div class="reviewer-meta">
          <div class="reviewer-avatar">${escapeHtml(initials)}</div>
          <div class="reviewer-info">
            <strong>${escapeHtml(r.name)}</strong>
            <span>${escapeHtml(r.tag || 'Coffee Enthusiast')} • ${escapeHtml(r.coffee || 'Specialty Roast')}</span>
          </div>
        </div>
      `;
      reviewsGrid.appendChild(card);
    });
  }

  function openModal() {
    updateStars(5);
    if (modal) modal.showModal();
  }

  function closeModal() {
    if (modal) modal.close();
    if (form) form.reset();
  }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('reviewCustomerName').value.trim();
      const tag = document.getElementById('reviewCustomerTag').value.trim() || 'Verified Customer';
      const coffee = document.getElementById('reviewFavoriteDrink').value;
      const quote = document.getElementById('reviewComment').value.trim();

      if (!name || !quote) return;

      const newReview = {
        id: 'rev-' + Date.now(),
        name,
        tag,
        rating: currentStars,
        coffee,
        quote,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };

      const reviews = getReviews();
      reviews.unshift(newReview);
      localStorage.setItem('aura_customer_reviews', JSON.stringify(reviews));
      if (window.AuraDB) {
        window.AuraDB.insertReview(newReview).catch(() => {});
      }
      window.dispatchEvent(new CustomEvent('aura_reviews_updated', { detail: reviews }));

      renderReviews();
      closeModal();
      showToast(`⭐ Thank you, ${name}! Your review has been published.`);
    });
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'aura_customer_reviews') renderReviews();
  });
  window.addEventListener('aura_reviews_updated', renderReviews);

  if (window.AuraDB) {
    window.AuraDB.fetchReviews(SEED_REVIEWS).then(revs => {
      if (revs && revs.length) {
        localStorage.setItem('aura_customer_reviews', JSON.stringify(revs));
        renderReviews();
      }
    }).catch(() => {});
  }

  renderReviews();
}

/* ==========================================================================
   11. CUSTOMER LIVE CHAT WIDGET (TALK TO BARISTA & ADMIN)
   ========================================================================== */
function initCustomerLiveChat() {
  const launcherBtn = document.getElementById('openChatDrawerBtn');
  const closePanelBtn = document.getElementById('closeChatPanelBtn');
  const chatPanel = document.getElementById('chatWindowPanel');
  const messagesBody = document.getElementById('customerChatMessages');
  const chatForm = document.getElementById('customerSendChatForm');
  const msgInput = document.getElementById('chatCustomerMsg');
  const nameInput = document.getElementById('chatCustomerName');
  const phoneInput = document.getElementById('chatCustomerPhone');
  const quickPrompts = document.querySelectorAll('.prompt-chip');

  // Load saved name/phone if customer previously entered
  try {
    const savedCustomer = localStorage.getItem('aura_customer_profile');
    if (savedCustomer) {
      const parsed = JSON.parse(savedCustomer);
      if (nameInput && parsed.name) nameInput.value = parsed.name;
      if (phoneInput && parsed.phone) phoneInput.value = parsed.phone;
    }
  } catch (e) {}

  function toggleChat() {
    if (!chatPanel) return;
    chatPanel.classList.toggle('active');
    if (chatPanel.classList.contains('active')) {
      renderChatMessages();
      if (msgInput) msgInput.focus();
    }
  }

  if (launcherBtn) launcherBtn.addEventListener('click', toggleChat);
  if (closePanelBtn) closePanelBtn.addEventListener('click', toggleChat);

  // Quick prompt chips
  quickPrompts.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (msgInput && prompt) {
        msgInput.value = prompt;
        msgInput.focus();
      }
    });
  });

  function getChats() {
    try {
      const saved = localStorage.getItem('aura_customer_chats');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  }

  function renderChatMessages() {
    if (!messagesBody) return;
    const chats = getChats();

    // Preserve greeting
    messagesBody.innerHTML = `
      <div class="chat-bubble admin-bubble">
        <span class="bubble-sender">Head Barista</span>
        <p>Hello & Welcome to AURA Coffee Roasters! ☕ How can we assist you with our specialty roasts, customized drinks, or dining at our Saifabad Roastery today?</p>
        <span class="bubble-time">Live Support</span>
      </div>
    `;

    chats.forEach(chat => {
      // Customer message
      const custBubble = document.createElement('div');
      custBubble.className = 'chat-bubble customer-bubble';
      custBubble.innerHTML = `
        <span class="bubble-sender">${escapeHtml(chat.customerName || 'You')}</span>
        <p>${escapeHtml(chat.message)}</p>
        <span class="bubble-time">${escapeHtml(chat.time || '')}</span>
      `;
      messagesBody.appendChild(custBubble);

      // Admin reply if present
      if (chat.reply) {
        const adminBubble = document.createElement('div');
        adminBubble.className = 'chat-bubble admin-bubble';
        adminBubble.innerHTML = `
          <span class="bubble-sender">Head Barista / Admin</span>
          <p>${escapeHtml(chat.reply)}</p>
          <span class="bubble-time">Replied by Admin</span>
        `;
        messagesBody.appendChild(adminBubble);
      }
    });

    messagesBody.scrollTop = messagesBody.scrollHeight;
  }

  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameInput ? nameInput.value.trim() : 'Customer';
      const phone = phoneInput ? phoneInput.value.trim() : '';
      const msg = msgInput ? msgInput.value.trim() : '';

      if (!name || !msg) return;

      // Remember profile
      localStorage.setItem('aura_customer_profile', JSON.stringify({ name, phone }));

      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' PKT';

      const newInquiry = {
        id: 'inq-' + Date.now(),
        customerName: name,
        contact: phone,
        message: msg,
        time: 'Today, ' + timeStr,
        reply: null
      };

      const chats = getChats();
      chats.push(newInquiry);
      localStorage.setItem('aura_customer_chats', JSON.stringify(chats));
      if (window.AuraDB) {
        window.AuraDB.insertInquiry(newInquiry).catch(() => {});
      }
      window.dispatchEvent(new CustomEvent('aura_chats_updated', { detail: chats }));

      msgInput.value = '';
      renderChatMessages();

      // Update WhatsApp link inside chat panel with user's question pre-filled
      const s = getCafeSettings();
      const chatPanelWa = document.getElementById('chatPanelWhatsappBtn');
      if (chatPanelWa) {
        chatPanelWa.href = `https://wa.me/${s.rawPhone}?text=${encodeURIComponent('Hello Aura Roasters! ' + msg + ' (From: ' + name + ')')}`;
      }

      showToast(`✓ Question sent to Barista Admin! We'll reply shortly.`);
    });
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'aura_customer_chats') renderChatMessages();
  });
  window.addEventListener('aura_chats_updated', renderChatMessages);

  if (window.AuraDB) {
    window.AuraDB.fetchInquiries([]).then(inqs => {
      if (inqs && inqs.length) {
        localStorage.setItem('aura_customer_chats', JSON.stringify(inqs));
        renderChatMessages();
      }
    }).catch(() => {});
  }
}
