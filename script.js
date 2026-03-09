// ========== ناردو برو - نظام التاجر المتكامل ==========
// ========== الجزء الأول: تحسينات التاجر وعرض المنتجات ==========

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
let notifications = [];

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
                merchantId: 'nardoo_ahm123424',
                totalProducts: 0,
                rating: 4.8,
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('nardoo_users', JSON.stringify(users));
    }
}
loadUsers();

// ========== 4. تحميل الإشعارات ==========
function loadNotifications() {
    const saved = localStorage.getItem('nardoo_notifications');
    if (saved) {
        notifications = JSON.parse(saved);
    } else {
        notifications = [];
    }
}
loadNotifications();

// ========== 5. حفظ الإشعارات ==========
function saveNotifications() {
    localStorage.setItem('nardoo_notifications', JSON.stringify(notifications));
}

// ========== 6. إضافة إشعار جديد ==========
function addNotification(userId, notification) {
    const newNotification = {
        id: Date.now() + Math.random(),
        userId: userId,
        title: notification.title,
        message: notification.message,
        type: notification.type || 'info',
        link: notification.link || null,
        read: false,
        createdAt: new Date().toISOString(),
        icon: notification.icon || 'bell'
    };
    
    notifications.push(newNotification);
    saveNotifications();
    
    if (currentUser && currentUser.id == userId) {
        updateNotificationsBadge();
        showNotificationPopup(newNotification);
    }
    
    return newNotification;
}

// ========== 7. تحديث شارة الإشعارات ==========
function updateNotificationsBadge() {
    if (!currentUser) return;
    
    const unreadCount = notifications.filter(n => 
        n.userId == currentUser.id && !n.read
    ).length;
    
    const countSpan = document.getElementById('notificationCount');
    const btn = document.getElementById('notificationBtn');
    
    if (countSpan) {
        countSpan.textContent = unreadCount;
    }
    
    if (btn) {
        if (unreadCount > 0) {
            btn.classList.add('has-unread');
        } else {
            btn.classList.remove('has-unread');
        }
    }
}

