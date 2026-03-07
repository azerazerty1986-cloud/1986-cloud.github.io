// ========== ناردو برو - نظام متكامل مع تلجرام ==========
// ========== الإصدار: 3.0 (يدعم الأفكار 1، 2، 3) ==========

// ========== 1. إعدادات تلجرام (قناة واحدة متكاملة) ==========
const TELEGRAM = {
    botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
    channelId: '-1003822964890',
    adminId: '7461896689'
};

// ========== 2. متغيرات عامة ==========
let products = [];
let currentUser = null;
let cart = [];
let isDarkMode = true;
let currentFilter = 'all';
let searchTerm = '';
let sortBy = 'newest';
let users = [];
let notifications = [];
let wishlist = [];

// ========== 3. فهرسة النقاط (للتنقل السريع) ==========
const POINTS = {
    TELEGRAM_SETUP: 1,
    FETCH_PRODUCTS: 2,
    ADD_PRODUCT: 3,
    SEND_ORDER: 4,
    MERCHANT_REQUEST: 5,
    SEND_NOTIFICATION: 6,
    GLOBAL_VARS: 7,
    LOAD_USERS: 8,
    ORDER_MANAGEMENT: 9,
    WHATSAPP: 10,
    ANALYTICS: 11,
    CREATE_OBJECTS: 12,
    NOTIFICATIONS: 13,
    DATE_UTILS: 14,
    STARS: 15,
    SORT: 16,
    DISPLAY_PRODUCTS: 17,
    CART: 18,
    SCROLL: 19,
    COUNTDOWN: 20,
    PROGRESS: 21,
    PRODUCT_DETAILS: 22,
    USER_MANAGEMENT: 23,
    APPROVE_MERCHANT: 24,
    ADD_PRODUCT_MODAL: 25,
    DASHBOARD: 26,
    TYPING: 27,
    MOUSE_EFFECTS: 28,
    SCROLL_PROGRESS: 29,
    PARTICLES: 30,
    TELEGRAM_COMMANDS: 31,
    INIT: 32,
    // نقاط إضافية جديدة
    WISHLIST: 33,
    NOTIFICATION_CENTER: 34,
    PRODUCT_REVIEWS: 35,
    DISCOUNT_SYSTEM: 36,
    SHIPPING_TRACKING: 37,
    EXPORT_DATA: 38,
    BACKUP_SYSTEM: 39,
    MULTI_LANGUAGE: 40
};

// ========== 4. جلب المنتجات من قناة تلجرام (الفكرة 1) ==========
async function loadProductsFromTelegram() {
    try {
        console.log('🔄 [النقطة 2] جلب المنتجات من تلجرام...');
        
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`
        );
        
        const data = await response.json();
        const products = [];
        
        if (data.ok && data.result) {
            console.log(`✅ تم العثور على ${data.result.length} تحديث`);
            
            // عكس الترتيب لجلب الأحدث أولاً
            const updates = [...data.result].reverse();
            
            for (const update of updates) {
                if (update.channel_post) {
                    const post = update.channel_post;
                    
                    // البحث عن رسائل المنتجات (🟣)
                    if (post.text && post.text.includes('🟣')) {
                        console.log('📦 وجدنا منتج:', post.text);
                        
                        // استخراج البيانات من النص
                        const lines = post.text.split('\n');
                        let name = 'منتج';
                        let price = 0;
                        let category = 'other';
                        let stock = 0;
                        let merchant = 'المتجر';
                        let description = '';
                        let images = [];
                        
                        lines.forEach(line => {
                            if (line.includes('المنتج:')) {
                                name = line.replace('المنتج:', '').replace(/[🟣*]/g, '').trim();
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
                            } else if (line.includes('الوصف:')) {
                                description = line.replace('الوصف:', '').replace(/[🟣*]/g, '').trim();
                            } else if (line.includes('الصور:')) {
                                // استخراج روابط الصور إذا وجدت
                                const urls = line.match(/https?:\/\/[^\s]+/g);
                                if (urls) images = urls;
                            }
                        });
                        
                        products.push({
                            id: post.message_id,
                            name: name,
                            price: price,
                            category: category,
                            stock: stock,
                            merchantName: merchant || 'المتجر',
                            description: description || 'منتج عالي الجودة',
                            rating: 4.5,
                            images: images.length > 0 ? images : ["https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال"],
                            createdAt: new Date(post.date * 1000).toISOString(),
                            soldCount: 0,
                            views: 0,
                            discount: 0
                        });
                        
                        console.log(`✅ منتج مضاف: ${name} - ${price} دج`);
                    }
                }
            }
        }
        
        console.log(`✅ [النقطة 2] تم تحميل ${products.length} منتج من تلجرام`);
        
        // حفظ نسخة احتياطية في localStorage
        localStorage.setItem('nardoo_products', JSON.stringify(products));
        
        return products;
        
    } catch (error) {
        console.error('❌ خطأ في جلب المنتجات:', error);
        
        // استخدم localStorage كاحتياطي
        const saved = localStorage.getItem('nardoo_products');
        return saved ? JSON.parse(saved) : [];
    }
}

// ========== 5. إضافة منتج جديد إلى تلجرام (الفكرة 1) ==========
async function addProductToTelegram(product) {
    const message = `
🟣 *منتج جديد في المتجر*
━━━━━━━━━━━━━━━━━━━━━━
📦 *المنتج:* ${product.name}
💰 *السعر:* ${product.price} دج
🏷️ *القسم:* ${product.category}
📊 *الكمية:* ${product.stock}
👤 *التاجر:* ${product.merchantName}
📝 *الوصف:* ${product.description || 'منتج عالي الجودة'}
🕐 *تاريخ الإضافة:* ${new Date().toLocaleString('ar-DZ')}
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
            // [نقطة إضافية 39] نسخ احتياطي
            backupProducts();
        }
        
        return result.ok;
    } catch (error) {
        console.error('❌ [النقطة 3] خطأ في إضافة المنتج:', error);
        return false;
    }
}

