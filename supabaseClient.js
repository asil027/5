/**
 * AURA COFFEE ROASTERS - SUPABASE CLIENT INTEGRATION
 * Connects frontend & admin portal to Supabase Database
 * With 100% transparent fallback to LocalStorage if credentials are not yet set
 */

// --- 1. CONFIGURATION ---
// Pre-configured live project credentials for AURA Coffee Roasters:
const SUPABASE_CONFIG = {
  url: 'https://eaybxrlppmrashltaelg.supabase.co',
  anonKey: 'sb_publishable_lt1_dLzC1HuaWU5KfDnQlQ_EVe_12ky'
};

// Also support dynamic configuration via localStorage or window override
function getSupabaseCredentials() {
  const localUrl = localStorage.getItem('aura_supabase_url');
  const localKey = localStorage.getItem('aura_supabase_key');
  
  const url = (localUrl && localUrl.startsWith('https://')) ? localUrl : SUPABASE_CONFIG.url;
  const key = (localKey && localKey.length > 20) ? localKey : SUPABASE_CONFIG.anonKey;
  
  const isConfigured = url && url !== 'https://YOUR_PROJECT_ID.supabase.co' && 
                       key && key !== 'YOUR_SUPABASE_ANON_KEY';
                       
  return { url, key, isConfigured };
}

// --- 2. CLIENT INITIALIZATION ---
let supabaseInstance = null;

function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;
  
  const creds = getSupabaseCredentials();
  if (creds.isConfigured && window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      supabaseInstance = window.supabase.createClient(creds.url, creds.key, {
        auth: { persistSession: true }
      });
      return supabaseInstance;
    } catch (err) {
      console.warn('Supabase initialization error:', err);
    }
  }
  return null;
}

// --- 3. CONNECTION TEST ---
async function dbCheckConnection() {
  const client = getSupabaseClient();
  if (!client) return { connected: false, reason: 'Credentials not configured' };
  
  try {
    const { data, error } = await client.from('menu_items').select('id').limit(1);
    if (error) {
      return { connected: false, reason: error.message };
    }
    return { connected: true, data };
  } catch (err) {
    return { connected: false, reason: err.message };
  }
}

// --- 4. ORDERS API ---
async function dbFetchOrders(fallbackList) {
  const client = getSupabaseClient();
  if (!client) return fallbackList;
  
  try {
    const { data, error } = await client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    if (data && Array.isArray(data) && data.length > 0) {
      // Map database snake_case back to camelCase expected by existing UI
      return data.map(o => {
        let paymentMethod = o.payment_method;
        let paymentStatus = o.payment_status;
        let transactionRef = o.transaction_ref;

        // If not in separate columns, extract from notes tag if present e.g. [Payment: Card (Paid Online) | Ref: #TXN-12345]
        if (!paymentMethod && o.notes && o.notes.includes('[Payment:')) {
          const match = o.notes.match(/\[Payment:\s*([^|(]+)(?:\(([^)]+)\))?\s*\|\s*Ref:\s*([^\]]+)\]/);
          if (match) {
            paymentMethod = match[1].trim();
            paymentStatus = match[2] ? match[2].trim() : 'Paid Online';
            transactionRef = match[3].trim();
          }
        }

        return {
          id: o.id,
          customerName: o.customer_name,
          phone: o.phone,
          orderType: o.order_type,
          address: o.address,
          coffee: o.coffee,
          qty: o.qty,
          cupSize: o.cup_size,
          milk: o.milk,
          temperature: o.temperature,
          sweetness: o.sweetness,
          notes: o.notes,
          total: Number(o.total),
          status: o.status,
          time: o.time || (o.created_at ? new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' PKT' : 'Recent'),
          paymentMethod: paymentMethod || 'Pay on Pickup',
          paymentStatus: paymentStatus || (paymentMethod && !paymentMethod.toLowerCase().includes('pickup') ? 'Paid Online' : 'Pay at Counter'),
          transactionRef: transactionRef || o.id
        };
      });
    }
  } catch (e) {
    console.warn('Supabase fetch orders failed, falling back to local storage:', e.message || e);
  }
  return fallbackList;
}

