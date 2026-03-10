// ========== ناردو برو - النظام النهائي المتكامل مع Reels ==========

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

// ========== 4. دوال المساعدة والإشعارات ==========
function showNotification(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        // إنشاء حاوية الإشعارات إذا لم تكن موجودة
        const newContainer = document.createElement('div');
        newContainer.id = 'toastContainer';
        newContainer.className = 'toast-container';
        document.body.appendChild(newContainer);
    }
    
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-message">${message}</div>`;
    toastContainer.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

// ========== 5. دوال الوقت والفرز ==========
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

// ========== 6. جلب المنتجات من تلجرام ==========
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

// ========== 7. عرض المنتجات ==========
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

function getCategoryName(category) {
    const names = {
        'promo': 'برومسيون',
        'spices': 'توابل',
        'cosmetic': 'كوسمتيك',
        'other': 'منتوجات أخرى'
    };
    return names[category] || 'أخرى';
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

// ========== 8. إدارة السلة ==========
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

// ========== 9. إتمام الشراء ==========
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

    showNotification('✅ تم إرسال الطلب بنجاح', 'success');
    
    cart = [];
    saveCart();
    updateCartCounter();
    toggleCart();
}

// ========== 10. إدارة المستخدمين ==========
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
        showNotification(`👋 مرحباً ${user.name}`, 'success');
        console.log('✅ تم تسجيل الدخول:', user);
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
        
        showNotification('✅ تم إرسال طلب التسجيل', 'success');
    } else {
        showNotification('✅ تم التسجيل بنجاح', 'success');
    }

    users.push(newUser);
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    document.getElementById('registerForm').reset();
    switchAuthTab('login');
}

function updateUIBasedOnRole() {
    if (!currentUser) return;

    const userBtn = document.getElementById('userBtn');
    if (userBtn) {
        userBtn.innerHTML = 
            currentUser.role === 'admin' ? '<i class="fas fa-crown"></i>' :
            currentUser.role === 'merchant_approved' ? '<i class="fas fa-store"></i>' :
            '<i class="fas fa-user"></i>';
    }
}

function viewProductDetails(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');

    const imageUrl = product.images && product.images.length > 0 ? product.images[0] : "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال";
    const telegramUsername = product.merchantTelegram || '@' + product.merchantName.replace(/\s+/g, '');

    content.innerHTML = `
        <div style="padding: 20px;">
            <h2 style="text-align: center; margin-bottom: 20px; color: var(--gold);">${product.name}</h2>
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

// ========== 11. دوال التمرير ==========
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

// ========== 12. نظام Reels من قناة Telegram ==========

// جلب Reels من قناة Telegram
async function loadReelsFromTelegram() {
    try {
        console.log('🔄 جاري جلب الـ Reels من تلجرام...');
        
        // محاولة جلب من localStorage أولاً
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
                if (reelCount >= 20) break; // حد أقصى 20 Reel
                
                const post = update.channel_post || update.message;
                
                // التحقق من وجود فيديو (Reel)
                if (!post || !post.video) continue;
                
                const reelId = post.message_id;
                const caption = post.caption || '';
                
                // استخراج البيانات من الكابشن
                let title = 'Reel';
                let duration = post.video.duration || 0;
                let views = Math.floor(Math.random() * 1000000) + 100000; // مشاهدات عشوائية للتجربة
                
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
                
                // الحصول على معلومات الفيديو
                const fileId = post.video.file_id;
                const fileResponse = await fetch(
                    `https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`
                );
                const fileData = await fileResponse.json();
                
                if (fileData.ok) {
                    // رابط الصورة المصغرة (Thumbnail)
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
                    
                    // رابط الفيديو
                    const videoUrl = `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`;
                    
                    // توليد بصمة فريدة
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
        
        // إذا لم نجد أي Reels، نستخدم بيانات تجريبية
        if (reelsList.length === 0) {
            console.log('⚠️ لم يتم العثور على Reels، استخدام بيانات تجريبية');
            const mockReels = getMockReels();
            reelsList.push(...mockReels);
        }
        
        // ترتيب من الأحدث للأقدم
        reelsList.sort((a, b) => b.date - a.date);
        
        console.log(`✅ تم تحميل ${reelsList.length} Reel من تلجرام`);
        
        // حفظ في localStorage
        localStorage.setItem('nardoo_reels', JSON.stringify(reelsList));
        
        return reelsList;
        
    } catch (error) {
        console.error('❌ خطأ في جلب الـ Reels:', error);
        // في حالة الخطأ، نستخدم بيانات تجريبية
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

    container.innerHTML = reels.map(reel => {
        const durationMinutes = Math.floor(reel.duration / 60);
        const durationSeconds = reel.duration % 60;
        const durationText = durationMinutes > 0 
            ? `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`
            : `${durationSeconds} ث`;

        return `
            <div class="reel-card" onclick="viewReelDetails('${reel.thumbprint}')">
                <div class="reel-thumbnail">
                    <img src="${reel.thumbnail}" alt="${reel.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x500/2c5e4f/ffffff?text=Reel'">
                    <div class="reel-duration">⏱️ ${durationText}</div>
                    <div class="reel-views">👁️ ${(reel.views / 1000000).toFixed(1)}M</div>
                    <div class="reel-play-overlay">
                        <i class="fas fa-play-circle"></i>
                    </div>
                </div>
                <div class="reel-info">
                    <h4 class="reel-title">${reel.title.substring(0, 30)}${reel.title.length > 30 ? '...' : ''}</h4>
                    <div class="reel-thumbprint" title="البصمة الفريدة">
                        <i class="fas fa-fingerprint" style="color: var(--gold);"></i>
                        <span>${reel.thumbprint}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // تفعيل أزرار التمرير
    setTimeout(updateScrollButtons, 100);
}