// ========== 6. إرسال طلب شراء (🟢) (الفكرة 3) ==========
async function sendOrderToTelegram(order) {
    const message = `
🟢 *طلب شراء جديد*
━━━━━━━━━━━━━━━━━━━━━━
👤 *الزبون:* ${order.customerName}
📞 *الهاتف:* ${order.customerPhone || 'غير متوفر'}
📍 *العنوان:* ${order.customerAddress || 'غير محدد'}
📦 *المنتجات:*
${order.items.map((item, i) => 
    `  ${i+1}. ${item.name} (${item.quantity}) - ${item.price} دج`
).join('\n')}
💰 *المجموع الفرعي:* ${order.subtotal} دج
🚚 *الشحن:* ${order.shipping} دج
💎 *الإجمالي:* ${order.total} دج
💳 *طريقة الدفع:* ${order.paymentMethod || 'الواتساب'}
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

// ========== 7. إرسال طلب انضمام تاجر (🔵) (الفكرة 2) ==========
async function sendMerchantRequestToTelegram(merchant) {
    const message = `
🔵 *طلب انضمام تاجر جديد*
━━━━━━━━━━━━━━━━━━━━━━
🏪 *اسم المتجر:* ${merchant.storeName}
👤 *التاجر:* ${merchant.name}
📧 *البريد:* ${merchant.email}
📞 *الهاتف:* ${merchant.phone || 'غير متوفر'}
📊 *المستوى:* ${merchant.merchantLevel || '1'}
📝 *الوصف:* ${merchant.merchantDesc || 'تاجر جديد'}

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

// ========== 8. إرسال إشعار عام (🟡) ==========
async function sendNotificationToTelegram(text, type = 'info') {
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : '🟡';
    const title = type === 'success' ? 'نجاح' : type === 'error' ? 'خطأ' : 'إشعار';
    
    const message = `
${emoji} *${title}*
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

// ========== 9. [نقطة إضافية 39] نظام النسخ الاحتياطي ==========
function backupProducts() {
    const backup = {
        timestamp: new Date().toISOString(),
        products: products,
        users: users,
        version: '3.0'
    };
    
    localStorage.setItem('nardoo_backup_' + Date.now(), JSON.stringify(backup));
    
    // الاحتفاظ بآخر 5 نسخ فقط
    const keys = Object.keys(localStorage).filter(k => k.startsWith('nardoo_backup_'));
    if (keys.length > 5) {
        keys.sort().slice(0, keys.length - 5).forEach(k => localStorage.removeItem(k));
    }
}

function restoreFromBackup(timestamp) {
    const backup = localStorage.getItem('nardoo_backup_' + timestamp);
    if (backup) {
        const data = JSON.parse(backup);
        products = data.products;
        users = data.users;
        localStorage.setItem('nardoo_products', JSON.stringify(products));
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        showAdvancedNotification('✅ تم استعادة النسخة الاحتياطية', 'success');
        displayProducts();
    }
}

// ========== 10. [نقطة إضافية 38] تصدير البيانات ==========
function exportData(format = 'json') {
    const data = {
        products: products,
        users: users,
        orders: orderManager.orders,
        date: new Date().toISOString()
    };
    
    if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nardoo_export_${Date.now()}.json`;
        a.click();
    } else if (format === 'csv') {
        // تصدير المنتجات كـ CSV
        let csv = 'الاسم,السعر,القسم,الكمية,التاجر\n';
        products.forEach(p => {
            csv += `${p.name},${p.price},${p.category},${p.stock},${p.merchantName}\n`;
        });
        
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nardoo_products_${Date.now()}.csv`;
        a.click();
    }
    
    showAdvancedNotification(`✅ تم تصدير البيانات بصيغة ${format}`, 'success');
}

// ========== 11. تحميل المستخدمين من localStorage ==========
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
                phone: '0555555555',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('nardoo_users', JSON.stringify(users));
    }
}
loadUsers();

// ========== 12. نظام إدارة الطلبات (مطور) ==========
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
            }],
            trackingNumber: this.generateTrackingNumber()
        };

        order.subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        order.tax = Math.round(order.subtotal * 0.09);
        order.total = order.subtotal + order.tax + order.shipping - order.discount;

        this.orders.push(order);
        this.saveOrders();
        
        // [نقطة إضافية 37] إرسال إشعار التتبع
        if (order.customerPhone) {
            this.sendTrackingNotification(order);
        }
        
        return order;
    }
    
    generateTrackingNumber() {
        return `TRK${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    }
    
    // [نقطة إضافية 37] نظام تتبع الشحن
    sendTrackingNotification(order) {
        const message = `📦 *طلبك رقم ${order.id} في الطريق*\nرقم التتبع: ${order.trackingNumber}\nيمكنك متابعة طلبك على الرابط: https://track.nardoo.dz/${order.trackingNumber}`;
        
        // إرسال واتساب للعميل
        if (order.customerPhone) {
            window.open(`https://wa.me/${order.customerPhone}?text=${encodeURIComponent(message)}`, '_blank');
        }
    }
    
    updateTrackingStatus(orderId, status, location) {
        const order = this.getOrder(orderId);
        if (!order) return false;
        
        order.timeline.push({
            status: 'tracking',
            timestamp: new Date().toISOString(),
            message: `📦 ${status} - ${location}`
        });
        
        this.saveOrders();
        return true;
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
                       order.customerPhone.includes(term) ||
                       order.trackingNumber.toLowerCase().includes(term);
            }
            return true;
        });
    }
}

// ========== 13. نظام الواتساب (مطور) ==========
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
            orderId = '',
            trackingNumber = ''
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
        if (trackingNumber) message += `📦 *رقم التتبع:* ${trackingNumber}\n`;

        return message;
    }

    calculateShipping(address) {
        if (!address) return 800;
        const rates = {
            'الجزائر': 500,
            'وهران': 700,
            'قسنطينة': 800,
            'عنابة': 800,
            'سطيف': 850,
            'الجنوب': 1200,
            'تيزي وزو': 750,
            'بجاية': 750
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

// ========== 14. نظام التحليلات (مطور) ==========
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

    getPopularProducts() {
        const productViews = {};
        this.events.filter(e => e.type === 'viewProduct').forEach(e => {
            const id = e.data.productId;
            productViews[id] = (productViews[id] || 0) + 1;
        });
        
        return Object.entries(productViews)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([id, views]) => ({
                productId: parseInt(id),
                views: views
            }));
    }

    generateComprehensiveReport() {
        return {
            visits: this.getVisitStatistics(),
            conversionRate: this.getConversionRate(),
            popularProducts: this.getPopularProducts(),
            eventsByType: this.events.reduce((acc, e) => {
                acc[e.type] = (acc[e.type] || 0) + 1;
                return acc;
            }, {})
        };
    }
}

// ========== 15. [نقطة إضافية 35] نظام التقييمات ==========
class ReviewSystem {
    constructor() {
        this.reviews = this.loadReviews();
    }

    loadReviews() {
        const saved = localStorage.getItem('nardoo_reviews');
        return saved ? JSON.parse(saved) : [];
    }

    saveReviews() {
        localStorage.setItem('nardoo_reviews', JSON.stringify(this.reviews));
    }

    addReview(productId, userId, userName, rating, comment) {
        const review = {
            id: `REV${Date.now()}${Math.random().toString(36).substring(2, 6)}`,
            productId: productId,
            userId: userId,
            userName: userName,
            rating: rating,
            comment: comment,
            createdAt: new Date().toISOString(),
            likes: 0,
            verified: false
        };

        this.reviews.push(review);
        this.saveReviews();

        // تحديث تقييم المنتج
        this.updateProductRating(productId);

        return review;
    }

    getProductReviews(productId) {
        return this.reviews.filter(r => r.productId === productId).sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
    }

    updateProductRating(productId) {
        const productReviews = this.getProductReviews(productId);
        if (productReviews.length === 0) return;

        const avgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
        const product = products.find(p => p.id === productId);
        if (product) {
            product.rating = avgRating;
            localStorage.setItem('nardoo_products', JSON.stringify(products));
        }
    }

    likeReview(reviewId) {
        const review = this.reviews.find(r => r.id === reviewId);
        if (review) {
            review.likes++;
            this.saveReviews();
        }
    }

    verifyReview(reviewId) {
        const review = this.reviews.find(r => r.id === reviewId);
        if (review) {
            review.verified = true;
            this.saveReviews();
        }
    }
}

// ========== 16. [نقطة إضافية 36] نظام الخصومات ==========
class DiscountSystem {
    constructor() {
        this.coupons = this.loadCoupons();
        this.activeDiscounts = [];
    }

    loadCoupons() {
        const saved = localStorage.getItem('nardoo_coupons');
        return saved ? JSON.parse(saved) : [
            {
                code: 'WELCOME10',
                type: 'percentage',
                value: 10,
                minPurchase: 1000,
                maxDiscount: 500,
                expiresAt: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
                usageLimit: 100,
                usedCount: 0
            },
            {
                code: 'FREE50',
                type: 'fixed',
                value: 50,
                minPurchase: 500,
                expiresAt: new Date(Date.now() + 15*24*60*60*1000).toISOString(),
                usageLimit: 50,
                usedCount: 0
            }
        ];
    }

    saveCoupons() {
        localStorage.setItem('nardoo_coupons', JSON.stringify(this.coupons));
    }

    validateCoupon(code, cartTotal) {
        const coupon = this.coupons.find(c => c.code === code);
        if (!coupon) return { valid: false, message: 'كود غير صالح' };

        // التحقق من تاريخ الانتهاء
        if (new Date(coupon.expiresAt) < new Date()) {
            return { valid: false, message: 'انتهت صلاحية الكود' };
        }

        // التحقق من حد الاستخدام
        if (coupon.usedCount >= coupon.usageLimit) {
            return { valid: false, message: 'تم استنفاذ عدد الاستخدامات' };
        }

        // التحقق من الحد الأدنى للشراء
        if (cartTotal < coupon.minPurchase) {
            return { valid: false, message: `الحد الأدنى للشراء ${coupon.minPurchase} دج` };
        }

        let discount = 0;
        if (coupon.type === 'percentage') {
            discount = Math.min((cartTotal * coupon.value) / 100, coupon.maxDiscount || Infinity);
        } else {
            discount = coupon.value;
        }

        return {
            valid: true,
            discount: discount,
            coupon: coupon
        };
    }