async function dbInsertOrder(order) {
  const client = getSupabaseClient();
  if (!client) return false;
  
  try {
    const payload = {
      id: order.id,
      customer_name: order.customerName,
      phone: order.phone,
      order_type: order.orderType,
      address: order.address,
      coffee: order.coffee,
      qty: order.qty,
      cup_size: order.cupSize,
      milk: order.milk,
      temperature: order.temperature,
      sweetness: order.sweetness,
      notes: order.notes,
      total: order.total,
      status: order.status || 'Pending',
      time: order.time
    };

    // If payment fields provided, try inserting with columns
    if (order.paymentMethod || order.transactionRef) {
      try {
        const fullPayload = {
          ...payload,
          payment_method: order.paymentMethod || 'Pay on Pickup',
          payment_status: order.paymentStatus || 'Pending',
          transaction_ref: order.transactionRef || order.id
        };
        const { data: pData, error: pError } = await client.from('orders').insert([fullPayload]);
        if (!pError) return true;
      } catch (colErr) {
        // Fall through to standard payload without extra columns
      }
    }
    
    const { data, error } = await client.from('orders').insert([payload]);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('Supabase insert order failed:', e.message || e);
    return false;
  }
}

async function dbUpdateOrderStatus(orderId, newStatus) {
  const client = getSupabaseClient();
  if (!client) return false;
  
  try {
    const { error } = await client
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);
      
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('Supabase update order status failed:', e.message || e);
    return false;
  }
}

// --- 5. MENU ITEMS API ---
async function dbFetchMenu(fallbackList) {
  const client = getSupabaseClient();
  if (!client) return fallbackList;
  
  try {
    const { data, error } = await client
      .from('menu_items')
      .select('*')
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    if (data && Array.isArray(data) && data.length > 0) {
      return data.map(m => ({
        id: m.id,
        name: m.name,
        price: Number(m.price),
        rating: m.rating || '5.0',
        reviewsCount: m.reviews_count || 100,
        badge: m.badge,
        badgeClass: m.badge_class,
        category: m.category,
        description: m.description,
        tags: Array.isArray(m.tags) ? m.tags : (m.tags ? JSON.parse(m.tags) : []),
        image: m.image,
        inStock: m.in_stock !== false
      }));
    }
  } catch (e) {
    console.warn('Supabase fetch menu failed, using local fallback:', e.message || e);
  }
  return fallbackList;
}

async function dbInsertMenuItem(item) {
  const client = getSupabaseClient();
  if (!client) return false;
  
  try {
    const payload = {
      id: item.id,
      name: item.name,
      price: item.price,
      rating: item.rating || '5.0',
      reviews_count: item.reviewsCount || 0,
      badge: item.badge || '',
      badge_class: item.badgeClass || 'gold-badge',
      category: item.category,
      description: item.description,
      tags: item.tags || [],
      image: item.image,
      in_stock: item.inStock !== false
    };
    const { error } = await client.from('menu_items').insert([payload]);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('Supabase insert menu item failed:', e.message || e);
    return false;
  }
}

async function dbUpdateMenuItem(itemId, updates) {
  const client = getSupabaseClient();
  if (!client) return false;
  
  try {
    const payload = {};
    if (updates.price !== undefined) payload.price = updates.price;
    if (updates.inStock !== undefined) payload.in_stock = updates.inStock;
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.badge !== undefined) payload.badge = updates.badge;
    
    const { error } = await client.from('menu_items').update(payload).eq('id', itemId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('Supabase update menu item failed:', e.message || e);
    return false;
  }
}

