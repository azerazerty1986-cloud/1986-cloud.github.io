// ========== 1. إعدادات تلجرام ==========
const TELEGRAM = {
    botToken: '8576673096:AAHCg7pM2MyzmVuCqWdK-ZbrDQy7zAR09x4',
    channelId: '-1003822964890',
    adminId: '7461896689'
};

// ========== 2. نظام منع التكرار ==========
const PROCESSED_UPDATES_KEY = 'telegram_processed_updates';
const MAX_PROCESSED = 100;

function markUpdateAsProcessed(updateId) {
    let processed = JSON.parse(localStorage.getItem(PROCESSED_UPDATES_KEY)) || [];
    if (!processed.includes(updateId)) {
        processed.push(updateId);
        if (processed.length > MAX_PROCESSED) {
            processed = processed.slice(-MAX_PROCESSED);
        }
        localStorage.setItem(PROCESSED_UPDATES_KEY, JSON.stringify(processed));
    }
}

function isUpdateProcessed(updateId) {
    const processed = JSON.parse(localStorage.getItem(PROCESSED_UPDATES_KEY)) || [];
    return processed.includes(updateId);
}

// ========== 3. المتغيرات العامة ==========
let products = [];
let currentUser = null;
let cart = [];
let isDarkMode = true;
let currentFilter = 'all';
let searchTerm = '';
let sortBy = 'newest';
let users = [];
let telegramUpdates = [];