    applyCoupon(code, cartTotal) {
        const validation = this.validateCoupon(code, cartTotal);
        if (!validation.valid) return validation;

        validation.coupon.usedCount++;
        this.saveCoupons();

        return {
            valid: true,
            discount: validation.discount,
            finalTotal: cartTotal - validation.discount
        };
    }

    createCoupon(couponData) {
        const coupon = {
            id: `CPN${Date.now()}`,
            code: couponData.code.toUpperCase(),
            type: couponData.type,
            value: couponData.value,
            minPurchase: couponData.minPurchase || 0,
            maxDiscount: couponData.maxDiscount || null,
            expiresAt: couponData.expiresAt,
            usageLimit: couponData.usageLimit || 999999,
            usedCount: 0,
            createdAt: new Date().toISOString()
        };

        this.coupons.push(coupon);
        this.saveCoupons();
        return coupon;
    }
}

// ========== 17. [نقطة إضافية 40] نظام متعدد اللغات ==========
const I18N = {
    currentLanguage: 'ar',
    
    translations: {
        ar: {
            home: 'الرئيسية',
            products: 'المنتجات',
            cart: 'السلة',
            login: 'تسجيل الدخول',
            register: 'تسجيل جديد',
            search: 'بحث...',
            addToCart: 'أضف للسلة',
            outOfStock: 'غير متوفر',
            lowStock: 'كمية محدودة',
            inStock: 'متوفر',
            price: 'السعر',
            category: 'القسم',
            merchant: 'التاجر',
            checkout: 'إتمام الشراء',
            total: 'الإجمالي',
            shipping: 'الشحن',
            discount: 'الخصم',
            applyCoupon: 'تطبيق الكود'
        },
        fr: {
            home: 'Accueil',
            products: 'Produits',
            cart: 'Panier',
            login: 'Connexion',
            register: 'Inscription',
            search: 'Rechercher...',
            addToCart: 'Ajouter au panier',
            outOfStock: 'Rupture',
            lowStock: 'Stock limité',
            inStock: 'Disponible',
            price: 'Prix',
            category: 'Catégorie',
            merchant: 'Marchand',
            checkout: 'Commander',
            total: 'Total',
            shipping: 'Livraison',
            discount: 'Remise',
            applyCoupon: 'Appliquer'
        },
        en: {
            home: 'Home',
            products: 'Products',
            cart: 'Cart',
            login: 'Login',
            register: 'Register',
            search: 'Search...',
            addToCart: 'Add to Cart',
            outOfStock: 'Out of Stock',
            lowStock: 'Low Stock',
            inStock: 'In Stock',
            price: 'Price',
            category: 'Category',
            merchant: 'Merchant',
            checkout: 'Checkout',
            total: 'Total',
            shipping: 'Shipping',
            discount: 'Discount',
            applyCoupon: 'Apply'
        }
    },

    t(key) {
        return this.translations[this.currentLanguage][key] || key;
    },

    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('nardoo_language', lang);
            this.updateUIText();
        }
    },

    updateUIText() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = this.t(key);
        });
    }
};

// ========== 18. [نقطة إضافية 33] نظام المفضلة ==========
function toggleWishlist(productId) {
    const index = wishlist.indexOf(productId);
    if (index === -1) {
        wishlist.push(productId);
        showAdvancedNotification('تمت الإضافة إلى المفضلة', 'success');
    } else {
        wishlist.splice(index, 1);
        showAdvancedNotification('تمت الإزالة من المفضلة', 'info');
    }
    localStorage.setItem('nardoo_wishlist', JSON.stringify(wishlist));
    updateWishlistCounter();
}

function loadWishlist() {
    const saved = localStorage.getItem('nardoo_wishlist');
    wishlist = saved ? JSON.parse(saved) : [];
    updateWishlistCounter();
}

function updateWishlistCounter() {
    const counter = document.getElementById('wishlistCounter');
    if (counter) {
        counter.textContent = wishlist.length;
    }
}

function showWishlist() {
    const wishlistProducts = products.filter(p => wishlist.includes(p.id));
    
    const modal = document.getElementById('wishlistModal');
    const content = document.getElementById('wishlistContent');
    
    if (wishlistProducts.length === 0) {
        content.innerHTML = '<div style="text-align: center; padding: 40px;">المفضلة فارغة</div>';
    } else {
        content.innerHTML = wishlistProducts.map(p => `
            <div class="wishlist-item">
                <img src="${p.images[0]}" style="width: 60px; height: 60px; border-radius: 10px;">
                <div>
                    <h4>${p.name}</h4>
                    <div>${p.price} دج</div>
                </div>
                <button onclick="addToCart(${p.id}); toggleWishlist(${p.id});" class="btn-gold small">
                    <i class="fas fa-shopping-cart"></i>
                </button>
            </div>
        `).join('');
    }
    
    modal.style.display = 'flex';
}

// ========== 19. [نقطة إضافية 34] مركز الإشعارات ==========
function addNotification(message, type = 'info', link = null) {
    const notification = {
        id: `NOT${Date.now()}`,
        message: message,
        type: type,
        link: link,
        read: false,
        createdAt: new Date().toISOString()
    };
    
    notifications.unshift(notification);
    
    // الاحتفاظ بآخر 50 إشعار فقط
    if (notifications.length > 50) {
        notifications.pop();
    }
    
    localStorage.setItem('nardoo_notifications', JSON.stringify(notifications));
    updateNotificationBadge();
    
    // إظهار إشعار عائم
    showAdvancedNotification(message, type);
}

function loadNotifications() {
    const saved = localStorage.getItem('nardoo_notifications');
    notifications = saved ? JSON.parse(saved) : [];
    updateNotificationBadge();
}

function updateNotificationBadge() {
    const unread = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'flex' : 'none';
    }
}

