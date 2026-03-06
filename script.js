// ========== 1. إعدادات تلجرام (قناة واحدة ملونة) ==========
const TELEGRAM = {
    botToken: '8576673096:AAHCg7pM2MyzmVuCqWdK-ZbrDQy7zAR09x4',
    channelId: '-1003822964890',
    adminId: '7461896689'
};

// ========== 2. دوال إرسال الرسائل الملونة ==========

// 🟢 طلب شراء جديد (أخضر)
async function sendOrderToTelegram(order) {
    const message = `
🟢 *طلب شراء جديد*
━━━━━━━━━━━━━━━━━━━━━━
👤 *الزبون:* ${order.customerName}
📦 *المنتجات:*
${order.items.map((item, i) => 
    `  ${i+1}. ${item.name} (${item.quantity}) - ${item.price} دج`
).join('\n')}
💰 *الإجمالي:* ${order.total} دج
🕐 *الوقت:* ${new Date().toLocaleString('ar-DZ')}
    `;

    await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM.channelId,
            text: message,
            parse_mode: 'Markdown'
        })
    });
}

// 🔵 طلب انضمام تاجر (أزرق)
async function sendMerchantRequestToTelegram(merchant) {
    const message = `
🔵 *طلب انضمام تاجر جديد*
━━━━━━━━━━━━━━━━━━━━━━
🏪 *اسم المتجر:* ${merchant.storeName}
👤 *التاجر:* ${merchant.name}
📧 *البريد:* ${merchant.email}
📞 *الهاتف:* ${merchant.phone}
📊 *المستوى:* ${merchant.level}
📝 *الوصف:* ${merchant.desc}

⬇️ *للإجراء*
✅ للموافقة: /approve_${merchant.id}
❌ للرفض: /reject_${merchant.id}
    `;

    await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM.channelId,
            text: message,
            parse_mode: 'Markdown'
        })
    });
}

// 🟣 منتج جديد (بنفسجي)
async function sendNewProductToTelegram(product) {
    const message = `
🟣 *منتج جديد في المتجر*
━━━━━━━━━━━━━━━━━━━━━━
📦 *المنتج:* ${product.name}
💰 *السعر:* ${product.price} دج
🏷️ *القسم:* ${product.category}
📊 *الكمية:* ${product.stock}
👤 *التاجر:* ${product.merchantName || 'المتجر'}
    `;

    await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM.channelId,
            text: message,
            parse_mode: 'Markdown'
        })
    });
}

// 🟡 إشعار عام (أصفر)
async function sendNotificationToTelegram(text) {
    const message = `
🟡 *إشعار*
━━━━━━━━━━━━━━━━━━━━━━
${text}
🕐 ${new Date().toLocaleString('ar-DZ')}
    `;

    await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM.channelId,
            text: message,
            parse_mode: 'Markdown'
        })
    });
}

// ========== 3. النظام الأساسي والمتغيرات العامة ==========
let products = [];
let currentUser = null;
let cart = [];
let isDarkMode = true;
let currentFilter = 'all';
let searchTerm = '';
let sortBy = 'newest';
let users = [];

// ========== 4. تحميل المستخدمين من localStorage ==========
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
                phone: '',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('nardoo_users', JSON.stringify(users));
    }
}
loadUsers();

// ========== 5. نظام إدارة الطلبات ==========
class OrderManagementSystem {
    constructor() {
        this.orders = this.loadOrders();
        this.orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    }

    loadOrders() {
        const saved = localStorage.getItem('nardoo_orders_management');
        return saved ? JSON.parse(saved) : [];
    }

    saveOrders() {
        localStorage.setItem('nardoo_orders_management', JSON.stringify(this.orders));
    }

