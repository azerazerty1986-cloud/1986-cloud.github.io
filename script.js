// ========== ناردو برو - النظام النهائي المتكامل ==========

// ========== 1. إعدادات تلجرام ==========
const TELEGRAM = {
    botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
    channelId: '-1003822964890',
    adminId: '7461896689'
};

// ========== 2. المتغيرات العامة ==========
let products = [];
let currentUser = null;
let cart = [];
let isDarkMode = true;
let currentFilter = 'all';
let searchTerm = '';
let sortBy = 'newest';
let users = [];

// ========== 3. تحميل المستخدمين ==========
function loadUsers() {
    const saved = localStorage.getItem('nardoo_users');
    if (saved) {
        users = JSON.parse(saved);
    } else {
        users = [
            { 
                id: 1, 
                name: 'azer', 
                email: 'azer@admin.com', 
                password: '123456', 
                role: 'admin',
                phone: '0555000000',
                telegram: '@admin_nardoo',
                avatar: 'https://via.placeholder.com/100/2c5e4f/ffffff?text=Admin',
                createdAt: new Date().toISOString()
            },
            { 
                id: 2, 
                name: 'أحمد التاجر', 
                email: 'ahmed@merchant.com', 
                password: 'a123', 
                role: 'merchant_approved',
                phone: '0555111111',
                storeName: 'متجر أحمد للتوابل',
                storeLogo: 'https://via.placeholder.com/100/8B4513/ffffff?text=A',
                telegram: '@ahmed_merchant',
                merchantLevel: '2',
                merchantCategory: 'spices',
                status: 'approved',
                approvedBy: 1,
                approvedAt: new Date().toISOString(),
                totalProducts: 0,
                rating: 4.8,
                createdAt: new Date().toISOString()
            },
            { 
                id: 3, 
                name: 'سارة للتجميل', 
                email: 'sara@merchant.com', 
                password: 's123', 
                role: 'merchant_pending',
                phone: '0555222222',
                storeName: 'متجر سارة للكوسمتيك',
                storeLogo: 'https://via.placeholder.com/100/FF69B4/ffffff?text=S',
                telegram: '@sara_cosmetic',
                merchantLevel: '1',
                merchantCategory: 'cosmetic',
                status: 'pending',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('nardoo_users', JSON.stringify(users));
    }
}
loadUsers();

// ========== 4. إضافة منتج إلى تلجرام ==========
async function addProductToTelegram(product, imageFile) {
    try {
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM.channelId);
        formData.append('photo', imageFile);
        
        const caption = `🛍️ **منتج جديد**
        
📦 الاسم: ${product.name}
💰 السعر: ${product.price} دج
📊 الكمية: ${product.stock}
🏷️ القسم: ${getCategoryName(product.category)}
👤 التاجر: ${product.merchantName}
📱 تليجرام: ${product.merchantTelegram || 'غير محدد'}

✅ للطلب: تواصل مع التاجر مباشرة`;

        formData.append('caption', caption);
        
        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: "📱 تواصل مع التاجر", url: `https://t.me/${product.merchantTelegram?.replace('@', '')}` },
                    { text: "🛒 طلب سريع", callback_data: `order_${product.name}` }
                ]
            ]
        };
        
        formData.append('reply_markup', JSON.stringify(replyMarkup));

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendPhoto`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.ok) {
            console.log(`✅ تم الإرسال - المعرف: ${data.result.message_id}`);
            return { success: true, messageId: data.result.message_id };
        }
        return { success: false, error: data.description };
    } catch (error) {
        console.error('❌ خطأ:', error);
        return { success: false, error: error.message };
    }
}

// ========== 5. جلب المنتجات من تلجرام ==========
async function loadProductsFromTelegram() {
    try {
        console.log('🔄 جاري جلب المنتجات من تلجرام...');
        
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`
        );
        
        const data = await response.json();
        const products = [];
        
        if (data.ok && data.result) {
            const updates = [...data.result].reverse();
            
            for (const update of updates) {
                const post = update.channel_post || update.message;
                if (!post || !post.photo) continue;
                
                const productId = post.message_id;
                const caption = post.caption || '';
                
                let name = 'منتج';
                let price = 0;
                let category = 'promo';
                let stock = 0;
                let merchant = 'المتجر';
                let merchantTelegram = '';
                
                const lines = caption.split('\n');
                lines.forEach(line => {
                    if (line.includes('الاسم:')) {
                        name = line.replace('الاسم:', '').trim();
                    }
                    if (line.includes('السعر:')) {
                        const match = line.match(/\d+/);
                        if (match) price = parseInt(match[0]);
                    }
                    if (line.includes('القسم:')) {
                        const cat = line.replace('القسم:', '').trim().toLowerCase();
                        if (cat.includes('promo')) category = 'promo';
                        else if (cat.includes('spices') || cat.includes('توابل')) category = 'spices';
                        else if (cat.includes('cosmetic') || cat.includes('كوسمتيك')) category = 'cosmetic';
                        else category = 'other';
                    }
                    if (line.includes('الكمية:')) {
                        const match = line.match(/\d+/);
                        if (match) stock = parseInt(match[0]);
                    }
                    if (line.includes('التاجر:')) {
                        merchant = line.replace('التاجر:', '').trim();
                    }
                    if (line.includes('تليجرام:')) {
                        merchantTelegram = line.replace('تليجرام:', '').trim();
                    }
                });
                
                const fileId = post.photo[post.photo.length - 1].file_id;
                const fileResponse = await fetch(
                    `https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`
                );
                const fileData = await fileResponse.json();
                
                if (fileData.ok) {
                    const imageUrl = `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`;
                    
                    products.push({
                        id: productId,
                        name: name,
                        price: price,
                        category: category,
                        stock: stock,
                        merchantName: merchant,
                        merchantTelegram: merchantTelegram,
                        description: 'منتج مميز',
                        rating: 4.5,
                        images: [imageUrl],
                        telegramMessageId: productId,
                        telegramLink: `https://t.me/nardoo_channel/${productId}`,
                        createdAt: new Date(post.date * 1000).toISOString()
                    });
                }
            }
        }
        
        console.log(`✅ تم تحميل ${products.length} منتج من تلجرام`);
        localStorage.setItem('nardoo_products', JSON.stringify(products));
        
        return products;
        
    } catch (error) {
        console.error('❌ خطأ في جلب المنتجات:', error);
        const saved = localStorage.getItem('nardoo_products');
        return saved ? JSON.parse(saved) : [];
    }
}

// ========== 6. حفظ المنتج ==========
async function saveProduct() {
    if (!currentUser) {
        showNotification('يجب تسجيل الدخول', 'error');
        return;
    }

    if (!['admin', 'merchant_approved'].includes(currentUser.role)) {
        showNotification('غير مصرح لك بإضافة منتجات', 'error');
        return;
    }

    const merchantTelegram = document.getElementById('merchantTelegram')?.value;
    if (merchantTelegram) {
        currentUser.telegram = merchantTelegram;
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex].telegram = merchantTelegram;
            localStorage.setItem('nardoo_users', JSON.stringify(users));
            localStorage.setItem('current_user', JSON.stringify(currentUser));
        }
    }

    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const description = document.getElementById('productDescription')?.value || '';
    const imageFile = document.getElementById('productImages').files[0];
    
    if (!name || !category || !price || !stock) {
        showNotification('املأ جميع الحقول', 'error');
        return;
    }

    if (!imageFile) {
        showNotification('اختر صورة للمنتج', 'error');
        return;
    }

    showNotification('جاري رفع المنتج...', 'info');

    const product = {
        merchantId: currentUser.id,
        name: name,
        price: price,
        category: category,
        stock: stock,
        merchantName: currentUser.storeName || currentUser.name,
        merchantTelegram: currentUser.telegram || '@' + currentUser.name,
        merchantPhone: currentUser.phone,
        description: description,
        approvedBy: currentUser.role === 'admin' ? 'admin' : 'merchant',
        approvedAt: new Date().toISOString()
    };

    const result = await addProductToTelegram(product, imageFile);
    
    if (result.success) {
        const newProduct = {
            ...product,
            id: result.messageId,
            telegramMessageId: result.messageId,
            telegramLink: `https://t.me/nardoo_channel/${result.messageId}`,
            images: [URL.createObjectURL(imageFile)],
            createdAt: new Date().toISOString(),
            rating: 4.5
        };

        products.push(newProduct);
        localStorage.setItem('nardoo_products', JSON.stringify(products));

        showNotification(`✅ تم إضافة المنتج بنجاح - المعرف: ${result.messageId}`, 'success');
        closeModal('productModal');
        
        displayProducts();
        
        if (currentUser.role === 'merchant_approved') {
            showMerchantDashboard();
        }
    } else {
        showNotification('❌ فشل الإضافة: ' + result.error, 'error');
    }
}

