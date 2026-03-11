// ========== ناردو برو - النظام النهائي المتكامل مع ريلز ريان ==========

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
let reels = [];
let currentPlayingReel = null;
let reelsObserver = null;

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
📅 تاريخ الإضافة: ${new Date(product.createdAt).toLocaleDateString('ar-EG')}

رابط المنتج: ${product.telegramLink || 'غير متوفر'}
        `);
    } else {
        alert('❌ لا يوجد منتج بهذا المعرف');
    }
}

// ========== 8. دوال المساعدة والإشعارات ==========
function showNotification(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
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

// ========== 14. عرض تفاصيل المنتج ==========
function viewProductDetails(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');

    const imageUrl = product.images && product.images.length > 0 ? product.images[0] : "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال";
    const telegramUsername = product.merchantTelegram || '@' + product.merchantName.replace(/\s+/g, '');

    content.innerHTML = `
        <div class="modal-content" style="max-width: 1000px;">
            <div class="modal-header">
                <h2 style="color: var(--gold);">${product.name}</h2>
                <button class="close-btn" onclick="closeModal('productDetailModal')">&times;</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding: 20px;">
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
                        <button class="btn-outline-gold" onclick="closeModal('productDetailModal')">
                            إغلاق
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

// ========== 15. إدارة المستخدمين ==========
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
        showNotification(`👋 مرحباً ${user.name}`, 'success');
        console.log('✅ تم تسجيل الدخول:', user);
    } else {
        showNotification('❌ بيانات غير صحيحة', 'error');
        console.log('❌ فشل تسجيل الدخول:', { email, password });
    }
}

// ========== تسجيل مستخدم جديد مع أزرار التليجرام ==========
async function handleRegister() {
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

    if (users.find(u => u.email === email)) {
        showNotification('❌ البريد مستخدم بالفعل', 'error');
        return;
    }

    const newUser = {
        id: users.length + 1,
        name,
        email,
        password,
        phone,
        telegram: telegram || '@' + name.replace(/\s+/g, ''),
        role: isMerchant ? 'merchant_pending' : 'customer',
        createdAt: new Date().toISOString()
    };

    if (isMerchant) {
        newUser.storeName = document.getElementById('storeName').value || 'متجر ' + name;
        newUser.merchantLevel = document.getElementById('merchantLevel').value;
        newUser.merchantCategory = document.getElementById('merchantCategory').value;
        newUser.status = 'pending';
        
        showNotification('🔄 جاري إرسال طلب التسجيل...', 'info');
        
        // ✅ إرسال إشعار إلى التليجرام مع أزرار الموافقة/الرفض
        const message = `🆕 **طلب تاجر جديد**
        
🆔 المعرف: ${newUser.id}
👤 الاسم: ${newUser.name}
📧 البريد: ${newUser.email}
📱 الهاتف: ${newUser.phone || 'غير محدد'}
🏪 المتجر: ${newUser.storeName}
🏷️ القسم: ${getCategoryName(newUser.merchantCategory)}
📊 المستوى: ${newUser.merchantLevel}
📅 التاريخ: ${new Date().toLocaleString('ar-EG')}

🔍 للموافقة أو الرفض:`;

        try {
            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM.channelId,
                    text: message,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { 
                                    text: "✅ موافقة", 
                                    callback_data: `approve_${newUser.id}` 
                                },
                                { 
                                    text: "❌ رفض", 
                                    callback_data: `reject_${newUser.id}` 
                                }
                            ],
                            [
                                {
                                    text: "👤 عرض التفاصيل",
                                    callback_data: `details_${newUser.id}`
                                }
                            ]
                        ]
                    }
                })
            });

            const data = await response.json();
            
            if (data.ok) {
                showNotification('✅ تم إرسال طلب التسجيل للمدير مع أزرار الموافقة', 'success');
                console.log('✅ تم إرسال إشعار التاجر مع الأزرار:', data);
            } else {
                showNotification('⚠️ تم التسجيل لكن فشل إرسال الإشعار', 'warning');
                console.log('❌ فشل إرسال الإشعار:', data);
            }
        } catch (error) {
            console.log('خطأ في الإرسال:', error);
            showNotification('⚠️ تم التسجيل لكن فشل الاتصال', 'warning');
        }
    } else {
        showNotification('✅ تم التسجيل بنجاح', 'success');
    }

    users.push(newUser);
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    document.getElementById('registerForm').reset();
    switchAuthTab('login');
}

// ========== معالجة الأزرار من التليجرام ==========
async function handleTelegramCallbacks() {
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`
        );
        const data = await response.json();
        
        if (data.ok && data.result) {
            for (const update of data.result) {
                // التحقق من وجود ضغطة زر
                if (update.callback_query) {
                    const callback = update.callback_query;
                    const data = callback.data;
                    const chatId = callback.message.chat.id;
                    const messageId = callback.message.message_id;
                    
                    // استخراج المعرف والفعل
                    if (data.startsWith('approve_')) {
                        const merchantId = parseInt(data.replace('approve_', ''));
                        await approveMerchantFromTelegram(merchantId, chatId, messageId);
                    }
                    else if (data.startsWith('reject_')) {
                        const merchantId = parseInt(data.replace('reject_', ''));
                        await rejectMerchantFromTelegram(merchantId, chatId, messageId);
                    }
                    else if (data.startsWith('details_')) {
                        const merchantId = parseInt(data.replace('details_', ''));
                        await showMerchantDetails(merchantId, chatId);
                    }
                    
                    // الرد على الضغطة لإزالة حالة "جاري التحميل"
                    await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/answerCallbackQuery`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            callback_query_id: callback.id
                        })
                    });
                }
            }
        }
    } catch (error) {
        console.error('خطأ في معالجة الأزرار:', error);
    }
}

