// ========== ناردو برو - نظام متكامل مع تلجرام ==========
// ========== الأفكار الثلاثة: 1️⃣ منتجات 2️⃣ تجار 3️⃣ طلبات ==========

// ========== 1. إعدادات تلجرام (قناة واحدة متكاملة) ==========
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
let lastUpdateId = 0;
let processingCommands = new Set();

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
                phone: '',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('nardoo_users', JSON.stringify(users));
    }
}
loadUsers();

// ========== 4. الفكرة 1: جلب المنتجات من تلجرام ==========
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
                if (update.channel_post) {
                    const post = update.channel_post;
                    
                    if (post.text && post.text.includes('🟣')) {
                        console.log('📦 وجدنا منتج:', post.text);
                        
                        const lines = post.text.split('\n');
                        let name = 'منتج';
                        let price = 0;
                        let category = 'other';
                        let stock = 0;
                        let merchant = 'المتجر';
                        
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
                            }
                        });
                        
                        products.push({
                            id: post.message_id,
                            name: name,
                            price: price,
                            category: category,
                            stock: stock,
                            merchantName: merchant || 'المتجر',
                            rating: 4.5,
                            images: ["https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال"],
                            createdAt: new Date(post.date * 1000).toISOString()
                        });
                        
                        console.log(`✅ منتج مضاف: ${name} - ${price} دج`);
                    }
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