    generateOrderId() {
        return `ORD${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    createOrder(orderData) {
        const order = {
            id: this.generateOrderId(),
            customerId: orderData.customerId || null,
            customerName: orderData.customerName,
            customerPhone: orderData.customerPhone,
            customerAddress: orderData.customerAddress,
            items: orderData.items || [],
            subtotal: 0,
            tax: 0,
            shipping: orderData.shipping || 800,
            discount: orderData.discount || 0,
            total: 0,
            paymentMethod: orderData.paymentMethod || 'الواتساب',
            notes: orderData.notes || '',
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeline: [{
                status: 'pending',
                timestamp: new Date().toISOString(),
                message: 'تم إنشاء الطلب'
            }]
        };

        order.subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        order.tax = Math.round(order.subtotal * 0.09);
        order.total = order.subtotal + order.tax + order.shipping - order.discount;

        this.orders.push(order);
        this.saveOrders();
        return order;
    }

    getOrder(orderId) {
        return this.orders.find(o => o.id === orderId);
    }

    getCustomerOrders(customerId) {
        return this.orders.filter(o => o.customerId === customerId);
    }

    updateOrderStatus(orderId, newStatus, message = '') {
        const order = this.getOrder(orderId);
        if (!order) return false;

        order.status = newStatus;
        order.updatedAt = new Date().toISOString();
        order.timeline.push({
            status: newStatus,
            timestamp: new Date().toISOString(),
            message: message || this.getStatusMessage(newStatus)
        });

        this.saveOrders();
        return true;
    }

    getStatusMessage(status) {
        const messages = {
            'pending': 'في انتظار التأكيد',
            'confirmed': 'تم تأكيد الطلب',
            'processing': 'جاري المعالجة',
            'shipped': 'تم الشحن',
            'delivered': 'تم التسليم',
            'cancelled': 'تم الإلغاء'
        };
        return messages[status] || 'تحديث الطلب';
    }

    getOrderStatistics() {
        const stats = {
            totalOrders: this.orders.length,
            totalRevenue: 0,
            averageOrderValue: 0,
            ordersByStatus: {},
            recentOrders: []
        };

        this.orderStatuses.forEach(s => stats.ordersByStatus[s] = 0);

        this.orders.forEach(order => {
            stats.totalRevenue += order.total;
            stats.ordersByStatus[order.status]++;
        });

        stats.averageOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;
        stats.recentOrders = [...this.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

        return stats;
    }

    searchOrders(filters = {}) {
        return this.orders.filter(order => {
            if (filters.status && order.status !== filters.status) return false;
            if (filters.customerId && order.customerId !== filters.customerId) return false;
            if (filters.search) {
                const term = filters.search.toLowerCase();
                return order.id.toLowerCase().includes(term) ||
                       order.customerName.toLowerCase().includes(term) ||
                       order.customerPhone.includes(term);
            }
            return true;
        });
    }
}

// ========== 6. نظام الواتساب ==========
class WhatsAppIntegration {
    constructor() {
        this.storePhone = '213562243648';
        this.orderHistory = this.loadOrderHistory();
    }

    loadOrderHistory() {
        const saved = localStorage.getItem('nardoo_order_history');
        return saved ? JSON.parse(saved) : [];
    }

    saveOrderHistory() {
        localStorage.setItem('nardoo_order_history', JSON.stringify(this.orderHistory));
    }

    formatOrderMessage(orderData) {
        const {
            items = [],
            customerName = currentUser?.name || 'عميل',
            customerPhone = '',
            customerAddress = '',
            paymentMethod = 'الواتساب',
            notes = '',
            orderId = ''
        } = orderData;

        let message = '🛍️ *طلب جديد من نكهة وجمال*\n';
        message += '━━━━━━━━━━━━━━━━━━━━━━\n\n';

        message += '👤 *العميل:*\n';
        message += `  • الاسم: ${customerName}\n`;
        message += `  • الهاتف: ${customerPhone || 'غير متوفر'}\n`;
        message += `  • العنوان: ${customerAddress || 'غير محدد'}\n\n`;

        message += '📦 *المنتجات:*\n';
        items.forEach((item, i) => {
            message += `  ${i+1}. ${item.name}\n`;
            message += `     • ${item.price.toLocaleString()} دج × ${item.quantity}\n`;
        });

        const subtotal = items.reduce((s, i) => s + (i.price * i.quantity), 0);
        const shipping = 800;
        const total = subtotal + shipping;

        message += '\n💰 *المجموع:*\n';
        message += `  • المجموع الفرعي: ${subtotal.toLocaleString()} دج\n`;
        message += `  • الشحن: ${shipping} دج\n`;
        message += `  • *الإجمالي: ${total.toLocaleString()} دج*\n\n`;

        message += `💳 *الدفع:* ${paymentMethod}\n`;
        if (notes) message += `📝 *ملاحظات:* ${notes}\n`;
        if (orderId) message += `🔔 *معرّف الطلب:* #${orderId}\n`;

        return message;
    }