function showNotifications() {
    const modal = document.getElementById('notificationsModal');
    const content = document.getElementById('notificationsContent');
    
    content.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.read ? 'read' : 'unread'}" onclick="markNotificationRead('${n.id}')">
            <div class="notification-icon ${n.type}">
                <i class="fas ${n.type === 'success' ? 'fa-check' : n.type === 'error' ? 'fa-times' : 'fa-info'}"></i>
            </div>
            <div class="notification-content">
                <div>${n.message}</div>
                <small>${getSimpleTimeAgo(n.createdAt)}</small>
            </div>
            ${n.link ? `<a href="${n.link}" target="_blank">عرض</a>` : ''}
        </div>
    `).join('');
    
    if (notifications.length === 0) {
        content.innerHTML = '<div style="text-align: center; padding: 40px;">لا توجد إشعارات</div>';
    }
    
    modal.style.display = 'flex';
}

function markNotificationRead(id) {
    const notification = notifications.find(n => n.id === id);
    if (notification) {
        notification.read = true;
        localStorage.setItem('nardoo_notifications', JSON.stringify(notifications));
        updateNotificationBadge();
    }
}

function markAllNotificationsRead() {
    notifications.forEach(n => n.read = true);
    localStorage.setItem('nardoo_notifications', JSON.stringify(notifications));
    updateNotificationBadge();
    showAdvancedNotification('تم تحديد الكل كمقروء', 'success');
}

// ========== 20. إنشاء الكائنات ==========
const orderManager = new OrderManagementSystem();
const whatsappManager = new WhatsAppIntegration();
const analyticsManager = new AnalyticsSystem();
const reviewSystem = new ReviewSystem();
const discountSystem = new DiscountSystem();

// ========== 21. دوال المساعدة والإشعارات المتقدمة ==========
function showAdvancedNotification(message, type = 'info', title = '', duration = 3000) {
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
    }, duration);
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

// ========== 22. دوال التاريخ والوقت ==========
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

// ========== 23. دوال تقييم النجوم (مطورة) ==========
function generateStars(rating, showNumber = false) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let starsHTML = '<div class="stars-container">';
    
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star star filled"></i>';
    }
    
    if (hasHalfStar) {
        starsHTML += '<i class="fas fa-star-half-alt star half"></i>';
    }
    
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="far fa-star star"></i>';
    }
    
    starsHTML += '</div>';
    
    if (showNumber) {
        starsHTML += `<span class="rating-value">${rating.toFixed(1)}</span>`;
    }
    
    return starsHTML;
}

// ========== 24. دوال الفرز ==========
function sortProducts(productsArray) {
    switch(sortBy) {
        case 'newest':
            return [...productsArray].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        case 'oldest':
            return [...productsArray].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        case 'price_low':
            return [...productsArray].sort((a, b) => a.price - b.price);
        case 'price_high':
            return [...productsArray].sort((a, b) => b.price - a.price);
        case 'rating':
            return [...productsArray].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        case 'popular':
            return [...productsArray].sort((a, b) => (b.views || 0) - (a.views || 0));
        case 'discount':
            return [...productsArray].sort((a, b) => (b.discount || 0) - (a.discount || 0));
        default:
            return productsArray;
    }
}

function changeSort(value) {
    sortBy = value;
    displayProducts();
    analyticsManager.trackEvent('sort', { sortBy: value });
}

// ========== 25. تحميل المنتجات من تلجرام ==========
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

function getCategoryIcon(category) {
    const icons = {
        'promo': 'fa-fire',
        'spices': 'fa-mortar-pestle',
        'cosmetic': 'fa-spa',
        'other': 'fa-gem'
    };
    return icons[category] || 'fa-tag';
}

// ========== 26. عرض المنتجات (مطور) ==========
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    let filtered = products.filter(p => p.stock > 0);
    
    if (currentFilter === 'my_products' && currentUser?.role === 'merchant_approved') {
        filtered = filtered.filter(p => p.merchantName === currentUser.name);
    }
    else if (currentFilter === 'wishlist' && currentUser) {
        filtered = filtered.filter(p => wishlist.includes(p.id));
    }
    else if (currentFilter === 'discount') {
        filtered = filtered.filter(p => p.discount > 0);
    }
    else if (currentFilter !== 'all') {
        filtered = filtered.filter(p => p.category === currentFilter);
    }

    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    filtered = sortProducts(filtered);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px;">
                <i class="fas fa-box-open" style="font-size: 80px; color: var(--gold); margin-bottom: 20px;"></i>
                <h3 style="color: var(--gold); font-size: 28px; margin-bottom: 15px;">لا توجد منتجات</h3>
                <p style="color: var(--text-secondary); font-size: 18px; margin-bottom: 30px;">أول منتج يضاف سيظهر هنا</p>
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

        const categoryIcon = getCategoryIcon(product.category);
        const timeAgo = getSimpleTimeAgo(product.createdAt);
        const inWishlist = wishlist.includes(product.id);
        
        const discountBadge = product.discount > 0 ? `
            <div class="discount-badge">
                -${product.discount}%
            </div>
        ` : '';

        return `
            <div class="product-card" data-id="${product.id}" onclick="viewProductDetails(${product.id})">
                ${discountBadge}
                <div class="product-time-badge">
                    <i class="far fa-clock"></i> ${timeAgo}
                </div>
                
                <div class="product-wishlist-btn" onclick="event.stopPropagation(); toggleWishlist(${product.id})">
                    <i class="fas fa-heart ${inWishlist ? 'active' : ''}"></i>
                </div>
                
                <div class="product-gallery">
                    <img src="${images[0]}" style="width: 100%; height: 250px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال';">
                </div>

                <div class="product-info">
                    <div class="product-category">
                        <i class="fas ${categoryIcon}"></i> ${getCategoryName(product.category)}
                    </div>
                    
                    <h3 class="product-title">${product.name}</h3>
                    
                    <div class="product-merchant-info">
                        <i class="fas fa-store"></i> ${product.merchantName}
                    </div>
                    
                    <div class="product-rating">
                        ${generateStars(product.rating || 4.5, true)}
                    </div>
                    
                    <div class="product-price">
                        ${product.discount > 0 ? `
                            <span class="old-price">${product.price.toLocaleString()}</span>
                            <span class="new-price">${(product.price * (1 - product.discount/100)).toLocaleString()}</span>
                        ` : `${product.price.toLocaleString()}`}
                        <small>دج</small>
                    </div>
                    
                    <div class="product-stock ${stockClass}">${stockText}</div>
                    
                    <div class="product-actions">
                        <button class="add-to-cart" onclick="event.stopPropagation(); addToCart(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> أضف للسلة
                        </button>
                        <button class="quick-view-btn" onclick="event.stopPropagation(); quickView(${product.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    analyticsManager.trackPageView('products');
}

function quickView(productId) {
    viewProductDetails(productId);
}

function filterProducts(category) {
    currentFilter = category;
    displayProducts();
    
    // تحديث الأزرار النشطة
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[onclick="filterProducts('${category}')"]`);
    if (activeBtn) activeBtn.classList.add('active');
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
    
    if (searchTerm) {
        showSearchIndicator(searchTerm);
    }
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

// ========== 27. إدارة السلة (مطورة) ==========
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
        showAdvancedNotification('المنتج غير متوفر', 'error');
        return;
    }

    const existing = cart.find(item => item.productId == productId);
    if (existing) {
        if (existing.quantity < product.stock) {
            existing.quantity++;
            showAdvancedNotification('تمت زيادة الكمية', 'success');
        } else {
            showAdvancedNotification('الكمية المتوفرة غير كافية', 'warning');
            return;
        }
    } else {
        cart.push({
            productId,
            name: product.name,
            price: product.discount > 0 ? product.price * (1 - product.discount/100) : product.price,
            originalPrice: product.price,
            quantity: 1,
            merchantName: product.merchantName,
            image: product.images[0]
        });
        showAdvancedNotification('تمت الإضافة إلى السلة', 'success');
    }

    // تحديث views
    product.views = (product.views || 0) + 1;

    saveCart();
    updateCartCounter();
    updateCartDisplay();
    analyticsManager.trackEvent('addToCart', { productId });
    
    // تأثير حركة للسلة
    const fixedCart = document.getElementById('fixedCart');
    if (fixedCart) {
        fixedCart.style.animation = 'shake 0.5s';
        setTimeout(() => {
            fixedCart.style.animation = 'pulse 2s infinite';
        }, 500);
    }
}

function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('open');
    updateCartDisplay();
}

function updateCartDisplay() {
    const itemsDiv = document.getElementById('cartItems');
    const totalSpan = document.getElementById('cartTotal');
    const subtotalSpan = document.getElementById('cartSubtotal');
    const shippingSpan = document.getElementById('cartShipping');
    const discountSpan = document.getElementById('cartDiscount');

    if (cart.length === 0) {
        itemsDiv.innerHTML = '<div style="text-align: center; padding: 40px;">السلة فارغة</div>';
        if (totalSpan) totalSpan.textContent = '0 دج';
        if (subtotalSpan) subtotalSpan.textContent = '0 دج';
        if (shippingSpan) shippingSpan.textContent = '800 دج';
        if (discountSpan) discountSpan.textContent = '0 دج';
        return;
    }

    let subtotal = 0;
    itemsDiv.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        return `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${item.image || 'https://via.placeholder.com/60/2c5e4f/ffffff?text=نكهة'}" style="width: 60px; height: 60px; border-radius: 10px; object-fit: cover;">
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

    const shipping = 800;
    const discount = 0; // يمكن تطبيق كود خصم هنا
    const total = subtotal + shipping - discount;

    if (subtotalSpan) subtotalSpan.textContent = `${subtotal.toLocaleString()} دج`;
    if (shippingSpan) shippingSpan.textContent = `${shipping} دج`;
    if (discountSpan) discountSpan.textContent = `${discount} دج`;
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
        showAdvancedNotification('الكمية غير متوفرة', 'warning');
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
    showAdvancedNotification('تمت إزالة المنتج من السلة', 'info', 'تم');
}