// ========== 4. تحميل المستخدمين ==========
function loadUsers() {
    const saved = localStorage.getItem('nardoo_users');
    if (saved) {
        users = JSON.parse(saved);
    } else {
        users = [
            { 
                id: 1, 
                name: 'azer', 
                username: 'azer',
                email: 'azer@admin.com', 
                password: '123456', 
                role: 'admin',
                phone: '',
                telegramId: TELEGRAM.adminId,
                storeName: 'نكهة وجمال',
                storeColor: '#d4af37',
                productsLimit: 1000,
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('nardoo_users', JSON.stringify(users));
    }
}
loadUsers();

// ========== 5. دالة قراءة المنتج من الجدول المنظم ==========
function parseProductFromTable(text) {
    try {
        // البحث عن النص داخل ``` ```
        const tableMatch = text.match(/```\n([\s\S]*?)\n```/);
        if (!tableMatch) return null;
        
        const tableContent = tableMatch[1];
        const lines = tableContent.split('\n');
        
        let product = {
            name: 'منتج',
            price: 1000,
            category: 'other',
            stock: 10,
            merchant: 'المتجر'
        };
        
        lines.forEach(line => {
            if (line.includes('المنتج:')) {
                product.name = line.replace('المنتج:', '').trim();
            } else if (line.includes('السعر:')) {
                const match = line.match(/\d+/);
                if (match) product.price = parseInt(match[0]);
            } else if (line.includes('القسم:')) {
                const cat = line.replace('القسم:', '').trim().toLowerCase();
                if (cat.includes('promo') || cat.includes('برموسيو')) product.category = 'promo';
                else if (cat.includes('spices') || cat.includes('توابل')) product.category = 'spices';
                else if (cat.includes('cosmetic') || cat.includes('كوسمتيك')) product.category = 'cosmetic';
                else product.category = 'other';
            } else if (line.includes('الكمية:')) {
                const match = line.match(/\d+/);
                if (match) product.stock = parseInt(match[0]);
            } else if (line.includes('التاجر:')) {
                product.merchant = line.replace('التاجر:', '').trim();
            }
        });
        
        return product;
    } catch (error) {
        console.error('خطأ في قراءة الجدول:', error);
        return null;
    }
}

// ========== 6. تحميل المنتجات من تلجرام ==========
async function loadProducts() {
    console.log('🔄 جاري تحميل المنتجات من تلجرام...');
    
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`
        );
        
        const data = await response.json();
        const newProducts = [];
        
        if (data.ok && data.result) {
            console.log(`✅ تم العثور على ${data.result.length} تحديث في تلجرام`);
            
            const updates = [...data.result].reverse();
            
            for (const update of updates) {
                if (update.channel_post && update.channel_post.text) {
                    const text = update.channel_post.text;
                    
                    // محاولة قراءة الجدول أولاً
                    const tableProduct = parseProductFromTable(text);
                    
                    if (tableProduct) {
                        // التحقق من عدم تكرار المنتج
                        const exists = products.some(p => p.telegramId === update.channel_post.message_id);
                        if (!exists) {
                            newProducts.push({
                                id: update.channel_post.message_id,
                                telegramId: update.channel_post.message_id,
                                name: tableProduct.name,
                                price: tableProduct.price,
                                category: tableProduct.category,
                                stock: tableProduct.stock,
                                merchantName: tableProduct.merchant,
                                images: ["https://via.placeholder.com/300/2c5e4f/ffffff?text=" + encodeURIComponent(tableProduct.name)],
                                rating: 4.5,
                                soldCount: 0,
                                createdAt: new Date(update.channel_post.date * 1000).toISOString(),
                                isActive: true
                            });
                            console.log(`📦 منتج مضاف من الجدول: ${tableProduct.name}`);
                        }
                    }
                }
            }
        }
        
        if (newProducts.length > 0) {
            // دمج المنتجات الجديدة مع القديمة
            const allProducts = [...newProducts, ...products];
            
            // إزالة التكرارات
            const uniqueProducts = [];
            const seenIds = new Set();
            
            allProducts.forEach(p => {
                if (!seenIds.has(p.telegramId)) {
                    seenIds.add(p.telegramId);
                    uniqueProducts.push(p);
                }
            });
            
            // ترتيب من الأحدث
            uniqueProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            products = uniqueProducts;
            localStorage.setItem('nardoo_products', JSON.stringify(products));
            
            console.log(`✅ تم حفظ ${products.length} منتج في localStorage`);
            displayProducts();
        } else {
            console.log('⚠️ لم يتم العثور على منتجات جديدة');
        }
        
    } catch (error) {
        console.error('❌ خطأ في جلب المنتجات:', error);
    }
}

// ========== 7. إضافة منتج جديد إلى تلجرام (بجدول منظم) ==========
async function addProductToTelegram(product) {
    const message = `
🟣 *منتج جديد في المتجر*
━━━━━━━━━━━━━━━━━━━━━━
\`\`\`
المنتج: ${product.name}
السعر: ${product.price} دج
القسم: ${product.category}
الكمية: ${product.stock}
التاجر: ${product.merchantName}
التاريخ: ${new Date().toLocaleString('ar-DZ')}
\`\`\`
    `;

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
        const result = await response.json();
        
        if (result.ok) {
            console.log(`✅ تم نشر المنتج في قناة تلجرام: ${result.result.message_id}`);
            
            const newProduct = {
                id: Date.now(),
                telegramId: result.result.message_id,
                name: product.name,
                price: product.price,
                category: product.category,
                stock: product.stock,
                merchantName: product.merchantName,
                merchantId: product.merchantId,
                images: ["https://via.placeholder.com/300/2c5e4f/ffffff?text=" + encodeURIComponent(product.name)],
                rating: 4.5,
                soldCount: 0,
                createdAt: new Date().toISOString(),
                isActive: true
            };
            
            let currentProducts = JSON.parse(localStorage.getItem('nardoo_products')) || [];
            currentProducts.unshift(newProduct);
            localStorage.setItem('nardoo_products', JSON.stringify(currentProducts));
            
            products = currentProducts;
            displayProducts();
            
            showNotification(`✅ تم نشر المنتج ${product.name} في المتجر`, 'success');
            
            return { ok: true };
        }
        return { ok: false };
    } catch (error) {
        console.error('❌ خطأ في إضافة المنتج:', error);
        return { ok: false };
    }
}

// ========== 8. إرسال طلب تاجر إلى تلجرام ==========
async function sendMerchantRequestToTelegram(merchant) {
    const message = `
🔵 *طلب انضمام تاجر جديد*
━━━━━━━━━━━━━━━━━━━━━━
\`\`\`
المتجر: ${merchant.storeName || merchant.name}
التاجر: ${merchant.name}
البريد: ${merchant.email}
الهاتف: ${merchant.phone || 'غير متوفر'}
المستوى: ${merchant.merchantLevel || '1'}
الوصف: ${merchant.merchantDesc || 'تاجر جديد'}
رقم الطلب: ${merchant.id}
التاريخ: ${new Date().toLocaleString('ar-DZ')}
\`\`\`

⬇️ *للإجراء من المدير*
✅ للموافقة: /approve_${merchant.id}
❌ للرفض: /reject_${merchant.id}
    `;

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
        const result = await response.json();
        
        if (result.ok) {
            showNotification('📋 تم إرسال طلب التسجيل إلى المدير', 'info');
            return { ok: true };
        }
        return { ok: false };
    } catch (error) {
        console.error('❌ خطأ في إرسال طلب التاجر:', error);
        return { ok: false };
    }
}