    calculateShipping(address) {
        if (!address) return 800;
        const rates = {
            'الجزائر': 500,
            'وهران': 700,
            'قسنطينة': 800,
            'الجنوب': 1200
        };

        for (const [region, cost] of Object.entries(rates)) {
            if (address.includes(region)) return cost;
        }
        return 800;
    }

    sendOrder(orderData, recipientPhone = null) {
        const message = this.formatOrderMessage(orderData);
        const phone = recipientPhone || this.storePhone;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');

        const order = {
            id: `WH${Date.now()}`,
            ...orderData,
            timestamp: new Date().toISOString(),
            status: 'sent'
        };
        this.orderHistory.push(order);
        this.saveOrderHistory();

        return order.id;
    }

    getOrderHistory() {
        return this.orderHistory;
    }

    getSalesStatistics() {
        const stats = {
            totalOrders: this.orderHistory.length,
            totalRevenue: 0,
            averageOrderValue: 0
        };

        this.orderHistory.forEach(order => {
            const total = order.items.reduce((s, i) => s + (i.price * i.quantity), 0);
            stats.totalRevenue += total;
        });

        stats.averageOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;
        return stats;
    }
}

// ========== 7. نظام التحليلات ==========
class AnalyticsSystem {
    constructor() {
        this.events = this.loadEvents();
        this.pageViews = this.loadPageViews();
        this.userSessions = this.loadUserSessions();
    }

    loadEvents() {
        const saved = localStorage.getItem('nardoo_analytics_events');
        return saved ? JSON.parse(saved) : [];
    }

    loadPageViews() {
        const saved = localStorage.getItem('nardoo_page_views');
        return saved ? JSON.parse(saved) : [];
    }

    loadUserSessions() {
        const saved = localStorage.getItem('nardoo_user_sessions');
        return saved ? JSON.parse(saved) : [];
    }

    saveEvents() {
        localStorage.setItem('nardoo_analytics_events', JSON.stringify(this.events));
    }

    savePageViews() {
        localStorage.setItem('nardoo_page_views', JSON.stringify(this.pageViews));
    }

    saveUserSessions() {
        localStorage.setItem('nardoo_user_sessions', JSON.stringify(this.userSessions));
    }

    trackEvent(eventType, eventData = {}) {
        const event = {
            id: `EVT${Date.now()}${Math.random().toString(36).substring(2, 8)}`,
            type: eventType,
            data: eventData,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };
        this.events.push(event);
        this.saveEvents();
    }

    trackPageView(pageName) {
        this.pageViews.push({
            id: `PV${Date.now()}`,
            pageName,
            timestamp: new Date().toISOString(),
            referrer: document.referrer
        });
        this.savePageViews();
    }

    getVisitStatistics() {
        return {
            totalPageViews: this.pageViews.length,
            uniquePages: new Set(this.pageViews.map(p => p.pageName)).size,
            totalEvents: this.events.length
        };
    }

    getConversionRate() {
        const cartEvents = this.events.filter(e => e.type === 'addToCart').length;
        const purchaseEvents = this.events.filter(e => e.type === 'purchase').length;
        return cartEvents > 0 ? ((purchaseEvents / cartEvents) * 100).toFixed(2) : 0;
    }

    generateComprehensiveReport() {
        return {
            visits: this.getVisitStatistics(),
            conversionRate: this.getConversionRate(),
            eventsByType: this.events.reduce((acc, e) => {
                acc[e.type] = (acc[e.type] || 0) + 1;
                return acc;
            }, {})
        };
    }
}

// ========== 8. إنشاء الكائنات ==========
const orderManager = new OrderManagementSystem();
const whatsappManager = new WhatsAppIntegration();
const analyticsManager = new AnalyticsSystem();

// ========== 9. دوال المساعدة والإشعارات ==========
function showAdvancedNotification(message, type = 'info', title = '') {
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

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode', !isDarkMode);
    const toggle = document.getElementById('themeToggle');
    toggle.innerHTML = isDarkMode ? 
        '<i class="fas fa-moon"></i><span>ليلي</span>' : 
        '<i class="fas fa-sun"></i><span>نهاري</span>';
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// ========== 10. دوال التاريخ والوقت ==========
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
    if (diffInSeconds < 2592000) {
        const weeks = Math.floor(diffInSeconds / 604800);
        return `منذ ${weeks} ${weeks === 1 ? 'أسبوع' : 'أسابيع'}`;
    }
    if (diffInSeconds < 31536000) {
        const months = Math.floor(diffInSeconds / 2592000);
        return `منذ ${months} ${months === 1 ? 'شهر' : 'أشهر'}`;
    }
    const years = Math.floor(diffInSeconds / 31536000);
    return `منذ ${years} ${years === 1 ? 'سنة' : 'سنوات'}`;
}

