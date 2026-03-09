// ========== ناردو برو - النظام الكامل والمصحح ==========

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
                name: 'مدير النظام', 
                email: 'admin@nardoo.com', 
                password: 'admin123', 
                role: 'admin',
                phone: '0555000000',
                createdAt: new Date().toISOString()
            },
            { 
                id: 2, 
                name: 'تاجر تجريبي', 
                email: 'merchant@nardoo.com', 
                password: 'merchant123', 
                role: 'merchant_approved',
                phone: '0555111111',
                storeName: 'متجر التجريبي',
                merchantLevel: '2',
                status: 'approved',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('nardoo_users', JSON.stringify(users));
    }
}
loadUsers();

// ========== 4. جلب المنتجات من تليجرام مع الصور ==========
async function loadProductsFromTelegram() {
    try {
        console.log('🔄 جاري جلب المنتجات من تلجرام...');
        
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`
        );
        
        const data = await response.json();
        const products = [];
        
        if (data.ok && data.result) {
            console.log(`✅ تم العثور على ${data.result.length} تحديث`);
            
            const updates = [...data.result].reverse();
            
            for (const update of updates) {
                if (!update.channel_post) continue;
                
                const post = update.channel_post;
                
                // البحث عن الصور
                if (post.photo && post.photo.length > 0) {
                    const text = post.caption || '';
                    
                    // أي رسالة تحتوي على منتج
                    if (text.includes('منتج') || text.includes('🟣')) {
                        console.log('📸 وجدنا منتج مع صورة');
                        
                        // جلب رابط الصورة
                        const fileId = post.photo[post.photo.length - 1].file_id;
                        const fileResponse = await fetch(
                            `https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`
                        );
                        const fileData = await fileResponse.json();
                        
                        if (fileData.ok) {
                            const imageUrl = `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`;
                            
                            // استخراج البيانات من النص
                            let name = 'منتج';
                            let price = 0;
                            let category = 'promo';
                            let stock = 0;
                            let merchant = 'المتجر';
                            
                            const lines = text.split('\n');
                            lines.forEach(line => {
                                if (line.includes('الاسم:') || line.includes('اسم:')) {
                                    name = line.replace(/.*(الاسم:|اسم:)/, '').replace(/[*🟣]/g, '').trim();
                                }
                                if (line.includes('السعر:')) {
                                    const match = line.match(/\d+/);
                                    if (match) price = parseInt(match[0]);
                                }
                                if (line.includes('القسم:')) {
                                    const cat = line.replace('القسم:', '').replace(/[*🟣]/g, '').trim().toLowerCase();
                                    if (cat.includes('promo') || cat.includes('برموسيو')) category = 'promo';
                                    else if (cat.includes('spices') || cat.includes('توابل')) category = 'spices';
                                    else if (cat.includes('cosmetic') || cat.includes('كوسمتيك')) category = 'cosmetic';
                                    else category = 'other';
                                }
                                if (line.includes('الكمية:')) {
                                    const match = line.match(/\d+/);
                                    if (match) stock = parseInt(match[0]);
                                }
                                if (line.includes('التاجر:')) {
                                    merchant = line.replace('التاجر:', '').replace(/[*🟣]/g, '').trim();
                                }
                            });
                            
                            products.push({
                                id: post.message_id,
                                name: name || 'منتج',
                                price: price || 0,
                                category: category,
                                stock: stock || 1,
                                merchantName: merchant || 'المتجر',
                                description: 'منتج مميز',
                                rating: 4.5,
                                images: [imageUrl],
                                createdAt: new Date(post.date * 1000).toISOString()
                            });
                            
                            console.log(`✅ منتج مضاف: ${name} - ${price} دج`);
                        }
                    }
                }
                // إذا كان المنشور نص فقط
                else if (post.text && post.text.includes('🟣')) {
                    const lines = post.text.split('\n');
                    let name = 'منتج';
                    let price = 0;
                    let category = 'other';
                    let stock = 0;
                    let merchant = 'المتجر';
                    
                    lines.forEach(line => {
                        if (line.includes('المنتج:') || line.includes('اسم:')) {
                            name = line.replace(/.*(المنتج:|اسم:)/, '').replace(/[🟣*]/g, '').trim();
                        } else if (line.includes('السعر:')) {
                            const match = line.match(/\d+/);
                            if (match) price = parseInt(match[0]);
                        } else if (line.includes('القسم:')) {
                            const cat = line.replace('القسم:', '').replace(/[🟣*]/g, '').trim().toLowerCase();
                            if (cat.includes('promo') || cat.includes('برموسيو')) category = 'promo';
                            else if (cat.includes('spices') || cat.includes('توابل')) category = 'spices';
                            else if (cat.includes('cosmetic') || cat.includes('كوسمتيك')) category = 'cosmetic';
                            else category = 'other';
                        } else if (line.includes('الكمية:')) {
                            const match = line.match(/\d+/);
                            if (match) stock = parseInt(match[0]);
                        } else if (line.includes('التاجر:')) {
                            merchant = line.replace('التاجر:', '').replace(/[🟣*]/g, '').trim();
                        }
                    });
                    
                    products.push({
                        id: post.message_id,
                        name: name,
                        price: price,
                        category: category,
                        stock: stock,
                        merchantName: merchant || 'المتجر',
                        description: 'منتج نصي',
                        rating: 4.5,
                        images: ["https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال"],
                        createdAt: new Date(post.date * 1000).toISOString()
                    });
                    
                    console.log(`📦 منتج نصي: ${name}`);
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

// ========== 5. إضافة منتج إلى تليجرام مع صورة ==========
async function addProductToTelegram(product) {
    const message = `منتج جديد
الاسم: ${product.name}
السعر: ${product.price} دج
القسم: ${product.category}
الكمية: ${product.stock}
التاجر: ${product.merchantName}`;

    try {
        if (product.imageUrl) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendPhoto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM.channelId,
                    photo: product.imageUrl,
                    caption: message
                })
            });
        } else {
            await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM.channelId,
                    text: message
                })
            });
        }
        
        showNotification('✅ تم إرسال المنتج إلى تلجرام', 'success');
        return true;
    } catch (error) {
        console.error('❌ خطأ في إضافة المنتج:', error);
        return false;
    }
}

// ========== 6. إرسال طلب شراء ==========
async function sendOrderToTelegram(order) {
    const message = `
🟢 طلب شراء جديد
━━━━━━━━━━━━━━━━
👤 الزبون: ${order.customerName}
📞 الهاتف: ${order.customerPhone || 'غير متوفر'}
📍 العنوان: ${order.customerAddress || 'غير محدد'}
📦 المنتجات:
${order.items.map((item, i) => 
    `  ${i+1}. ${item.name} (${item.quantity}) - ${item.price} دج`
).join('\n')}
💰 الإجمالي: ${order.total} دج
    `;

    await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM.channelId,
            text: message
        })
    });
}

// ========== 7. نظام الواتساب ==========
const whatsappManager = {
    storePhone: '213562243648',
    
    sendOrder(orderData, recipientPhone = null) {
        const items = orderData.items || [];
        const customerName = orderData.customerName || 'عميل';
        const customerPhone = orderData.customerPhone || '';
        const customerAddress = orderData.customerAddress || '';
        
        let message = '🛍️ طلب جديد من نكهة وجمال\n';
        message += '━━━━━━━━━━━━━━━━━━━━━━\n\n';
        message += `👤 الاسم: ${customerName}\n`;
        message += `📞 الهاتف: ${customerPhone}\n`;
        message += `📍 العنوان: ${customerAddress}\n\n`;
        message += '📦 المنتجات:\n';
        
        items.forEach((item, i) => {
            message += `  ${i+1}. ${item.name} - ${item.price} دج × ${item.quantity}\n`;
        });
        
        const subtotal = items.reduce((s, i) => s + (i.price * i.quantity), 0);
        const shipping = 800;
        const total = subtotal + shipping;
        
        message += `\n💰 الإجمالي: ${total} دج`;
        
        const phone = recipientPhone || this.storePhone;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    }
};

// ========== 8. دوال المساعدة والإشعارات ==========
function showNotification(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
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

// ========== 9. دالة الوقت ==========
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

// ========== 10. دوال الفرز ==========
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

// ========== 11. تحميل المنتجات وعرضها ==========
async function loadProducts() {
    products = await loadProductsFromTelegram();
    displayProducts();
}

function getCategoryName(category) {
    const names = {
        'promo': 'برموسيو',
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
        filtered = filtered.filter(p => p.merchantName === currentUser.storeName || p.merchantName === currentUser.name);
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

        return `
            <div class="product-card" onclick="viewProductDetails(${product.id})">
                <div class="product-time-badge">
                    <i class="far fa-clock"></i> ${timeAgo}
                </div>
                
                <div class="product-gallery">
                    <img src="${imageUrl}" onerror="this.src='https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال';">
                </div>

                <div class="product-info">
                    <div class="product-category">${getCategoryName(product.category)}</div>
                    
                    <h3 class="product-title">${product.name}</h3>
                    
                    <div class="product-merchant-info">
                        <i class="fas fa-store"></i> ${product.merchantName}
                    </div>
                    
                    <div class="product-rating">
                        <div class="stars-container">
                            ${generateStars(product.rating || 4.5)}
                        </div>
                        <span class="rating-value">${(product.rating || 4.5).toFixed(1)}</span>
                    </div>
                    
                    <div class="product-price">${product.price.toLocaleString()} <small>دج</small></div>
                    <div class="product-stock ${stockClass}">${stockText}</div>
                    
                    <div class="product-actions" onclick="event.stopPropagation()">
                        <button class="add-to-cart" onclick="addToCart(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> أضف للسلة
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

// ========== 12. إدارة السلة ==========
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
            merchantName: product.merchantName
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

// ========== 13. إتمام الشراء ==========
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

    const customerPhone = prompt('رقم الهاتف:', currentUser.phone || '');
    if (!customerPhone) return;
    
    const customerAddress = prompt('عنوان التوصيل:', '');
    if (!customerAddress) return;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 800;
    const total = subtotal + shipping;

    const order = {
        customerName: currentUser.name,
        customerPhone: customerPhone,
        customerAddress: customerAddress,
        items: [...cart],
        total: total
    };

    await sendOrderToTelegram(order);
    whatsappManager.sendOrder(order);

    cart = [];
    saveCart();
    updateCartCounter();
    toggleCart();
    
    showNotification('✅ تم إرسال الطلب بنجاح', 'success');
}

// ========== 14. دوال التمرير ==========
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

// ========== 15. عداد تنازلي ==========
function updateCountdown() {
    const hoursElement = document.getElementById('marqueeHours');
    const minutesElement = document.getElementById('marqueeMinutes');
    const secondsElement = document.getElementById('marqueeSeconds');
    
    if (!hoursElement || !minutesElement || !secondsElement) return;
    
    let hours = 12, minutes = 30, seconds = 45;
    
    setInterval(() => {
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 12; minutes = 30; seconds = 45; }
        
        hoursElement.textContent = hours.toString().padStart(2, '0');
        minutesElement.textContent = minutes.toString().padStart(2, '0');
        secondsElement.textContent = seconds.toString().padStart(2, '0');
    }, 1000);
}