// ========== الموافقة على التاجر من التليجرام ==========
async function approveMerchantFromTelegram(merchantId, chatId, messageId) {
    const merchant = users.find(u => u.id == merchantId);
    
    if (!merchant) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: '❌ لم يتم العثور على التاجر'
            })
        });
        return;
    }
    
    // تحديث حالة التاجر
    merchant.role = 'merchant_approved';
    merchant.status = 'approved';
    merchant.approvedBy = 1; // معرف المدير
    merchant.approvedAt = new Date().toISOString();
    
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    // تحديث الرسالة الأصلية
    await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: `✅ **تمت الموافقة على التاجر**
            
🆔 المعرف: ${merchant.id}
👤 الاسم: ${merchant.name}
🏪 المتجر: ${merchant.storeName}
📧 البريد: ${merchant.email}
📱 الهاتف: ${merchant.phone}
🏷️ القسم: ${getCategoryName(merchant.merchantCategory)}

🕐 تمت الموافقة في: ${new Date().toLocaleString('ar-EG')}`,
            parse_mode: 'Markdown'
        })
    });
    
    // إرسال إشعار للتاجر
    await sendApprovalNotification(merchant);
    
    showNotification(`✅ تمت الموافقة على ${merchant.storeName} من التليجرام`, 'success');
    
    // تحديث واجهة المتجر إذا كانت مفتوحة
    if (currentUser?.role === 'admin') {
        showPendingMerchants();
    }
}

// ========== رفض التاجر من التليجرام ==========
async function rejectMerchantFromTelegram(merchantId, chatId, messageId) {
    const merchant = users.find(u => u.id == merchantId);
    
    if (!merchant) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: '❌ لم يتم العثور على التاجر'
            })
        });
        return;
    }
    
    // تحديث حالة التاجر
    merchant.role = 'customer';
    merchant.status = 'rejected';
    
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    // تحديث الرسالة الأصلية
    await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: `❌ **تم رفض طلب التاجر**
            
🆔 المعرف: ${merchant.id}
👤 الاسم: ${merchant.name}
🏪 المتجر: ${merchant.storeName}
📧 البريد: ${merchant.email}

🕐 تم الرفض في: ${new Date().toLocaleString('ar-EG')}`,
            parse_mode: 'Markdown'
        })
    });
    
    showNotification(`❌ تم رفض ${merchant.storeName} من التليجرام`, 'info');
    
    if (currentUser?.role === 'admin') {
        showPendingMerchants();
    }
}

// ========== عرض تفاصيل التاجر ==========
async function showMerchantDetails(merchantId, chatId) {
    const merchant = users.find(u => u.id == merchantId);
    
    if (!merchant) return;
    
    const message = `📋 **تفاصيل التاجر**
    
🆔 المعرف: ${merchant.id}
👤 الاسم: ${merchant.name}
📧 البريد: ${merchant.email}
📱 الهاتف: ${merchant.phone || 'غير محدد'}
📱 تليجرام: ${merchant.telegram || 'غير محدد'}
🏪 المتجر: ${merchant.storeName || 'غير محدد'}
🏷️ القسم: ${getCategoryName(merchant.merchantCategory) || 'غير محدد'}
📊 المستوى: ${merchant.merchantLevel || 'غير محدد'}
📅 تاريخ التسجيل: ${new Date(merchant.createdAt).toLocaleString('ar-EG')}
📌 الحالة: ${merchant.status === 'pending' ? '⏳ في الانتظار' : '✅ معتمد'}`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown'
        })
    });
}

// ========== تشغيل معالجة الأزرار كل 10 ثواني ==========
setInterval(handleTelegramCallbacks, 10000);

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
            <i class="fas fa-tags"></i><span>برومسيون</span>
        </a>
        <a class="nav-link" onclick="filterProducts('spices')">
            <i class="fas fa-seedling"></i><span>توابل</span>
        </a>
        <a class="nav-link" onclick="filterProducts('cosmetic')">
            <i class="fas fa-spa"></i><span>كوسمتيك</span>
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
        <a class="nav-link" onclick="scrollToReels()">
            <i class="fas fa-film" style="color: var(--gold);"></i><span>Reels</span>
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
            <div style="display: flex; gap: 20px; justify-content: center; margin: 20px 0;">
                <div style="text-align: center;">
                    <div style="font-size: 32px; color: var(--gold);">${merchantProducts.length}</div>
                    <div>📦 منتجاتي</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 32px; color: var(--gold);">${merchantProducts.filter(p => p.stock > 0).length}</div>
                    <div>✅ متاحة</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 32px; color: var(--gold);">${merchantProducts.reduce((sum, p) => sum + p.stock, 0)}</div>
                    <div>📊 إجمالي المخزون</div>
                </div>
            </div>
            <button class="btn-gold" onclick="showMerchantDashboard()">
                <i class="fas fa-chart-line"></i> فتح لوحة التحكم الكاملة
            </button>
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

    let modal = document.getElementById('merchantDashboardModal');
    if (!modal) {
        createMerchantDashboardModal();
        modal = document.getElementById('merchantDashboardModal');
    }

    const content = document.getElementById('merchantDashboardContent');
    content.innerHTML = `
        <div class="merchant-dashboard">
            <div class="dashboard-header" style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px;">
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
                    <span class="merchant-badge approved">
                        <i class="fas fa-check-circle"></i> تاجر معتمد
                    </span>
                </div>
            </div>

            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px;">
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
                                        <span class="stock-badge ${p.stock < 5 ? 'low' : 'good'}">
                                            ${p.stock}
                                        </span>
                                    </td>
                                    <td style="padding: 12px;">
                                        <a href="${p.telegramLink}" target="_blank">
                                            <i class="fab fa-telegram"></i> ${p.telegramMessageId}
                                        </a>
                                    </td>
                                    <td style="padding: 12px;">
                                        <button class="action-btn" onclick="editProduct(${p.id})" title="تعديل">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="action-btn" onclick="viewProductTelegram(${p.id})" title="عرض في تليجرام">
                                            <i class="fab fa-telegram"></i>
                                        </button>
                                        <button class="action-btn" onclick="deleteProduct(${p.id})" title="حذف">
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

    modal.style.display = 'flex';
}

function showMerchantProducts() {
    const merchantProducts = products.filter(p => 
        p.merchantId === currentUser.id || 
        p.merchantName === currentUser.storeName ||
        p.merchantName === currentUser.name
    );

    let modal = document.getElementById('merchantProductsModal');
    if (!modal) {
        createMerchantProductsModal();
        modal = document.getElementById('merchantProductsModal');
    }

    const content = document.getElementById('merchantProductsContent');
    content.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 20px;">📦 منتجاتي (${merchantProducts.length})</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">
            ${merchantProducts.map(p => `
                <div class="product-mini-card" style="background: var(--glass); border-radius: 10px; padding: 15px;">
                    <img src="${p.images?.[0] || 'https://via.placeholder.com/150'}" 
                         style="width: 100%; height: 150px; object-fit: cover; border-radius: 10px;">
                    <h4 style="margin: 10px 0;">${p.name}</h4>
                    <p style="color: var(--gold); font-weight: bold;">${p.price} دج</p>
                    <p>📦 ${p.stock} قطعة</p>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-gold" onclick="editProduct(${p.id})" style="flex: 1;">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="btn-outline-gold" onclick="deleteProduct(${p.id})" style="flex: 1;">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    modal.style.display = 'flex';
}

