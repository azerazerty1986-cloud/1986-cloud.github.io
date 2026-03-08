// ========== نظام المنتجات والتجار في تليجرام ==========

// ========== 1. إعدادات تليجرام ==========
const TELEGRAM = {
    botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
    channelId: '-1003822964890'
};

// ========== 2. المنتجات - جلب من تليجرام ==========
async function loadProductsFromTelegram() {
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`
        );
        
        const data = await response.json();
        const products = [];
        
        if (data.ok && data.result) {
            for (const update of data.result) {
                if (update.channel_post && update.channel_post.text) {
                    const post = update.channel_post;
                    
                    if (post.text.includes('🟣')) {
                        const lines = post.text.split('\n');
                        let name = 'منتج';
                        let price = 0;
                        let category = 'other';
                        let stock = 0;
                        let merchant = 'المتجر';
                        
                        lines.forEach(line => {
                            if (line.includes('المنتج:')) {
                                name = line.replace('المنتج:', '').trim();
                            }
                            if (line.includes('السعر:')) {
                                const match = line.match(/\d+/);
                                if (match) price = parseInt(match[0]);
                            }
                            if (line.includes('القسم:')) {
                                const cat = line.replace('القسم:', '').trim().toLowerCase();
                                if (cat.includes('promo')) category = 'promo';
                                else if (cat.includes('spices')) category = 'spices';
                                else if (cat.includes('cosmetic')) category = 'cosmetic';
                            }
                            if (line.includes('الكمية:')) {
                                const match = line.match(/\d+/);
                                if (match) stock = parseInt(match[0]);
                            }
                            if (line.includes('التاجر:')) {
                                merchant = line.replace('التاجر:', '').trim();
                            }
                        });
                        
                        products.push({
                            id: post.message_id,
                            name: name,
                            price: price,
                            category: category,
                            stock: stock,
                            merchantName: merchant,
                            createdAt: new Date().toISOString()
                        });
                    }
                }
            }
        }
        
        localStorage.setItem('nardoo_products', JSON.stringify(products));
        return products;
        
    } catch (error) {
        const saved = localStorage.getItem('nardoo_products');
        return saved ? JSON.parse(saved) : [];
    }
}

// ========== 3. المنتجات - إضافة منتج إلى تليجرام ==========
async function addProductToTelegram(product) {
    const message = `
🟣 *منتج جديد*
━━━━━━━━━━━━━━━━
📦 المنتج: ${product.name}
💰 السعر: ${product.price} دج
🏷️ القسم: ${product.category}
📊 الكمية: ${product.stock}
👤 التاجر: ${product.merchantName}
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
        return false;
    }
}

// ========== 4. التجار - إرسال طلب انضمام تاجر ==========
async function sendMerchantRequestToTelegram(merchant) {
    const message = `
🔵 *طلب تاجر جديد*
━━━━━━━━━━━━━━━━
🏪 المتجر: ${merchant.storeName || 'متجر ' + merchant.name}
👤 الاسم: ${merchant.name}
📧 البريد: ${merchant.email}
📞 الهاتف: ${merchant.phone || 'غير متوفر'}

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

// ========== 5. التجار - الموافقة على تاجر ==========
function approveMerchant(userId) {
    let users = JSON.parse(localStorage.getItem('nardoo_users') || '[]');
    const user = users.find(u => u.id == userId);
    
    if (user) {
        user.role = 'merchant_approved';
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        
        fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: `✅ تمت الموافقة على التاجر: ${user.name}`,
                parse_mode: 'Markdown'
            })
        });
    }
}

// ========== 6. التجار - رفض تاجر ==========
function rejectMerchant(userId) {
    let users = JSON.parse(localStorage.getItem('nardoo_users') || '[]');
    const user = users.find(u => u.id == userId);
    
    if (user) {
        user.role = 'customer';
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        
        fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: `❌ تم رفض التاجر: ${user.name}`,
                parse_mode: 'Markdown'
            })
        });
    }
}

// ========== 7. الطلبات - إرسال طلب شراء ==========
async function sendOrderToTelegram(order) {
    const message = `
🟢 *طلب جديد*
━━━━━━━━━━━━━━━━
👤 الزبون: ${order.customerName}
📞 الهاتف: ${order.customerPhone || 'غير متوفر'}
📍 العنوان: ${order.customerAddress || 'غير محدد'}
📦 المنتجات:
${order.items.map((item, i) => 
    `  ${i+1}. ${item.name} (${item.quantity})`
).join('\n')}
💰 الإجمالي: ${order.total} دج
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

// ========== 8. الاستماع لأوامر تليجرام ==========
setInterval(async () => {
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`
        );
        
        const data = await response.json();
        
        if (data.ok && data.result) {
            for (const update of data.result) {
                if (update.message?.text) {
                    const text = update.message.text;
                    
                    if (text.startsWith('/approve_')) {
                        const userId = text.replace('/approve_', '');
                        approveMerchant(userId);
                    }
                    
                    if (text.startsWith('/reject_')) {
                        const userId = text.replace('/reject_', '');
                        rejectMerchant(userId);
                    }
                }
            }
        }
    } catch (error) {
        console.error('خطأ في الاستماع لتليجرام:', error);
    }
}, 10000);