// ========== 16. تقييم النجوم ==========
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

// ========== 17. عرض تفاصيل المنتج ==========
function viewProductDetails(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');

    const imageUrl = product.images && product.images.length > 0 ? product.images[0] : "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال";

    content.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 20px; color: var(--gold);">${product.name}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <div>
                <img src="${imageUrl}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 20px;">
            </div>
            <div>
                <p style="margin-bottom: 20px;">${product.description || 'منتج عالي الجودة'}</p>
                
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                    <i class="fas fa-store" style="color: var(--gold);"></i>
                    <span>${product.merchantName}</span>
                </div>
                
                <div class="product-rating" style="margin-bottom: 20px;">
                    <div class="stars-container">${generateStars(product.rating || 4.5)}</div>
                    <span class="rating-value">${(product.rating || 4.5).toFixed(1)}</span>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <span style="font-size: 32px; color: var(--gold);">${product.price.toLocaleString()} دج</span>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <span>${product.stock} قطعة متوفرة</span>
                </div>
                
                <div style="display: flex; gap: 15px;">
                    <button class="btn-gold" onclick="addToCart(${product.id}); closeModal('productDetailModal')">
                        أضف للسلة
                    </button>
                    <button class="btn-outline-gold" onclick="closeModal('productDetailModal')">
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

// ========== 18. إدارة المستخدمين ==========
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
        showNotification(`مرحباً ${user.name}`, 'success');
    } else {
        showNotification('بيانات غير صحيحة', 'error');
    }
}