// ========== 9. إرسال طلب شراء إلى تلجرام ==========
async function sendOrderToTelegram(order) {
    const message = `
🟢 *طلب شراء جديد*
━━━━━━━━━━━━━━━━━━━━━━
\`\`\`
الزبون: ${order.customerName}
الهاتف: ${order.customerPhone || 'غير متوفر'}
المنتجات:
${order.items.map((item, i) => `  ${i+1}. ${item.name} (${item.quantity}) - ${item.price} دج`).join('\n')}
الإجمالي: ${order.total} دج
الوقت: ${new Date().toLocaleString('ar-DZ')}
\`\`\`
    `;

    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
    } catch (error) {
        console.error('❌ خطأ في إرسال الطلب:', error);
    }
}

// ========== 10. الموافقة على تاجر ==========
async function approveMerchant(userId) {
    const userIndex = users.findIndex(u => u.id == userId);
    
    if (userIndex !== -1 && users[userIndex].role === 'merchant_pending') {
        users[userIndex].role = 'merchant_approved';
        users[userIndex].storeColor = '#' + Math.floor(Math.random()*16777215).toString(16);
        
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        
        showNotification(`✅ تم قبول التاجر ${users[userIndex].name}`, 'success');
        return true;
    }
    return false;
}

// ========== 11. رفض تاجر ==========
async function rejectMerchant(userId) {
    const userIndex = users.findIndex(u => u.id == userId);
    
    if (userIndex !== -1 && users[userIndex].role === 'merchant_pending') {
        users.splice(userIndex, 1);
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        
        showNotification(`❌ تم رفض طلب التاجر`, 'info');
        return true;
    }
    return false;
}