function showMerchantOrders() {
    const orders = JSON.parse(localStorage.getItem('nardoo_orders') || '[]');
    const merchantOrders = orders.filter(order => 
        order.items.some(item => 
            item.merchantName === currentUser.storeName || 
            item.merchantName === currentUser.name
        )
    );

    let modal = document.getElementById('merchantOrdersModal');
    if (!modal) {
        createMerchantOrdersModal();
        modal = document.getElementById('merchantOrdersModal');
    }

    const content = document.getElementById('merchantOrdersContent');
    content.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 20px;">🛒 طلباتي (${merchantOrders.length})</h3>
        ${merchantOrders.length === 0 ? '<p style="text-align: center;">لا توجد طلبات حتى الآن</p>' : 
            merchantOrders.map(order => {
                const merchantItems = order.items.filter(item => 
                    item.merchantName === currentUser.storeName || 
                    item.merchantName === currentUser.name
                );
                const merchantTotal = merchantItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

                return `
                    <div class="order-card" style="background: var(--glass); border-radius: 10px; padding: 20px; margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between;">
                            <h4>🆔 طلب رقم: ${order.orderId}</h4>
                            <span class="status-badge new">جديد</span>
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
                            <button class="btn-gold" onclick="contactCustomer('${order.customerPhone}')">
                                <i class="fas fa-phone"></i> اتصال
                            </button>
                            <button class="btn-telegram" onclick="contactCustomerTelegram('${order.customerName}')">
                                <i class="fab fa-telegram"></i> تواصل
                            </button>
                        </div>
                    </div>
                `;
            }).join('')
        }
    `;

    modal.style.display = 'flex';
}

function showAdminDashboard() {
    if (currentUser?.role !== 'admin') {
        showNotification('غير مصرح', 'error');
        return;
    }
    
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
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 20px;">
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
        
        <div style="margin-top: 30px;">
            <button class="btn-gold" onclick="showPendingMerchants()">
                <i class="fas fa-user-clock"></i> عرض طلبات التجار
            </button>
            <button class="btn-outline-gold" onclick="showApprovedMerchants()" style="margin-right: 10px;">
                <i class="fas fa-store"></i> التجار المعتمدين
            </button>
            <button class="btn-outline-gold" onclick="showAllOrders()" style="margin-right: 10px;">
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
                <div style="display: flex; gap: 20px;">
                    <img src="${m.storeLogo || 'https://via.placeholder.com/100'}" 
                         style="width: 100px; height: 100px; border-radius: 15px; object-fit: cover;">
                    
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between;">
                            <h4 style="color: var(--gold);">${m.storeName || m.name}</h4>
                            <span class="status-badge pending">
                                <i class="fas fa-hourglass-half"></i> في الانتظار
                            </span>
                        </div>
                        
                        <p><i class="fas fa-user"></i> ${m.name}</p>
                        <p><i class="fas fa-envelope"></i> ${m.email}</p>
                        <p><i class="fas fa-phone"></i> ${m.phone}</p>
                        <p><i class="fab fa-telegram"></i> ${m.telegram}</p>
                        <p><i class="fas fa-tag"></i> التخصص: ${getCategoryName(m.merchantCategory)}</p>
                        <p><i class="fas fa-calendar"></i> ${new Date(m.createdAt).toLocaleDateString('ar-EG')}</p>
                        
                        <div style="margin-top: 15px; display: flex; gap: 10px;">
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

function approveMerchant(merchantId) {
    if (currentUser?.role !== 'admin') return;

    const merchant = users.find(u => u.id == merchantId);
    if (!merchant) return;

    merchant.role = 'merchant_approved';
    merchant.status = 'approved';
    merchant.approvedBy = currentUser.id;
    merchant.approvedAt = new Date().toISOString();

    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    sendApprovalNotification(merchant);
    
    showNotification(`✅ تمت الموافقة على ${merchant.storeName}`, 'success');
    showPendingMerchants();
}

async function sendApprovalNotification(merchant) {
    try {
        const message = `
🎉 تهانينا! تمت الموافقة على طلب انضمامك كتاجر في ناردو برو

📌 متجرك: ${merchant.storeName}
🆔 معرفك: ${merchant.telegram}
📝 المستوى: ${merchant.merchantLevel}

✨ يمكنك الآن:
✅ إضافة منتجاتك
✅ إدارة متجرك
✅ التواصل مع العملاء
✅ متابعة طلباتك

🔗 رابط المتجر: ${window.location.origin}
📱 للدعم: @nardoo_support

نتمنى لك تجارة موفقة 🌟
        `;

        await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: merchant.telegram.replace('@', ''),
                text: message,
                parse_mode: 'HTML'
            })
        });

        console.log('✅ تم إرسال إشعار الموافقة للتاجر');
    } catch (error) {
        console.error('❌ فشل إرسال الإشعار:', error);
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
                            <button class="btn-outline-gold" onclick="contactMerchant('${m.telegram}')" style="flex: 1;">
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

    let modal = document.getElementById('merchantProductsModal');
    if (!modal) {
        createMerchantProductsModal();
        modal = document.getElementById('merchantProductsModal');
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

    modal.style.display = 'flex';
}

function showAllOrders() {
    const orders = JSON.parse(localStorage.getItem('nardoo_orders') || '[]');
    const content = document.getElementById('dashboardContent');
    
    content.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 20px;">🛒 جميع الطلبات (${orders.length})</h3>
        <div style="max-height: 500px; overflow-y: auto;">
            ${orders.map(order => `
                <div class="order-card" style="background: var(--glass); border-radius: 10px; padding: 20px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between;">
                        <h4>🆔 طلب رقم: ${order.orderId}</h4>
                        <span class="status-badge new">جديد</span>
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
            <div class="modal-header">
                <h2>➕ إضافة منتج جديد</h2>
                <button class="close-btn" onclick="closeModal('productModal')">&times;</button>
            </div>
            <div class="modal-body">
                <form id="productForm" onsubmit="event.preventDefault(); saveProduct();">
                    ${telegramField}
                    
                    <div class="form-group">
                        <label>📦 اسم المنتج</label>
                        <input type="text" id="productName" class="form-control" required>
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
                            <input type="number" id="productPrice" class="form-control" required>
                        </div>
                        
                        <div class="form-group">
                            <label>📊 الكمية</label>
                            <input type="number" id="productStock" class="form-control" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>📝 وصف المنتج</label>
                        <textarea id="productDescription" class="form-control" rows="3"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>🖼️ صورة المنتج</label>
                        <input type="file" id="productImages" class="form-control" accept="image/*" required>
                        <div id="imagePreview" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;"></div>
                    </div>
                    
                    <div class="form-actions" style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 20px;">
                        <button type="submit" class="btn-gold">
                            <i class="fas fa-cloud-upload-alt"></i> رفع المنتج
                        </button>
                        <button type="button" class="btn-outline-gold" onclick="closeModal('productModal')">
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

function contactCustomer(phone) {
    window.open(`tel:${phone}`);
}

function contactCustomerTelegram(customerName) {
    window.open('https://t.me/nardoo_support');
}

// ========== 16. إنشاء المودالات ==========
function createMerchantDashboardModal() {
    const modal = document.createElement('div');
    modal.id = 'merchantDashboardModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1200px; width: 95%;">
            <div class="modal-header">
                <h2><i class="fas fa-store"></i> لوحة تحكم التاجر</h2>
                <button class="close-btn" onclick="closeModal('merchantDashboardModal')">&times;</button>
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
            <div class="modal-header">
                <h2><i class="fas fa-boxes"></i> منتجات التاجر</h2>
                <button class="close-btn" onclick="closeModal('merchantProductsModal')">&times;</button>
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
            <div class="modal-header">
                <h2><i class="fas fa-shopping-bag"></i> طلباتي</h2>
                <button class="close-btn" onclick="closeModal('merchantOrdersModal')">&times;</button>
            </div>
            <div class="modal-body" id="merchantOrdersContent" style="max-height: 80vh; overflow-y: auto;">
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ========== 17. نظام Reels المتطور مع التشغيل التلقائي ==========

// تهيئة مراقبة التمرير للـ Reels
function initReelsObserver() {
    if (reelsObserver) {
        reelsObserver.disconnect();
    }
    
    reelsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const reelCard = entry.target;
                const video = reelCard.querySelector('video');
                if (video) {
                    playReel(reelCard);
                }
            } else {
                const reelCard = entry.target;
                stopReel(reelCard);
            }
        });
    }, {
        threshold: 0.7,
        rootMargin: '0px'
    });

    document.querySelectorAll('.reel-card').forEach(card => {
        reelsObserver.observe(card);
    });
}