function handleRegister() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const phone = document.getElementById('regPhone')?.value || '';
    const isMerchant = document.getElementById('isMerchant').checked;

    if (!name || !email || !password) {
        showNotification('املأ جميع الحقول', 'error');
        return;
    }

    if (users.find(u => u.email === email)) {
        showNotification('البريد مستخدم بالفعل', 'error');
        return;
    }

    const newUser = {
        id: users.length + 1,
        name,
        email,
        password,
        phone,
        role: isMerchant ? 'merchant_pending' : 'customer',
        createdAt: new Date().toISOString()
    };

    if (isMerchant) {
        newUser.storeName = document.getElementById('storeName').value || 'متجر ' + name;
        newUser.merchantLevel = document.getElementById('merchantLevel').value;
        newUser.status = 'pending';
        showNotification('📋 تم إرسال طلب التسجيل', 'info');
    } else {
        showNotification('✅ تم التسجيل', 'success');
    }

    users.push(newUser);
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    switchAuthTab('login');
}

function updateUIBasedOnRole() {
    if (!currentUser) return;

    document.getElementById('userBtn').innerHTML = 
        currentUser.role === 'admin' ? '<i class="fas fa-crown"></i>' :
        currentUser.role === 'merchant_approved' ? '<i class="fas fa-store"></i>' :
        '<i class="fas fa-user"></i>';

    if (currentUser.role === 'admin') {
        document.getElementById('dashboardBtn').style.display = 'flex';
        showAdminDashboard();
    } else if (currentUser.role === 'merchant_approved') {
        showMerchantPanel();
    }
}