// ========== 12. عرض المنتجات (للكل) ==========
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    // تأكد من أن products مصفوفة
    if (!products || !Array.isArray(products)) {
        products = [];
    }

    // عرض جميع المنتجات النشطة
    let filtered = products.filter(p => p && p.stock > 0);
    
    console.log(`📦 عرض ${filtered.length} منتج للزائر`);
    
    // تطبيق التصفية حسب القسم
    if (currentFilter !== 'all' && currentFilter !== 'my_products') {
        filtered = filtered.filter(p => p.category === currentFilter);
    }
    
    // تطبيق التصفية لمنتجات التاجر فقط إذا كان مسجلاً
    if (currentFilter === 'my_products' && currentUser?.role === 'merchant_approved') {
        filtered = filtered.filter(p => p.merchantName === currentUser.name);
    }

    // تطبيق البحث
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    // ترتيب المنتجات
    filtered = sortProducts(filtered);

    // عرض المنتجات أو رسالة "لا توجد منتجات"
    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px;">
                <i class="fas fa-box-open" style="font-size: 80px; color: var(--gold); margin-bottom: 20px;"></i>
                <h3 style="color: var(--gold); font-size: 28px; margin-bottom: 15px;">لا توجد منتجات</h3>
                <p style="color: var(--text-secondary); font-size: 18px; margin-bottom: 30px;">أول منتج يضاف سيظهر هنا</p>
                ${currentUser?.role === 'admin' || currentUser?.role === 'merchant_approved' ? `
                    <button class="btn-gold" onclick="showAddProductModal()" style="font-size: 18px; padding: 15px 40px;">
                        <i class="fas fa-plus"></i> إضافة منتج جديد
                    </button>
                ` : `
                    <button class="btn-gold" onclick="openLoginModal()" style="font-size: 18px; padding: 15px 40px;">
                        <i class="fas fa-sign-in-alt"></i> تسجيل الدخول للإضافة
                    </button>
                `}
            </div>
        `;
        return;
    }

    // عرض المنتجات
    container.innerHTML = filtered.map(product => {
        const stockClass = product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : 'in-stock';
        const stockText = product.stock <= 0 ? 'غير متوفر' : product.stock < 5 ? `كمية محدودة (${product.stock})` : `متوفر (${product.stock})`;

        const images = product.images && product.images.length > 0 ? product.images : [
            "https://via.placeholder.com/300/2c5e4f/ffffff?text=" + encodeURIComponent(product.name)
        ];

        let categoryIcon = 'fas fa-tag';
        if (product.category === 'promo') categoryIcon = 'fas fa-fire';
        else if (product.category === 'spices') categoryIcon = 'fas fa-mortar-pestle';
        else if (product.category === 'cosmetic') categoryIcon = 'fas fa-spa';
        else if (product.category === 'other') categoryIcon = 'fas fa-gem';

        const timeAgo = getSimpleTimeAgo(product.createdAt);
        const merchant = users.find(u => u.name === product.merchantName);
        const merchantColor = merchant?.storeColor || '#9b59b6';

        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-time-badge">
                    <i class="far fa-clock"></i> ${timeAgo}
                </div>
                
                <div class="product-gallery">
                    <img src="${images[0]}" style="width: 100%; height: 250px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال';">
                </div>

                <div class="product-info">
                    <div class="product-category">
                        <i class="${categoryIcon}"></i> ${getCategoryName(product.category)}
                    </div>
                    
                    <h3 class="product-title">${product.name}</h3>
                    
                    <div class="product-merchant-info" style="background: ${merchantColor}20; color: ${merchantColor}; border: 1px solid ${merchantColor};">
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
                    
                    <div class="product-actions">
                        <button class="add-to-cart" onclick="addToCart(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> أضف للسلة
                        </button>
                        <button class="wishlist-btn" onclick="viewProductDetails(${product.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${currentUser?.role === 'admin' || (currentUser?.role === 'merchant_approved' && currentUser?.name === product.merchantName) ? `
                            <button class="wishlist-btn" onclick="editProduct(${product.id})" style="background: #fbbf24; color: black;">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="wishlist-btn" onclick="deleteProduct(${product.id})" style="background: #f87171; color: white;">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ========== 13. دوال المساعدة ==========
function getCategoryName(category) {
    const names = {
        'promo': 'برموسيو',
        'spices': 'توابل',
        'cosmetic': 'كوسمتيك',
        'other': 'منتوجات أخرى'
    };
    return names[category] || 'أخرى';
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let starsHTML = '';
    
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star star filled"></i>';
    }
    
    if (hasHalfStar) {
        starsHTML += '<i class="fas fa-star-half-alt star half"></i>';
    }
    
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="far fa-star star"></i>';
    }
    
    return starsHTML;
}