// عرض تفاصيل Reel
function viewReelDetails(thumbprint) {
    const reel = reels.find(r => r.thumbprint === thumbprint);
    if (!reel) return;

    const modal = document.getElementById('reelViewModal');
    const content = document.getElementById('reelViewContent');

    content.innerHTML = `
        <div class="reel-view-container">
            <div class="reel-video-container">
                <video controls poster="${reel.thumbnail}">
                    <source src="${reel.videoUrl}" type="video/mp4">
                    <source src="https://www.youtube.com/watch?v=${reel.id}" type="video/mp4">
                    متصفحك لا يدعم تشغيل الفيديو
                </video>
            </div>
            
            <div class="reel-details">
                <div class="reel-detail-header">
                    <h3>${reel.title}</h3>
                    <span class="reel-thumbprint-badge">
                        <i class="fas fa-fingerprint"></i> ${reel.thumbprint}
                    </span>
                </div>
                
                <div class="reel-stats">
                    <div class="stat-item">
                        <i class="fas fa-eye"></i>
                        <span>${(reel.views / 1000000).toFixed(1)}M مشاهدة</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-clock"></i>
                        <span>${Math.floor(reel.duration / 60)}:${(reel.duration % 60).toString().padStart(2, '0')}</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-calendar"></i>
                        <span>${new Date(reel.createdAt).toLocaleDateString('ar-EG')}</span>
                    </div>
                </div>
                
                <div class="reel-actions">
                    <a href="${reel.videoUrl}" target="_blank" class="btn-gold" style="flex: 1;">
                        <i class="fas fa-play"></i> مشاهدة
                    </a>
                    <a href="${reel.telegramLink}" target="_blank" class="btn-telegram" style="flex: 1;">
                        <i class="fab fa-telegram"></i> مشاركة
                    </a>
                </div>
                
                <div class="reel-share">
                    <h4>البصمة:</h4>
                    <div class="share-box">
                        <input type="text" value="${reel.thumbprint}" readonly id="thumbprintCopy">
                        <button onclick="copyThumbprint('${reel.thumbprint}')">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

// نسخ البصمة
function copyThumbprint(thumbprint) {
    navigator.clipboard.writeText(thumbprint);
    showNotification('✅ تم نسخ البصمة', 'success');
}

// التمرير في شريط Reels
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

// إضافة زر Reels في القائمة
function addReelsNavButton() {
    const nav = document.getElementById('mainNav');
    if (!nav) return;
    
    // التحقق إذا كان الزر موجود مسبقاً
    if (document.querySelector('[onclick="scrollToReels()"]')) return;
    
    const reelsBtn = document.createElement('a');
    reelsBtn.className = 'nav-link';
    reelsBtn.setAttribute('onclick', 'scrollToReels()');
    reelsBtn.innerHTML = '<i class="fas fa-film" style="color: var(--gold);"></i><span>Reels</span>';
    nav.appendChild(reelsBtn);
}

function scrollToReels() {
    const reelsBar = document.querySelector('.reels-promo-bar');
    if (reelsBar) {
        reelsBar.scrollIntoView({ behavior: 'smooth' });
    }
}

// تهيئة Reels
async function initReels() {
    console.log('🎬 تهيئة نظام Reels...');
    reels = await loadReelsFromTelegram();
    displayReels();
    addReelsNavButton();
}

// ========== 13. التهيئة ==========
window.onload = async function() {
    console.log('🚀 بدء تشغيل ناردو برو...');
    
    // تهيئة AOS
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
            offset: 100
        });
    }
    
    await loadProductsFromTelegram();
    products = JSON.parse(localStorage.getItem('nardoo_products') || '[]');
    displayProducts();
    
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

    // تهيئة Reels
    await initReels();

    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
    }, 1000);
    
    window.addEventListener('scroll', toggleQuickTopButton);
    
    console.log('✅ نظام ناردو برو جاهز');
    console.log('👑 المدير: azer | كلمة المرور: 123456');
};

// ========== إغلاق النوافذ ==========
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};