function showMerchantPanel() {
    const merchantProducts = products.filter(p => p.merchantName === currentUser.storeName || p.merchantName === currentUser.name);
    
    const panel = document.getElementById('merchantPanelContainer');
    panel.style.display = 'block';
    panel.innerHTML = `
        <div class="merchant-panel">
            <h3>لوحة التاجر - ${currentUser.storeName || currentUser.name}</h3>
            <div style="display: flex; gap: 20px; justify-content: center; margin: 20px 0;">
                <div style="text-align: center;">
                    <div style="font-size: 32px; color: var(--gold);">${merchantProducts.length}</div>
                    <div>منتجاتي</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 32px; color: var(--gold);">${merchantProducts.filter(p => p.stock > 0).length}</div>
                    <div>متاحة</div>
                </div>
            </div>
            <button class="btn-gold" onclick="showAddProductModal()">إضافة منتج جديد</button>
        </div>
    `;
}

function showAdminDashboard() {
    const section = document.getElementById('dashboardSection');
    section.style.display = 'block';
    showDashboardOverview();
}

function showDashboardOverview() {
    const content = document.getElementById('dashboardContent');
    const pendingMerchants = users.filter(u => u.role === 'merchant_pending').length;
    
    content.innerHTML = `
        <h3 style="color: var(--gold);">نظرة عامة</h3>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px;">
            <div style="background: var(--glass); padding: 20px; border-radius: 15px;">
                <div style="font-size: 32px;">${products.length}</div>
                <div>إجمالي المنتجات</div>
            </div>
            <div style="background: var(--glass); padding: 20px; border-radius: 15px;">
                <div style="font-size: 32px;">${users.length}</div>
                <div>إجمالي المستخدمين</div>
            </div>
            <div style="background: var(--glass); padding: 20px; border-radius: 15px;">
                <div style="font-size: 32px;">${pendingMerchants}</div>
                <div>طلبات التجار</div>
            </div>
        </div>
    `;
}