function getSimpleTimeAgo(dateString) {
    if (!dateString) return '';
    
    const now = new Date();
    const productDate = new Date(dateString);
    const diffInSeconds = Math.floor((now - productDate) / 1000);
    
    if (diffInSeconds < 60) return 'الآن';
    if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `منذ ${minutes} ${minutes === 1 ? 'دقيقة' : 'دقائق'}`;
    }
    if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `منذ ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`;
    }
    if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}`;
    }
    return '';
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

function filterProducts(category) {
    currentFilter = category;
    displayProducts();
}

function searchProducts() {
    searchTerm = document.getElementById('searchInput').value;
    displayProducts();
}

function changeSort(value) {
    sortBy = value;
    displayProducts();
}

// ========== 14. إدارة السلة ==========
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
    const cartCounter = document.getElementById('cartCounter');
    const fixedCartCounter = document.getElementById('fixedCartCounter');
    if (cartCounter) cartCounter.textContent = count;
    if (fixedCartCounter) fixedCartCounter.textContent = count;
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
            showNotification('الكمية المتوفرة غير كافية', 'warning');
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
        totalSpan.textContent = '0 دج';
        return;
    }

    let total = 0;
    itemsDiv.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="cart-item">
                <div class="cart-item-image">
                    <i class="fas fa-box"></i>
                </div>
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

    totalSpan.textContent = `${total.toLocaleString()} دج`;
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
    showNotification('تمت إزالة المنتج من السلة', 'info');
}

// ========== 15. إتمام الشراء ==========
async function checkoutCart() {
    if (cart.length === 0) {
        showNotification('السلة فارغة', 'warning');
        return;
    }

    const order = {
        customerName: currentUser?.name || 'عميل',
        customerPhone: currentUser?.phone || '',
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 800
    };

    await sendOrderToTelegram(order);

    cart = [];
    saveCart();
    updateCartCounter();
    toggleCart();
    showNotification('✅ تم إرسال الطلب بنجاح', 'success');
}

// ========== 16. إدارة المستخدمين ==========
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

function toggleMerchantFields() {
    const isMerchant = document.getElementById('isMerchant').checked;
    document.getElementById('merchantFields').style.display = isMerchant ? 'block' : 'none';
}

function handleLogin() {
    const emailOrUsername = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const user = users.find(u => 
        (u.email === emailOrUsername || u.username === emailOrUsername || u.name === emailOrUsername) 
        && u.password === password
    );

    if (user) {
        currentUser = user;
        localStorage.setItem('current_user', JSON.stringify(user));
        closeModal('loginModal');
        updateUIBasedOnRole();
        
        if (user.role === 'merchant_approved') {
            showNotification(`🎉 مرحباً أيها التاجر ${user.name}`, 'success');
        } else if (user.role === 'admin') {
            showNotification(`👑 مرحباً بك يا مدير ${user.name}`, 'success');
        } else {
            showNotification(`👤 مرحباً ${user.name}`, 'success');
        }
    } else {
        showNotification('❌ اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
    }
}

async function handleRegister() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const phone = document.getElementById('regPhone')?.value || '';
    const isMerchant = document.getElementById('isMerchant').checked;

    if (!name || !email || !password) {
        showNotification('الرجاء ملء جميع الحقول', 'error');
        return;
    }

    if (users.find(u => u.email === email)) {
        showNotification('البريد الإلكتروني مستخدم بالفعل', 'error');
        return;
    }

    const newUser = {
        id: users.length + 1,
        name: name,
        email: email,
        password: password,
        phone: phone,
        role: isMerchant ? 'merchant_pending' : 'customer',
        telegramId: null,
        storeName: isMerchant ? (document.getElementById('merchantStoreName')?.value || `متجر ${name}`) : '',
        merchantDesc: isMerchant ? document.getElementById('merchantDesc')?.value : '',
        merchantLevel: isMerchant ? parseInt(document.getElementById('merchantLevel')?.value || '1') : null,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('nardoo_users', JSON.stringify(users));

    if (isMerchant) {
        await sendMerchantRequestToTelegram(newUser);
        showNotification('📋 تم إرسال طلب التسجيل إلى المدير', 'info');
        showNotification('⏳ في انتظار الموافقة...', 'warning');
    } else {
        showNotification('✅ تم التسجيل كعميل بنجاح', 'success');
        switchAuthTab('login');
    }
    
    closeModal('loginModal');
}

function updateUIBasedOnRole() {
    if (!currentUser) return;

    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.merchant-only').forEach(el => el.style.display = 'none');
    document.getElementById('merchantPanelContainer').style.display = 'none';
    
    if (currentUser.role === 'admin') {
        document.getElementById('dashboardBtn').style.display = 'flex';
        document.getElementById('userBtn').innerHTML = '<i class="fas fa-crown"></i>';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
    } 
    else if (currentUser.role === 'merchant_approved') {
        document.getElementById('dashboardBtn').style.display = 'none';
        document.getElementById('userBtn').innerHTML = '<i class="fas fa-store"></i>';
        document.querySelectorAll('.merchant-only').forEach(el => el.style.display = 'block');
        showMerchantPanel();
    } 
    else {
        document.getElementById('dashboardBtn').style.display = 'none';
        document.getElementById('userBtn').innerHTML = '<i class="fas fa-user"></i>';
    }
}

function showMerchantPanel() {
    if (!currentUser || currentUser.role !== 'merchant_approved') return;
    
    const merchantProducts = products.filter(p => p.merchantName === currentUser.name);
    const totalSales = merchantProducts.reduce((sum, p) => sum + (p.price * (p.soldCount || 0)), 0);
    
    document.getElementById('merchantPanelContainer').style.display = 'block';
    document.getElementById('merchantPanelContainer').innerHTML = `
        <div class="merchant-panel" style="border: 3px solid ${currentUser.storeColor || '#9b59b6'};">
            <h3><i class="fas fa-store"></i> لوحة التاجر - ${currentUser.name}</h3>
            <div class="stats">
                <div class="stat-item"><div class="number">${merchantProducts.length}</div><div>إجمالي المنتجات</div></div>
                <div class="stat-item"><div class="number">${merchantProducts.filter(p => p.stock > 0).length}</div><div>المنتجات المتاحة</div></div>
                <div class="stat-item"><div class="number">${totalSales.toLocaleString()} دج</div><div>إجمالي المبيعات</div></div>
            </div>
            <div style="display: flex; gap: 15px; margin-top: 20px; justify-content: center;">
                <button class="btn-gold" onclick="showAddProductModal()"><i class="fas fa-plus"></i> إضافة منتج جديد</button>
                <button class="btn-outline-gold" onclick="viewMyProducts()"><i class="fas fa-box"></i> عرض منتجاتي</button>
            </div>
        </div>
    `;
    
    if (!document.getElementById('myProductsBtn')) {
        const navMenu = document.getElementById('mainNav');
        const btn = document.createElement('a');
        btn.className = 'nav-link';
        btn.id = 'myProductsBtn';
        btn.setAttribute('onclick', 'viewMyProducts()');
        btn.innerHTML = '<i class="fas fa-box"></i><span>منتجاتي</span>';
        navMenu.appendChild(btn);
    }
}

function viewMyProducts() {
    if (!currentUser || currentUser.role !== 'merchant_approved') return;
    currentFilter = 'my_products';
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    document.getElementById('myProductsBtn').classList.add('active');
    displayProducts();
}

// ========== 17. إدارة المنتجات ==========
function showAddProductModal() {
    if (!currentUser) {
        showNotification('يجب تسجيل الدخول أولاً', 'warning');
        openLoginModal();
        return;
    }

    if (currentUser.role === 'merchant_approved' || currentUser.role === 'admin') {
        document.getElementById('modalTitle').textContent = 'إضافة منتج جديد';
        document.getElementById('productName').value = '';
        document.getElementById('productCategory').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productStock').value = '';
        document.getElementById('productDescription').value = '';
        document.getElementById('editingProductId').value = '';
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('productImagesData').value = '';
        document.getElementById('productModal').style.display = 'flex';
    } else {
        showNotification('فقط المدير والتجار يمكنهم إضافة منتجات', 'error');
    }
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
            preview.innerHTML += `<img src="${e.target.result}" class="preview-image">`;
            imagesData.push(e.target.result);
            document.getElementById('productImagesData').value = JSON.stringify(imagesData);
        };
        reader.readAsDataURL(file);
    }
}

async function saveProduct() {
    if (!currentUser) {
        showNotification('يجب تسجيل الدخول أولاً', 'error');
        return;
    }

    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const description = document.getElementById('productDescription')?.value || '';
    const imagesData = document.getElementById('productImagesData')?.value;
    const images = imagesData ? JSON.parse(imagesData) : ["https://via.placeholder.com/300/2c5e4f/ffffff?text=" + encodeURIComponent(name)];
    
    if (!name || !category || !price || !stock) {
        showNotification('الرجاء ملء جميع الحقول', 'error');
        return;
    }

    const product = {
        name: name,
        price: price,
        category: category,
        stock: stock,
        description: description,
        images: images,
        merchantName: currentUser.name,
        merchantId: currentUser.id
    };

    const result = await addProductToTelegram(product);
    
    if (result.ok) {
        showNotification(`✅ تم إضافة المنتج ${name} بنجاح`, 'success');
        closeModal('productModal');
    } else {
        showNotification('❌ فشل إضافة المنتج', 'error');
    }
}

function editProduct(id) {
    showNotification('تعديل المنتج قيد التطوير', 'info');
}

function deleteProduct(id) {
    showNotification('حذف المنتج قيد التطوير', 'info');
}

function viewProductDetails(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');

    const images = product.images?.map(img => `
        <img src="${img}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 20px; margin-bottom: 10px;">
    `).join('') || '<div style="height: 300px; background: var(--nardoo); display: flex; align-items: center; justify-content: center; border-radius: 20px;"><i class="fas fa-image" style="font-size: 80px; color: var(--gold);"></i></div>';

    const merchant = users.find(u => u.name === product.merchantName);
    const merchantColor = merchant?.storeColor || '#9b59b6';

    content.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 20px; color: var(--gold);">${product.name}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <div><div style="display: grid; gap: 10px;">${images}</div></div>
            <div>
                <div style="margin-bottom: 20px;">
                    <span style="background: var(--gold); padding: 5px 15px; border-radius: 20px; color: var(--bg-primary); font-weight: 700;">${getCategoryName(product.category)}</span>
                </div>
                <p style="margin-bottom: 20px;">منتج من 
                    <span style="color: ${merchantColor}; font-weight: bold;">${product.merchantName}</span>
                </p>
                <div class="product-rating"><div class="stars-container">${generateStars(product.rating || 4.5)}</div><span class="rating-value">${(product.rating || 4.5).toFixed(1)}</span></div>
                <div style="margin-bottom: 20px;"><span style="font-size: 32px; font-weight: 800; color: var(--gold);">${product.price.toLocaleString()} دج</span></div>
                <div style="margin-bottom: 20px;"><span class="product-stock ${product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : 'in-stock'}">${product.stock <= 0 ? 'غير متوفر' : product.stock < 5 ? `كمية محدودة (${product.stock})` : `متوفر (${product.stock})`}</span></div>
                <div style="display: flex; gap: 15px;">
                    <button class="btn-gold" onclick="addToCart(${product.id}); closeModal('productDetailModal')">أضف للسلة</button>
                    <button class="btn-outline-gold" onclick="closeModal('productDetailModal')">إغلاق</button>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

// ========== 18. نظام الإشعارات ==========
function showNotification(message, type = 'info', title = '') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const titles = {
        success: 'نجاح',
        error: 'خطأ',
        warning: 'تنبيه',
        info: 'معلومات'
    };
    
    toast.innerHTML = `
        <div class="toast-icon ${type}">
            <i class="fas ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-times' : type === 'warning' ? 'fa-exclamation' : 'fa-info'}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title || titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
        <div class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