// ========== 11. دوال تقييم النجوم ==========
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

// ========== 12. دوال الفرز ==========
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

// ========== 13. إدارة المنتجات ==========
function loadProducts() {
    const saved = localStorage.getItem('nardoo_products');
    if (saved) {
        products = JSON.parse(saved);
        console.log('تم تحميل المنتجات من localStorage:', products.length);
    } else {
        products = [
            { 
                id: 1, 
                name: "عرض رمضان - طقم بهارات كامل", 
                category: "promo", 
                price: 3500, 
                stock: 20, 
                rating: 5.0,
                images: ["https://via.placeholder.com/300/ff6b6b/ffffff?text=عرض+رمضان"],
                merchantId: null,
                merchantName: 'المتجر',
                soldCount: 0,
                createdAt: new Date().toISOString()
            },
            { 
                id: 2, 
                name: "بهارات برياني أصلية - خلطة خاصة", 
                category: "spices", 
                price: 4500, 
                stock: 15, 
                rating: 4.5,
                images: ["https://via.placeholder.com/300/ffd93d/000000?text=برياني"],
                merchantId: null,
                merchantName: 'المتجر',
                soldCount: 0,
                createdAt: new Date().toISOString()
            }
        ];
        saveProducts();
    }
    displayProducts();
}

function saveProducts() {
    localStorage.setItem('nardoo_products', JSON.stringify(products));
    console.log('تم حفظ المنتجات في localStorage');
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
        filtered = filtered.filter(p => p.merchantId === currentUser.id);
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
                <h3 style="color: var(--gold); font-size: 28px; margin-bottom: 15px;">لا توجد منتجات</h3>
                <p style="color: var(--text-secondary); font-size: 18px; margin-bottom: 30px;">لم تقم بإضافة أي منتجات بعد</p>
                ${currentUser ? `
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

    container.innerHTML = filtered.map(product => {
        const stockClass = product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : 'in-stock';
        const stockText = product.stock <= 0 ? 'غير متوفر' : product.stock < 5 ? `كمية محدودة (${product.stock})` : `متوفر (${product.stock})`;

        const images = product.images && product.images.length > 0 ? product.images : [
            "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال"
        ];

        const slides = images.map((img, idx) => `
            <div class="swiper-slide">
                <img src="${img}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300/2c5e4f/ffffff?text=صورة+غير+متوفرة';">
            </div>
        `).join('');

        let categoryIcon = 'fas fa-tag';
        if (product.category === 'promo') categoryIcon = 'fas fa-fire';
        else if (product.category === 'spices') categoryIcon = 'fas fa-mortar-pestle';
        else if (product.category === 'cosmetic') categoryIcon = 'fas fa-spa';
        else if (product.category === 'other') categoryIcon = 'fas fa-gem';

        const merchant = users.find(u => u.id === product.merchantId);
        const timeAgo = getSimpleTimeAgo(product.createdAt);

        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-time-badge">
                    <i class="far fa-clock"></i> ${timeAgo}
                </div>
                
                ${product.merchantId ? `
                    <div class="merchant-badge">
                        <i class="fas fa-store"></i> 
                        <span class="merchant-name" title="${merchant?.name || 'تاجر'}">${merchant?.name || 'تاجر'}</span>
                    </div>
                ` : ''}
                
                <div class="product-gallery">
                    <div class="swiper product-swiper-${product.id}">
                        <div class="swiper-wrapper">
                            ${slides}
                        </div>
                        <div class="swiper-pagination"></div>
                        <div class="swiper-button-next"></div>
                        <div class="swiper-button-prev"></div>
                    </div>
                </div>

                <div class="product-info">
                    <div class="product-category">
                        <i class="${categoryIcon}"></i> ${getCategoryName(product.category)}
                    </div>
                    
                    <h3 class="product-title">${product.name}</h3>
                    
                    ${!product.merchantId ? `
                        <div class="product-merchant-info">
                            <i class="fas fa-shop"></i>
                            <span>متجر نكهة وجمال</span>
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
                    
                    <div class="product-actions">
                        <button class="add-to-cart" onclick="addToCart(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> أضف للسلة
                        </button>
                        <button class="wishlist-btn" onclick="viewProductDetails(${product.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    setTimeout(() => {
        filtered.forEach(product => {
            const swiperEl = document.querySelector(`.product-swiper-${product.id}`);
            if (swiperEl && !swiperEl.swiper) {
                new Swiper(`.product-swiper-${product.id}`, {
                    pagination: { el: '.swiper-pagination', clickable: true },
                    navigation: {
                        nextEl: '.swiper-button-next',
                        prevEl: '.swiper-button-prev',
                    },
                    loop: product.images?.length > 1,
                    autoplay: product.images?.length > 1 ? {
                        delay: 3000,
                        disableOnInteraction: false,
                    } : false,
                });
            }
        });
    }, 200);

    analyticsManager.trackPageView('products');
}