async function dbDeleteMenuItem(itemId) {
  const client = getSupabaseClient();
  if (!client) return false;
  
  try {
    const { error } = await client.from('menu_items').delete().eq('id', itemId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('Supabase delete menu item failed:', e.message || e);
    return false;
  }
}

// --- 6. CAFE SETTINGS API ---
async function dbFetchCafeSettings(fallbackSettings) {
  const client = getSupabaseClient();
  if (!client) return fallbackSettings;
  
  try {
    const { data, error } = await client
      .from('cafe_settings')
      .select('*')
      .eq('id', 'current')
      .single();
      
    if (error) throw error;
    if (data) {
      return {
        weekdayHours: data.weekday_hours || fallbackSettings.weekdayHours,
        sundayHours: data.sunday_hours || fallbackSettings.sundayHours,
        address: data.address || fallbackSettings.address,
        hotline: data.hotline || fallbackSettings.hotline,
        rawPhone: data.raw_phone || fallbackSettings.rawPhone,
        email: data.email || fallbackSettings.email
      };
    }
  } catch (e) {
    console.warn('Supabase fetch cafe settings failed:', e.message || e);
  }
  return fallbackSettings;
}

async function dbSaveCafeSettings(settings) {
  const client = getSupabaseClient();
  if (!client) return false;
  
  try {
    const payload = {
      id: 'current',
      weekday_hours: settings.weekdayHours,
      sunday_hours: settings.sundayHours,
      address: settings.address,
      hotline: settings.hotline,
      raw_phone: settings.rawPhone,
      email: settings.email,
      updated_at: new Date().toISOString()
    };
    
    const { error } = await client
      .from('cafe_settings')
      .upsert(payload, { onConflict: 'id' });
      
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('Supabase save cafe settings failed:', e.message || e);
    return false;
  }
}

// --- 7. CUSTOMER INQUIRIES & CHAT API ---
async function dbFetchInquiries(fallbackList) {
  const client = getSupabaseClient();
  if (!client) return fallbackList;
  
  try {
    const { data, error } = await client
      .from('customer_inquiries')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    if (data && Array.isArray(data) && data.length > 0) {
      return data.map(i => ({
        id: i.id,
        customerName: i.customer_name,
        contact: i.contact,
        message: i.message,
        time: i.time,
        reply: i.reply
      }));
    }
  } catch (e) {
    console.warn('Supabase fetch inquiries failed:', e.message || e);
  }
  return fallbackList;
}

async function dbInsertInquiry(inquiry) {
  const client = getSupabaseClient();
  if (!client) return false;
  
  try {
    const payload = {
      id: inquiry.id,
      customer_name: inquiry.customerName,
      contact: inquiry.contact,
      message: inquiry.message,
      time: inquiry.time,
      reply: inquiry.reply || null
    };
    const { error } = await client.from('customer_inquiries').insert([payload]);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('Supabase insert inquiry failed:', e.message || e);
    return false;
  }
}

async function dbUpdateInquiryReply(inquiryId, replyText) {
  const client = getSupabaseClient();
  if (!client) return false;
  
  try {
    const { error } = await client
      .from('customer_inquiries')
      .update({ reply: replyText })
      .eq('id', inquiryId);
      
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('Supabase reply inquiry failed:', e.message || e);
    return false;
  }
}

async function dbDeleteInquiry(inquiryId) {
  const client = getSupabaseClient();
  if (!client) return false;
  
  try {
    const { error } = await client.from('customer_inquiries').delete().eq('id', inquiryId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('Supabase delete inquiry failed:', e.message || e);
    return false;
  }
}

// --- 8. CUSTOMER REVIEWS API ---
async function dbFetchReviews(fallbackList) {
  const client = getSupabaseClient();
  if (!client) return fallbackList;
  
  try {
    const { data, error } = await client
      .from('customer_reviews')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    if (data && Array.isArray(data) && data.length > 0) {
      return data.map(r => ({
        id: r.id,
        name: r.name,
        tag: r.tag,
        rating: Number(r.rating),
        coffee: r.coffee,
        quote: r.quote,
        date: r.date
      }));
    }
  } catch (e) {
    console.warn('Supabase fetch reviews failed:', e.message || e);
  }
  return fallbackList;
}

async function dbInsertReview(review) {
  const client = getSupabaseClient();
  if (!client) return false;
  
  try {
    const payload = {
      id: review.id,
      name: review.name,
      tag: review.tag,
      rating: review.rating,
      coffee: review.coffee,
      quote: review.quote,
      date: review.date
    };
    const { error } = await client.from('customer_reviews').insert([payload]);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('Supabase insert review failed:', e.message || e);
    return false;
  }
}

async function dbDeleteReview(reviewId) {
  const client = getSupabaseClient();
  if (!client) return false;
  
  try {
    const { error } = await client.from('customer_reviews').delete().eq('id', reviewId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('Supabase delete review failed:', e.message || e);
    return false;
  }
}

// Export functions globally to window
window.AuraDB = {
  getConfig: getSupabaseCredentials,
  setCredentials: (url, key) => {
    localStorage.setItem('aura_supabase_url', url.trim());
    localStorage.setItem('aura_supabase_key', key.trim());
    supabaseInstance = null; // reset
  },
  checkConnection: dbCheckConnection,
  fetchOrders: dbFetchOrders,
  insertOrder: dbInsertOrder,
  updateOrderStatus: dbUpdateOrderStatus,
  fetchMenu: dbFetchMenu,
  insertMenuItem: dbInsertMenuItem,
  updateMenuItem: dbUpdateMenuItem,
  deleteMenuItem: dbDeleteMenuItem,
  fetchCafeSettings: dbFetchCafeSettings,
  saveCafeSettings: dbSaveCafeSettings,
  fetchInquiries: dbFetchInquiries,
  insertInquiry: dbInsertInquiry,
  updateInquiryReply: dbUpdateInquiryReply,
  deleteInquiry: dbDeleteInquiry,
  fetchReviews: dbFetchReviews,
  insertReview: dbInsertReview,
  deleteReview: dbDeleteReview
};