// ========== 7. البحث عن منتج بالمعرف ==========
function findProductById() {
    const id = prompt('🔍 أدخل معرف المنتج:');
    if (!id) return;
    
    const product = products.find(p => p.id == id);
    
    if (product) {
        alert(`
🔍 **المنتج موجود:**
        
🆔 المعرف: ${product.id}
📦 الاسم: ${product.name}
💰 السعر: ${product.price} دج
🏪 التاجر: ${product.merchantName}
📱 تليجرام: ${product.merchantTelegram || 'غير محدد'}
📊 المخزون: ${product.stock}
⭐ التقييم: ${product.rating || 4.5}
📅 التاريخ: ${new Date(product.createdAt).toLocaleDateString('ar-EG')}

رابط المنتج: ${product.telegramLink || 'غير متوفر'}
        `);
    } else {
        alert('❌ لا يوجد منتج بهذا المعرف');
    }
}

// ========== 8. دوال المساعدة والإشعارات ==========
function showNotification(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-message">${message}</div>`;
    container.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode', !isDarkMode);
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.innerHTML = isDarkMode ? 
            '<i class="fas fa-moon"></i><span>ليلي</span>' : 
            '<i class="fas fa-sun"></i><span>نهاري</span>';
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// ========== 9. دوال الوقت والفرز ==========
function getTimeAgo(dateString) {
    if (!dateString) return '';
    
    const now = new Date();
    const productDate = new Date(dateString);
    const diffInSeconds = Math.floor((now - productDate) / 1000);
    
    if (diffInSeconds < 60) return 'الآن';
    if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `منذ ${minutes} دقيقة`;
    }
    if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `منذ ${hours} ساعة`;
    }
    return 'منذ وقت';
}

function sortProducts(productsArray) {
    switch(sortBy) {
        case 'newest':
            return [...productsArray].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        case 'price_low':
            return [...productsArray].sort((a, b) => a.price - b.price);
        case 'price_high':
            return [...productsArray].sort((a, b) => b.price - a.price);
        case 'rating':
            return [...productsArray].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        default:
            return productsArray;
    }
}

function changeSort(value) {
    sortBy = value;
    displayProducts();
}

// ========== 10. تحميل المنتجات وعرضها ==========
async function loadProducts() {
    products = await loadProductsFromTelegram();
    displayProducts();
}

function getCategoryName(category) {
    const names = {
        'promo': 'برومسيون',
        'spices': 'توابل',
        'cosmetic': 'كوسمتيك',
        'other': 'منتوجات أخرى'
    };
    return names[category] || 'أخرى';
}