// ========== 19. دوال التمرير ==========
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

// ========== 20. عداد تنازلي ==========
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

// ========== 21. تأثيرات إضافية ==========
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode', !isDarkMode);
    const toggle = document.getElementById('themeToggle');
    toggle.innerHTML = isDarkMode ? 
        '<i class="fas fa-moon"></i><span>ليلي</span>' : 
        '<i class="fas fa-sun"></i><span>نهاري</span>';
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

function initMouseEffects() {
    if (window.innerWidth <= 768) return;
    
    const cursor = document.createElement('div');
    cursor.className = 'mouse-effect';
    const cursorDot = document.createElement('div');
    cursorDot.className = 'mouse-effect-dot';
    
    document.body.appendChild(cursor);
    document.body.appendChild(cursorDot);
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.transform = `translate(${e.clientX - 10}px, ${e.clientY - 10}px)`;
        cursorDot.style.transform = `translate(${e.clientX - 2}px, ${e.clientY - 2}px)`;
    });
    
    document.querySelectorAll('a, button, .product-card').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
}

function initScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', () => {
        const winScroll = document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        progressBar.style.width = scrolled + '%';
    });
}

function initParticles() {
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles';
    document.body.appendChild(particlesContainer);
    
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 10 + 's';
        particle.style.animationDuration = (10 + Math.random() * 10) + 's';
        particlesContainer.appendChild(particle);
    }
}