function filterProducts(category) {
    currentFilter = category;
    
    document.querySelectorAll('.nav-link, .category-btn').forEach(el => {
        el.classList.remove('active');
    });
    
    document.querySelectorAll(`[onclick*="'${category}'"]`).forEach(el => {
        el.classList.add('active');
    });
    
    displayProducts();
}

function searchProducts() {
    searchTerm = document.getElementById('searchInput').value;
    displayProducts();
    analyticsManager.trackEvent('search', { searchTerm });
    
    const searchBox = document.querySelector('.search-box');
    searchBox.style.animation = 'pulse 0.5s';
    setTimeout(() => {
        searchBox.style.animation = '';
    }, 500);
    
    showSearchIndicator(searchTerm);
}

function showSearchIndicator(term) {
    if (!term) return;
    
    const searchWrapper = document.querySelector('.search-wrapper');
    let indicator = document.querySelector('.search-indicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'search-indicator';
        searchWrapper.appendChild(indicator);
    }
    
    indicator.innerHTML = `🔍 جاري البحث عن: "${term}"`;
    
    setTimeout(() => {
        if (indicator) {
            indicator.remove();
        }
    }, 3000);
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
    document.getElementById('cartCounter').textContent = count;
    document.getElementById('fixedCartCounter').textContent = count;
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) {
        showAdvancedNotification('المنتج غير متوفر', 'error');
        return;
    }

    const existing = cart.find(item => item.productId === productId);
    if (existing) {
        if (existing.quantity < product.stock) {
            existing.quantity++;
        } else {
            showAdvancedNotification('الكمية المتوفرة غير كافية', 'warning');
            return;
        }
    } else {
        cart.push({
            productId,
            name: product.name,
            price: product.price,
            quantity: 1,
            image: product.images?.[0] || '',
            merchantId: product.merchantId,
            merchantName: product.merchantName
        });
    }

    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showAdvancedNotification('تمت الإضافة إلى السلة', 'success', 'تم بنجاح');
    analyticsManager.trackEvent('addToCart', { productId });
    
    const fixedCart = document.getElementById('fixedCart');
    fixedCart.style.animation = 'shake 0.5s';
    setTimeout(() => {
        fixedCart.style.animation = 'pulse 2s infinite';
    }, 500);
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
    const item = cart.find(i => i.productId === productId);
    const product = products.find(p => p.id === productId);

    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }

    if (newQuantity > product.stock) {
        showAdvancedNotification('الكمية غير متوفرة', 'warning');
        return;
    }

    item.quantity = newQuantity;
    saveCart();
    updateCartCounter();
    updateCartDisplay();
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.productId !== productId);
    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showAdvancedNotification('تمت إزالة المنتج من السلة', 'info', 'تم');
}

// 🟢 دالة إتمام الشراء (مع إرسال تلجرام)
async function checkoutCart() {
    if (cart.length === 0) {
        showAdvancedNotification('السلة فارغة', 'warning');
        return;
    }

    const order = {
        customerName: currentUser?.name || 'عميل',
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 800
    };

    // 🟢 إرسال طلب أخضر إلى تلجرام
    await sendOrderToTelegram(order);

    // إرسال واتساب للتجار
    const merchants = {};
    cart.forEach(item => {
        if (item.merchantId && !merchants[item.merchantId]) {
            const merchant = users.find(u => u.id === item.merchantId);
            if (merchant?.phone) {
                merchants[item.merchantId] = {
                    phone: merchant.phone,
                    items: []
                };
            }
        }
        if (item.merchantId && merchants[item.merchantId]) {
            merchants[item.merchantId].items.push(item);
        }
    });

    Object.values(merchants).forEach(merchant => {
        const msg = `🛍️ لديك طلب جديد من ${order.customerName}`;
        window.open(`https://wa.me/${merchant.phone}?text=${encodeURIComponent(msg)}`, '_blank');
    });

    cart = [];
    saveCart();
    updateCartCounter();
    toggleCart();
    showAdvancedNotification('✅ تم إرسال الطلب', 'success');
}