// ========== 28. [الفكرة 3] إتمام الشراء المتطور ==========
async function checkoutCart() {
    if (cart.length === 0) {
        showAdvancedNotification('السلة فارغة', 'warning');
        return;
    }

    if (!currentUser) {
        showAdvancedNotification('يجب تسجيل الدخول أولاً', 'warning');
        openLoginModal();
        return;
    }

    // طلب معلومات إضافية
    const customerPhone = prompt('رقم الهاتف للتواصل:', currentUser.phone || '');
    if (!customerPhone) return;
    
    const customerAddress = prompt('عنوان التوصيل:', '');
    if (!customerAddress) return;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = whatsappManager.calculateShipping(customerAddress);
    const total = subtotal + shipping;

    const order = {
        customerName: currentUser.name,
        customerPhone: customerPhone,
        customerAddress: customerAddress,
        items: cart,
        subtotal: subtotal,
        shipping: shipping,
        total: total,
        paymentMethod: 'الواتساب',
        orderId: orderManager.generateOrderId()
    };

    // 🟢 إرسال طلب أخضر إلى تلجرام (الفكرة 3)
    await sendOrderToTelegram(order);

    // إرسال واتساب للتجار (كل تاجر يرى منتجاته فقط)
    const merchants = {};
    cart.forEach(item => {
        const merchant = users.find(u => u.name === item.merchantName);
        if (merchant?.phone) {
            if (!merchants[merchant.phone]) {
                merchants[merchant.phone] = [];
            }
            merchants[merchant.phone].push(item);
        }
    });

    Object.entries(merchants).forEach(([phone, items]) => {
        const merchantOrder = {
            ...order,
            items: items,
            total: items.reduce((s, i) => s + (i.price * i.quantity), 0) + 800
        };
        whatsappManager.sendOrder(merchantOrder, phone);
    });

    // حفظ الطلب في النظام
    orderManager.createOrder(order);
    
    // تحديث المخزون
    cart.forEach(item => {
        const product = products.find(p => p.id == item.productId);
        if (product) {
            product.stock -= item.quantity;
            product.soldCount = (product.soldCount || 0) + item.quantity;
        }
    });

    // تفريغ السلة
    cart = [];
    saveCart();
    updateCartCounter();
    toggleCart();
    
    showAdvancedNotification('✅ تم إرسال الطلب بنجاح', 'success');
    analyticsManager.trackEvent('purchase', { total: total, items: cart.length });
    
    // إضافة إشعار
    addNotification(`طلب جديد #${order.orderId} بقيمة ${total} دج`, 'success');
}

// ========== 29. دوال التمرير ==========
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

// ========== 30. عداد تنازلي ==========
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

// ========== 31. أشرطة التقدم ==========
function updateProgressBars() {
    setInterval(() => {
        document.querySelectorAll('.progress-fill, .marquee-progress-fill').forEach(fill => {
            fill.style.width = Math.floor(Math.random() * 50) + 50 + '%';
        });
    }, 5000);
}

// ========== 32. عرض تفاصيل المنتج (مطور) ==========
function viewProductDetails(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    // تحديث عدد المشاهدات
    product.views = (product.views || 0) + 1;
    analyticsManager.trackEvent('viewProduct', { productId: productId });

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');

    const images = product.images?.map(img => `
        <img src="${img}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 20px; margin-bottom: 10px;" onclick="openImageGallery('${img}')">
    `).join('') || '<div style="height: 300px; background: var(--nardoo); display: flex; align-items: center; justify-content: center; border-radius: 20px;"><i class="fas fa-image" style="font-size: 80px; color: var(--gold);"></i></div>';

    // جلب التقييمات
    const productReviews = reviewSystem.getProductReviews(productId);

    content.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 20px; color: var(--gold);">${product.name}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <div>
                <div style="display: grid; gap: 10px;">${images}</div>
            </div>
            <div>
                <div style="margin-bottom: 20px;">
                    <span style="background: var(--gold); padding: 5px 15px; border-radius: 20px; color: var(--bg-primary); font-weight: 700;">
                        <i class="fas ${getCategoryIcon(product.category)}"></i> ${getCategoryName(product.category)}
                    </span>
                </div>
                
                <p style="margin-bottom: 20px;">${product.description}</p>
                
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                    <i class="fas fa-store" style="color: var(--gold);"></i>
                    <span>${product.merchantName}</span>
                </div>
                
                <div class="product-rating" style="margin-bottom: 20px;">
                    ${generateStars(product.rating || 4.5, true)}
                    <span style="margin-right: 10px;">(${productReviews.length} تقييم)</span>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <span style="font-size: 32px; font-weight: 800; color: var(--gold);">
                        ${product.discount > 0 ? (product.price * (1 - product.discount/100)).toLocaleString() : product.price.toLocaleString()} دج
                    </span>
                    ${product.discount > 0 ? `
                        <span style="text-decoration: line-through; color: var(--text-secondary); margin-right: 10px;">
                            ${product.price.toLocaleString()} دج
                        </span>
                        <span style="background: #f87171; color: white; padding: 3px 10px; border-radius: 20px; font-size: 14px;">
                            -${product.discount}%
                        </span>
                    ` : ''}
                </div>
                
                <div style="margin-bottom: 20px;">
                    <span class="product-stock ${product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : 'in-stock'}">
                        ${product.stock <= 0 ? 'غير متوفر' : product.stock < 5 ? `كمية محدودة (${product.stock})` : `متوفر (${product.stock})`}
                    </span>
                </div>
                
                <div style="display: flex; gap: 15px; margin-bottom: 30px;">
                    <button class="btn-gold" onclick="addToCart(${product.id}); closeModal('productDetailModal')">
                        <i class="fas fa-shopping-cart"></i> أضف للسلة
                    </button>
                    <button class="btn-outline-gold" onclick="toggleWishlist(${product.id})">
                        <i class="fas fa-heart ${wishlist.includes(product.id) ? 'active' : ''}"></i> 
                        ${wishlist.includes(product.id) ? 'في المفضلة' : 'أضف للمفضلة'}
                    </button>
                </div>
                
                <!-- قسم التقييمات -->
                <div style="border-top: 1px solid var(--border-color); padding-top: 20px;">
                    <h4 style="margin-bottom: 15px;">التقييمات</h4>
                    
                    ${currentUser ? `
                        <div style="margin-bottom: 20px;">
                            <textarea id="reviewComment" placeholder="اكتب تقييمك..." style="width: 100%; padding: 10px; border-radius: 10px; border: 1px solid var(--gold); background: var(--bg-secondary); color: var(--text-primary);" rows="3"></textarea>
                            <div style="display: flex; gap: 10px; margin-top: 10px;">
                                <select id="reviewRating" style="padding: 8px; border-radius: 10px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--gold);">
                                    <option value="5">⭐⭐⭐⭐⭐ 5</option>
                                    <option value="4">⭐⭐⭐⭐ 4</option>
                                    <option value="3">⭐⭐⭐ 3</option>
                                    <option value="2">⭐⭐ 2</option>
                                    <option value="1">⭐ 1</option>
                                </select>
                                <button class="btn-gold small" onclick="submitReview(${product.id})">إرسال</button>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="reviews-list">
                        ${productReviews.map(review => `
                            <div style="background: var(--glass); padding: 15px; border-radius: 10px; margin-bottom: 10px;">
                                <div style="display: flex; justify-content: space-between;">
                                    <strong>${review.userName}</strong>
                                    <div>${generateStars(review.rating)}</div>
                                </div>
                                <p style="margin: 10px 0;">${review.comment}</p>
                                <small style="color: var(--text-secondary);">${getSimpleTimeAgo(review.createdAt)}</small>
                                ${review.verified ? '<span style="color: #4ade80; margin-right: 10px;"><i class="fas fa-check-circle"></i> تم الشراء</span>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

function submitReview(productId) {
    const comment = document.getElementById('reviewComment').value;
    const rating = parseInt(document.getElementById('reviewRating').value);
    
    if (!comment) {
        showAdvancedNotification('الرجاء كتابة التقييم', 'warning');
        return;
    }
    
    reviewSystem.addReview(productId, currentUser.id, currentUser.name, rating, comment);
    showAdvancedNotification('تم إضافة تقييمك', 'success');
    viewProductDetails(productId); // تحديث الصفحة
}

// ========== 33. إدارة المستخدمين (مطورة) ==========
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
        analyticsManager.trackEvent('login', { userId: user.id });
    } else {
        showAdvancedNotification('بيانات الدخول غير صحيحة', 'error');
    }
}

// [الفكرة 2] تسجيل تاجر جديد
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
        newUser.storeName = document.getElementById('storeName').value || 'متجر ' + name;
        
        // 🔵 [الفكرة 2] إرسال طلب أزرق إلى تلجرام
        sendMerchantRequestToTelegram(newUser);
        showAdvancedNotification('📋 تم إرسال طلب التسجيل إلى المدير', 'info');
        
        // إضافة إشعار
        addNotification(`طلب تاجر جديد: ${name}`, 'info');
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
    
    const merchantProducts = products.filter(p => p.merchantName === currentUser.name);
    const totalSales = merchantProducts.reduce((sum, p) => sum + (p.price * (p.soldCount || 0)), 0);
    const totalViews = merchantProducts.reduce((sum, p) => sum + (p.views || 0), 0);
    
    document.getElementById('merchantPanelContainer').style.display = 'block';
    document.getElementById('merchantPanelContainer').innerHTML = `
        <div class="merchant-panel">
            <h3><i class="fas fa-store"></i> لوحة التاجر - ${currentUser.name}</h3>
            <div class="stats-grid" style="grid-template-columns: repeat(3,1fr);">
                <div class="stat-card">
                    <i class="fas fa-box"></i>
                    <div class="stat-value">${merchantProducts.length}</div>
                    <div class="stat-label">إجمالي المنتجات</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-check-circle"></i>
                    <div class="stat-value">${merchantProducts.filter(p => p.stock > 0).length}</div>
                    <div class="stat-label">المنتجات المتاحة</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-coins"></i>
                    <div class="stat-value">${totalSales.toLocaleString()} دج</div>
                    <div class="stat-label">إجمالي المبيعات</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-eye"></i>
                    <div class="stat-value">${totalViews}</div>
                    <div class="stat-label">مشاهدات</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-star"></i>
                    <div class="stat-value">${(merchantProducts.reduce((sum, p) => sum + (p.rating || 0), 0) / merchantProducts.length || 0).toFixed(1)}</div>
                    <div class="stat-label">متوسط التقييم</div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-chart-line"></i>
                    <div class="stat-value">${orderManager.orders.filter(o => o.items.some(i => i.merchantName === currentUser.name)).length}</div>
                    <div class="stat-label">الطلبات</div>
                </div>
            </div>
            <div style="display: flex; gap: 15px; margin-top: 20px; justify-content: center;">
                <button class="btn-gold" onclick="showAddProductModal()"><i class="fas fa-plus"></i> إضافة منتج جديد</button>
                <button class="btn-outline-gold" onclick="viewMyProducts()"><i class="fas fa-box"></i> عرض منتجاتي</button>
                <button class="btn-outline-gold" onclick="showMerchantOrders()"><i class="fas fa-shopping-cart"></i> طلباتي</button>
            </div>
        </div>
    `;
}