// تشغيل Reel
function playReel(reelCard) {
    const video = reelCard.querySelector('video');
    const playIcon = reelCard.querySelector('.reel-play-icon');
    
    if (video) {
        if (currentPlayingReel && currentPlayingReel !== video) {
            const oldCard = currentPlayingReel.closest('.reel-card');
            if (oldCard) {
                oldCard.classList.remove('reel-playing');
            }
            currentPlayingReel.pause();
            currentPlayingReel.currentTime = 0;
        }
        
        const isMuted = document.getElementById('reelsMuteToggle')?.classList.contains('muted');
        video.muted = isMuted || false;
        
        video.play().then(() => {
            currentPlayingReel = video;
            if (playIcon) playIcon.style.display = 'none';
            reelCard.classList.add('reel-playing');
        }).catch(e => console.log('لا يمكن تشغيل الفيديو:', e));
    }
}

// إيقاف Reel
function stopReel(reelCard) {
    const video = reelCard.querySelector('video');
    const playIcon = reelCard.querySelector('.reel-play-icon');
    
    if (video) {
        video.pause();
        video.currentTime = 0;
        if (playIcon) playIcon.style.display = 'flex';
        reelCard.classList.remove('reel-playing');
        
        if (currentPlayingReel === video) {
            currentPlayingReel = null;
        }
    }
}