// ========== 5. الفكرة 1: إضافة منتج جديد إلى تلجرام ==========
async function addProductToTelegram(product) {
    const message = `
🟣 *منتج جديد في المتجر*
━━━━━━━━━━━━━━━━━━━━━━
📦 *المنتج:* ${product.name}
💰 *السعر:* ${product.price} دج
🏷️ *القسم:* ${product.category}
📊 *الكمية:* ${product.stock}
👤 *التاجر:* ${product.merchantName}
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
        return result.ok;
    } catch (error) {
        console.error('❌ خطأ في إضافة المنتج:', error);
        return false;
    }
}

// ========== 6. الفكرة 3: إرسال طلب شراء (🟢) ==========
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

// ========== 7. 🔵 الفكرة 2: إرسال طلب انضمام تاجر ==========
async function sendMerchantRequestToTelegram(merchant) {
    console.log('🔵 محاولة إرسال طلب تاجر:', merchant);
    
    const message = `
🔵 *طلب انضمام تاجر جديد*  
━━━━━━━━━━━━━━━━━━━━━━
🏪 *المتجر:* ${merchant.storeName}
👤 *التاجر:* ${merchant.name}
📧 *البريد:* ${merchant.email}
📞 *الهاتف:* ${merchant.phone || 'غير متوفر'}
📊 *المستوى:* ${merchant.merchantLevel || '1'}
📝 *الوصف:* ${merchant.merchantDesc || '---'}

━━━━━━━━━━━━━━━━━━━━━━
*🔘 للإجراء:*

✅ اكتب: قبول_${merchant.id}
❌ اكتب: رفض_${merchant.id}

أو استخدم الأزرار أدناه:
    `;

    try {
        console.log('📤 جاري الإرسال إلى تلجرام...');
        
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
                            { text: '✅ قبول', callback_data: `approve_${merchant.id}` },
                            { text: '❌ رفض', callback_data: `reject_${merchant.id}` }
                        ]
                    ]
                }
            })
        });
        
        const result = await response.json();
        console.log('📥 نتيجة الإرسال:', result);
        
        if (result.ok) {
            console.log('✅ تم إرسال طلب التاجر بنجاح');
            return true;
        } else {
            console.log('❌ فشل الإرسال:', result.description);
            return false;
        }
    } catch (error) {
        console.error('❌ خطأ في إرسال طلب التاجر:', error);
        return false;
    }
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

// ========== 9. نظام إدارة الطلبات ==========
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
            shipping: orderData.shipping || 800,
            total: 0,
            paymentMethod: orderData.paymentMethod || 'الواتساب',
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
        order.total = order.subtotal + order.shipping;

        this.orders.push(order);
        this.saveOrders();
        return order;
    }

    getOrder(orderId) {
        return this.orders.find(o => o.id === orderId);
    }

    updateOrderStatus(orderId, newStatus) {
        const order = this.getOrder(orderId);
        if (!order) return false;

        order.status = newStatus;
        order.updatedAt = new Date().toISOString();
        order.timeline.push({
            status: newStatus,
            timestamp: new Date().toISOString(),
            message: this.getStatusMessage(newStatus)
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
}

// ========== 10. نظام الواتساب ==========
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
}

// ========== 11. نظام التحليلات ==========
class AnalyticsSystem {
    constructor() {
        this.events = this.loadEvents();
        this.pageViews = this.loadPageViews();
    }

    loadEvents() {
        const saved = localStorage.getItem('nardoo_analytics_events');
        return saved ? JSON.parse(saved) : [];
    }

    loadPageViews() {
        const saved = localStorage.getItem('nardoo_page_views');
        return saved ? JSON.parse(saved) : [];
    }

    saveEvents() {
        localStorage.setItem('nardoo_analytics_events', JSON.stringify(this.events));
    }

    savePageViews() {
        localStorage.setItem('nardoo_page_views', JSON.stringify(this.pageViews));
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
            totalEvents: this.events.length
        };
    }

    getConversionRate() {
        const cartEvents = this.events.filter(e => e.type === 'addToCart').length;
        const purchaseEvents = this.events.filter(e => e.type === 'purchase').length;
        return cartEvents > 0 ? ((purchaseEvents / cartEvents) * 100).toFixed(2) : 0;
    }
}

// ========== 12. إنشاء الكائنات ==========
const orderManager = new OrderManagementSystem();
const whatsappManager = new WhatsAppIntegration();
const analyticsManager = new AnalyticsSystem();

// ========== 13. ✅ الموافقة على تاجر ==========
function approveMerchant(userId) {
    console.log('✅ محاولة الموافقة على تاجر رقم:', userId);
    
    const user = users.find(u => u.id == userId);
    if (!user) {
        console.log('❌ التاجر غير موجود');
        showAdvancedNotification('التاجر غير موجود', 'error');
        return false;
    }

    user.role = 'merchant_approved';
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    sendNotificationToTelegram(`✅ تمت الموافقة على التاجر: ${user.name}`, 'success');
    showAdvancedNotification(`تمت الموافقة على التاجر ${user.name}`, 'success');
    
    console.log('✅ تمت الموافقة بنجاح');
    return true;
}

// ========== 14. ❌ رفض تاجر ==========
function rejectMerchant(userId) {
    console.log('❌ محاولة رفض تاجر رقم:', userId);
    
    const user = users.find(u => u.id == userId);
    if (!user) {
        console.log('❌ التاجر غير موجود');
        showAdvancedNotification('التاجر غير موجود', 'error');
        return false;
    }

    user.role = 'customer';
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    sendNotificationToTelegram(`❌ تم رفض طلب التاجر: ${user.name}`, 'error');
    showAdvancedNotification(`تم رفض طلب التاجر ${user.name}`, 'info');
    
    console.log('❌ تم الرفض بنجاح');
    return true;
}

// ========== 15. 🔍 الاستماع لأوامر التلجرام (محسن - بدون تكرار) ==========
function startTelegramListener() {
    console.log('🔄 بدء الاستماع لأوامر التلجرام...');
    
    setInterval(async () => {
        try {
            const response = await fetch(
                `https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates?offset=${lastUpdateId}`
            );
            
            const data = await response.json();
            
            if (data.ok && data.result) {
                for (const update of data.result) {
                    
                    // تحديث آخر ID معالج
                    lastUpdateId = update.update_id + 1;
                    
                    // ===== معالجة الأزرار (callback queries) =====
                    if (update.callback_query) {
                        const callback = update.callback_query;
                        const data = callback.data;
                        console.log('🔘 تم ضغط زر:', data);
                        
                        // تحقق من تكرار الأمر
                        if (processingCommands.has(data)) {
                            console.log('⚠️ الأمر قيد المعالجة بالفعل:', data);
                            continue;
                        }
                        
                        processingCommands.add(data);
                        
                        if (data.startsWith('approve_')) {
                            const userId = data.replace('approve_', '');
                            approveMerchant(userId);
                            
                            await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/answerCallbackQuery`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    callback_query_id: callback.id,
                                    text: '✅ تمت الموافقة على التاجر',
                                    show_alert: false
                                })
                            });
                            
                            await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/editMessageText`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    chat_id: callback.message.chat.id,
                                    message_id: callback.message.message_id,
                                    text: callback.message.text + '\n\n✅ **تمت الموافقة على هذا الطلب**',
                                    parse_mode: 'Markdown'
                                })
                            });
                        }
                        
                        if (data.startsWith('reject_')) {
                            const userId = data.replace('reject_', '');
                            rejectMerchant(userId);
                            
                            await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/answerCallbackQuery`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    callback_query_id: callback.id,
                                    text: '❌ تم رفض التاجر',
                                    show_alert: false
                                })
                            });
                            
                            await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/editMessageText`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    chat_id: callback.message.chat.id,
                                    message_id: callback.message.message_id,
                                    text: callback.message.text + '\n\n❌ **تم رفض هذا الطلب**',
                                    parse_mode: 'Markdown'
                                })
                            });
                        }
                        
                        // إزالة الأمر بعد ثانيتين
                        setTimeout(() => {
                            processingCommands.delete(data);
                        }, 2000);
                    }
                    
                    // ===== معالجة النصوص =====
                    if (update.message?.text) {
                        const text = update.message.text.trim();
                        
                        // تجاهل رسائل الإشعارات
                        if (text.includes('🟡') || text.includes('نجاح') || text.includes('خطأ')) {
                            continue;
                        }
                        
                        console.log('📨 رسالة جديدة:', text);
                        
                        // ✅ الأوامر العربية للموافقة
                        if (text.match(/^(قبول|موافقة|اقبل|نعم|اوافق)_?(\d+)/i) || 
                            (text.includes('✅') && text.match(/\d+/))) {
                            
                            const match = text.match(/\d+/);
                            if (match) {
                                const userId = match[0];
                                const commandKey = `approve_${userId}`;
                                
                                if (processingCommands.has(commandKey)) {
                                    console.log('⚠️ الأمر قيد المعالجة:', commandKey);
                                    continue;
                                }
                                
                                processingCommands.add(commandKey);
                                console.log('✅ أمر موافقة عربي:', text, 'للتاجر:', userId);
                                approveMerchant(userId);
                                
                                setTimeout(() => {
                                    processingCommands.delete(commandKey);
                                }, 2000);
                            }
                        }
                        
                        // ❌ الأوامر العربية للرفض
                        if (text.match(/^(رفض|لا|مرفوض|غير موافق)_?(\d+)/i) || 
                            (text.includes('❌') && text.match(/\d+/))) {
                            
                            const match = text.match(/\d+/);
                            if (match) {
                                const userId = match[0];
                                const commandKey = `reject_${userId}`;
                                
                                if (processingCommands.has(commandKey)) {
                                    console.log('⚠️ الأمر قيد المعالجة:', commandKey);
                                    continue;
                                }
                                
                                processingCommands.add(commandKey);
                                console.log('❌ أمر رفض عربي:', text, 'للتاجر:', userId);
                                rejectMerchant(userId);
                                
                                setTimeout(() => {
                                    processingCommands.delete(commandKey);
                                }, 2000);
                            }
                        }
                        
                        // ✅ الأوامر الإنجليزية
                        if (text.startsWith('/approve_')) {
                            const userId = text.replace('/approve_', '');
                            const commandKey = `approve_${userId}`;
                            
                            if (processingCommands.has(commandKey)) {
                                console.log('⚠️ الأمر قيد المعالجة:', commandKey);
                                continue;
                            }
                            
                            processingCommands.add(commandKey);
                            console.log('✅ أمر موافقة إنجليزي:', userId);
                            approveMerchant(userId);
                            
                            setTimeout(() => {
                                processingCommands.delete(commandKey);
                            }, 2000);
                        }
                        
                        if (text.startsWith('/reject_')) {
                            const userId = text.replace('/reject_', '');
                            const commandKey = `reject_${userId}`;
                            
                            if (processingCommands.has(commandKey)) {
                                console.log('⚠️ الأمر قيد المعالجة:', commandKey);
                                continue;
                            }
                            
                            processingCommands.add(commandKey);
                            console.log('❌ أمر رفض إنجليزي:', userId);
                            rejectMerchant(userId);
                            
                            setTimeout(() => {
                                processingCommands.delete(commandKey);
                            }, 2000);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ خطأ في الاستماع للتلجرام:', error);
        }
    }, 30000);
}

// ========== 16. دوال المساعدة والإشعارات ==========
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
    if (toggle) {
        toggle.innerHTML = isDarkMode ? 
            '<i class="fas fa-moon"></i><span>ليلي</span>' : 
            '<i class="fas fa-sun"></i><span>نهاري</span>';
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// ========== 17. دوال التاريخ والوقت ==========
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
    return 'منذ وقت';
}

// ========== 18. دوال تقييم النجوم ==========
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

// ========== 19. دوال الفرز ==========
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

// ========== 20. تحميل المنتجات وعرضها ==========
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
        filtered = filtered.filter(p => p.merchantName === currentUser.name);
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

        let categoryIcon = 'fas fa-tag';
        if (product.category === 'promo') categoryIcon = 'fas fa-fire';
        else if (product.category === 'spices') categoryIcon = 'fas fa-mortar-pestle';
        else if (product.category === 'cosmetic') categoryIcon = 'fas fa-spa';
        else if (product.category === 'other') categoryIcon = 'fas fa-gem';

        const timeAgo = getSimpleTimeAgo(product.createdAt);

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

    analyticsManager.trackPageView('products');
}

function filterProducts(category) {
    currentFilter = category;
    displayProducts();
}

function searchProducts() {
    searchTerm = document.getElementById('searchInput').value;
    displayProducts();
    analyticsManager.trackEvent('search', { searchTerm });
}

// ========== 21. إدارة السلة ==========
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
            merchantName: product.merchantName
        });
    }

    saveCart();
    updateCartCounter();
    updateCartDisplay();
    showAdvancedNotification('تمت الإضافة إلى السلة', 'success', 'تم بنجاح');
    analyticsManager.trackEvent('addToCart', { productId });
    
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

// ========== 22. الفكرة 3: إتمام الشراء ==========
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
        paymentMethod: 'الواتساب'
    };

    await sendOrderToTelegram(order);

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

    orderManager.createOrder(order);
    
    cart.forEach(item => {
        const product = products.find(p => p.id == item.productId);
        if (product) {
            product.stock -= item.quantity;
        }
    });

    cart = [];
    saveCart();
    updateCartCounter();
    toggleCart();
    
    showAdvancedNotification('✅ تم إرسال الطلب بنجاح', 'success');
    analyticsManager.trackEvent('purchase', { total: total });
}

// ========== 23. دوال التمرير ==========
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

// ========== 24. عداد تنازلي ==========
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

// ========== 25. أشرطة التقدم ==========
function updateProgressBars() {
    setInterval(() => {
        document.querySelectorAll('.progress-fill, .marquee-progress-fill').forEach(fill => {
            fill.style.width = Math.floor(Math.random() * 50) + 50 + '%';
        });
    }, 5000);
}

// ========== 26. عرض تفاصيل المنتج ==========
function viewProductDetails(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    analyticsManager.trackEvent('viewProduct', { productId: productId });

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');

    const images = product.images?.map(img => `
        <img src="${img}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 20px; margin-bottom: 10px;">
    `).join('') || '<div style="height: 300px; background: var(--nardoo); display: flex; align-items: center; justify-content: center; border-radius: 20px;"><i class="fas fa-image" style="font-size: 80px; color: var(--gold);"></i></div>';

    let categoryIcon = 'fas fa-tag';
    if (product.category === 'promo') categoryIcon = 'fas fa-fire';
    else if (product.category === 'spices') categoryIcon = 'fas fa-mortar-pestle';
    else if (product.category === 'cosmetic') categoryIcon = 'fas fa-spa';

    content.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 20px; color: var(--gold);">${product.name}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <div><div style="display: grid; gap: 10px;">${images}</div></div>
            <div>
                <div style="margin-bottom: 20px;">
                    <span style="background: var(--gold); padding: 5px 15px; border-radius: 20px; color: var(--bg-primary); font-weight: 700;">
                        <i class="${categoryIcon}"></i> ${getCategoryName(product.category)}
                    </span>
                </div>
                
                <p style="margin-bottom: 20px;">منتج عالي الجودة من ${product.merchantName}</p>
                
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                    <i class="fas fa-store" style="color: var(--gold);"></i>
                    <span>${product.merchantName}</span>
                </div>
                
                <div class="product-rating" style="margin-bottom: 20px;">
                    <div class="stars-container">${generateStars(product.rating || 4.5)}</div>
                    <span class="rating-value">${(product.rating || 4.5).toFixed(1)}</span>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <span style="font-size: 32px; font-weight: 800; color: var(--gold);">${product.price.toLocaleString()} دج</span>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <span class="product-stock ${product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : 'in-stock'}">
                        ${product.stock <= 0 ? 'غير متوفر' : product.stock < 5 ? `كمية محدودة (${product.stock})` : `متوفر (${product.stock})`}
                    </span>
                </div>
                
                <div style="display: flex; gap: 15px;">
                    <button class="btn-gold" onclick="addToCart(${product.id}); closeModal('productDetailModal')">
                        <i class="fas fa-shopping-cart"></i> أضف للسلة
                    </button>
                    <button class="btn-outline-gold" onclick="closeModal('productDetailModal')">
                        <i class="fas fa-times"></i> إغلاق
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

// ========== 27. إدارة المستخدمين ==========
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

// ========== 28. دوال رفع الصور ==========
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

// ========== 29. حفظ المنتج ==========
async function saveProduct() {
    if (!currentUser) {
        showAdvancedNotification('يجب تسجيل الدخول أولاً', 'error');
        return;
    }

    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    
    if (!name || !category || !price || !stock) {
        showAdvancedNotification('الرجاء ملء جميع الحقول', 'error');
        return;
    }

    const product = {
        name: name,
        price: price,
        category: category,
        stock: stock,
        merchantName: currentUser.name
    };

    const sent = await addProductToTelegram(product);
    
    if (sent) {
        showAdvancedNotification('✅ تم إضافة المنتج وسيظهر قريباً', 'success');
        closeModal('productModal');
        
        setTimeout(async () => {
            await loadProducts();
        }, 2000);
    } else {
        showAdvancedNotification('❌ فشل إضافة المنتج', 'error');
    }
}

// ========== 30. دوال التجار ==========
function toggleMerchantFields() {
    const isMerchant = document.getElementById('isMerchant')?.checked;
    const merchantFields = document.getElementById('merchantFields');
    
    console.log('🔄 تغيير حالة التاجر:', isMerchant ? 'تاجر' : 'عميل');
    
    if (merchantFields) {
        merchantFields.style.display = isMerchant ? 'block' : 'none';
    }
}

function handleRegister() {
    console.log('📝 بدء عملية التسجيل...');
    
    const name = document.getElementById('regName')?.value;
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const phone = document.getElementById('regPhone')?.value || '';
    
    if (!name || !email || !password) {
        showAdvancedNotification('الرجاء ملء جميع الحقول الأساسية', 'error');
        return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
        showAdvancedNotification('البريد الإلكتروني غير صحيح', 'error');
        return;
    }
    
    if (users.find(u => u.email === email)) {
        showAdvancedNotification('البريد الإلكتروني مستخدم بالفعل', 'error');
        return;
    }
    
    const isMerchant = document.getElementById('isMerchant')?.checked || false;
    
    console.log('👤 نوع المستخدم:', isMerchant ? 'تاجر' : 'عميل');
    
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
        const storeName = document.getElementById('storeName')?.value;
        const merchantLevel = document.getElementById('merchantLevel')?.value;
        const merchantDesc = document.getElementById('merchantDesc')?.value;
        
        if (!storeName) {
            showAdvancedNotification('الرجاء إدخال اسم المتجر', 'error');
            return;
        }
        
        newUser.storeName = storeName;
        newUser.merchantLevel = merchantLevel || '1';
        newUser.merchantDesc = merchantDesc || '';
        
        console.log('🔵 بيانات التاجر:', {
            storeName: newUser.storeName,
            level: newUser.merchantLevel
        });
        
        showAdvancedNotification('📤 جاري إرسال طلب التسجيل...', 'info');
        
        sendMerchantRequestToTelegram(newUser)
            .then(sent => {
                if (sent) {
                    console.log('✅ تم إرسال طلب التاجر بنجاح');
                    showAdvancedNotification('📋 تم إرسال طلب التسجيل إلى المدير', 'success');
                } else {
                    console.log('❌ فشل إرسال طلب التاجر');
                    showAdvancedNotification('⚠️ فشل إرسال الطلب، لكن سيتم مراجعته لاحقاً', 'warning');
                }
            })
            .catch(error => {
                console.error('❌ خطأ في إرسال الطلب:', error);
                showAdvancedNotification('⚠️ مشكلة في الاتصال، سيتم حفظ الطلب محلياً', 'warning');
            });
    } else {
        showAdvancedNotification('✅ تم التسجيل بنجاح', 'success');
    }
    
    users.push(newUser);
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    switchAuthTab('login');
    
    document.getElementById('regName').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
    if (document.getElementById('regPhone')) {
        document.getElementById('regPhone').value = '';
    }
}

function addMerchantFieldsToRegisterForm() {
    console.log('🔧 إضافة حقول التاجر لنموذج التسجيل...');
    
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) {
        console.log('❌ نموذج التسجيل غير موجود');
        return;
    }
    
    if (!document.getElementById('isMerchant')) {
        const merchantCheckboxDiv = document.createElement('div');
        merchantCheckboxDiv.className = 'form-group';
        merchantCheckboxDiv.innerHTML = `
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; margin: 15px 0;">
                <input type="checkbox" id="isMerchant" onchange="toggleMerchantFields()">
                <span style="color: var(--gold); font-weight: 700;">تسجيل كتاجر</span>
                <i class="fas fa-store" style="color: var(--gold);"></i>
            </label>
        `;
        
        const submitBtn = registerForm.querySelector('button[onclick="handleRegister()"]');
        if (submitBtn) {
            submitBtn.parentNode.insertBefore(merchantCheckboxDiv, submitBtn);
        }
    }
    
    if (!document.getElementById('merchantFields')) {
        const merchantFieldsDiv = document.createElement('div');
        merchantFieldsDiv.id = 'merchantFields';
        merchantFieldsDiv.style.display = 'none';
        merchantFieldsDiv.innerHTML = `
            <div class="form-group">
                <label><i class="fas fa-store"></i> اسم المتجر</label>
                <input type="text" id="storeName" placeholder="اسم متجرك" class="form-input">
            </div>
            <div class="form-group">
                <label><i class="fas fa-chart-line"></i> مستوى التاجر</label>
                <select id="merchantLevel" class="form-input">
                    <option value="1">المستوى الأول (5 منتجات)</option>
                    <option value="2">المستوى الثاني (15 منتج)</option>
                    <option value="3">المستوى الثالث (غير محدود)</option>
                </select>
            </div>
            <div class="form-group">
                <label><i class="fas fa-pen"></i> وصف النشاط التجاري</label>
                <textarea id="merchantDesc" placeholder="اكتب وصفاً لمتجرك..." class="form-input" rows="3"></textarea>
            </div>
        `;
        
        const merchantCheckbox = document.getElementById('isMerchant')?.parentNode?.parentNode;
        if (merchantCheckbox) {
            merchantCheckbox.parentNode.insertBefore(merchantFieldsDiv, merchantCheckbox.nextSibling);
        }
    }
    
    console.log('✅ تمت إضافة حقول التاجر');
}

// ========== 31. تحديث واجهة المستخدم حسب الصلاحية ==========
function updateUIBasedOnRole() {
    if (!currentUser) return;

    if (currentUser.role === 'admin') {
        console.log('👑 مدير');
        showAdvancedNotification('مرحباً بك يا مدير', 'success');
    } 
    else if (currentUser.role === 'merchant_approved') {
        console.log('🏪 تاجر معتمد');
        showAdvancedNotification('مرحباً أيها التاجر', 'info');
        
        addMerchantMenuButton();
        showMerchantPanel();
    } 
    else if (currentUser.role === 'merchant_pending') {
        console.log('⏳ تاجر في الانتظار');
        showAdvancedNotification('طلبك قيد المراجعة', 'warning');
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
    displayProducts();
}

function showMerchantPanel() {
    if (!currentUser || currentUser.role !== 'merchant_approved') return;
    
    const merchantProducts = products.filter(p => p.merchantName === currentUser.name);
    const totalSales = merchantProducts.reduce((sum, p) => sum + (p.price * (p.soldCount || 0)), 0);
    
    const panel = document.getElementById('merchantPanelContainer');
    if (panel) {
        panel.style.display = 'block';
        panel.innerHTML = `
            <div class="merchant-panel" style="background: var(--glass); border: 2px solid var(--gold); border-radius: 20px; padding: 20px; margin: 20px;">
                <h3 style="color: var(--gold); text-align: center;"><i class="fas fa-store"></i> لوحة التاجر - ${currentUser.name}</h3>
                <div style="display: flex; gap: 20px; justify-content: center; margin: 20px 0; flex-wrap: wrap;">
                    <div style="text-align: center; background: var(--bg-secondary); padding: 20px; border-radius: 15px; min-width: 150px;">
                        <div style="font-size: 32px; font-weight: 800; color: var(--gold);">${merchantProducts.length}</div>
                        <div>إجمالي المنتجات</div>
                    </div>
                    <div style="text-align: center; background: var(--bg-secondary); padding: 20px; border-radius: 15px; min-width: 150px;">
                        <div style="font-size: 32px; font-weight: 800; color: var(--gold);">${merchantProducts.filter(p => p.stock > 0).length}</div>
                        <div>المنتجات المتاحة</div>
                    </div>
                    <div style="text-align: center; background: var(--bg-secondary); padding: 20px; border-radius: 15px; min-width: 150px;">
                        <div style="font-size: 32px; font-weight: 800; color: var(--gold);">${totalSales.toLocaleString()} دج</div>
                        <div>إجمالي المبيعات</div>
                    </div>
                </div>
                <div style="display: flex; gap: 15px; margin-top: 20px; justify-content: center; flex-wrap: wrap;">
                    <button class="btn-gold" onclick="showAddProductModal()" style="padding: 12px 25px;"><i class="fas fa-plus"></i> إضافة منتج جديد</button>
                    <button class="btn-outline-gold" onclick="viewMyProducts()" style="padding: 12px 25px;"><i class="fas fa-box"></i> عرض منتجاتي</button>
                </div>
            </div>
        `;
    }
}

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
        document.getElementById('editingProductId').value = '';
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('productImagesData').value = '';
        document.getElementById('productModal').style.display = 'flex';
    } else {
        showAdvancedNotification('فقط المدير والتجار يمكنهم إضافة منتجات', 'error');
    }
}

// ========== 32. تأثيرات الكتابة ==========
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

// ========== 33. التهيئة النهائية (معدلة - للزوار العاديين) ==========
window.onload = function() {
    console.log('🚀 بدء تشغيل النظام...');
    
    // تحميل المنتجات - الكل يشوفها (زوار، عملاء، تجار، مدير)
    loadProducts();
    
    // تحميل السلة - لكل زائر سلة خاصة فيه
    loadCart();
    
    // إضافة حقول التاجر لنموذج التسجيل
    setTimeout(addMerchantFieldsToRegisterForm, 500);
    
    // بدء الاستماع لأوامر التلجرام
    startTelegramListener();
    
    // ✅ الأهم: ما فيش تسجيل دخول تلقائي أبداً
    // الزائر يدخل كضيف يشوف المنتجات ويشتري
    currentUser = null;
    console.log('👤 زائر جديد - يشوف المنتجات ويشتري');
    
    // إخفاء كل حاجات المدير والتجار
    const dashboardBtn = document.getElementById('dashboardBtn');
    if (dashboardBtn) dashboardBtn.style.display = 'none';
    
    const merchantPanel = document.getElementById('merchantPanelContainer');
    if (merchantPanel) merchantPanel.style.display = 'none';
    
    // إزالة أي أزرار خاصة
    const myProductsBtn = document.getElementById('myProductsBtn');
    if (myProductsBtn) myProductsBtn.remove();
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.remove();
    
    // استعادة الثيم (الوضع الليلي/النهاري)
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
    
    // أحداث التمرير
    window.addEventListener('scroll', toggleQuickTopButton);
    
    // تشغيل العداد
    updateCountdown();
    
    // تشغيل أشرطة التقدم
    updateProgressBars();
    
    // تشغيل تأثير الكتابة
    const typingElement = document.getElementById('typing-text');
    if (typingElement) {
        new TypingAnimation(typingElement, ['نكهة وجمال', 'تسوق آمن', 'جودة عالية', 'توصيل سريع'], 100, 2000).start();
    }
    
    console.log('✅ النظام جاهز - الزوار يشوفون المنتجات ويشترون');
};



// ========== إغلاق النوافذ عند النقر خارجها ==========
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};