function showMerchantOrders() {
    if (!currentUser) return;
    
    const merchantOrders = orderManager.orders.filter(order => 
        order.items.some(item => item.merchantName === currentUser.name)
    );
    
    const modal = document.getElementById('merchantOrdersModal');
    const content = document.getElementById('merchantOrdersContent');
    
    content.innerHTML = merchantOrders.map(order => `
        <div style="background: var(--glass); padding: 15px; border-radius: 10px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between;">
                <strong>طلب #${order.id}</strong>
                <span style="background: ${order.status === 'delivered' ? '#4ade80' : order.status === 'cancelled' ? '#f87171' : '#fbbf24'}; color: #000; padding: 3px 10px; border-radius: 20px;">${orderManager.getStatusMessage(order.status)}</span>
            </div>
            <p>العميل: ${order.customerName}</p>
            <p>التاريخ: ${new Date(order.createdAt).toLocaleDateString('ar-DZ')}</p>
            <p>منتجاتك: ${order.items.filter(i => i.merchantName === currentUser.name).map(i => `${i.name} (${i.quantity})`).join('، ')}</p>
            <p>إجمالي طلبك: ${order.items.filter(i => i.merchantName === currentUser.name).reduce((s, i) => s + (i.price * i.quantity), 0)} دج</p>
        </div>
    `).join('');
    
    if (merchantOrders.length === 0) {
        content.innerHTML = '<div style="text-align: center; padding: 40px;">لا توجد طلبات بعد</div>';
    }
    
    modal.style.display = 'flex';
}

// ========== 34. [الفكرة 2] الموافقة على تاجر (للمدير) ==========
async function approveMerchant(userId) {
    const user = users.find(u => u.id == userId);
    if (!user || currentUser?.role !== 'admin') return;

    user.role = 'merchant_approved';
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    await sendNotificationToTelegram(`✅ تمت الموافقة على التاجر: ${user.name}`, 'success');
    showAdvancedNotification('تمت الموافقة على التاجر', 'success');
    
    // إضافة إشعار
    addNotification(`تمت الموافقة على التاجر ${user.name}`, 'success');
    
    if (document.getElementById('dashboardSection').style.display === 'block') {
        switchDashboardTab('merchants');
    }
}

async function rejectMerchant(userId) {
    const user = users.find(u => u.id == userId);
    if (!user || currentUser?.role !== 'admin') return;

    user.role = 'customer';
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    await sendNotificationToTelegram(`❌ تم رفض طلب التاجر: ${user.name}`, 'error');
    showAdvancedNotification('تم رفض طلب التاجر', 'info');
    
    if (document.getElementById('dashboardSection').style.display === 'block') {
        switchDashboardTab('merchants');
    }
}