// جلب Reels من تلجرام
async function loadReelsFromTelegram() {
    try {
        console.log('🔄 جاري جلب الـ Reels من تلجرام...');
        
        const savedReels = localStorage.getItem('nardoo_reels');
        if (savedReels) {
            const parsedReels = JSON.parse(savedReels);
            if (parsedReels.length > 0) {
                console.log(`✅ تم تحميل ${parsedReels.length} Reel من التخزين المحلي`);
                return parsedReels;
            }
        }
        
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`
        );
        
        const data = await response.json();
        const reelsList = [];
        
        if (data.ok && data.result) {
            const updates = [...data.result].reverse();
            let reelCount = 0;
            
            for (const update of updates) {
                if (reelCount >= 20) break;
                
                const post = update.channel_post || update.message;
                if (!post || !post.video) continue;
                
                const reelId = post.message_id;
                const caption = post.caption || '';
                
                let title = 'Reel';
                let duration = post.video.duration || 0;
                let views = Math.floor(Math.random() * 1000000) + 100000;
                
                const lines = caption.split('\n');
                lines.forEach(line => {
                    if (line.includes('العنوان:') || line.includes('📌')) {
                        title = line.replace('العنوان:', '').replace('📌', '').trim();
                    }
                    if (line.includes('مشاهدات:') || line.includes('👁️')) {
                        const match = line.match(/\d+/);
                        if (match) views = parseInt(match[0]);
                    }
                });
                
                const fileId = post.video.file_id;
                const fileResponse = await fetch(
                    `https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`
                );
                const fileData = await fileResponse.json();
                
                if (fileData.ok) {
                    let thumbnailUrl = '';
                    if (post.video.thumb) {
                        const thumbResponse = await fetch(
                            `https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${post.video.thumb.file_id}`
                        );
                        const thumbData = await thumbResponse.json();
                        if (thumbData.ok) {
                            thumbnailUrl = `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${thumbData.result.file_path}`;
                        }
                    }
                    
                    const videoUrl = `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`;
                    const thumbprint = generateReelThumbprint(reelId);
                    
                    reelsList.push({
                        id: reelId,
                        messageId: reelId,
                        title: title,
                        duration: duration,
                        views: views,
                        thumbnail: thumbnailUrl || `https://img.youtube.com/vi/${reelId}/maxresdefault.jpg`,
                        videoUrl: videoUrl,
                        telegramLink: `https://t.me/nardoo_channel/${reelId}`,
                        thumbprint: thumbprint,
                        createdAt: new Date(post.date * 1000).toISOString(),
                        date: new Date(post.date * 1000)
                    });
                    
                    reelCount++;
                }
            }
        }
        
        if (reelsList.length === 0) {
            console.log('⚠️ لم يتم العثور على Reels، استخدام بيانات تجريبية');
            const mockReels = getMockReels();
            reelsList.push(...mockReels);
        }
        
        reelsList.sort((a, b) => b.date - a.date);
        console.log(`✅ تم تحميل ${reelsList.length} Reel من تلجرام`);
        
        localStorage.setItem('nardoo_reels', JSON.stringify(reelsList));
        return reelsList;
        
    } catch (error) {
        console.error('❌ خطأ في جلب الـ Reels:', error);
        const mockReels = getMockReels();
        localStorage.setItem('nardoo_reels', JSON.stringify(mockReels));
        return mockReels;
    }
}

// بيانات تجريبية للـ Reels
function getMockReels() {
    return [
        {
            id: 'RgKAFK5djSk',
            messageId: 'RgKAFK5djSk',
            title: 'Wiz Khalifa - See You Again ft. Charlie Puth',
            duration: 120,
            views: 1500000000,
            thumbnail: 'https://img.youtube.com/vi/RgKAFK5djSk/maxresdefault.jpg',
            videoUrl: 'https://www.youtube.com/shorts/RgKAFK5djSk',
            telegramLink: 'https://www.youtube.com/shorts/RgKAFK5djSk',
            thumbprint: 'TP_YO_RgKAFK_HN68_Oufo',
            createdAt: new Date().toISOString(),
            date: new Date()
        },
        {
            id: 'dQw4w9WgXcQ',
            messageId: 'dQw4w9WgXcQ',
            title: 'Rick Astley - Never Gonna Give You Up',
            duration: 90,
            views: 1200000000,
            thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
            videoUrl: 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
            telegramLink: 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
            thumbprint: 'TP_YO_dQw4w9_AH67_Poir',
            createdAt: new Date().toISOString(),
            date: new Date()
        },
        {
            id: 'kJQP7kiw5Fk',
            messageId: 'kJQP7kiw5Fk',
            title: 'Ed Sheeran - Shape of You',
            duration: 110,
            views: 5000000000,
            thumbnail: 'https://img.youtube.com/vi/kJQP7kiw5Fk/maxresdefault.jpg',
            videoUrl: 'https://www.youtube.com/shorts/kJQP7kiw5Fk',
            telegramLink: 'https://www.youtube.com/shorts/kJQP7kiw5Fk',
            thumbprint: 'TP_YO_kJQP7k_BN45_Koli',
            createdAt: new Date().toISOString(),
            date: new Date()
        },
        {
            id: 'OPf0YbXqDm0',
            messageId: 'OPf0YbXqDm0',
            title: 'Mark Ronson - Uptown Funk ft. Bruno Mars',
            duration: 95,
            views: 4500000000,
            thumbnail: 'https://img.youtube.com/vi/OPf0YbXqDm0/maxresdefault.jpg',
            videoUrl: 'https://www.youtube.com/shorts/OPf0YbXqDm0',
            telegramLink: 'https://www.youtube.com/shorts/OPf0YbXqDm0',
            thumbprint: 'TP_YO_OPf0Yb_CM78_Wert',
            createdAt: new Date().toISOString(),
            date: new Date()
        },
        {
            id: 'fJ9rUzIMcZQ',
            messageId: 'fJ9rUzIMcZQ',
            title: 'Queen - Bohemian Rhapsody',
            duration: 85,
            views: 1800000000,
            thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/maxresdefault.jpg',
            videoUrl: 'https://www.youtube.com/shorts/fJ9rUzIMcZQ',
            telegramLink: 'https://www.youtube.com/shorts/fJ9rUzIMcZQ',
            thumbprint: 'TP_YO_fJ9rUz_XC90_Jklo',
            createdAt: new Date().toISOString(),
            date: new Date()
        }
    ];
}

// توليد بصمة Reel
function generateReelThumbprint(reelId) {
    const timestamp = Date.now().toString(36).slice(-4);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const idPart = reelId.toString().slice(-4);
    return `TP_YO_${idPart}_${random}_${timestamp}`;
}