// ========== 15. دوال التمرير ==========
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToBottom() {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
}

function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function toggleQuickTopButton() {
    const quickTopBtn = document.getElementById('quickTopBtn');
    if (!quickTopBtn) return;
    quickTopBtn.classList.toggle('show', window.scrollY > 300);
}

function updateFixedCartCounter() {
    const fixedCounter = document.getElementById('fixedCartCounter');
    if (fixedCounter) {
        fixedCounter.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    }
}

function addScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.product-card, .feature-card, .marquee-item').forEach(el => {
        observer.observe(el);
    });
}

// ========== 16. عداد تنازلي ==========
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

// ========== 17. أشرطة التقدم ==========
function updateProgressBars() {
    setInterval(() => {
        document.querySelectorAll('.progress-fill, .marquee-progress-fill').forEach(fill => {
            fill.style.width = Math.floor(Math.random() * 50) + 50 + '%';
        });
    }, 5000);
}

// ========== 18. عرض تفاصيل المنتج ==========
function viewProductDetails(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');

    const images = product.images?.map(img => `
        <img src="${img}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 20px; margin-bottom: 10px;">
    `).join('') || '<div style="height: 300px; background: var(--nardoo); display: flex; align-items: center; justify-content: center; border-radius: 20px;"><i class="fas fa-image" style="font-size: 80px; color: var(--gold);"></i></div>';

    const timeAgo = getSimpleTimeAgo(product.createdAt);

    content.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 20px; color: var(--gold);">${product.name}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <div><div style="display: grid; gap: 10px;">${images}</div></div>
            <div>
                <div style="margin-bottom: 20px;"><span style="background: var(--gold); padding: 5px 15px; border-radius: 20px; color: var(--bg-primary); font-weight: 700;">${getCategoryName(product.category)}</span></div>
                <p style="margin-bottom: 20px;">${product.description || 'منتج عالي الجودة'}</p>
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

// ========== 19. إدارة المستخدمين ==========
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
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const user = users.find(u => (u.email === email || u.name === email) && u.password === password);

    if (user) {
        currentUser = user;
        localStorage.setItem('current_user', JSON.stringify(user));
        closeModal('loginModal');
        updateUIBasedOnRole();
        showAdvancedNotification(`مرحباً ${user.name}`, 'success');
    } else {
        showAdvancedNotification('بيانات الدخول غير صحيحة', 'error');
    }
}

// 🔵 دالة تسجيل التاجر (مع إرسال تلجرام)
function handleRegister() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const phone = document.getElementById('regPhone')?.value || '';
    const isMerchant = document.getElementById('isMerchant').checked;

    if (!name || !email || !password) {
        showAdvancedNotification('الرجاء ملء جميع الحقول', 'error');
        return;
    }

    if (users.find(u => u.email === email)) {
        showAdvancedNotification('البريد الإلكتروني مستخدم بالفعل', 'error');
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
        newUser.merchantLevel = document.getElementById('merchantLevel').value;
        newUser.merchantDesc = document.getElementById('merchantDesc').value;
        newUser.storeName = newUser.merchantDesc.split('\n')[0] || 'متجر ' + name;
        
        // 🔵 إرسال طلب أزرق إلى تلجرام
        sendMerchantRequestToTelegram(newUser);
        showAdvancedNotification('📋 تم إرسال طلب التسجيل إلى المدير', 'info');
    } else {
        showAdvancedNotification('✅ تم التسجيل بنجاح', 'success');
    }

    users.push(newUser);
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    switchAuthTab('login');
}

function updateUIBasedOnRole() {
    if (!currentUser) return;

    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    document.getElementById('merchantPanelContainer').style.display = 'none';
    
    const myProductsBtn = document.getElementById('myProductsBtn');
    if (myProductsBtn) myProductsBtn.remove();

    if (currentUser.role === 'admin') {
        document.getElementById('dashboardBtn').style.display = 'flex';
        document.getElementById('userBtn').innerHTML = '<i class="fas fa-crown"></i>';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
        showAdvancedNotification('مرحباً بك يا مدير', 'success');
    } 
    else if (currentUser.role === 'merchant_approved') {
        document.getElementById('dashboardBtn').style.display = 'none';
        document.getElementById('userBtn').innerHTML = '<i class="fas fa-store"></i>';
        addMerchantMenuButton();
        showMerchantPanel();
        showAdvancedNotification('مرحباً أيها التاجر', 'info');
    } 
    else {
        document.getElementById('dashboardBtn').style.display = 'none';
        document.getElementById('userBtn').innerHTML = '<i class="fas fa-user"></i>';
    }
}