// ========== 8. إظهار نافذة منبثقة للإشعار ==========
function showNotificationPopup(notification) {
    const popup = document.createElement('div');
    popup.className = 'notification-popup';
    popup.innerHTML = `
        <div class="notification-header ${notification.type}">
            <i class="fas fa-${notification.icon}"></i>
            <h4>${notification.title}</h4>
            <button class="close-popup" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="notification-body">
            ${notification.message}
        </div>
        <div class="notification-footer">
            <span style="color: #888; font-size: 11px;">
                <i class="far fa-clock"></i> الآن
            </span>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    setTimeout(() => {
        if (popup.parentElement) {
            popup.remove();
        }
    }, 5000);
}

// ========== 9. إشعارات خاصة بالتاجر ==========
function addOrderNotificationForMerchant(merchantId, orderData) {
    addNotification(merchantId, {
        title: '🛒 طلب جديد!',
        message: `لديك طلب جديد بقيمة ${orderData.merchantTotal} دج`,
        type: 'success',
        icon: 'shopping-cart',
        link: '/merchant/orders'
    });
}

function addStockAlertNotification(merchantId, product) {
    addNotification(merchantId, {
        title: '⚠️ تنبيه المخزون',
        message: `المنتج "${product.name}" تبقى منه ${product.stock} قطعة فقط`,
        type: 'warning',
        icon: 'exclamation-triangle',
        link: '/merchant/products'
    });
}

function addProductAddedNotification(merchantId, productName) {
    addNotification(merchantId, {
        title: '✅ تم إضافة منتج',
        message: `تم إضافة المنتج "${productName}" بنجاح`,
        type: 'success',
        icon: 'box',
        link: '/merchant/products'
    });
}

// ========== 10. جلب المنتجات من تلجرام ==========
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
                let merchantId = '';
                
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
                    if (line.includes('معرف التاجر:')) {
                        merchantId = line.replace('معرف التاجر:', '').trim();
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
                        merchantId: merchantId,
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

// ========== 11. إضافة منتج إلى تلجرام ==========
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
🆔 معرف التاجر: ${product.merchantId || 'غير محدد'}

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

// ========== 12. دوال المساعدة والإشعارات ==========
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

// ========== 13. دوال الوقت والفرز ==========
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

// ========== 14. تحميل المنتجات وعرضها ==========
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

// ========== 15. تقييم النجوم ==========
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

// ========== 16. عرض المنتجات مع تحسينات التاجر ==========
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    let filtered = products.filter(p => p.stock > 0);
    
    if (currentFilter === 'my_products' && currentUser?.role === 'merchant_approved') {
        filtered = filtered.filter(p => 
            p.merchantId === currentUser.merchantId || 
            p.merchantId == currentUser.id ||
            p.merchantName === currentUser.storeName || 
            p.merchantName === currentUser.name
        );
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
        
        // البحث عن التاجر في قاعدة البيانات
        const merchant = users.find(u => 
            u.merchantId === product.merchantId || 
            u.id == product.merchantId ||
            u.storeName === product.merchantName || 
            u.name === product.merchantName
        );

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
                    
                    <div class="product-merchant-info" onclick="event.stopPropagation(); showMerchantStore('${merchant?.id || product.merchantId}')" style="cursor: pointer; display: flex; align-items: center; gap: 5px; margin-bottom: 5px;">
                        <i class="fas fa-store"></i> ${product.merchantName}
                        <i class="fas fa-external-link-alt" style="font-size: 10px; margin-right: 5px; color: var(--gold);"></i>
                    </div>
                    
                    <div class="product-telegram" style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px; color: #0088cc;">
                        <i class="fab fa-telegram"></i>
                        <a href="https://t.me/${telegramUsername.replace('@', '')}" target="_blank" style="color: #0088cc; text-decoration: none;" onclick="event.stopPropagation()">
                            ${telegramUsername}
                        </a>
                    </div>
                    
                    ${merchant?.merchantId ? `
                        <div style="font-size: 11px; color: #888; margin-bottom: 5px;">
                            <i class="fas fa-id-card"></i> معرف التاجر: ${merchant.merchantId}
                        </div>
                    ` : ''}
                    
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

// ========== 17. عرض متجر التاجر ==========
function showMerchantStore(merchantId) {
    if (!merchantId) {
        showNotification('معرف التاجر غير صحيح', 'error');
        return;
    }
    
    const merchant = users.find(u => u.id == merchantId || u.merchantId == merchantId);
    if (!merchant) {
        showNotification('التاجر غير موجود', 'error');
        return;
    }

    // فلترة منتجات هذا التاجر فقط
    const merchantProducts = products.filter(p => 
        p.merchantId == merchant.id || 
        p.merchantId == merchant.merchantId ||
        p.merchantName === merchant.storeName ||
        p.merchantName === merchant.name
    );

    // إنشاء نافذة عرض المتجر
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'merchantStoreModal';
    modal.style.display = 'flex';
    modal.onclick = function(e) {
        if (e.target === modal) modal.remove();
    };
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1200px; width: 95%; max-height: 90vh; overflow-y: auto; padding: 0;">
            <div style="position: sticky; top: 0; background: var(--bg-secondary); padding: 20px; border-bottom: 2px solid var(--gold); z-index: 10; border-radius: 35px 35px 0 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                    <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                        <img src="${merchant.storeLogo || 'https://via.placeholder.com/80/2c5e4f/ffffff?text=Store'}" 
                             style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid var(--gold); object-fit: cover;">
                        <div>
                            <h2 style="color: var(--gold); margin: 0; font-size: 28px;">${merchant.storeName || merchant.name}</h2>
                            <p style="display: flex; align-items: center; gap: 10px; margin: 5px 0; flex-wrap: wrap;">
                                <i class="fab fa-telegram" style="color: #0088cc;"></i>
                                <a href="https://t.me/${merchant.telegram?.replace('@', '')}" target="_blank">${merchant.telegram || 'غير محدد'}</a>
                                <i class="fas fa-phone" style="color: var(--gold); margin-right: 15px;"></i>
                                <span>${merchant.phone || 'غير محدد'}</span>
                            </p>
                            <p style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                <i class="fas fa-id-card" style="color: var(--gold);"></i>
                                <code style="background: var(--glass); padding: 5px 15px; border-radius: 20px; border: 1px solid var(--gold);">
                                    ${merchant.merchantId || 'غير محدد'}
                                </code>
                                <span style="background: var(--glass); padding: 5px 15px; border-radius: 20px;">
                                    <i class="fas fa-star" style="color: var(--gold);"></i> ${merchant.rating || 'جديد'}
                                </span>
                            </p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <span class="status-badge ${merchant.role === 'merchant_approved' ? 'status-approved' : 'status-pending'}" 
                              style="padding: 8px 20px; font-size: 14px;">
                            <i class="fas ${merchant.role === 'merchant_approved' ? 'fa-check-circle' : 'fa-hourglass-half'}"></i>
                            ${merchant.role === 'merchant_approved' ? 'تاجر معتمد' : 'في الانتظار'}
                        </span>
                        <button onclick="document.getElementById('merchantStoreModal').remove()" 
                                style="background: none; border: none; color: var(--gold); font-size: 30px; cursor: pointer;">&times;</button>
                    </div>
                </div>
                
                <div style="display: flex; gap: 20px; margin-top: 20px; flex-wrap: wrap;">
                    <div style="background: var(--glass); padding: 15px 25px; border-radius: 15px; min-width: 120px; text-align: center;">
                        <div style="font-size: 32px; color: var(--gold); font-weight: bold;">${merchantProducts.length}</div>
                        <div>📦 إجمالي المنتجات</div>
                    </div>
                    <div style="background: var(--glass); padding: 15px 25px; border-radius: 15px; min-width: 120px; text-align: center;">
                        <div style="font-size: 32px; color: var(--gold); font-weight: bold;">${merchantProducts.filter(p => p.stock > 0).length}</div>
                        <div>✅ المتوفر</div>
                    </div>
                    <div style="background: var(--glass); padding: 15px 25px; border-radius: 15px; min-width: 120px; text-align: center;">
                        <div style="font-size: 32px; color: var(--gold); font-weight: bold;">${merchant.rating || 'جديد'}</div>
                        <div>⭐ التقييم</div>
                    </div>
                    <div style="background: var(--glass); padding: 15px 25px; border-radius: 15px; min-width: 120px; text-align: center;">
                        <div style="font-size: 32px; color: var(--gold); font-weight: bold;">${merchant.merchantLevel || '2'}</div>
                        <div>📊 المستوى</div>
                    </div>
                </div>
            </div>
            
            <div style="padding: 30px;">
                <h3 style="color: var(--gold); margin-bottom: 25px; font-size: 24px;">
                    <i class="fas fa-boxes"></i> منتجات المتجر (${merchantProducts.length})
                </h3>
                
                ${merchantProducts.length === 0 ? `
                    <div style="text-align: center; padding: 60px 20px;">
                        <i class="fas fa-box-open" style="font-size: 80px; color: var(--gold); margin-bottom: 20px;"></i>
                        <h3 style="color: var(--gold); font-size: 24px;">لا توجد منتجات بعد</h3>
                        <p style="color: var(--text-secondary);">سيتم إضافة منتجات قريباً</p>
                    </div>
                ` : `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px;">
                        ${merchantProducts.map(product => `
                            <div class="product-card" onclick="viewProductDetails(${product.id})" style="margin: 0; animation: fadeInUp 0.3s ease;">
                                <div class="product-time-badge">
                                    <i class="far fa-clock"></i> ${getTimeAgo(product.createdAt)}
                                </div>
                                <div class="product-gallery">
                                    <img src="${product.images?.[0] || 'https://via.placeholder.com/300/2c5e4f/ffffff?text=منتج'}" 
                                         onerror="this.src='https://via.placeholder.com/300/2c5e4f/ffffff?text=منتج';">
                                </div>
                                <div class="product-info">
                                    <span class="product-category">${getCategoryName(product.category)}</span>
                                    <h3 class="product-title">${product.name}</h3>
                                    <div class="product-rating">
                                        <div class="stars-container">${generateStars(product.rating || 4.5)}</div>
                                        <span class="rating-value">${(product.rating || 4.5).toFixed(1)}</span>
                                    </div>
                                    <div class="product-price">${product.price.toLocaleString()} <small>دج</small></div>
                                    <div class="product-stock ${product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : 'in-stock'}">
                                        ${product.stock <= 0 ? 'غير متوفر' : product.stock < 5 ? `كمية محدودة (${product.stock})` : `متوفر (${product.stock})`}
                                    </div>
                                    <button class="add-to-cart" onclick="event.stopPropagation(); addToCart(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>
                                        <i class="fas fa-shopping-cart"></i> أضف للسلة
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
    
    // إزالة أي نافذة سابقة
    const oldModal = document.getElementById('merchantStoreModal');
    if (oldModal) oldModal.remove();
    
    document.body.appendChild(modal);
}

// ========== 18. عرض التجار النشطين ==========
function showActiveMerchants() {
    const activeMerchants = users.filter(u => u.role === 'merchant_approved');
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'activeMerchantsModal';
    modal.style.display = 'flex';
    modal.onclick = function(e) {
        if (e.target === modal) modal.remove();
    };
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1000px; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; position: sticky; top: 0; background: var(--bg-secondary); padding: 10px 0; z-index: 5;">
                <h2 style="color: var(--gold);"><i class="fas fa-store-alt"></i> التجار النشطين (${activeMerchants.length})</h2>
                <button onclick="document.getElementById('activeMerchantsModal').remove()" style="background: none; border: none; color: var(--gold); font-size: 30px; cursor: pointer;">&times;</button>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                ${activeMerchants.map(merchant => {
                    const merchantProducts = products.filter(p => 
                        p.merchantId == merchant.id || 
                        p.merchantId == merchant.merchantId ||
                        p.merchantName === merchant.storeName
                    );
                    
                    return `
                        <div class="merchant-card" style="background: var(--glass); border-radius: 20px; padding: 20px; border: 2px solid transparent; transition: all 0.3s; cursor: pointer;" 
                             onclick="showMerchantStore('${merchant.id}')"
                             onmouseover="this.style.borderColor='var(--gold)'" 
                             onmouseout="this.style.borderColor='transparent'">
                            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                                <img src="${merchant.storeLogo || 'https://via.placeholder.com/60/2c5e4f/ffffff?text=Store'}" 
                                     style="width: 60px; height: 60px; border-radius: 50%; border: 2px solid var(--gold); object-fit: cover;">
                                <div>
                                    <h3 style="margin: 0; color: var(--gold); font-size: 18px;">${merchant.storeName}</h3>
                                    <p style="margin: 5px 0 0; font-size: 13px; color: #888;">👤 ${merchant.name}</p>
                                </div>
                            </div>
                            
                            <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                                <span style="background: var(--bg-primary); padding: 5px 12px; border-radius: 20px; font-size: 12px;">
                                    <i class="fas fa-box"></i> ${merchantProducts.length} منتج
                                </span>
                                <span style="background: var(--bg-primary); padding: 5px 12px; border-radius: 20px; font-size: 12px;">
                                    <i class="fas fa-star" style="color: var(--gold);"></i> ${merchant.rating || 'جديد'}
                                </span>
                                <span style="background: var(--bg-primary); padding: 5px 12px; border-radius: 20px; font-size: 12px;">
                                    <i class="fas fa-level-up-alt"></i> مستوى ${merchant.merchantLevel || '2'}
                                </span>
                            </div>
                            
                            <p style="font-size: 13px; margin-bottom: 15px; display: flex; align-items: center; gap: 5px;">
                                <i class="fab fa-telegram" style="color: #0088cc;"></i> 
                                ${merchant.telegram || 'غير محدد'}
                            </p>
                            
                            <p style="font-size: 12px; margin-bottom: 15px; color: #888; display: flex; align-items: center; gap: 5px;">
                                <i class="fas fa-id-card"></i>
                                <code>${merchant.merchantId || 'غير محدد'}</code>
                            </p>
                            
                            <button class="btn-gold" style="width: 100%;" onclick="event.stopPropagation(); showMerchantStore('${merchant.id}')">
                                <i class="fas fa-store"></i> زيارة المتجر
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ========== 19. عرض متجري (للتاجر) ==========
function showMyStore() {
    if (!currentUser || currentUser.role !== 'merchant_approved') {
        showNotification('غير مصرح', 'error');
        return;
    }
    
    showMerchantStore(currentUser.id);
}

// ========== 20. فلترة المنتجات ==========
function filterProducts(category) {
    currentFilter = category;
    displayProducts();
    
    // تحديث النشاط في القائمة
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick')?.includes(`'${category}'`)) {
            link.classList.add('active');
        }
    });
}

// ========== 21. البحث عن منتج ==========
function searchProducts() {
    searchTerm = document.getElementById('searchInput').value;
    displayProducts();
}

// ========== 22. إدارة السلة ==========
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
            merchantTelegram: product.merchantTelegram,
            merchantId: product.merchantId
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
                    <div style="font-size: 11px; color: #888; margin-top: 5px;">
                        <i class="fas fa-store"></i> ${item.merchantName}
                    </div>
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