function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    let filtered = products.filter(p => p.stock > 0);
    
    if (currentFilter === 'my_products' && currentUser?.role === 'merchant_approved') {
        filtered = filtered.filter(p => p.merchantId === currentUser.id || p.merchantName === currentUser.storeName || p.merchantName === currentUser.name);
    }
    else if (currentFilter !== 'all') {
        filtered = filtered.filter(p => p.category === currentFilter);
    }

    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    filtered = sortProducts(filtered);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px;">
                <i class="fas fa-box-open" style="font-size: 80px; color: var(--gold); margin-bottom: 20px;"></i>
                <h3 style="color: var(--gold); font-size: 28px;">لا توجد منتجات</h3>
                <p style="color: var(--text-secondary);">أول منتج يضاف سيظهر هنا</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(product => {
        const stockClass = product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : 'in-stock';
        const stockText = product.stock <= 0 ? 'غير متوفر' : product.stock < 5 ? `كمية محدودة (${product.stock})` : `متوفر (${product.stock})`;
        const imageUrl = product.images && product.images.length > 0 ? product.images[0] : "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال";
        const timeAgo = getTimeAgo(product.createdAt);
        const telegramUsername = product.merchantTelegram || '@' + product.merchantName.replace(/\s+/g, '');

        return `
            <div class="product-card" onclick="viewProductDetails(${product.id})">
                <div class="product-time-badge">
                    <i class="far fa-clock"></i> ${timeAgo}
                </div>
                
                <div style="position:absolute; top:15px; left:15px; background:var(--gold); color:black; padding:5px 10px; border-radius:20px; font-size:12px; font-weight:bold; z-index:10;">
                    🆔 ${product.id}
                </div>
                
                <div class="product-gallery">
                    <img src="${imageUrl}" onerror="this.src='https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال';">
                </div>

                <div class="product-info">
                    <div class="product-category">${getCategoryName(product.category)}</div>
                    
                    <h3 class="product-title">${product.name}</h3>
                    
                    <div class="product-merchant-info" style="display: flex; align-items: center; gap: 5px; margin-bottom: 5px;">
                        <i class="fas fa-store"></i> ${product.merchantName}
                    </div>
                    
                    <div class="product-telegram" style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px; color: #0088cc;">
                        <i class="fab fa-telegram"></i>
                        <a href="https://t.me/${telegramUsername.replace('@', '')}" target="_blank" style="color: #0088cc; text-decoration: none;" onclick="event.stopPropagation()">
                            ${telegramUsername}
                        </a>
                    </div>
                    
                    <div class="product-rating">
                        <div class="stars-container">
                            ${generateStars(product.rating || 4.5)}
                        </div>
                        <span class="rating-value">${(product.rating || 4.5).toFixed(1)}</span>
                    </div>
                    
                    <div class="product-price">${product.price.toLocaleString()} <small>دج</small></div>
                    <div class="product-stock ${stockClass}">${stockText}</div>
                    
                    <div class="product-actions" onclick="event.stopPropagation()" style="display: flex; gap: 10px;">
                        <button class="add-to-cart" onclick="addToCart(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> أضف للسلة
                        </button>
                        <button class="btn-telegram" onclick="window.open('https://t.me/${telegramUsername.replace('@', '')}', '_blank')" style="background: #0088cc; color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer;">
                            <i class="fab fa-telegram"></i> تواصل
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterProducts(category) {
    currentFilter = category;
    displayProducts();
}

function searchProducts() {
    searchTerm = document.getElementById('searchInput').value;
    displayProducts();
}

// ========== 11. إدارة السلة ==========
function loadCart() {
    const saved = localStorage.getItem('nardoo_cart');
    cart = saved ? JSON.parse(saved) : [];
    updateCartCounter();
}

function saveCart() {
    localStorage.setItem('nardoo_cart', JSON.stringify(cart));
}

function updateCartCounter() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const counter = document.getElementById('cartCounter');
    const fixedCounter = document.getElementById('fixedCartCounter');
    
    if (counter) counter.textContent = count;
    if (fixedCounter) fixedCounter.textContent = count;
}

function addToCart(productId) {
    const product = products.find(p => p.id == productId);
    if (!product || product.stock <= 0) {
        showNotification('المنتج غير متوفر', 'error');
        return;
    }

    const existing = cart.find(item => item.productId == productId);
    if (existing) {
        if (existing.quantity < product.stock) {
            existing.quantity++;
        } else {
            showNotification('الكمية غير كافية', 'warning');
            return;
        }
    } else {
        cart.push({
            productId,
            name: product.name,
            price: product.price,
            quantity: 1,
            merchantName: product.merchantName,
            merchantTelegram: product.merchantTelegram
        });
    }

    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showNotification('تمت الإضافة إلى السلة', 'success');
}

function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('open');
    updateCartDisplay();
}

function updateCartDisplay() {
    const itemsDiv = document.getElementById('cartItems');
    const totalSpan = document.getElementById('cartTotal');

    if (cart.length === 0) {
        itemsDiv.innerHTML = '<div style="text-align: center; padding: 40px;">السلة فارغة</div>';
        if (totalSpan) totalSpan.textContent = '0 دج';
        return;
    }

    let total = 0;
    itemsDiv.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="cart-item">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${item.price.toLocaleString()} دج</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="updateCartItem(${item.productId}, ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateCartItem(${item.productId}, ${item.quantity + 1})">+</button>
                        <button class="quantity-btn" onclick="removeFromCart(${item.productId})" style="background: #f87171; color: white;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (totalSpan) totalSpan.textContent = `${total.toLocaleString()} دج`;
}

function updateCartItem(productId, newQuantity) {
    const item = cart.find(i => i.productId == productId);
    const product = products.find(p => p.id == productId);

    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }

    if (newQuantity > product.stock) {
        showNotification('الكمية غير متوفرة', 'warning');
        return;
    }

    item.quantity = newQuantity;
    saveCart();
    updateCartCounter();
    updateCartDisplay();
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.productId != productId);
    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showNotification('تمت إزالة المنتج', 'info');
}

// ========== 12. إتمام الشراء ==========
async function checkoutCart() {
    if (cart.length === 0) {
        showNotification('السلة فارغة', 'warning');
        return;
    }

    if (!currentUser) {
        showNotification('يجب تسجيل الدخول أولاً', 'warning');
        openLoginModal();
        return;
    }

    const customerPhone = prompt('📞 رقم الهاتف:', currentUser.phone || '');
    if (!customerPhone) return;
    
    const customerAddress = prompt('📍 عنوان التوصيل:', '');
    if (!customerAddress) return;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 800;
    const total = subtotal + shipping;

    const order = {
        orderId: Date.now(),
        customerName: currentUser.name,
        customerPhone: customerPhone,
        customerAddress: customerAddress,
        items: [...cart],
        subtotal: subtotal,
        shipping: shipping,
        total: total,
        createdAt: new Date().toISOString()
    };

    // تجميع الطلبات حسب التاجر
    const ordersByMerchant = {};
    cart.forEach(item => {
        if (!ordersByMerchant[item.merchantName]) {
            ordersByMerchant[item.merchantName] = {
                merchantTelegram: item.merchantTelegram,
                items: []
            };
        }
        ordersByMerchant[item.merchantName].items.push(item);
    });

    // إرسال إشعار لكل تاجر
    for (const [merchantName, merchantData] of Object.entries(ordersByMerchant)) {
        const merchantItems = merchantData.items;
        const merchantTotal = merchantItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const message = `🟢 **طلب جديد**
        
👤 الزبون: ${order.customerName}
📞 الهاتف: ${order.customerPhone}
📍 العنوان: ${order.customerAddress}
🏪 التاجر: ${merchantName}

📦 **المنتجات:**
${merchantItems.map(i => `  • ${i.name} x${i.quantity} = ${i.price * i.quantity} دج`).join('\n')}

💰 إجمالي الطلب: ${merchantTotal} دج
➕ تكلفة التوصيل: ${shipping} دج
💵 الإجمالي الكلي: ${merchantTotal + shipping} دج

🆔 رقم الطلب: ${order.orderId}
📅 التاريخ: ${new Date().toLocaleString('ar-EG')}

✅ سيتم التواصل معك قريباً`;

        if (merchantData.merchantTelegram) {
            try {
                await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: merchantData.merchantTelegram.replace('@', ''),
                        text: message,
                        parse_mode: 'Markdown'
                    })
                });
            } catch (error) {
                console.error('❌ فشل إرسال إشعار للتاجر:', error);
            }
        }
    }

    // إرسال إشعار للقناة
    const channelMessage = `🟢 **طلب جديد في المتجر**
        
👤 الزبون: ${order.customerName}
📞 الهاتف: ${order.customerPhone}
📍 العنوان: ${order.customerAddress}

📦 **المنتجات:**
${order.items.map(i => `  • ${i.name} x${i.quantity} = ${i.price * i.quantity} دج (${i.merchantName})`).join('\n')}

💰 الإجمالي: ${order.total} دج
🆔 رقم الطلب: ${order.orderId}`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM.channelId,
            text: channelMessage,
            parse_mode: 'Markdown'
        })
    });

    // حفظ الطلب
    const orders = JSON.parse(localStorage.getItem('nardoo_orders') || '[]');
    orders.push(order);
    localStorage.setItem('nardoo_orders', JSON.stringify(orders));

    cart = [];
    saveCart();
    updateCartCounter();
    toggleCart();
    
    showNotification('✅ تم إرسال الطلب بنجاح، سيتم التواصل معك قريباً', 'success');
}

// ========== 13. دوال التمرير ==========
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToBottom() {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
}

function toggleQuickTopButton() {
    const quickTopBtn = document.getElementById('quickTopBtn');
    if (!quickTopBtn) return;
    quickTopBtn.classList.toggle('show', window.scrollY > 300);
}

// ========== 14. تقييم النجوم ==========
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    let starsHTML = '';
    
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star star filled"></i>';
    }
    
    if (hasHalfStar) {
        starsHTML += '<i class="fas fa-star-half-alt star half"></i>';
    }
    
    for (let i = 0; i < 5 - fullStars - (hasHalfStar ? 1 : 0); i++) {
        starsHTML += '<i class="far fa-star star"></i>';
    }
    
    return starsHTML;
}

// ========== 15. عرض تفاصيل المنتج ==========
function viewProductDetails(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');

    const imageUrl = product.images && product.images.length > 0 ? product.images[0] : "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال";
    const telegramUsername = product.merchantTelegram || '@' + product.merchantName.replace(/\s+/g, '');

    content.innerHTML = `
        <div style="position: relative;">
            <button onclick="closeModal('productDetailModal')" style="position: absolute; left: 0; top: 0; background: none; border: none; color: var(--gold); font-size: 28px; cursor: pointer;">&times;</button>
            <h2 style="text-align: center; margin-bottom: 20px; color: var(--gold);">${product.name}</h2>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <div>
                <img src="${imageUrl}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 20px;">
            </div>
            <div>
                <p style="color: #888; margin-bottom: 10px;">🆔 المعرف: ${product.id}</p>
                <p style="margin-bottom: 20px;">${product.description || 'منتج عالي الجودة'}</p>
                
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <i class="fas fa-store" style="color: var(--gold);"></i>
                    <span>${product.merchantName}</span>
                </div>
                
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                    <i class="fab fa-telegram" style="color: #0088cc;"></i>
                    <a href="https://t.me/${telegramUsername.replace('@', '')}" target="_blank" style="color: #0088cc; text-decoration: none;">
                        ${telegramUsername}
                    </a>
                </div>
                
                <div class="product-rating" style="margin-bottom: 20px;">
                    <div class="stars-container">${generateStars(product.rating || 4.5)}</div>
                    <span class="rating-value">${(product.rating || 4.5).toFixed(1)}</span>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <span style="font-size: 32px; color: var(--gold);">${product.price.toLocaleString()} دج</span>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <span>📊 ${product.stock} قطعة متوفرة</span>
                </div>
                
                <div style="display: flex; gap: 15px;">
                    <button class="btn-gold" onclick="addToCart(${product.id}); closeModal('productDetailModal')">
                        🛒 أضف للسلة
                    </button>
                    <button class="btn-telegram" onclick="window.open('https://t.me/${telegramUsername.replace('@', '')}', '_blank')">
                        <i class="fab fa-telegram"></i> تواصل مع التاجر
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

// ========== 16. إدارة المستخدمين ==========
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function switchAuthTab(tab) {
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}

function toggleMerchantFields() {
    const isMerchant = document.getElementById('isMerchant').checked;
    document.getElementById('merchantFields').style.display = isMerchant ? 'block' : 'none';
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const user = users.find(u => (u.email === email || u.name === email) && u.password === password);

    if (user) {
        currentUser = user;
        localStorage.setItem('current_user', JSON.stringify(user));
        closeModal('loginModal');
        updateUIBasedOnRole();
        updateNavigation();
        
        // التحقق من الإشعارات المعلقة
        checkPendingNotifications();
        
        showNotification(`👋 مرحباً ${user.name}`, 'success');
        console.log('✅ تم تسجيل الدخول:', user);
        
        // إذا كان التاجر معتمد، نعرض له رسالة
        if (user.role === 'merchant_approved') {
            showNotification('✨ يمكنك الآن إضافة منتجاتك من زر "إضافة منتج"', 'info');
        }
    } else {
        showNotification('❌ بيانات غير صحيحة', 'error');
    }
}

function handleRegister() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const phone = document.getElementById('regPhone')?.value || '';
    const telegram = document.getElementById('regTelegram')?.value || '';
    const isMerchant = document.getElementById('isMerchant').checked;

    if (!name || !email || !password) {
        showNotification('❌ املأ جميع الحقول', 'error');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        showNotification('❌ البريد الإلكتروني غير صحيح', 'error');
        return;
    }

    if (password.length < 3) {
        showNotification('❌ كلمة المرور قصيرة جداً', 'error');
        return;
    }

    if (users.find(u => u.email === email)) {
        showNotification('❌ البريد مستخدم بالفعل', 'error');
        return;
    }

    if (isMerchant) {
        const storeName = document.getElementById('storeName').value;
        const merchantLevel = document.getElementById('merchantLevel').value;
        const merchantCategory = document.getElementById('merchantCategory')?.value || 'other';
        
        if (!storeName) {
            showNotification('❌ أدخل اسم المتجر', 'error');
            return;
        }
        
        if (!phone) {
            showNotification('❌ أدخل رقم الهاتف للتواصل', 'error');
            return;
        }

        const newUser = {
            id: users.length + 1,
            name,
            email,
            password,
            phone,
            telegram: telegram || '@' + name.replace(/\s+/g, ''),
            role: 'merchant_pending',
            storeName: storeName,
            merchantLevel: merchantLevel,
            merchantCategory: merchantCategory,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        
        // إرسال إشعار للمدير
        sendNewMerchantNotificationToAdmin(newUser);
        
        showNotification('📋 تم إرسال طلب التسجيل، انتظر موافقة المدير', 'info');
        switchAuthTab('login');
    } else {
        // تسجيل كعميل عادي
        const newUser = {
            id: users.length + 1,
            name,
            email,
            password,
            phone,
            telegram: telegram || '@' + name.replace(/\s+/g, ''),
            role: 'customer',
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        showNotification('✅ تم التسجيل بنجاح', 'success');
        switchAuthTab('login');
    }
}

// ========== إرسال إشعار للمدير عند تسجيل تاجر جديد ==========
async function sendNewMerchantNotificationToAdmin(merchant) {
    try {
        const message = `
🆕 **تاجر جديد ينتظر الموافقة**
━━━━━━━━━━━━━━━━
👤 الاسم: ${merchant.name}
🏪 المتجر: ${merchant.storeName}
📧 البريد: ${merchant.email}
📱 الهاتف: ${merchant.phone}
📱 تليجرام: ${merchant.telegram}
📊 المستوى: ${merchant.merchantLevel}
🏷️ التخصص: ${getCategoryName(merchant.merchantCategory)}
📅 التاريخ: ${new Date().toLocaleString('ar-EG')}

🔗 رابط الموقع: ${window.location.origin}
        `;

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.adminId,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        const data = await response.json();
        if (data.ok) {
            console.log('✅ تم إرسال إشعار للمدير عن تاجر جديد');
        } else {
            console.error('❌ فشل إرسال إشعار للمدير:', data);
        }
    } catch (error) {
        console.error('❌ خطأ في إرسال الإشعار:', error);
    }
}

// ========== موافقة المدير على التاجر مع إشعار فوري ==========
function approveMerchant(merchantId) {
    if (currentUser?.role !== 'admin') return;

    const merchant = users.find(u => u.id == merchantId);
    if (!merchant) return;

    // تحديث صلاحيات التاجر
    merchant.role = 'merchant_approved';
    merchant.status = 'approved';
    merchant.approvedBy = currentUser.id;
    merchant.approvedAt = new Date().toISOString();

    // حفظ التغييرات
    localStorage.setItem('nardoo_users', JSON.stringify(users));

    // إرسال إشعار فوري للتاجر إذا كان مسجل الدخول حالياً
    const currentUserData = JSON.parse(localStorage.getItem('current_user'));
    if (currentUserData && currentUserData.id == merchantId) {
        showNotification('✅ تهانينا! تمت الموافقة على طلبك كتاجر', 'success');
        
        setTimeout(() => {
            location.reload();
        }, 3000);
    }

    // حفظ إشعار في localStorage ليظهر عندما يسجل دخول
    const pendingNotifications = JSON.parse(localStorage.getItem('pending_notifications') || '[]');
    pendingNotifications.push({
        userId: merchantId,
        message: '✅ تهانينا! تمت الموافقة على طلبك كتاجر. يمكنك الآن إضافة منتجاتك',
        type: 'success',
        date: new Date().toISOString()
    });
    localStorage.setItem('pending_notifications', JSON.stringify(pendingNotifications));

    // إرسال إشعار في تليجرام للتاجر
    sendApprovalNotificationToMerchant(merchant);

    showNotification(`✅ تمت الموافقة على ${merchant.storeName}`, 'success');
    
    // تحديث عرض الطلبات
    showPendingMerchants();
}

// ========== إرسال إشعار الموافقة للتاجر في تليجرام ==========
async function sendApprovalNotificationToMerchant(merchant) {
    try {
        let chatId = merchant.telegram;
        if (!chatId) {
            console.log('❌ التاجر ليس لديه معرف تليجرام');
            return;
        }
        
        chatId = chatId.replace('@', '');
        
        const message = `
🎉 **تهانينا! تمت الموافقة على طلبك كتاجر في ناردو برو**

━━━━━━━━━━━━━━━━
📌 **بيانات متجرك:**
🏪 اسم المتجر: ${merchant.storeName || merchant.name}
👤 اسم التاجر: ${merchant.name}
📱 معرف تليجرام: @${chatId}
📊 المستوى: ${merchant.merchantLevel || 'المستوى الثاني'}
🏷️ التخصص: ${getCategoryName(merchant.merchantCategory)}

━━━━━━━━━━━━━━━━
✨ **الصلاحيات المتاحة لك:**
✅ إضافة منتجات جديدة
✅ إدارة المخزون
✅ متابعة الطلبات
✅ التواصل مع العملاء

━━━━━━━━━━━━━━━━
📋 **لبدء البيع:**
1️⃣ سجل الدخول إلى حسابك
2️⃣ اضغط على "إضافة منتج"
3️⃣ أضف صور المنتج والبيانات
4️⃣ المنتج سينشر تلقائياً في المتجر وتليجرام

━━━━━━━━━━━━━━━━
🔗 رابط المتجر: ${window.location.origin}
📱 للدعم: @nardoo_support

نتمنى لك تجارة موفقة ومربحة 🌟
        `;

        console.log(`📤 جاري إرسال إشعار الموافقة إلى ${chatId}...`);

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        const data = await response.json();
        
        if (data.ok) {
            console.log('✅ تم إرسال إشعار الموافقة للتاجر بنجاح');
            showNotification(`✅ تم إرسال إشعار الموافقة للتاجر ${merchant.name}`, 'success');
        } else {
            console.error('❌ فشل إرسال الإشعار:', data);
        }
    } catch (error) {
        console.error('❌ خطأ في إرسال الإشعار:', error);
    }
}

// ========== التحقق من الإشعارات المعلقة عند تسجيل الدخول ==========
function checkPendingNotifications() {
    if (!currentUser) return;

    const pendingNotifications = JSON.parse(localStorage.getItem('pending_notifications') || '[]');
    const userNotifications = pendingNotifications.filter(n => n.userId == currentUser.id);

    if (userNotifications.length > 0) {
        userNotifications.forEach(notification => {
            showNotification(notification.message, notification.type);
        });

        const remainingNotifications = pendingNotifications.filter(n => n.userId != currentUser.id);
        localStorage.setItem('pending_notifications', JSON.stringify(remainingNotifications));
    }
}

function rejectMerchant(merchantId) {
    if (currentUser?.role !== 'admin') return;

    const merchant = users.find(u => u.id == merchantId);
    if (!merchant) return;

    merchant.role = 'customer';
    merchant.status = 'rejected';
    
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    showNotification('❌ تم رفض الطلب', 'info');
    showPendingMerchants();
}

function updateUIBasedOnRole() {
    if (!currentUser) return;

    console.log('👤 تحديث الواجهة للمستخدم:', currentUser.role);

    const userBtn = document.getElementById('userBtn');
    if (userBtn) {
        userBtn.innerHTML = 
            currentUser.role === 'admin' ? '<i class="fas fa-crown"></i>' :
            currentUser.role === 'merchant_approved' ? '<i class="fas fa-store"></i>' :
            '<i class="fas fa-user"></i>';
    }

    const dashboardBtn = document.getElementById('dashboardBtn');
    const merchantPanel = document.getElementById('merchantPanelContainer');
    
    if (dashboardBtn) dashboardBtn.style.display = 'none';
    if (merchantPanel) merchantPanel.style.display = 'none';
    
    const oldAddBtn = document.getElementById('adminAddProductBtn');
    if (oldAddBtn) oldAddBtn.remove();

    if (currentUser.role === 'admin') {
        console.log('👑 مرحباً أيها المدير azer');
        
        if (dashboardBtn) dashboardBtn.style.display = 'flex';
        
        const navMenu = document.getElementById('mainNav');
        if (navMenu && !document.getElementById('adminAddProductBtn')) {
            const addBtn = document.createElement('a');
            addBtn.className = 'nav-link';
            addBtn.id = 'adminAddProductBtn';
            addBtn.setAttribute('onclick', 'showAddProductModal()');
            addBtn.innerHTML = '<i class="fas fa-plus-circle"></i><span>إضافة منتج</span>';
            navMenu.appendChild(addBtn);
        }
        
        const dashboardSection = document.getElementById('dashboardSection');
        if (dashboardSection) {
            dashboardSection.style.display = 'block';
            showDashboardOverview();
        }
    } 
    else if (currentUser.role === 'merchant_approved') {
        console.log('👨‍💼 مرحباً أيها التاجر');
        showMerchantPanel();
    }
}

function updateNavigation() {
    const nav = document.getElementById('mainNav');
    if (!nav) return;

    nav.innerHTML = '';

    nav.innerHTML += `
        <a class="nav-link" onclick="filterProducts('all')">
            <i class="fas fa-home"></i><span>الرئيسية</span>
        </a>
        <a class="nav-link" onclick="filterProducts('promo')">
            <i class="fas fa-fire"></i><span>برومسيون</span>
        </a>
        <a class="nav-link" onclick="filterProducts('spices')">
            <i class="fas fa-seedling"></i><span>توابل</span>
        </a>
        <a class="nav-link" onclick="filterProducts('cosmetic')">
            <i class="fas fa-spa"></i><span>كوسمتيك</span>
        </a>
        <a class="nav-link" onclick="filterProducts('other')">
            <i class="fas fa-gem"></i><span>أخرى</span>
        </a>
    `;

    if (currentUser) {
        if (currentUser.role === 'admin') {
            nav.innerHTML += `
                <a class="nav-link" onclick="showAdminDashboard()">
                    <i class="fas fa-crown"></i><span>لوحة المدير</span>
                </a>
                <a class="nav-link" onclick="showPendingMerchants()">
                    <i class="fas fa-user-clock"></i><span>طلبات التجار</span>
                </a>
                <a class="nav-link" onclick="showAddProductModal()">
                    <i class="fas fa-plus-circle"></i><span>إضافة منتج</span>
                </a>
            `;
        } else if (currentUser.role === 'merchant_approved') {
            nav.innerHTML += `
                <a class="nav-link" onclick="showMerchantDashboard()">
                    <i class="fas fa-store"></i><span>متجري</span>
                </a>
                <a class="nav-link" onclick="filterProducts('my_products')">
                    <i class="fas fa-box"></i><span>منتجاتي</span>
                </a>
                <a class="nav-link" onclick="showAddProductModal()">
                    <i class="fas fa-plus-circle"></i><span>إضافة منتج</span>
                </a>
            `;
        }
    }

    nav.innerHTML += `
        <a class="nav-link" onclick="findProductById()">
            <i class="fas fa-search"></i><span>بحث بالمعرف</span>
        </a>
    `;
}

function showMerchantPanel() {
    const merchantProducts = products.filter(p => p.merchantId === currentUser.id || p.merchantName === currentUser.storeName || p.merchantName === currentUser.name);
    
    const panel = document.getElementById('merchantPanelContainer');
    panel.style.display = 'block';
    panel.innerHTML = `
        <div class="merchant-panel">
            <h3>👨‍💼 لوحة التاجر - ${currentUser.storeName || currentUser.name}</h3>
            <div style="display: flex; gap: 20px; justify-content: center; margin: 20px 0; flex-wrap: wrap;">
                <div style="text-align: center; background: var(--glass); padding: 20px; border-radius: 15px; min-width: 120px;">
                    <div style="font-size: 32px; color: var(--gold);">${merchantProducts.length}</div>
                    <div>📦 منتجاتي</div>
                </div>
                <div style="text-align: center; background: var(--glass); padding: 20px; border-radius: 15px; min-width: 120px;">
                    <div style="font-size: 32px; color: var(--gold);">${merchantProducts.filter(p => p.stock > 0).length}</div>
                    <div>✅ متاحة</div>
                </div>
                <div style="text-align: center; background: var(--glass); padding: 20px; border-radius: 15px; min-width: 120px;">
                    <div style="font-size: 32px; color: var(--gold);">${merchantProducts.reduce((sum, p) => sum + p.stock, 0)}</div>
                    <div>📊 إجمالي المخزون</div>
                </div>
            </div>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button class="btn-gold" onclick="showMerchantDashboard()">
                    <i class="fas fa-chart-line"></i> فتح لوحة التحكم
                </button>
                <button class="btn-gold" onclick="showAddProductModal()">
                    <i class="fas fa-plus-circle"></i> إضافة منتج
                </button>
            </div>
        </div>
    `;
}

function showMerchantDashboard() {
    if (!currentUser || !['merchant_approved', 'admin'].includes(currentUser.role)) {
        showNotification('غير مصرح لك', 'error');
        return;
    }

    const merchantProducts = products.filter(p => 
        p.merchantId === currentUser.id || 
        p.merchantName === currentUser.storeName ||
        p.merchantName === currentUser.name
    );

    const totalProducts = merchantProducts.length;
    const inStock = merchantProducts.filter(p => p.stock > 0).length;
    const outOfStock = merchantProducts.filter(p => p.stock <= 0).length;
    const totalValue = merchantProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    
    const recentProducts = [...merchantProducts]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

    const modal = document.getElementById('merchantDashboardModal');
    if (!modal) {
        createMerchantDashboardModal();
    }

    const content = document.getElementById('merchantDashboardContent');
    content.innerHTML = `
        <div class="merchant-dashboard">
            <div class="dashboard-header" style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px; flex-wrap: wrap;">
                <img src="${currentUser.storeLogo || 'https://via.placeholder.com/80/2c5e4f/ffffff?text=Store'}" 
                     style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid var(--gold);">
                <div>
                    <h2 style="color: var(--gold); margin: 0;">${currentUser.storeName || currentUser.name}</h2>
                    <p style="display: flex; align-items: center; gap: 5px; margin: 5px 0;">
                        <i class="fab fa-telegram" style="color: #0088cc;"></i>
                        <a href="https://t.me/${currentUser.telegram?.replace('@', '')}" target="_blank">${currentUser.telegram}</a>
                    </p>
                    <p>📱 ${currentUser.phone}</p>
                </div>
                <div style="margin-right: auto;">
                    <span class="merchant-badge approved" style="background: var(--gold); color: black; padding: 5px 15px; border-radius: 20px;">
                        <i class="fas fa-check-circle"></i> تاجر معتمد
                    </span>
                </div>
            </div>

            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div class="stat-card" style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                    <i class="fas fa-boxes" style="font-size: 30px; color: var(--gold);"></i>
                    <div style="font-size: 28px; font-weight: bold;">${totalProducts}</div>
                    <div>إجمالي المنتجات</div>
                </div>
                <div class="stat-card" style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                    <i class="fas fa-check-circle" style="font-size: 30px; color: #4CAF50;"></i>
                    <div style="font-size: 28px; font-weight: bold;">${inStock}</div>
                    <div>متوفر</div>
                </div>
                <div class="stat-card" style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                    <i class="fas fa-times-circle" style="font-size: 30px; color: #f44336;"></i>
                    <div style="font-size: 28px; font-weight: bold;">${outOfStock}</div>
                    <div>نفذ من المخزون</div>
                </div>
                <div class="stat-card" style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                    <i class="fas fa-coins" style="font-size: 30px; color: #FFD700;"></i>
                    <div style="font-size: 28px; font-weight: bold;">${totalValue.toLocaleString()}</div>
                    <div>قيمة المخزون (دج)</div>
                </div>
            </div>

            <div class="quick-actions" style="display: flex; gap: 15px; margin-bottom: 30px; flex-wrap: wrap;">
                <button class="btn-gold" onclick="showAddProductModal()">
                    <i class="fas fa-plus-circle"></i> إضافة منتج جديد
                </button>
                <button class="btn-outline-gold" onclick="showMerchantProducts()">
                    <i class="fas fa-list"></i> إدارة المنتجات
                </button>
                <button class="btn-outline-gold" onclick="showMerchantOrders()">
                    <i class="fas fa-shopping-bag"></i> الطلبات
                </button>
            </div>

            <div class="recent-products">
                <h3 style="color: var(--gold); margin-bottom: 20px;">
                    <i class="fas fa-clock"></i> آخر المنتجات المضافة
                </h3>
                <div class="products-table" style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: var(--glass);">
                                <th style="padding: 12px;">الصورة</th>
                                <th style="padding: 12px;">المنتج</th>
                                <th style="padding: 12px;">السعر</th>
                                <th style="padding: 12px;">المخزون</th>
                                <th style="padding: 12px;">معرف تليجرام</th>
                                <th style="padding: 12px;">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${recentProducts.map(p => `
                                <tr style="border-bottom: 1px solid var(--border);">
                                    <td style="padding: 12px;">
                                        <img src="${p.images?.[0] || 'https://via.placeholder.com/50'}" 
                                             style="width: 50px; height: 50px; border-radius: 10px; object-fit: cover;">
                                    </td>
                                    <td style="padding: 12px;">${p.name}</td>
                                    <td style="padding: 12px;">${p.price} دج</td>
                                    <td style="padding: 12px;">
                                        <span style="padding: 3px 10px; border-radius: 15px; background: ${p.stock < 5 ? '#f44336' : '#4CAF50'}; color: white;">
                                            ${p.stock}
                                        </span>
                                    </td>
                                    <td style="padding: 12px;">
                                        <a href="${p.telegramLink}" target="_blank">
                                            <i class="fab fa-telegram"></i> ${p.telegramMessageId}
                                        </a>
                                    </td>
                                    <td style="padding: 12px;">
                                        <button class="action-btn" onclick="editProduct(${p.id})" title="تعديل" style="background: var(--glass); border: none; color: var(--text); width: 35px; height: 35px; border-radius: 8px; cursor: pointer;">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="action-btn" onclick="viewProductTelegram(${p.id})" title="عرض في تليجرام" style="background: var(--glass); border: none; color: var(--text); width: 35px; height: 35px; border-radius: 8px; cursor: pointer;">
                                            <i class="fab fa-telegram"></i>
                                        </button>
                                        <button class="action-btn" onclick="deleteProduct(${p.id})" title="حذف" style="background: var(--glass); border: none; color: #f44336; width: 35px; height: 35px; border-radius: 8px; cursor: pointer;">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.getElementById('merchantDashboardModal').style.display = 'flex';
}

function showMerchantProducts() {
    const merchantProducts = products.filter(p => 
        p.merchantId === currentUser.id || 
        p.merchantName === currentUser.storeName ||
        p.merchantName === currentUser.name
    );

    let productsHtml = merchantProducts.map(p => `
        <div class="product-mini-card" style="background: var(--glass); border-radius: 10px; padding: 15px;">
            <img src="${p.images?.[0] || 'https://via.placeholder.com/150'}" 
                 style="width: 100%; height: 150px; object-fit: cover; border-radius: 10px;">
            <h4 style="margin: 10px 0;">${p.name}</h4>
            <p style="color: var(--gold); font-weight: bold;">${p.price} دج</p>
            <p>📦 ${p.stock} قطعة</p>
            <div style="display: flex; gap: 10px;">
                <button class="btn-gold" onclick="editProduct(${p.id})" style="flex: 1; padding: 8px;">
                    <i class="fas fa-edit"></i> تعديل
                </button>
                <button class="btn-outline-gold" onclick="deleteProduct(${p.id})" style="flex: 1; padding: 8px;">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </div>
        </div>
    `).join('');

    const modal = document.getElementById('merchantProductsModal');
    if (!modal) {
        createMerchantProductsModal();
    }

    const content = document.getElementById('merchantProductsContent');
    content.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 20px;">📦 منتجاتي (${merchantProducts.length})</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">
            ${productsHtml || '<p style="text-align: center;">لا توجد منتجات بعد</p>'}
        </div>
    `;

    document.getElementById('merchantProductsModal').style.display = 'flex';
}

function showMerchantOrders() {
    const orders = JSON.parse(localStorage.getItem('nardoo_orders') || '[]');
    const merchantOrders = orders.filter(order => 
        order.items.some(item => 
            item.merchantName === currentUser.storeName || 
            item.merchantName === currentUser.name
        )
    );

    let ordersHtml = merchantOrders.map(order => {
        const merchantItems = order.items.filter(item => 
            item.merchantName === currentUser.storeName || 
            item.merchantName === currentUser.name
        );
        const merchantTotal = merchantItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        return `
            <div class="order-card" style="background: var(--glass); border-radius: 10px; padding: 20px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
                    <h4>🆔 طلب رقم: ${order.orderId}</h4>
                    <span style="background: #2196F3; color: white; padding: 5px 15px; border-radius: 20px;">جديد</span>
                </div>
                <p>👤 الزبون: ${order.customerName}</p>
                <p>📞 الهاتف: ${order.customerPhone}</p>
                <p>📍 العنوان: ${order.customerAddress}</p>
                <p>📅 التاريخ: ${new Date(order.createdAt).toLocaleString('ar-EG')}</p>
                <div style="margin-top: 10px;">
                    <strong>منتجاتك:</strong>
                    ${merchantItems.map(item => `
                        <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                            <span>${item.name} x${item.quantity}</span>
                            <span>${item.price * item.quantity} دج</span>
                        </div>
                    `).join('')}
                    <div style="display: flex; justify-content: space-between; margin-top: 10px; font-weight: bold;">
                        <span>الإجمالي:</span>
                        <span style="color: var(--gold);">${merchantTotal} دج</span>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="btn-gold" onclick="window.open('tel:${order.customerPhone}')" style="flex: 1;">
                        <i class="fas fa-phone"></i> اتصال
                    </button>
                    <button class="btn-telegram" onclick="window.open('https://t.me/nardoo_support')" style="flex: 1; background: #0088cc; color: white; border: none; padding: 10px; border-radius: 8px;">
                        <i class="fab fa-telegram"></i> تواصل
                    </button>
                </div>
            </div>
        `;
    }).join('');

    const modal = document.getElementById('merchantOrdersModal');
    if (!modal) {
        createMerchantOrdersModal();
    }

    const content = document.getElementById('merchantOrdersContent');
    content.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 20px;">🛒 طلباتي (${merchantOrders.length})</h3>
        ${ordersHtml || '<p style="text-align: center;">لا توجد طلبات حتى الآن</p>'}
    `;

    document.getElementById('merchantOrdersModal').style.display = 'flex';
}

function showAdminDashboard() {
    const section = document.getElementById('dashboardSection');
    section.style.display = 'block';
    showDashboardOverview();
}

function showDashboardOverview() {
    const content = document.getElementById('dashboardContent');
    const pendingMerchants = users.filter(u => u.role === 'merchant_pending').length;
    const totalProducts = products.length;
    const totalUsers = users.length;
    const totalOrders = JSON.parse(localStorage.getItem('nardoo_orders') || '[]').length;
    
    content.innerHTML = `
        <h3 style="color: var(--gold);">📊 نظرة عامة</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
            <div style="background: var(--glass); padding: 20px; border-radius: 15px;">
                <div style="font-size: 32px;">${totalProducts}</div>
                <div>📦 إجمالي المنتجات</div>
            </div>
            <div style="background: var(--glass); padding: 20px; border-radius: 15px;">
                <div style="font-size: 32px;">${totalUsers}</div>
                <div>👥 إجمالي المستخدمين</div>
            </div>
            <div style="background: var(--glass); padding: 20px; border-radius: 15px;">
                <div style="font-size: 32px;">${pendingMerchants}</div>
                <div>⏳ طلبات التجار</div>
            </div>
            <div style="background: var(--glass); padding: 20px; border-radius: 15px;">
                <div style="font-size: 32px;">${totalOrders}</div>
                <div>🛒 إجمالي الطلبات</div>
            </div>
        </div>
        
        <div style="margin-top: 30px; display: flex; gap: 15px; flex-wrap: wrap;">
            <button class="btn-gold" onclick="showPendingMerchants()">
                <i class="fas fa-user-clock"></i> عرض طلبات التجار
            </button>
            <button class="btn-outline-gold" onclick="showApprovedMerchants()">
                <i class="fas fa-store"></i> التجار المعتمدين
            </button>
            <button class="btn-outline-gold" onclick="showAllOrders()">
                <i class="fas fa-shopping-bag"></i> جميع الطلبات
            </button>
        </div>
    `;
}

function showPendingMerchants() {
    if (currentUser?.role !== 'admin') {
        showNotification('غير مصرح', 'error');
        return;
    }

    const pendingMerchants = users.filter(u => u.role === 'merchant_pending');
    const content = document.getElementById('dashboardContent');
    
    content.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 20px;">
            <i class="fas fa-user-clock"></i> طلبات التجار الجديدة (${pendingMerchants.length})
        </h3>
        
        ${pendingMerchants.length === 0 ? `
            <div style="text-align: center; padding: 50px;">
                <i class="fas fa-check-circle" style="font-size: 60px; color: #4CAF50;"></i>
                <p style="margin-top: 20px;">لا توجد طلبات جديدة</p>
            </div>
        ` : pendingMerchants.map(m => `
            <div class="merchant-request-card" style="background: var(--glass); border: 2px solid var(--gold); border-radius: 15px; padding: 20px; margin-bottom: 20px;">
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <img src="${m.storeLogo || 'https://via.placeholder.com/100'}" 
                         style="width: 100px; height: 100px; border-radius: 15px; object-fit: cover;">
                    
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
                            <h4 style="color: var(--gold);">${m.storeName || m.name}</h4>
                            <span style="background: #FFC107; color: black; padding: 5px 15px; border-radius: 20px;">
                                <i class="fas fa-hourglass-half"></i> في الانتظار
                            </span>
                        </div>
                        
                        <p><i class="fas fa-user"></i> ${m.name}</p>
                        <p><i class="fas fa-envelope"></i> ${m.email}</p>
                        <p><i class="fas fa-phone"></i> ${m.phone}</p>
                        <p><i class="fab fa-telegram"></i> ${m.telegram}</p>
                        <p><i class="fas fa-tag"></i> التخصص: ${getCategoryName(m.merchantCategory)}</p>
                        <p><i class="fas fa-calendar"></i> ${new Date(m.createdAt).toLocaleDateString('ar-EG')}</p>
                        
                        <div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                            <button class="btn-gold" onclick="approveMerchant(${m.id})">
                                <i class="fas fa-check"></i> موافقة
                            </button>
                            <button class="btn-outline-gold" onclick="rejectMerchant(${m.id})" style="border-color: #f44336; color: #f44336;">
                                <i class="fas fa-times"></i> رفض
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('')}
    `;
}

function showApprovedMerchants() {
    if (currentUser?.role !== 'admin') return;

    const approvedMerchants = users.filter(u => u.role === 'merchant_approved');
    const content = document.getElementById('dashboardContent');
    
    content.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 20px;">
            <i class="fas fa-store-alt"></i> التجار المعتمدين (${approvedMerchants.length})
        </h3>

        <div class="merchants-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
            ${approvedMerchants.map(m => {
                const merchantProducts = products.filter(p => p.merchantId === m.id || p.merchantName === m.storeName);
                return `
                    <div class="merchant-card" style="background: var(--glass); border-radius: 15px; padding: 20px;">
                        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                            <img src="${m.storeLogo || 'https://via.placeholder.com/60'}" 
                                 style="width: 60px; height: 60px; border-radius: 50%; border: 2px solid var(--gold);">
                            <div>
                                <h4 style="margin: 0;">${m.storeName}</h4>
                                <p style="margin: 5px 0; color: #888;">${m.name}</p>
                            </div>
                        </div>
                        
                        <p><i class="fab fa-telegram" style="color: #0088cc;"></i> ${m.telegram}</p>
                        <p><i class="fas fa-phone"></i> ${m.phone}</p>
                        <p><i class="fas fa-tag"></i> ${getCategoryName(m.merchantCategory)}</p>
                        <p><i class="fas fa-box"></i> المنتجات: ${merchantProducts.length}</p>
                        <p><i class="fas fa-star" style="color: var(--gold);"></i> ${m.rating || 'جديد'}</p>
                        
                        <div style="display: flex; gap: 10px; margin-top: 15px;">
                            <button class="btn-gold" onclick="viewMerchantProducts(${m.id})" style="flex: 1;">
                                <i class="fas fa-box"></i> منتجاته
                            </button>
                            <button class="btn-outline-gold" onclick="window.open('https://t.me/${m.telegram?.replace('@', '')}')" style="flex: 1;">
                                <i class="fab fa-telegram"></i> تواصل
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function viewMerchantProducts(merchantId) {
    const merchant = users.find(u => u.id == merchantId);
    if (!merchant) return;

    const merchantProducts = products.filter(p => 
        p.merchantId == merchantId || 
        p.merchantName === merchant.storeName ||
        p.merchantName === merchant.name
    );

    const modal = document.getElementById('merchantProductsModal');
    if (!modal) {
        createMerchantProductsModal();
    }

    const content = document.getElementById('merchantProductsContent');
    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
            <img src="${merchant.storeLogo || 'https://via.placeholder.com/100'}" 
                 style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid var(--gold);">
            <h2 style="color: var(--gold); margin: 10px 0;">${merchant.storeName}</h2>
            <p><i class="fab fa-telegram"></i> ${merchant.telegram}</p>
            <p>📦 عدد المنتجات: ${merchantProducts.length}</p>
        </div>

        <div class="products-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">
            ${merchantProducts.map(p => `
                <div class="product-mini-card" style="background: var(--glass); border-radius: 10px; padding: 15px;">
                    <img src="${p.images?.[0] || 'https://via.placeholder.com/150'}" 
                         style="width: 100%; height: 150px; object-fit: cover; border-radius: 10px;">
                    <h4 style="margin: 10px 0;">${p.name}</h4>
                    <p style="color: var(--gold); font-weight: bold;">${p.price} دج</p>
                    <p>📦 ${p.stock} قطعة</p>
                    <button class="btn-gold" onclick="addToCart(${p.id})" style="width: 100%;">
                        <i class="fas fa-shopping-cart"></i> أضف للسلة
                    </button>
                </div>
            `).join('')}
        </div>
    `;

    document.getElementById('merchantProductsModal').style.display = 'flex';
}

function showAllOrders() {
    const orders = JSON.parse(localStorage.getItem('nardoo_orders') || '[]');
    const content = document.getElementById('dashboardContent');
    
    content.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 20px;">🛒 جميع الطلبات (${orders.length})</h3>
        <div style="max-height: 500px; overflow-y: auto;">
            ${orders.map(order => `
                <div class="order-card" style="background: var(--glass); border-radius: 10px; padding: 20px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
                        <h4>🆔 طلب رقم: ${order.orderId}</h4>
                        <span style="background: #2196F3; color: white; padding: 5px 15px; border-radius: 20px;">جديد</span>
                    </div>
                    <p>👤 الزبون: ${order.customerName}</p>
                    <p>📞 الهاتف: ${order.customerPhone}</p>
                    <p>📍 العنوان: ${order.customerAddress}</p>
                    <p>📅 التاريخ: ${new Date(order.createdAt).toLocaleString('ar-EG')}</p>
                    <div style="margin-top: 10px;">
                        <strong>المنتجات:</strong>
                        ${order.items.map(item => `
                            <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                                <span>${item.name} x${item.quantity} (${item.merchantName})</span>
                                <span>${item.price * item.quantity} دج</span>
                            </div>
                        `).join('')}
                        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-weight: bold;">
                            <span>الإجمالي الكلي:</span>
                            <span style="color: var(--gold);">${order.total} دج</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showAddProductModal() {
    if (!currentUser) {
        showNotification('سجل دخول أولاً', 'warning');
        openLoginModal();
        return;
    }

    if (!['admin', 'merchant_approved'].includes(currentUser.role)) {
        showNotification('غير مصرح لك بإضافة منتجات', 'error');
        return;
    }

    const modal = document.getElementById('productModal');
    
    const telegramField = !currentUser.telegram ? `
        <div class="form-group">
            <label>📱 معرف تليجرام الخاص بك (للتواصل)</label>
            <input type="text" id="merchantTelegram" class="form-control" placeholder="@username" value="${currentUser.telegram || ''}">
            <small style="color: #888;">أدخل معرفك في تليجرام ليتمكن العملاء من التواصل</small>
        </div>
    ` : '';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color:var(--gold);">➕ إضافة منتج جديد</h2>
                <button class="close-btn" onclick="closeModal('productModal')" style="background: none; border: none; color: var(--gold); font-size: 28px; cursor: pointer;">&times;</button>
            </div>
            <div class="modal-body">
                <form id="productForm" onsubmit="event.preventDefault(); saveProduct();">
                    ${telegramField}
                    
                    <div class="form-group">
                        <label>📦 اسم المنتج</label>
                        <input type="text" id="productName" class="form-control" required placeholder="أدخل اسم المنتج">
                    </div>
                    
                    <div class="form-group">
                        <label>🏷️ القسم</label>
                        <select id="productCategory" class="form-control" required>
                            <option value="promo">برومسيون</option>
                            <option value="spices">توابل</option>
                            <option value="cosmetic">كوسمتيك</option>
                            <option value="other">منتوجات أخرى</option>
                        </select>
                    </div>
                    
                    <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div class="form-group">
                            <label>💰 السعر (دج)</label>
                            <input type="number" id="productPrice" class="form-control" required min="0" placeholder="0">
                        </div>
                        
                        <div class="form-group">
                            <label>📊 الكمية</label>
                            <input type="number" id="productStock" class="form-control" required min="0" placeholder="0">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>📝 وصف المنتج</label>
                        <textarea id="productDescription" class="form-control" rows="3" placeholder="أدخل وصف المنتج..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>🔗 رابط الصورة (اختياري)</label>
                        <input type="url" id="productImage" class="form-control" placeholder="https://example.com/image.jpg">
                    </div>
                    
                    <div class="image-upload-area" onclick="document.getElementById('productImages').click()" style="border: 2px dashed var(--gold); border-radius: 25px; padding: 40px 20px; text-align: center; cursor: pointer; margin-top: 15px;">
                        <i class="fas fa-cloud-upload-alt" style="font-size: 48px; color: var(--gold);"></i>
                        <p>أو اضغط لرفع صورة من جهازك</p>
                    </div>
                    
                    <input type="file" id="productImages" accept="image/*" style="display:none;" onchange="handleImageUpload(event)" multiple>
                    <div class="image-preview" id="imagePreview" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;"></div>
                    <input type="hidden" id="productImagesData">
                    
                    <div style="display: flex; gap: 15px; margin-top: 20px;">
                        <button type="submit" class="btn-gold" style="flex: 2;">
                            <i class="fas fa-cloud-upload-alt"></i> حفظ المنتج
                        </button>
                        <button type="button" class="btn-outline-gold" style="flex: 1;" onclick="closeModal('productModal')">
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

function handleImageUpload(event) {
    const files = event.target.files;
    const preview = document.getElementById('imagePreview');
    const imagesData = [];

    preview.innerHTML = '';

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML += `<img src="${e.target.result}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 10px; margin: 5px;">`;
            imagesData.push(e.target.result);
            document.getElementById('productImagesData').value = JSON.stringify(imagesData);
        };
        reader.readAsDataURL(file);
    }
}

function editProduct(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    if (currentUser.role !== 'admin' && product.merchantId !== currentUser.id) {
        showNotification('لا يمكنك تعديل هذا المنتج', 'error');
        return;
    }

    showAddProductModal();
    setTimeout(() => {
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productStock').value = product.stock;
        document.getElementById('productDescription').value = product.description || '';
    }, 100);
}

function deleteProduct(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    if (currentUser.role !== 'admin' && product.merchantId !== currentUser.id) {
        showNotification('لا يمكنك حذف هذا المنتج', 'error');
        return;
    }

    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        products = products.filter(p => p.id != productId);
        localStorage.setItem('nardoo_products', JSON.stringify(products));
        displayProducts();
        showNotification('✅ تم حذف المنتج', 'success');
    }
}

function viewProductTelegram(productId) {
    const product = products.find(p => p.id == productId);
    if (product && product.telegramLink) {
        window.open(product.telegramLink, '_blank');
    }
}

// ========== إنشاء المودالات ==========
function createMerchantDashboardModal() {
    const modal = document.createElement('div');
    modal.id = 'merchantDashboardModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1200px; width: 95%;">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color:var(--gold);"><i class="fas fa-store"></i> لوحة تحكم التاجر</h2>
                <button class="close-btn" onclick="closeModal('merchantDashboardModal')" style="background: none; border: none; color: var(--gold); font-size: 28px; cursor: pointer;">&times;</button>
            </div>
            <div class="modal-body" id="merchantDashboardContent" style="max-height: 80vh; overflow-y: auto;">
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function createMerchantProductsModal() {
    const modal = document.createElement('div');
    modal.id = 'merchantProductsModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1000px;">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color:var(--gold);"><i class="fas fa-boxes"></i> منتجات التاجر</h2>
                <button class="close-btn" onclick="closeModal('merchantProductsModal')" style="background: none; border: none; color: var(--gold); font-size: 28px; cursor: pointer;">&times;</button>
            </div>
            <div class="modal-body" id="merchantProductsContent" style="max-height: 80vh; overflow-y: auto;">
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function createMerchantOrdersModal() {
    const modal = document.createElement('div');
    modal.id = 'merchantOrdersModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color:var(--gold);"><i class="fas fa-shopping-bag"></i> طلباتي</h2>
                <button class="close-btn" onclick="closeModal('merchantOrdersModal')" style="background: none; border: none; color: var(--gold); font-size: 28px; cursor: pointer;">&times;</button>
            </div>
            <div class="modal-body" id="merchantOrdersContent" style="max-height: 80vh; overflow-y: auto;">
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ========== تأثيرات الكتابة ==========
class TypingAnimation {
    constructor(element, texts, speed = 100, delay = 2000) {
        this.element = element;
        this.texts = texts;
        this.speed = speed;
        this.delay = delay;
        this.currentIndex = 0;
        this.isDeleting = false;
        this.text = '';
    }

    start() {
        this.type();
    }

    type() {
        const current = this.texts[this.currentIndex];
        if (this.isDeleting) {
            this.text = current.substring(0, this.text.length - 1);
        } else {
            this.text = current.substring(0, this.text.length + 1);
        }

        this.element.innerHTML = this.text + '<span class="typing-cursor">|</span>';

        let typeSpeed = this.speed;
        if (this.isDeleting) typeSpeed /= 2;

        if (!this.isDeleting && this.text === current) {
            typeSpeed = this.delay;
            this.isDeleting = true;
        } else if (this.isDeleting && this.text === '') {
            this.isDeleting = false;
            this.currentIndex = (this.currentIndex + 1) % this.texts.length;
            typeSpeed = 500;
        }

        setTimeout(() => this.type(), typeSpeed);
    }
}

// ========== استقبال الإشعارات من النوافذ الأخرى ==========
try {
    const channel = new BroadcastChannel('merchant_notifications');
    channel.onmessage = function(event) {
        if (event.data.type === 'approval' && currentUser && currentUser.id == event.data.merchantId) {
            showNotification(event.data.message, 'success');
            setTimeout(() => {
                location.reload();
            }, 3000);
        }
    };
} catch (e) {
    console.log('Broadcast Channel غير مدعوم');
}

// ========== التهيئة ==========
window.onload = async function() {
    await loadProducts();
    loadCart();

    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIBasedOnRole();
        updateNavigation();
        
        // التحقق من الإشعارات المعلقة
        checkPendingNotifications();
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        isDarkMode = savedTheme === 'dark';
        document.body.classList.toggle('light-mode', !isDarkMode);
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.innerHTML = isDarkMode ? 
                '<i class="fas fa-moon"></i><span>ليلي</span>' : 
                '<i class="fas fa-sun"></i><span>نهاري</span>';
        }
    }

    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
    }, 1000);
    
    window.addEventListener('scroll', toggleQuickTopButton);
    
    const typingElement = document.getElementById('typing-text');
    if (typingElement) {
        new TypingAnimation(typingElement, ['ناردو برو', 'تسوق آمن', 'جودة عالية'], 100, 2000).start();
    }
    
    console.log('✅ نظام ناردو برو جاهز');
    console.log('👑 المدير: azer | كلمة المرور: 123456');
};

// ========== إغلاق النوافذ ==========
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};