// ========== 35. [الفكرة 1] إضافة المنتجات ==========
function showAddProductModal() {
    if (!currentUser) {
        showAdvancedNotification('يجب تسجيل الدخول أولاً', 'warning');
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
        showAdvancedNotification('فقط المدير والتجار يمكنهم إضافة منتجات', 'error');
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

// [الفكرة 1] حفظ المنتج
async function saveProduct() {
    if (!currentUser) {
        showAdvancedNotification('يجب تسجيل الدخول أولاً', 'error');
        return;
    }

    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const description = document.getElementById('productDescription')?.value || 'منتج عالي الجودة';
    const imagesData = document.getElementById('productImagesData')?.value;
    
    if (!name || !category || !price || !stock) {
        showAdvancedNotification('الرجاء ملء جميع الحقول', 'error');
        return;
    }

    const product = {
        name: name,
        price: price,
        category: category,
        stock: stock,
        description: description,
        merchantName: currentUser.name,
        images: imagesData ? JSON.parse(imagesData) : ["https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال"]
    };

    // 🟣 [الفكرة 1] إرسال إشهار بنفسجي إلى تلجرام
    const sent = await addProductToTelegram(product);
    
    if (sent) {
        showAdvancedNotification('✅ تم إضافة المنتج وسيظهر قريباً', 'success');
        closeModal('productModal');
        
        // إضافة إشعار
        addNotification(`منتج جديد: ${name}`, 'success');
        
        setTimeout(async () => {
            await loadProducts();
        }, 2000);
    } else {
        showAdvancedNotification('❌ فشل إضافة المنتج', 'error');
    }
}

function editProduct(id) {
    showAdvancedNotification('تعديل المنتج غير متاح حالياً', 'info');
}

function deleteProduct(id) {
    showAdvancedNotification('حذف المنتج غير متاح حالياً', 'info');
}

// ========== 36. لوحة التحكم (مطورة) ==========
function openDashboard() {
    if (!currentUser || currentUser.role !== 'admin') {
        showAdvancedNotification('غير مصرح', 'error');
        return;
    }

    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('dashboardSection').scrollIntoView({ behavior: 'smooth' });
    switchDashboardTab('overview');
}

function switchDashboardTab(tab) {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    const content = document.getElementById('dashboardContent');
    
    if (tab === 'overview') showDashboardOverview(content);
    else if (tab === 'orders') showDashboardOrders(content);
    else if (tab === 'analytics') showDashboardAnalytics(content);
    else if (tab === 'products') showDashboardProducts(content);
    else if (tab === 'merchants') showDashboardMerchants(content);
    else if (tab === 'coupons') showDashboardCoupons(content);
    else if (tab === 'backup') showDashboardBackup(content);
}

function showDashboardOverview(container) {
    const orderStats = orderManager.getOrderStatistics();
    const analytics = analyticsManager.generateComprehensiveReport();

    container.innerHTML = `
        <h3 style="margin-bottom: 30px; color: var(--gold);">نظرة عامة على المتجر</h3>
        <div class="stats-grid" style="grid-template-columns: repeat(4,1fr);">
            <div class="stat-card">
                <i class="fas fa-shopping-cart"></i>
                <div class="stat-value">${orderStats.totalOrders}</div>
                <div class="stat-label">إجمالي الطلبات</div>
            </div>
            <div class="stat-card">
                <i class="fas fa-coins"></i>
                <div class="stat-value">${orderStats.totalRevenue.toLocaleString()}</div>
                <div class="stat-label">الإيرادات (دج)</div>
            </div>
            <div class="stat-card">
                <i class="fas fa-chart-line"></i>
                <div class="stat-value">${orderStats.averageOrderValue.toFixed(0)}</div>
                <div class="stat-label">متوسط قيمة الطلب</div>
            </div>
            <div class="stat-card">
                <i class="fas fa-percent"></i>
                <div class="stat-value">${analytics.conversionRate}%</div>
                <div class="stat-label">معدل التحويل</div>
            </div>
            <div class="stat-card">
                <i class="fas fa-users"></i>
                <div class="stat-value">${users.length}</div>
                <div class="stat-label">إجمالي المستخدمين</div>
            </div>
            <div class="stat-card">
                <i class="fas fa-box"></i>
                <div class="stat-value">${products.length}</div>
                <div class="stat-label">إجمالي المنتجات</div>
            </div>
            <div class="stat-card">
                <i class="fas fa-store"></i>
                <div class="stat-value">${users.filter(u => u.role === 'merchant_approved').length}</div>
                <div class="stat-label">التجار المعتمدون</div>
            </div>
            <div class="stat-card">
                <i class="fas fa-eye"></i>
                <div class="stat-value">${analytics.visits.totalPageViews}</div>
                <div class="stat-label">مشاهدات الصفحات</div>
            </div>
        </div>
        
        <h4 style="margin: 30px 0 20px; color: var(--gold);">المنتجات الأكثر مشاهدة</h4>
        <div style="overflow-x: auto;">
            <table>
                <thead><tr><th>المنتج</th><th>التاجر</th><th>مشاهدات</th><th>مبيعات</th></tr></thead>
                <tbody>
                    ${analytics.popularProducts.map(({productId, views}) => {
                        const product = products.find(p => p.id === productId);
                        return product ? `
                            <tr>
                                <td>${product.name}</td>
                                <td>${product.merchantName}</td>
                                <td>${views}</td>
                                <td>${product.soldCount || 0}</td>
                            </tr>
                        ` : '';
                    }).join('')}
                </tbody>
            </table>
        </div>
        
        <h4 style="margin: 30px 0 20px; color: var(--gold);">الطلبات الأخيرة</h4>
        <div style="overflow-x: auto;">
            <table>
                <thead><tr><th>رقم الطلب</th><th>العميل</th><th>المجموع</th><th>الحالة</th><th>التاريخ</th></tr></thead>
                <tbody>
                    ${orderStats.recentOrders.map(order => `
                        <tr>
                            <td>${order.id}</td>
                            <td>${order.customerName}</td>
                            <td style="color: var(--gold); font-weight: 700;">${order.total.toLocaleString()} دج</td>
                            <td><span style="background: ${order.status === 'delivered' ? '#4ade80' : order.status === 'cancelled' ? '#f87171' : '#fbbf24'}; color: #000; padding: 5px 10px; border-radius: 20px; font-size: 12px;">${orderManager.getStatusMessage(order.status)}</span></td>
                            <td>${new Date(order.createdAt).toLocaleDateString('ar-DZ')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function showDashboardOrders(container) {
    const orders = orderManager.orders;
    container.innerHTML = `
        <h3 style="margin-bottom: 20px; color: var(--gold);">جميع الطلبات</h3>
        <div style="margin-bottom: 20px; display: flex; gap: 10px;">
            <input type="text" id="orderSearch" placeholder="بحث برقم الطلب أو العميل..." style="flex: 1; padding: 10px; border-radius: 10px; border: 1px solid var(--gold); background: var(--bg-secondary); color: var(--text-primary);">
            <button class="btn-gold" onclick="searchOrders()">بحث</button>
        </div>
        <div style="overflow-x: auto;">
            <table>
                <thead><tr><th>رقم الطلب</th><th>العميل</th><th>المجموع</th><th>الحالة</th><th>التاريخ</th><th>رقم التتبع</th><th>إجراءات</th></tr></thead>
                <tbody id="ordersTableBody">
                    ${orders.map(order => `
                        <tr>
                            <td>${order.id}</td>
                            <td>${order.customerName}</td>
                            <td>${order.total} دج</td>
                            <td>
                                <select onchange="updateOrderStatus('${order.id}', this.value)" style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--gold); padding: 5px; border-radius: 5px;">
                                    ${orderManager.orderStatuses.map(status => `
                                        <option value="${status}" ${order.status === status ? 'selected' : ''}>${orderManager.getStatusMessage(status)}</option>
                                    `).join('')}
                                </select>
                            </td>
                            <td>${new Date(order.createdAt).toLocaleDateString('ar-DZ')}</td>
                            <td>${order.trackingNumber || 'غير متوفر'}</td>
                            <td>
                                <button onclick="viewOrderDetails('${order.id}')" style="background: none; border: none; color: var(--gold); cursor: pointer;">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function showDashboardAnalytics(container) {
    const analytics = analyticsManager.generateComprehensiveReport();
    
    container.innerHTML = `
        <h3 style="margin-bottom: 30px; color: var(--gold);">التحليلات</h3>
        <div class="stats-grid" style="grid-template-columns: repeat(3,1fr);">
            <div class="stat-card">
                <i class="fas fa-eye"></i>
                <div class="stat-value">${analytics.visits.totalPageViews}</div>
                <div class="stat-label">مشاهدات الصفحات</div>
            </div>
            <div class="stat-card">
                <i class="fas fa-bolt"></i>
                <div class="stat-value">${analytics.visits.totalEvents}</div>
                <div class="stat-label">إجمالي الأحداث</div>
            </div>
            <div class="stat-card">
                <i class="fas fa-chart-pie"></i>
                <div class="stat-value">${Object.keys(analytics.eventsByType).length}</div>
                <div class="stat-label">أنواع الأحداث</div>
            </div>
        </div>
        
        <h4 style="margin: 30px 0 20px; color: var(--gold);">توزيع الأحداث</h4>
        <div style="display: grid; grid-template-columns: repeat(2,1fr); gap: 20px;">
            ${Object.entries(analytics.eventsByType).map(([type, count]) => `
                <div style="background: var(--glass); padding: 15px; border-radius: 10px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span>${type}</span>
                        <strong>${count}</strong>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showDashboardProducts(container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <h3 style="color: var(--gold);">المنتجات</h3>
            <button class="btn-gold" onclick="showAddProductModal()">إضافة منتج</button>
        </div>
        <div style="overflow-x: auto;">
            <table>
                <thead><tr><th>المنتج</th><th>السعر</th><th>الكمية</th><th>التاجر</th><th>المبيعات</th><th>المشاهدات</th></tr></thead>
                <tbody>
                    ${products.map(p => `<tr><td>${p.name}</td><td>${p.price} دج</td><td>${p.stock}</td><td>${p.merchantName}</td><td>${p.soldCount || 0}</td><td>${p.views || 0}</td></tr>`).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function showDashboardMerchants(container) {
    const pendingMerchants = users.filter(u => u.role === 'merchant_pending');
    const approvedMerchants = users.filter(u => u.role === 'merchant_approved');

    container.innerHTML = `
        <h3 style="margin-bottom: 20px; color: var(--gold);">طلبات التجار (${pendingMerchants.length})</h3>
        ${pendingMerchants.map(m => `
            <div style="background: var(--glass); border: 1px solid var(--gold); border-radius: 10px; padding: 15px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between;">
                    <div>
                        <p><strong>${m.name}</strong> - ${m.email}</p>
                        <p>🏪 متجر: ${m.storeName || 'غير محدد'}</p>
                        <p>📊 مستوى: ${m.merchantLevel || '1'}</p>
                        <p>📝 وصف: ${m.merchantDesc || 'تاجر جديد'}</p>
                    </div>
                    <div>
                        <button class="btn-gold" onclick="approveMerchant(${m.id})">✅ موافقة</button>
                        <button class="btn-outline-gold" onclick="rejectMerchant(${m.id})">❌ رفض</button>
                    </div>
                </div>
            </div>
        `).join('')}

        <h3 style="margin: 30px 0 20px; color: var(--gold);">التجار المعتمدون (${approvedMerchants.length})</h3>
        <div style="overflow-x: auto;">
            <table>
                <thead><tr><th>التاجر</th><th>المتجر</th><th>البريد</th><th>الهاتف</th><th>المنتجات</th></tr></thead>
                <tbody>
                    ${approvedMerchants.map(m => {
                        const merchantProducts = products.filter(p => p.merchantName === m.name);
                        return `
                            <tr>
                                <td>${m.name}</td>
                                <td>${m.storeName || 'غير محدد'}</td>
                                <td>${m.email}</td>
                                <td>${m.phone || 'غير متوفر'}</td>
                                <td>${merchantProducts.length}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function showDashboardCoupons(container) {
    const coupons = discountSystem.coupons;
    
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <h3 style="color: var(--gold);">كوبونات الخصم</h3>
            <button class="btn-gold" onclick="showAddCouponModal()">إضافة كوبون</button>
        </div>
        
        <div style="overflow-x: auto;">
            <table>
                <thead><tr><th>الكود</th><th>النوع</th><th>القيمة</th><th>الحد الأدنى</th><th>الاستخدام</th><th>تاريخ الانتهاء</th></tr></thead>
                <tbody>
                    ${coupons.map(c => `
                        <tr>
                            <td><strong>${c.code}</strong></td>
                            <td>${c.type === 'percentage' ? 'نسبة مئوية' : 'قيمة ثابتة'}</td>
                            <td>${c.type === 'percentage' ? c.value + '%' : c.value + ' دج'}</td>
                            <td>${c.minPurchase} دج</td>
                            <td>${c.usedCount}/${c.usageLimit}</td>
                            <td>${new Date(c.expiresAt).toLocaleDateString('ar-DZ')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function showDashboardBackup(container) {
    const backups = Object.keys(localStorage)
        .filter(k => k.startsWith('nardoo_backup_'))
        .sort()
        .reverse();
    
    container.innerHTML = `
        <h3 style="margin-bottom: 20px; color: var(--gold);">النسخ الاحتياطية</h3>
        
        <div style="margin-bottom: 30px; display: flex; gap: 15px;">
            <button class="btn-gold" onclick="backupProducts()">
                <i class="fas fa-database"></i> إنشاء نسخة احتياطية
            </button>
            <button class="btn-outline-gold" onclick="exportData('json')">
                <i class="fas fa-download"></i> تصدير JSON
            </button>
            <button class="btn-outline-gold" onclick="exportData('csv')">
                <i class="fas fa-file-csv"></i> تصدير CSV
            </button>
        </div>
        
        <h4 style="margin: 20px 0;">النسخ المتاحة</h4>
        ${backups.map(backupKey => {
            const backup = JSON.parse(localStorage.getItem(backupKey));
            const date = new Date(backup.timestamp).toLocaleString('ar-DZ');
            return `
                <div style="background: var(--glass); padding: 15px; border-radius: 10px; margin-bottom: 10px; display: flex; justify-content: space-between;">
                    <div>
                        <p><strong>${date}</strong></p>
                        <p>منتجات: ${backup.products.length} | مستخدمين: ${backup.users.length}</p>
                    </div>
                    <div>
                        <button class="btn-gold small" onclick="restoreFromBackup('${backupKey.replace('nardoo_backup_', '')}')">
                            <i class="fas fa-undo"></i> استعادة
                        </button>
                    </div>
                </div>
            `;
        }).join('')}
    `;
}

// ========== 37. تأثيرات الكتابة ==========
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

// ========== 38. تأثيرات الماوس ==========
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

// ========== 39. شريط تقدم التمرير ==========
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

// ========== 40. جسيمات متحركة ==========
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

// ========== 41. [النقطة 31] الاستماع لأوامر تلجرام ==========
setInterval(async () => {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`);
        const data = await response.json();
        
        if (data.ok && data.result) {
            for (const update of data.result) {
                if (update.message?.text) {
                    const text = update.message.text;
                    
                    if (text.startsWith('/approve_')) {
                        const userId = text.replace('/approve_', '');
                        await approveMerchant(userId);
                    }
                    
                    if (text.startsWith('/reject_')) {
                        const userId = text.replace('/reject_', '');
                        await rejectMerchant(userId);
                    }
                    
                    if (text.startsWith('/delete_')) {
                        const productId = text.replace('/delete_', '');
                        // حذف منتج
                    }
                }
            }
        }
    } catch (error) {
        console.error('خطأ في التحقق من أوامر تلجرام:', error);
    }
}, 30000);

// ========== 42. [النقطة 32] التهيئة الكاملة (onload) ==========
window.onload = function() {
    // تحميل البيانات
    loadProducts();
    loadCart();
    loadWishlist();
    loadNotifications();

    // تحميل المستخدم الحالي
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIBasedOnRole();
    }

    // تحميل الثيم
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        isDarkMode = savedTheme === 'dark';
        document.body.classList.toggle('light-mode', !isDarkMode);
        document.getElementById('themeToggle').innerHTML = isDarkMode ? 
            '<i class="fas fa-moon"></i><span>ليلي</span>' : 
            '<i class="fas fa-sun"></i><span>نهاري</span>';
    }

    // تحميل اللغة
    const savedLanguage = localStorage.getItem('nardoo_language');
    if (savedLanguage) {
        I18N.setLanguage(savedLanguage);
    }

    // إخفاءloader
    setTimeout(() => {
        document.getElementById('loader').style.opacity = '0';
        setTimeout(() => document.getElementById('loader').style.display = 'none', 500);
    }, 1000);

    // تتبع الصفحة
    analyticsManager.trackPageView('home');
    
    // أحداث التمرير
    window.addEventListener('scroll', toggleQuickTopButton);
    
    // تأثيرات الحركة
    addScrollAnimations();
    updateCountdown();
    updateProgressBars();
    initMouseEffects();
    initScrollProgress();
    initParticles();
    
    // تأثير الكتابة
    const typingElement = document.getElementById('typing-text');
    if (typingElement) {
        new TypingAnimation(typingElement, ['نكهة وجمال', 'ناردو برو', 'تسوق آمن', 'جودة عالية'], 100, 2000).start();
    }
    
    console.log('✅ [النقطة 32] تم تهيئة النظام بالكامل');
    console.log(`📊 الإصدار: 3.0 | النقاط: ${Object.keys(POINTS).length} نقطة`);
};

// ========== 43. إغلاق النوافذ عند النقر خارجها ==========
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// ========== 44. تصدير للاستخدام العام ==========
window.app = {
    version: '3.0',
    points: POINTS,
    products,
    currentUser,
    cart,
    users,
    orderManager,
    whatsappManager,
    analyticsManager,
    reviewSystem,
    discountSystem,
    loadProducts,
    addToCart,
    checkoutCart,
    toggleTheme,
    openLoginModal,
    showAddProductModal
};