function addMerchantMenuButton() {
    const navMenu = document.getElementById('mainNav');
    if (navMenu && !document.getElementById('myProductsBtn')) {
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
    document.querySelectorAll('.nav-link, .category-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('myProductsBtn').classList.add('active');
    displayProducts();
}

function showMerchantPanel() {
    if (!currentUser || currentUser.role !== 'merchant_approved') return;
    
    const merchantProducts = products.filter(p => p.merchantId === currentUser.id);
    const totalSales = merchantProducts.reduce((sum, p) => sum + (p.price * (p.soldCount || 0)), 0);
    
    document.getElementById('merchantPanelContainer').style.display = 'block';
    document.getElementById('merchantPanelContainer').innerHTML = `
        <div class="merchant-panel">
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
}

// ========== 20. الموافقة على تاجر (للمدير) ==========
async function approveMerchant(userId) {
    const user = users.find(u => u.id == userId);
    if (!user || currentUser?.role !== 'admin') return;

    user.role = 'merchant_approved';
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    // 🟡 إشعار أصفر في تلجرام
    await sendNotificationToTelegram(`✅ تمت الموافقة على التاجر: ${user.name}`);
    showAdvancedNotification('تمت الموافقة على التاجر', 'success');
}

// ========== 21. رفض تاجر (للمدير) ==========
async function rejectMerchant(userId) {
    const user = users.find(u => u.id == userId);
    if (!user || currentUser?.role !== 'admin') return;

    user.role = 'customer';
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    // 🟡 إشعار أصفر في تلجرام
    await sendNotificationToTelegram(`❌ تم رفض طلب التاجر: ${user.name}`);
    showAdvancedNotification('تم رفض طلب التاجر', 'info');
}

// ========== 22. إضافة وتعديل وحذف المنتجات ==========
function showAddProductModal() {
    if (!currentUser) {
        showAdvancedNotification('يجب تسجيل الدخول أولاً', 'warning');
        openLoginModal();
        return;
    }

    if (currentUser.role === 'merchant_approved') {
        document.getElementById('modalTitle').textContent = 'إضافة منتج جديد (خاص بك)';
        const merchantSelect = document.getElementById('productMerchant');
        merchantSelect.innerHTML = `<option value="${currentUser.id}">${currentUser.name}</option>`;
        merchantSelect.disabled = true;
    } 
    else if (currentUser.role === 'admin') {
        document.getElementById('modalTitle').textContent = 'إضافة منتج جديد';
        const merchantSelect = document.getElementById('productMerchant');
        merchantSelect.innerHTML = '<option value="">منتج عام</option>';
        users.filter(u => u.role === 'merchant_approved').forEach(m => {
            merchantSelect.innerHTML += `<option value="${m.id}">${m.name}</option>`;
        });
        merchantSelect.disabled = false;
    } 
    else {
        showAdvancedNotification('فقط المدير والتجار يمكنهم إضافة منتجات', 'error');
        return;
    }
    
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('editingProductId').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('productImagesData').value = '';
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
            preview.innerHTML += `<img src="${e.target.result}" class="preview-image">`;
            imagesData.push(e.target.result);
            document.getElementById('productImagesData').value = JSON.stringify(imagesData);
        };
        reader.readAsDataURL(file);
    }
}

// 🟣 دالة حفظ المنتج (مع إرسال تلجرام)
async function saveProduct() {
    if (!currentUser) {
        showAdvancedNotification('يجب تسجيل الدخول أولاً', 'error');
        return;
    }

    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const editingId = document.getElementById('editingProductId').value;
    const imagesData = document.getElementById('productImagesData').value;

    if (!name || !category || !price || !stock) {
        showAdvancedNotification('الرجاء ملء جميع الحقول', 'error');
        return;
    }

    let merchantId = null;
    if (currentUser.role === 'merchant_approved') {
        merchantId = currentUser.id;
    } else if (currentUser.role === 'admin') {
        merchantId = document.getElementById('productMerchant').value || null;
    }

    let images = [];
    try {
        images = imagesData ? JSON.parse(imagesData) : [];
    } catch(e) {
        images = [];
    }

    if (images.length === 0) {
        images = ["https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال"];
    }

    const productData = {
        name: name,
        category: category,
        price: price,
        stock: stock,
        rating: 4.5,
        images: images,
        merchantId: merchantId,
        merchantName: currentUser.name,
        soldCount: 0,
        createdAt: new Date().toISOString()
    };

    // 🟣 إرسال إشعار بنفسجي إلى تلجرام
    await sendNewProductToTelegram(productData);

    if (editingId) {
        const index = products.findIndex(p => p.id == editingId);
        if (index !== -1) {
            if (currentUser.role === 'merchant_approved' && products[index].merchantId !== currentUser.id) {
                showAdvancedNotification('لا يمكنك تعديل منتجات الآخرين', 'error');
                return;
            }
            products[index] = { ...productData, id: editingId };
            showAdvancedNotification('تم تعديل المنتج بنجاح', 'success');
        }
    } else {
        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        products.push({ id: newId, ...productData });
        showAdvancedNotification('تم إضافة المنتج بنجاح', 'success');
    }

    saveProducts();
    displayProducts();
    closeModal('productModal');
    
    if (currentUser.role === 'merchant_approved') {
        showMerchantPanel();
    }
}

function editProduct(id) {
    const product = products.find(p => p.id == id);
    if (!product) return;

    document.getElementById('modalTitle').textContent = 'تعديل المنتج';
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('editingProductId').value = id;

    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    if (product.images) {
        product.images.forEach(img => preview.innerHTML += `<img src="${img}" class="preview-image">`);
    }

    document.getElementById('productModal').style.display = 'flex';
}

function deleteProduct(id) {
    if (!currentUser) {
        showAdvancedNotification('يجب تسجيل الدخول أولاً', 'error');
        return;
    }

    const product = products.find(p => p.id == id);
    
    if (currentUser.role === 'merchant_approved' && product.merchantId !== currentUser.id) {
        showAdvancedNotification('لا يمكنك حذف منتجات الآخرين', 'error');
        return;
    }
    
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        products = products.filter(p => p.id != id);
        saveProducts();
        displayProducts();
        showAdvancedNotification('تم حذف المنتج', 'info');
        
        if (currentUser.role === 'merchant_approved') {
            showMerchantPanel();
        }
    }
}

// ========== 23. تأثيرات الكتابة ==========
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

// ========== 24. نظام المقارنة ==========
class ProductComparator {
    constructor() {
        this.compareList = JSON.parse(localStorage.getItem('compare_list')) || [];
    }

    addToCompare(product) {
        if (this.compareList.length >= 4) {
            showAdvancedNotification('لا يمكن مقارنة أكثر من 4 منتجات', 'warning');
            return false;
        }
        if (!this.compareList.find(p => p.id === product.id)) {
            this.compareList.push(product);
            localStorage.setItem('compare_list', JSON.stringify(this.compareList));
            showAdvancedNotification('تمت الإضافة للمقارنة', 'success');
            return true;
        }
        return false;
    }

    removeFromCompare(productId) {
        this.compareList = this.compareList.filter(p => p.id !== productId);
        localStorage.setItem('compare_list', JSON.stringify(this.compareList));
    }

    getCompareList() {
        return this.compareList;
    }

    clearCompare() {
        this.compareList = [];
        localStorage.setItem('compare_list', JSON.stringify(this.compareList));
    }
}

const comparator = new ProductComparator();

// ========== 25. تأثيرات الماوس ==========
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

// ========== 26. شريط تقدم التمرير ==========
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

// ========== 27. جسيمات متحركة ==========
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

// ========== 28. التهيئة (onload) ==========
window.onload = function() {
    loadProducts();
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

    analyticsManager.trackPageView('home');
    
    updateFixedCartCounter();
    window.addEventListener('scroll', toggleQuickTopButton);
    addScrollAnimations();
    updateCountdown();
    updateProgressBars();
    initMouseEffects();
    initScrollProgress();
    initParticles();
    
    const typingElement = document.getElementById('typing-text');
    if (typingElement) {
        new TypingAnimation(typingElement, ['نكهة وجمال', 'ناردو برو', 'تسوق آمن', 'جودة عالية'], 100, 2000).start();
    }
};

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};
