const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'orders_data.json');
const MENU_FILE = path.join(__dirname, 'menu_data.json');

// Initialize sample orders if not exists
let orders = [];
if (fs.existsSync(DATA_FILE)) {
  try {
    orders = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    orders = [];
  }
}

// Load or initialize menu
let menuItems = [];
if (fs.existsSync(MENU_FILE)) {
  try {
    menuItems = JSON.parse(fs.readFileSync(MENU_FILE, 'utf8'));
  } catch (e) {
    menuItems = [];
  }
}

function saveOrders() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving orders:', err);
  }
}

function saveMenu() {
  try {
    fs.writeFileSync(MENU_FILE, JSON.stringify(menuItems, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving menu:', err);
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = parsedUrl.pathname;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API: ORDERS ---
  if (pathname === '/api/orders' && req.method === 'GET') {
    if (fs.existsSync(DATA_FILE)) {
      try {
        orders = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      } catch (e) {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(orders));
    return;
  }

  if (pathname === '/api/orders' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        if (fs.existsSync(DATA_FILE)) {
          try {
            orders = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
          } catch (e) {}
        }
        const newOrder = JSON.parse(body);
        if (!newOrder.id) {
          newOrder.id = 'ORD-' + (Math.floor(1000 + Math.random() * 9000));
        }
        if (!newOrder.status) {
          newOrder.status = 'Pending';
        }
        if (!newOrder.time) {
          const now = new Date();
          newOrder.time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' PKT';
        }
        // Remove existing if duplicate id
        orders = orders.filter(o => o.id !== newOrder.id);
        orders.unshift(newOrder);
        saveOrders();
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, order: newOrder }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (pathname.startsWith('/api/orders/') && req.method === 'PATCH') {
    const orderId = pathname.replace('/api/orders/', '');
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        if (fs.existsSync(DATA_FILE)) {
          try {
            orders = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
          } catch (e) {}
        }
        const update = JSON.parse(body);
        const order = orders.find(o => o.id === orderId);
        if (order) {
          if (update.status) order.status = update.status;
          saveOrders();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, order }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Order not found' }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // --- API: MENU MANAGEMENT ---
  if (pathname === '/api/menu' && req.method === 'GET') {
    if (fs.existsSync(MENU_FILE)) {
      try {
        menuItems = JSON.parse(fs.readFileSync(MENU_FILE, 'utf8'));
      } catch (e) {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(menuItems));
    return;
  }

  // Add new drink
  if (pathname === '/api/menu' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        if (fs.existsSync(MENU_FILE)) {
          try {
            menuItems = JSON.parse(fs.readFileSync(MENU_FILE, 'utf8'));
          } catch (e) {}
        }
        const item = JSON.parse(body);
        if (!item.id) item.id = 'drink-' + Date.now();
        if (item.inStock === undefined) item.inStock = true;
        if (!item.rating) item.rating = '5.0';
        if (!item.reviewsCount) item.reviewsCount = 1;
        if (!item.image) item.image = 'assets/images/vanilla-latte.jpg';
        menuItems.push(item);
        saveMenu();
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, item }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Update drink (price, stock, etc.)
  if (pathname.startsWith('/api/menu/') && req.method === 'PATCH') {
    const drinkId = pathname.replace('/api/menu/', '');
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        if (fs.existsSync(MENU_FILE)) {
          try {
            menuItems = JSON.parse(fs.readFileSync(MENU_FILE, 'utf8'));
          } catch (e) {}
        }
        const updates = JSON.parse(body);
        const item = menuItems.find(m => m.id === drinkId);
        if (item) {
          Object.assign(item, updates);
          saveMenu();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, item }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Drink not found' }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Delete drink
  if (pathname.startsWith('/api/menu/') && req.method === 'DELETE') {
    const drinkId = pathname.replace('/api/menu/', '');
    if (fs.existsSync(MENU_FILE)) {
      try {
        menuItems = JSON.parse(fs.readFileSync(MENU_FILE, 'utf8'));
      } catch (e) {}
    }
    const index = menuItems.findIndex(m => m.id === drinkId);
    if (index !== -1) {
      const removed = menuItems.splice(index, 1);
      saveMenu();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, removed: removed[0] }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Drink not found' }));
    }
    return;
  }

  // Routing Shortcuts
  if (pathname === '/' || pathname === '') pathname = '/index.html';
  if (pathname === '/admin' || pathname === '/admin/') pathname = '/admin.html';

  const filePath = path.join(__dirname, pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Admin Portal: http://localhost:${PORT}/admin`);
});