// عرض Reels في المتجر
function displayReels() {
    const container = document.getElementById('reelsTrack');
    if (!container) {
        console.log('❌ حاوية Reels غير موجودة');
        return;
    }

    console.log(`📊 عرض ${reels.length} Reel`);

    if (reels.length === 0) {
        container.innerHTML = `
            <div class="reels-empty">
                <i class="fas fa-film"></i>
                <span>لا توجد Reels بعد</span>
            </div>
        `;
        return;
    }

    container.innerHTML = reels.map((reel, index) => {
        const durationMinutes = Math.floor(reel.duration / 60);
        const durationSeconds = reel.duration % 60;
        const durationText = durationMinutes > 0 
            ? `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`
            : `${durationSeconds} ث`;

        const hasVideo = reel.videoUrl && reel.videoUrl.includes('telegram');
        
        return `
            <div class="reel-card" data-reel-id="${reel.id}" data-index="${index}" onclick="expandReel('${reel.thumbprint}')">
                <div class="reel-thumbnail ${hasVideo ? 'has-video' : ''}">
                    ${hasVideo ? `
                        <video class="reel-video-preview" loop muted playsinline preload="metadata">
                            <source src="${reel.videoUrl}" type="video/mp4">
                        </video>
                    ` : `
                        <img src="${reel.thumbnail}" alt="${reel.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x500/2c5e4f/ffffff?text=Reel'">
                    `}
                    
                    <div class="reel-play-icon" style="display: ${hasVideo ? 'none' : 'flex'};">
                        <i class="fas fa-play"></i>
                    </div>
                    
                    <div class="reel-duration">⏱️ ${durationText}</div>
                    <div class="reel-views">👁️ ${(reel.views / 1000000).toFixed(1)}M</div>
                    
                    <div class="reel-title-overlay">
                        <h4>${reel.title.substring(0, 30)}${reel.title.length > 30 ? '...' : ''}</h4>
                    </div>
                    
                    <div class="reel-volume-control" onclick="event.stopPropagation(); toggleReelVolume(this)">
                        <i class="fas fa-volume-mute"></i>
                    </div>
                </div>
                
                <div class="reel-info">
                    <div class="reel-thumbprint" title="البصمة الفريدة">
                        <i class="fas fa-fingerprint" style="color: var(--gold);"></i>
                        <span>${reel.thumbprint}</span>
                    </div>
                    
                    <div class="reel-actions-mini">
                        <button class="reel-action-btn" onclick="event.stopPropagation(); likeReel('${reel.thumbprint}')">
                            <i class="far fa-heart"></i>
                        </button>
                        <button class="reel-action-btn" onclick="event.stopPropagation(); shareReel('${reel.thumbprint}')">
                            <i class="far fa-share-square"></i>
                        </button>
                        <button class="reel-action-btn" onclick="event.stopPropagation(); downloadReel('${reel.thumbprint}')">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    setTimeout(() => {
        initReelsObserver();
        addReelsScrollListener();
        updateScrollButtons();
    }, 500);
}

// توسيع Reel إلى وضع ملء الشاشة
function expandReel(thumbprint) {
    const reel = reels.find(r => r.thumbprint === thumbprint);
    if (!reel) return;

    const modal = document.createElement('div');
    modal.className = 'reels-fullscreen-modal';
    modal.onclick = function(e) {
        if (e.target === modal) closeFullscreenReel();
    };

    const durationMinutes = Math.floor(reel.duration / 60);
    const durationSeconds = reel.duration % 60;
    const durationText = durationMinutes > 0 
        ? `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`
        : `${durationSeconds} ث`;

    modal.innerHTML = `
        <div class="reels-fullscreen-content">
            <button class="reels-fullscreen-close" onclick="closeFullscreenReel()">
                <i class="fas fa-times"></i>
            </button>
            
            <div class="reels-fullscreen-video-container">
                <video class="reels-fullscreen-video" controls autoplay loop poster="${reel.thumbnail}">
                    <source src="${reel.videoUrl}" type="video/mp4">
                    <source src="https://www.youtube.com/watch?v=${reel.id}" type="video/mp4">
                </video>
                
                <div class="reels-fullscreen-overlay">
                    <div class="reels-fullscreen-header">
                        <h2>${reel.title}</h2>
                        <span class="reels-fullscreen-badge">
                            <i class="fas fa-fingerprint"></i> ${reel.thumbprint}
                        </span>
                    </div>
                    
                    <div class="reels-fullscreen-stats">
                        <div class="stat">
                            <i class="fas fa-eye"></i>
                            <span>${(reel.views / 1000000).toFixed(1)}M</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-clock"></i>
                            <span>${durationText}</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-calendar"></i>
                            <span>${new Date(reel.createdAt).toLocaleDateString('ar-EG')}</span>
                        </div>
                    </div>
                    
                    <div class="reels-fullscreen-actions">
                        <button class="reels-fullscreen-btn like" onclick="likeReel('${reel.thumbprint}')">
                            <i class="far fa-heart"></i> إعجاب
                        </button>
                        <button class="reels-fullscreen-btn share" onclick="shareReel('${reel.thumbprint}')">
                            <i class="far fa-share-square"></i> مشاركة
                        </button>
                        <button class="reels-fullscreen-btn download" onclick="downloadReel('${reel.thumbprint}')">
                            <i class="fas fa-download"></i> تحميل
                        </button>
                    </div>
                    
                    <div class="reels-fullscreen-share">
                        <input type="text" value="${reel.thumbprint}" readonly>
                        <button onclick="copyThumbprint('${reel.thumbprint}')">
                            <i class="fas fa-copy"></i> نسخ البصمة
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function closeFullscreenReel() {
    const modal = document.querySelector('.reels-fullscreen-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

// تفاعلات Reels
function toggleReelVolume(btn) {
    const video = btn.closest('.reel-card')?.querySelector('video');
    const icon = btn.querySelector('i');
    
    if (video) {
        video.muted = !video.muted;
        if (video.muted) {
            icon.className = 'fas fa-volume-mute';
            btn.classList.add('muted');
        } else {
            icon.className = 'fas fa-volume-up';
            btn.classList.remove('muted');
        }
    }
}

function likeReel(thumbprint) {
    const reel = reels.find(r => r.thumbprint === thumbprint);
    if (reel) {
        reel.liked = !reel.liked;
        const btns = document.querySelectorAll(`[onclick="likeReel('${thumbprint}')"] i`);
        btns.forEach(btn => {
            btn.className = reel.liked ? 'fas fa-heart' : 'far fa-heart';
            btn.style.color = reel.liked ? 'var(--gold)' : '';
        });
        showNotification(reel.liked ? '👍 تم الإعجاب' : '👎 تم إلغاء الإعجاب', 'success');
    }
}

function shareReel(thumbprint) {
    const reel = reels.find(r => r.thumbprint === thumbprint);
    if (reel) {
        if (navigator.share) {
            navigator.share({
                title: reel.title,
                text: `شاهد هذا Reel: ${reel.title}`,
                url: reel.videoUrl
            });
        } else {
            copyThumbprint(reel.thumbprint);
            showNotification('✅ تم نسخ البصمة للمشاركة', 'success');
        }
    }
}

function downloadReel(thumbprint) {
    const reel = reels.find(r => r.thumbprint === thumbprint);
    if (reel && reel.videoUrl) {
        const a = document.createElement('a');
        a.href = reel.videoUrl;
        a.download = `reel_${reel.thumbprint}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showNotification('📥 جاري التحميل...', 'info');
    } else {
        showNotification('❌ رابط التحميل غير متوفر', 'error');
    }
}

function copyThumbprint(thumbprint) {
    navigator.clipboard.writeText(thumbprint);
    showNotification('✅ تم نسخ البصمة', 'success');
}

// دوال التمرير والتحكم
function scrollReels(direction) {
    const container = document.getElementById('reelsTrack');
    if (!container) return;
    
    const scrollAmount = 300;
    
    if (direction === 'left') {
        container.scrollLeft -= scrollAmount;
    } else {
        container.scrollLeft += scrollAmount;
    }
    
    setTimeout(updateScrollButtons, 100);
}

function updateScrollButtons() {
    const container = document.getElementById('reelsTrack');
    const leftBtn = document.getElementById('scrollLeftBtn');
    const rightBtn = document.getElementById('scrollRightBtn');
    
    if (!container || !leftBtn || !rightBtn) return;
    
    leftBtn.disabled = container.scrollLeft <= 0;
    rightBtn.disabled = container.scrollLeft >= (container.scrollWidth - container.clientWidth - 10);
}

function addReelsScrollListener() {
    const reelsTrack = document.getElementById('reelsTrack');
    if (reelsTrack) {
        reelsTrack.addEventListener('scroll', () => {
            document.querySelectorAll('.reel-card').forEach(card => {
                const rect = card.getBoundingClientRect();
                const isVisible = rect.left >= 0 && rect.right <= window.innerWidth;
                
                if (isVisible) {
                    const video = card.querySelector('video');
                    if (video && video.paused) {
                        playReel(card);
                    }
                }
            });
        });
    }
}

function scrollToReels() {
    const reelsBar = document.querySelector('.reels-promo-bar');
    if (reelsBar) {
        reelsBar.scrollIntoView({ behavior: 'smooth' });
    }
}

function addReelsNavButton() {
    const nav = document.getElementById('mainNav');
    if (!nav) return;
    
    if (!document.querySelector('[onclick="scrollToReels()"]')) {
        const reelsBtn = document.createElement('a');
        reelsBtn.className = 'nav-link';
        reelsBtn.setAttribute('onclick', 'scrollToReels()');
        reelsBtn.innerHTML = '<i class="fas fa-film" style="color: var(--gold);"></i><span>Reels</span>';
        nav.appendChild(reelsBtn);
    }
}

function addGlobalVolumeControl() {
    const reelsBar = document.querySelector('.reels-promo-bar .reels-controls');
    if (!reelsBar) return;
    
    if (!document.getElementById('reelsMuteToggle')) {
        const volumeBtn = document.createElement('button');
        volumeBtn.id = 'reelsMuteToggle';
        volumeBtn.className = 'reels-volume-global';
        volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        volumeBtn.onclick = function() {
            const videos = document.querySelectorAll('.reel-card video');
            const isMuted = this.classList.contains('muted');
            
            videos.forEach(video => {
                video.muted = !isMuted;
            });
            
            if (isMuted) {
                this.innerHTML = '<i class="fas fa-volume-up"></i>';
                this.classList.remove('muted');
            } else {
                this.innerHTML = '<i class="fas fa-volume-mute"></i>';
                this.classList.add('muted');
            }
        };
        
        reelsBar.appendChild(volumeBtn);
    }
}

async function initReels() {
    console.log('🎬 تهيئة نظام Reels المتطور...');
    reels = await loadReelsFromTelegram();
    displayReels();
    addReelsNavButton();
    setTimeout(addGlobalVolumeControl, 1000);
}

// ========== 18. تأثيرات الكتابة ==========
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

// ========== 19. إضافة CSS ==========
const styles = `
    .btn-telegram {
        background: #0088cc;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 5px;
        transition: all 0.3s ease;
    }
    
    .btn-telegram:hover {
        background: #006699;
        transform: translateY(-2px);
    }
    
    .product-telegram a {
        transition: color 0.3s ease;
    }
    
    .product-telegram a:hover {
        color: #006699 !important;
        text-decoration: underline !important;
    }
    
    .merchant-badge {
        padding: 5px 15px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: bold;
    }
    
    .merchant-badge.approved {
        background: linear-gradient(45deg, #4CAF50, #45a049);
        color: white;
    }
    
    .merchant-badge.pending {
        background: linear-gradient(45deg, #FFC107, #FFB300);
        color: black;
    }
    
    .status-badge {
        padding: 5px 15px;
        border-radius: 20px;
        font-size: 12px;
    }
    
    .status-badge.pending {
        background: #FFC107;
        color: black;
    }
    
    .status-badge.approved {
        background: #4CAF50;
        color: white;
    }
    
    .status-badge.new {
        background: #2196F3;
        color: white;
    }
    
    .stock-badge {
        padding: 3px 10px;
        border-radius: 15px;
        font-size: 12px;
    }
    
    .stock-badge.good {
        background: #4CAF50;
        color: white;
    }
    
    .stock-badge.low {
        background: #f44336;
        color: white;
    }
    
    .action-btn {
        background: var(--glass);
        border: none;
        color: var(--text);
        width: 35px;
        height: 35px;
        border-radius: 8px;
        cursor: pointer;
        margin: 0 2px;
        transition: all 0.3s ease;
    }
    
    .action-btn:hover {
        background: var(--gold);
        color: black;
        transform: translateY(-2px);
    }
    
    .merchant-request-card {
        animation: slideIn 0.3s ease;
    }
    
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    /* أنماط Reels الجديدة */
    .reel-card {
        position: relative;
        cursor: pointer;
        transition: transform 0.3s ease;
    }

    .reel-card video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        pointer-events: none;
    }

    .reel-card.reel-playing {
        transform: scale(1.02);
        z-index: 10;
        animation: playingPulse 2s infinite;
    }

    @keyframes playingPulse {
        0% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(212, 175, 55, 0); }
        100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0); }
    }

    .reel-play-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 60px;
        height: 60px;
        background: rgba(212, 175, 55, 0.9);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 5;
        animation: pulse 2s infinite;
    }

    .reel-play-icon i {
        font-size: 30px;
        color: black;
        margin-left: 5px;
    }

    .reel-title-overlay {
        position: absolute;
        bottom: 50px;
        left: 0;
        right: 0;
        padding: 15px;
        background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
        color: white;
        z-index: 4;
    }

    .reel-title-overlay h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        text-shadow: 1px 1px 2px black;
    }

    .reel-volume-control {
        position: absolute;
        top: 15px;
        left: 15px;
        width: 35px;
        height: 35px;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 2px solid var(--gold);
    }

    .reel-volume-control:hover {
        background: var(--gold);
        transform: scale(1.1);
    }

    .reel-volume-control i {
        color: white;
        font-size: 16px;
    }

    .reel-volume-control.muted i {
        color: var(--red);
    }

    .reel-actions-mini {
        display: flex;
        gap: 8px;
        margin-top: 8px;
        justify-content: flex-end;
    }

    .reel-action-btn {
        width: 35px;
        height: 35px;
        border-radius: 50%;
        background: var(--glass);
        border: 1px solid var(--gold);
        color: var(--gold);
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .reel-action-btn:hover {
        background: var(--gold);
        color: black;
        transform: translateY(-3px);
    }

    /* نافذة ملء الشاشة */
    .reels-fullscreen-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
    }

    .reels-fullscreen-content {
        width: 100%;
        height: 100%;
        position: relative;
    }

    .reels-fullscreen-close {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        background: var(--gold);
        border: none;
        border-radius: 50%;
        color: black;
        font-size: 24px;
        cursor: pointer;
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
    }

    .reels-fullscreen-close:hover {
        transform: rotate(90deg) scale(1.1);
        background: var(--red);
        color: white;
    }

    .reels-fullscreen-video-container {
        width: 100%;
        height: 100%;
        position: relative;
    }

    .reels-fullscreen-video {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    .reels-fullscreen-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 30px;
        background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
        color: white;
    }

    .reels-fullscreen-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .reels-fullscreen-header h2 {
        margin: 0;
        color: var(--gold);
        font-size: 24px;
    }

    .reels-fullscreen-badge {
        background: rgba(212, 175, 55, 0.2);
        border: 1px solid var(--gold);
        padding: 8px 20px;
        border-radius: 50px;
        font-family: monospace;
        font-size: 16px;
    }

    .reels-fullscreen-stats {
        display: flex;
        gap: 30px;
        margin-bottom: 20px;
    }

    .reels-fullscreen-stats .stat {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #888;
    }

    .reels-fullscreen-stats .stat i {
        color: var(--gold);
    }

    .reels-fullscreen-actions {
        display: flex;
        gap: 15px;
        margin-bottom: 20px;
    }

    .reels-fullscreen-btn {
        flex: 1;
        padding: 15px;
        border: none;
        border-radius: 10px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    .reels-fullscreen-btn.like {
        background: linear-gradient(135deg, #ff6b6b, #ff4757);
        color: white;
    }

    .reels-fullscreen-btn.share {
        background: linear-gradient(135deg, #4ecdc4, #45b7af);
        color: white;
    }

    .reels-fullscreen-btn.download {
        background: linear-gradient(135deg, var(--gold), var(--gold-dark));
        color: black;
    }

    .reels-fullscreen-btn:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.3);
    }

    .reels-fullscreen-share {
        display: flex;
        gap: 10px;
    }

    .reels-fullscreen-share input {
        flex: 1;
        padding: 15px;
        background: rgba(255,255,255,0.1);
        border: 2px solid var(--gold);
        border-radius: 10px;
        color: white;
        font-family: monospace;
        font-size: 16px;
    }

    .reels-fullscreen-share button {
        padding: 15px 30px;
        background: var(--gold);
        border: none;
        border-radius: 10px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .reels-fullscreen-share button:hover {
        transform: scale(1.05);
        background: white;
    }

    .reels-volume-global {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--glass);
        border: 2px solid var(--gold);
        color: var(--gold);
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .reels-volume-global:hover {
        background: var(--gold);
        color: black;
        transform: scale(1.1);
    }

    .reels-volume-global.muted {
        color: var(--red);
        border-color: var(--red);
    }
`;

const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// ========== 20. التهيئة ==========
window.onload = async function() {
    console.log('🚀 بدء تشغيل ناردو برو...');
    
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
            offset: 100
        });
    }
    
    products = await loadProductsFromTelegram();
    displayProducts();
    
    loadCart();

    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIBasedOnRole();
        updateNavigation();
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

    await initReels();

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

// تحديث أزرار التمرير عند تغيير حجم النافذة
window.addEventListener('resize', () => {
    setTimeout(updateScrollButtons, 100);
});

// تحديث دوري كل 30 ثانية
setInterval(updateScrollButtons, 30000);