// ========== 19. إضافة المنتجات ==========
function showAddProductModal() {
    if (!currentUser) {
        showNotification('سجل دخول أولاً', 'warning');
        openLoginModal();
        return;
    }
    document.getElementById('productModal').style.display = 'flex';
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

async function saveProduct() {
    if (!currentUser) {
        showNotification('يجب تسجيل الدخول', 'error');
        return;
    }

    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const description = document.getElementById('productDescription')?.value || '';
    const imageUrl = document.getElementById('productImage').value || '';
    
    if (!name || !category || !price || !stock) {
        showNotification('املأ جميع الحقول', 'error');
        return;
    }

    const product = {
        name: name,
        price: price,
        category: category,
        stock: stock,
        merchantName: currentUser.storeName || currentUser.name,
        description: description,
        imageUrl: imageUrl
    };

    const sent = await addProductToTelegram(product);
    
    if (sent) {
        showNotification('✅ تم إضافة المنتج', 'success');
        closeModal('productModal');
        
        setTimeout(async () => {
            await loadProducts();
        }, 2000);
    } else {
        showNotification('❌ فشل الإضافة', 'error');
    }
}

function switchDashboardTab(tab) {
    if (tab === 'overview') showDashboardOverview();
    else if (tab === 'merchants') showDashboardMerchants();
}

function showDashboardMerchants() {
    const pendingMerchants = users.filter(u => u.role === 'merchant_pending');
    const content = document.getElementById('dashboardContent');
    
    content.innerHTML = `
        <h3 style="color: var(--gold);">طلبات التجار</h3>
        ${pendingMerchants.map(m => `
            <div style="background: var(--glass); border: 1px solid var(--gold); border-radius: 10px; padding: 15px; margin: 10px 0;">
                <p><strong>${m.storeName || m.name}</strong></p>
                <p>البريد: ${m.email}</p>
                <p>الهاتف: ${m.phone || 'غير متوفر'}</p>
                <button class="btn-gold" onclick="approveMerchant(${m.id})">موافقة</button>
                <button class="btn-outline-gold" onclick="rejectMerchant(${m.id})">رفض</button>
            </div>
        `).join('')}
    `;
}

function approveMerchant(id) {
    const user = users.find(u => u.id == id);
    if (user) {
        user.role = 'merchant_approved';
        user.status = 'approved';
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        showNotification('تمت الموافقة', 'success');
        showDashboardMerchants();
    }
}

function rejectMerchant(id) {
    const user = users.find(u => u.id == id);
    if (user) {
        user.role = 'customer';
        user.status = 'rejected';
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        showNotification('تم الرفض', 'info');
        showDashboardMerchants();
    }
}

// ========== 20. تأثيرات الكتابة ==========
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

// ========== 21. التهيئة ==========
window.onload = async function() {
    await loadProducts();
    loadCart();

    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIBasedOnRole();
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
    updateCountdown();
    
    const typingElement = document.getElementById('typing-text');
    if (typingElement) {
        new TypingAnimation(typingElement, ['نكهة وجمال', 'تسوق آمن', 'جودة عالية'], 100, 2000).start();
    }
    
    console.log('✅ النظام جاهز للعمل');
};

// ========== إغلاق النوافذ ==========
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};