// ========== 22. الاستماع لأوامر تلجرام ==========
setInterval(async () => {
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates?offset=-1`
        );
        
        const data = await response.json();
        
        if (data.ok && data.result) {
            for (const update of data.result) {
                if (isUpdateProcessed(update.update_id)) {
                    continue;
                }
                
                if (update.channel_post?.text) {
                    const text = update.channel_post.text;
                    
                    if (text.startsWith('/approve_')) {
                        const userId = text.replace('/approve_', '').trim();
                        await approveMerchant(userId);
                        markUpdateAsProcessed(update.update_id);
                    }
                    
                    if (text.startsWith('/reject_')) {
                        const userId = text.replace('/reject_', '').trim();
                        await rejectMerchant(userId);
                        markUpdateAsProcessed(update.update_id);
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ خطأ في الاستماع لأوامر تلجرام:', error);
    }
}, 10000);

// ========== 23. تحديث دوري للمنتجات ==========
setInterval(() => {
    console.log('🔄 تحديث دوري للمنتجات...');
    loadProducts();
}, 30000);

// ========== 24. تشغيل قوي للمنتجات عند تحميل الصفحة ==========
(function forceProductDisplay() {
    console.log('🚀 تشغيل قوي للمنتجات...');
    
    // 1. جلب المنتجات من localStorage
    const saved = localStorage.getItem('nardoo_products');
    if (saved) {
        try {
            products = JSON.parse(saved);
            console.log(`✅ تم تحميل ${products.length} منتج من localStorage`);
            
            // 2. عرض المنتجات فوراً
            if (typeof displayProducts === 'function') {
                displayProducts();
            }
        } catch (e) {
            console.error('خطأ في قراءة المنتجات:', e);
        }
    }
    
    // 3. جلب المنتجات من تلجرام بعد ثانية واحدة
    setTimeout(() => {
        console.log('🔄 جلب المنتجات من تلجرام...');
        if (typeof loadProducts === 'function') {
            loadProducts();
        }
    }, 1000);
    
    // 4. جلب المنتجات مرة أخرى بعد 5 ثواني (للتأكد)
    setTimeout(() => {
        console.log('🔄 جلب المنتجات مرة أخرى...');
        if (typeof loadProducts === 'function') {
            loadProducts();
        }
    }, 5000);
})();

// ========== 25. التهيئة ==========
window.onload = function() {
    // تحميل السلة
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
        document.getElementById('themeToggle').innerHTML = isDarkMode ? 
            '<i class="fas fa-moon"></i><span>ليلي</span>' : 
            '<i class="fas fa-sun"></i><span>نهاري</span>';
    }

    setTimeout(() => {
        document.getElementById('loader').style.opacity = '0';
        setTimeout(() => document.getElementById('loader').style.display = 'none', 500);
    }, 1000);

    window.addEventListener('scroll', toggleQuickTopButton);
    updateCountdown();
    initMouseEffects();
    initScrollProgress();
    initParticles();
    
    const typingElement = document.getElementById('typing-text');
    if (typingElement) {
        const texts = ['نكهة وجمال', 'ناردو برو', 'تسوق آمن', 'جودة عالية'];
        let i = 0;
        setInterval(() => {
            typingElement.innerHTML = texts[i % texts.length] + '<span class="typing-cursor">|</span>';
            i++;
        }, 2000);
    }
    
    console.log('✅ تم تهيئة المتجر بنجاح');
};

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// ========== 26. تصدير الدوال ==========
window.addToCart = addToCart;
window.toggleCart = toggleCart;
window.updateCartItem = updateCartItem;
window.removeFromCart = removeFromCart;
window.checkoutCart = checkoutCart;
window.filterProducts = filterProducts;
window.searchProducts = searchProducts;
window.changeSort = changeSort;
window.viewProductDetails = viewProductDetails;
window.openLoginModal = openLoginModal;
window.closeModal = closeModal;
window.switchAuthTab = switchAuthTab;
window.toggleMerchantFields = toggleMerchantFields;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.showAddProductModal = showAddProductModal;
window.saveProduct = saveProduct;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.openDashboard = openDashboard;
window.switchDashboardTab = switchDashboardTab;
window.approveMerchant = approveMerchant;
window.rejectMerchant = rejectMerchant;
window.viewMyProducts = viewMyProducts;
window.toggleTheme = toggleTheme;
window.scrollToTop = scrollToTop;
window.scrollToBottom = scrollToBottom;
window.showProcessedUpdates = function() {
    const processed = JSON.parse(localStorage.getItem(PROCESSED_UPDATES_KEY)) || [];
    showNotification(`📋 عدد التحديثات المعالجة: ${processed.length}`, 'info');
};
