// ========== ناردو برو - نظام متكامل مع تلجرام ==========
// ========== نسخة مصححة - الجداول والصور + الموافقة على التجار ==========

// ========== 1. إعدادات تلجرام ==========
const TELEGRAM = {
    botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
    channelId: '-1003822964890',
    adminId: '7461896689'
};

// ========== 2. المتغيرات العامة ==========
let products = [];
let merchants = [];
let currentUser = null;
let cart = [];
let isDarkMode = true;
let currentFilter = 'all';
let searchTerm = '';
let sortBy = 'newest';
let users = [];
let lastUpdateId = 0;

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
                telegramId: TELEGRAM.adminId,
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('nardoo_users', JSON.stringify(users));
    }
}
loadUsers();

// ========== 4. نظام الإشعارات Toast ==========
const ToastSystem = {
    show: function(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle',
            loading: 'fa-spinner fa-spin'
        };
        
        toast.innerHTML = `
            <div class="toast-icon"><i class="fas ${icons[type]}"></i></div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        container.appendChild(toast);
        
        if (type !== 'loading') {
            setTimeout(() => toast.remove(), duration);
        }
        
        return toast;
    },
    
    hideAll: function() {
        const container = document.getElementById('toastContainer');
        if (container) container.innerHTML = '';
    }
};

// ========== 5. دالة مساعدة لاستخراج بيانات المنتج ==========
function extractProductData(lines) {
    let name = 'منتج';
    let price = 0;
    let category = 'other';
    let stock = 10;
    let merchant = 'المتجر';
    let merchantId = null;
    
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
        } else if (line.includes('معرف التاجر:')) {
            const match = line.match(/\|\|(\d+)\|\|/);
            if (match) merchantId = parseInt(match[1]);
        }
    });
    
    return { name, price, category, stock, merchantName: merchant, merchantId, rating: 4.5 };
}

// ========== 6. الحصول على اسم القسم ==========
function getCategoryName(category) {
    const names = {
        'promo': 'برموسيو',
        'spices': 'توابل',
        'cosmetic': 'كوسمتيك',
        'other': 'منتوجات أخرى'
    };
    return names[category] || 'أخرى';
}

// ========== 7. جلب التجار من تليجرام والاستماع للأوامر ==========
async function loadMerchantsFromTelegram() {
    try {
        console.log('🔄 جاري جلب طلبات التجار من تلجرام...');
        
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates?offset=${lastUpdateId}`
        );
        
        const data = await response.json();
        
        if (data.ok && data.result) {
            for (const update of data.result) {
                lastUpdateId = update.update_id + 1;
                
                // معالجة رسائل القناة
                if (update.channel_post && update.channel_post.text) {
                    const post = update.channel_post;
                    const text = post.text;
                    
                    // طلب تاجر جديد (🔵)
                    if (text.includes('🔵') && text.includes('طلب انضمام تاجر')) {
                        console.log('👤 وجدنا طلب تاجر:', text.substring(0, 50));
                        
                        const lines = text.split('\n');
                        let merchantData = {
                            id: post.message_id,
                            name: 'تاجر',
                            storeName: 'متجر',
                            email: '',
                            phone: '',
                            level: '1',
                            desc: '',
                            status: 'pending',
                            telegramId: null,
                            createdAt: new Date(post.date * 1000).toISOString()
                        };
                        
                        lines.forEach(line => {
                            if (line.includes('التاجر:')) {
                                merchantData.name = line.replace('التاجر:', '').replace(/[🔵*]/g, '').trim();
                            } else if (line.includes('المتجر:')) {
                                merchantData.storeName = line.replace('المتجر:', '').replace(/[🔵*]/g, '').trim();
                            } else if (line.includes('البريد:')) {
                                merchantData.email = line.replace('البريد:', '').replace(/[🔵*]/g, '').trim();
                            } else if (line.includes('الهاتف:')) {
                                merchantData.phone = line.replace('الهاتف:', '').replace(/[🔵*]/g, '').trim();
                            } else if (line.includes('المستوى:')) {
                                merchantData.level = line.replace('المستوى:', '').replace(/[🔵*]/g, '').trim();
                            } else if (line.includes('الوصف:')) {
                                merchantData.desc = line.replace('الوصف:', '').replace(/[🔵*]/g, '').trim();
                            }
                        });
                        
                        merchants.push(merchantData);
                        
                        // إضافة للمستخدمين
                        const existingUser = users.find(u => u.email === merchantData.email);
                        if (!existingUser) {
                            users.push({
                                id: users.length + 1,
                                name: merchantData.name,
                                email: merchantData.email,
                                password: 'temp123',
                                phone: merchantData.phone,
                                role: 'merchant_pending',
                                status: 'pending',
                                storeName: merchantData.storeName,
                                merchantLevel: merchantData.level,
                                merchantDesc: merchantData.desc,
                                telegramId: merchantData.telegramId,
                                telegramMessageId: merchantData.id,
                                createdAt: merchantData.createdAt
                            });
                        }
                    }
                    
                    // أمر موافقة (✅)
                    if (text.includes('/approve_')) {
                        const match = text.match(/\/approve_(\d+)/);
                        if (match) {
                            const merchantId = parseInt(match[1]);
                            console.log('✅ أمر موافقة للتاجر رقم:', merchantId);
                            await approveMerchant(merchantId);
                        }
                    }
                    
                    // أمر رفض (❌)
                    if (text.includes('/reject_')) {
                        const match = text.match(/\/reject_(\d+)/);
                        if (match) {
                            const merchantId = parseInt(match[1]);
                            console.log('❌ أمر رفض للتاجر رقم:', merchantId);
                            await rejectMerchant(merchantId);
                        }
                    }
                }
                
                // معالجة الرسائل الخاصة (من البوت)
                if (update.message && update.message.text) {
                    const msg = update.message;
                    const text = msg.text;
                    
                    // أمر موافقة من رسالة خاصة
                    if (text.startsWith('/approve_')) {
                        const match = text.match(/\/approve_(\d+)/);
                        if (match) {
                            const merchantId = parseInt(match[1]);
                            console.log('✅ أمر موافقة من خاص للتاجر:', merchantId);
                            await approveMerchant(merchantId);
                        }
                    }
                    
                    // أمر رفض من رسالة خاصة
                    if (text.startsWith('/reject_')) {
                        const match = text.match(/\/reject_(\d+)/);
                        if (match) {
                            const merchantId = parseInt(match[1]);
                            console.log('❌ أمر رفض من خاص للتاجر:', merchantId);
                            await rejectMerchant(merchantId);
                        }
                    }
                }
            }
        }
        
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        console.log(`✅ تم تحديث بيانات التجار`);
        
    } catch (error) {
        console.error('❌ خطأ في جلب التجار:', error);
    }
}

// ========== 8. جلب المنتجات من تليجرام ==========
async function loadProductsFromTelegram() {
    try {
        console.log('🔄 جاري جلب المنتجات من تلجرام...');
        
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`
        );
        
        const data = await response.json();
        const telegramProducts = [];
        
        if (data.ok && data.result) {
            console.log(`✅ تم العثور على ${data.result.length} تحديث`);
            
            const updates = [...data.result].reverse();
            
            for (const update of updates) {
                if (update.channel_post) {
                    const post = update.channel_post;
                    
                    // منتج مع صورة
                    if (post.photo && post.caption && post.caption.includes('🟣')) {
                        console.log('📸 وجدنا منتج مع صورة');
                        
                        const photo = post.photo[post.photo.length - 1];
                        const fileId = photo.file_id;
                        
                        const fileResponse = await fetch(
                            `https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`
                        );
                        const fileData = await fileResponse.json();
                        
                        let imageUrl = "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال";
                        if (fileData.ok) {
                            imageUrl = `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`;
                        }
                        
                        const lines = post.caption.split('\n');
                        let productData = extractProductData(lines);
                        
                        telegramProducts.push({
                            id: post.message_id,
                            name: productData.name,
                            price: productData.price,
                            category: productData.category,
                            stock: productData.stock,
                            merchantName: productData.merchantName,
                            merchantId: productData.merchantId,
                            images: [imageUrl],
                            rating: 4.5,
                            telegramPhoto: true,
                            telegramMessageId: post.message_id,
                            createdAt: new Date(post.date * 1000).toISOString()
                        });
                    }
                    
                    // منتج نصي
                    else if (post.text && post.text.includes('🟣')) {
                        console.log('📦 وجدنا منتج نصي');
                        
                        const lines = post.text.split('\n');
                        let productData = extractProductData(lines);
                        
                        telegramProducts.push({
                            id: post.message_id,
                            name: productData.name,
                            price: productData.price,
                            category: productData.category,
                            stock: productData.stock,
                            merchantName: productData.merchantName,
                            merchantId: productData.merchantId,
                            images: ["https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال"],
                            rating: 4.5,
                            telegramPhoto: false,
                            telegramMessageId: post.message_id,
                            createdAt: new Date(post.date * 1000).toISOString()
                        });
                    }
                }
            }
        }
        
        // دمج مع المنتجات المحلية
        const localProducts = JSON.parse(localStorage.getItem('nardoo_products') || '[]');
        const allProducts = [...telegramProducts];
        
        localProducts.forEach(localProduct => {
            if (!allProducts.find(p => p.id === localProduct.id)) {
                allProducts.push(localProduct);
            }
        });
        
        localStorage.setItem('nardoo_products', JSON.stringify(allProducts));
        products = allProducts;
        
        console.log(`✅ تم تحميل ${products.length} منتج (${telegramProducts.length} من تلجرام)`);
        displayProducts();
        
    } catch (error) {
        console.error('❌ خطأ في جلب المنتجات:', error);
        const saved = localStorage.getItem('nardoo_products');
        products = saved ? JSON.parse(saved) : [];
        displayProducts();
    }
}

// ========== 9. الموافقة على تاجر ==========
async function approveMerchant(merchantId) {
    console.log('🔄 محاولة الموافقة على التاجر:', merchantId);
    
    // البحث عن التاجر
    const merchantIndex = users.findIndex(u => u.id == merchantId || u.telegramMessageId == merchantId);
    
    if (merchantIndex === -1) {
        console.error('❌ التاجر غير موجود:', merchantId);
        ToastSystem.show('التاجر غير موجود', 'error');
        return;
    }
    
    const merchant = users[merchantIndex];
    
    // تحديث الدور والحالة
    merchant.role = 'merchant_approved';
    merchant.status = 'approved';
    
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    console.log('✅ تمت الموافقة على التاجر:', merchant.name);
    
    // إرسال إشعار الموافقة إلى القناة
    const message = `
✅ *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
✅      *تمت الموافقة على تاجر*      
✅ *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*

┌──────────────────┬────────────────────┐
│ 🏪 *المتجر*      │ ${merchant.storeName.padEnd(18)} │
├──────────────────┼────────────────────┤
│ 👤 *التاجر*      │ ${merchant.name.padEnd(18)} │
└──────────────────┴────────────────────┘

🎉 *مبروك! يمكنك الآن إضافة منتجاتك*
✅ *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
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
        
        // إرسال رسالة خاصة للتاجر إذا كان لديه معرف
        if (merchant.telegramId) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: merchant.telegramId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
        }
        
        ToastSystem.show(`✅ تمت الموافقة على التاجر: ${merchant.name}`, 'success');
        
        // تحديث الواجهة إذا كان التاجر مسجل دخوله
        if (currentUser && currentUser.id === merchant.id) {
            currentUser = merchant;
            localStorage.setItem('current_user', JSON.stringify(currentUser));
            updateUIBasedOnRole();
        }
        
    } catch (error) {
        console.error('❌ خطأ في إرسال إشعار الموافقة:', error);
        ToastSystem.show('تمت الموافقة ولكن فشل إرسال الإشعار', 'warning');
    }
}

// ========== 10. رفض تاجر ==========
async function rejectMerchant(merchantId) {
    console.log('🔄 محاولة رفض التاجر:', merchantId);
    
    const merchantIndex = users.findIndex(u => u.id == merchantId || u.telegramMessageId == merchantId);
    
    if (merchantIndex === -1) {
        console.error('❌ التاجر غير موجود:', merchantId);
        ToastSystem.show('التاجر غير موجود', 'error');
        return;
    }
    
    const merchant = users[merchantIndex];
    
    merchant.role = 'customer';
    merchant.status = 'rejected';
    
    localStorage.setItem('nardoo_users', JSON.stringify(users));
    
    console.log('❌ تم رفض التاجر:', merchant.name);
    
    const message = `
❌ *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
❌        *تم رفض طلب تاجر*         
❌ *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*

┌──────────────────┬────────────────────┐
│ 🏪 *المتجر*      │ ${merchant.storeName.padEnd(18)} │
├──────────────────┼────────────────────┤
│ 👤 *التاجر*      │ ${merchant.name.padEnd(18)} │
└──────────────────┴────────────────────┘

😞 *نأسف، لم تتم الموافقة على طلبك*
❌ *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
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
        
        if (merchant.telegramId) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: merchant.telegramId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
        }
        
        ToastSystem.show(`❌ تم رفض التاجر: ${merchant.name}`, 'error');
        
    } catch (error) {
        console.error('❌ خطأ في إرسال إشعار الرفض:', error);
        ToastSystem.show('تم الرفض ولكن فشل إرسال الإشعار', 'warning');
    }
}

// ========== 11. إرسال طلب انضمام تاجر ==========
async function sendMerchantRequestToTelegram(merchant) {
    const message = `
🔵 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
🔵      *طلب انضمام تاجر جديد*      
🔵 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*

┌──────────────────┬────────────────────┐
│ 🏪 *المتجر*      │ ${merchant.storeName.padEnd(18)} │
├──────────────────┼────────────────────┤
│ 👤 *التاجر*      │ ${merchant.name.padEnd(18)} │
├──────────────────┼────────────────────┤
│ 📧 *البريد*      │ ${merchant.email.padEnd(18)} │
├──────────────────┼────────────────────┤
│ 📞 *الهاتف*      │ ${(merchant.phone || 'غير متوفر').padEnd(18)} │
├──────────────────┼────────────────────┤
│ 📊 *المستوى*     │ ${(merchant.merchantLevel || '1').padEnd(18)} │
└──────────────────┴────────────────────┘

📝 *الوصف:* ${merchant.merchantDesc || 'تاجر جديد'}
🔵 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*

⬇️ *للإجراء*
✅ للموافقة: /approve_${merchant.id}
❌ للرفض: /reject_${merchant.id}
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
        console.log('✅ تم إرسال طلب التاجر إلى تلجرام');
    } catch (error) {
        console.error('❌ خطأ في إرسال طلب التاجر:', error);
    }
}

// ========== 12. إضافة منتج إلى تليجرام مع جدول منسق ==========
async function addProductToTelegram(product) {
    try {
        ToastSystem.show('🔄 جاري الإرسال إلى تلجرام...', 'loading', 0);
        
        const categoryIcon = {
            'promo': '🔥',
            'spices': '🧂',
            'cosmetic': '💄',
            'other': '📦'
        }[product.category] || '📦';
        
        const merchantTag = `👤 *معرف التاجر:* ||${product.merchantId}||`;
        
        const tableMessage = `
🟣 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
🟣         *منتج جديد في المتجر*         
🟣 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*

┌──────────────────┬────────────────────┐
│ 📦 *المنتج*      │ ${product.name.padEnd(18)} │
├──────────────────┼────────────────────┤
│ 💰 *السعر*       │ ${product.price.toString().padEnd(18)} دج │
├──────────────────┼────────────────────┤
│ ${categoryIcon} *القسم*       │ ${getCategoryName(product.category).padEnd(18)} │
├──────────────────┼────────────────────┤
│ 📊 *الكمية*      │ ${product.stock.toString().padEnd(18)} قطعة │
├──────────────────┼────────────────────┤
│ 👤 *التاجر*      │ ${product.merchantName.padEnd(18)} │
└──────────────────┴────────────────────┘
🟣 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
${merchantTag}
⏰ ${new Date().toLocaleDateString('ar-DZ')}
🔗 *للطلب:* واتساب
🟣 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
        `;

        // إرسال مع صورة
        if (product.images && product.images.length > 0 && !product.images[0].startsWith('data:')) {
            const photoResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendPhoto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM.channelId,
                    photo: product.images[0],
                    caption: tableMessage,
                    parse_mode: 'Markdown'
                })
            });
            
            const photoResult = await photoResponse.json();
            
            if (photoResult.ok) {
                ToastSystem.hideAll();
                ToastSystem.show('✅ تم إرسال المنتج مع الصورة', 'success');
                return true;
            }
        }
        
        // إرسال بدون صورة
        const textResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: tableMessage,
                parse_mode: 'Markdown'
            })
        });
        
        const textResult = await textResponse.json();
        
        if (textResult.ok) {
            ToastSystem.hideAll();
            ToastSystem.show('✅ تم إرسال المنتج', 'success');
            return true;
        }
        
        ToastSystem.hideAll();
        ToastSystem.show('❌ فشل الإرسال', 'error');
        return false;
        
    } catch (error) {
        console.error('❌ خطأ:', error);
        ToastSystem.hideAll();
        ToastSystem.show('❌ خطأ في الاتصال', 'error');
        return false;
    }
}

// ========== 13. عرض المنتجات في المتجر ==========
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px;">
                <i class="fas fa-box-open" style="font-size: 80px; color: var(--gold); margin-bottom: 20px;"></i>
                <h3 style="color: var(--gold); font-size: 28px;">لا توجد منتجات</h3>
                <p style="color: var(--text-secondary);">أول منتج يضاف في تلجرام سيظهر هنا</p>
            </div>
        `;
        return;
    }

    let filtered = products.filter(p => p.stock > 0);
    
    if (currentFilter !== 'all' && currentFilter !== 'my_products') {
        filtered = filtered.filter(p => p.category === currentFilter);
    } else if (currentFilter === 'my_products' && currentUser?.role === 'merchant_approved') {
        filtered = filtered.filter(p => 
            p.merchantName === currentUser.storeName || 
            p.merchantName === currentUser.name ||
            p.merchantId == currentUser.id
        );
    }

    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    filtered = sortProducts(filtered);

    container.innerHTML = filtered.map(product => {
        const images = product.images && product.images.length > 0 
            ? product.images 
            : ["https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال"];
        
        let categoryIcon = 'fas fa-tag';
        if (product.category === 'promo') categoryIcon = 'fas fa-fire';
        else if (product.category === 'spices') categoryIcon = 'fas fa-mortar-pestle';
        else if (product.category === 'cosmetic') categoryIcon = 'fas fa-spa';

        const stockClass = product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : 'in-stock';
        const stockText = product.stock <= 0 ? 'غير متوفر' : product.stock < 5 ? `كمية محدودة (${product.stock})` : `متوفر (${product.stock})`;
        const timeAgo = getSimpleTimeAgo(product.createdAt);

        return `
            <div class="product-card" onclick="viewProductDetails(${product.id})">
                <div class="product-time-badge">
                    <i class="far fa-clock"></i> ${timeAgo}
                </div>
                <div class="product-gallery">
                    <img src="${images[0]}" alt="${product.name}" 
                         onerror="this.src='https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال'">
                    ${product.telegramPhoto ? '<span class="telegram-badge"><i class="fab fa-telegram"></i></span>' : ''}
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
                        <div class="stars-container">${generateStars(product.rating || 4.5)}</div>
                        <span class="rating-value">${(product.rating || 4.5).toFixed(1)}</span>
                    </div>
                    <div class="product-price">${product.price.toLocaleString()} <small>دج</small></div>
                    <div class="product-stock ${stockClass}">${stockText}</div>
                    <div class="product-actions">
                        <button class="add-to-cart" onclick="event.stopPropagation(); addToCart(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> أضف للسلة
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ========== 14. عرض تفاصيل المنتج ==========
function viewProductDetails(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');

    const images = product.images?.map(img => `
        <img src="${img}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 20px; margin-bottom: 10px;">
    `).join('') || '<div style="height: 300px; background: var(--nardoo); display: flex; align-items: center; justify-content: center; border-radius: 20px;"><i class="fas fa-image" style="font-size: 80px; color: var(--gold);"></i></div>';

    let categoryIcon = 'fas fa-tag';
    if (product.category === 'promo') categoryIcon = 'fas fa-fire';
    else if (product.category === 'spices') categoryIcon = 'fas fa-mortar-pestle';
    else if (product.category === 'cosmetic') categoryIcon = 'fas fa-spa';

    const stockClass = product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : 'in-stock';
    const stockText = product.stock <= 0 ? 'غير متوفر' : product.stock < 5 ? `كمية محدودة (${product.stock})` : `متوفر (${product.stock})`;

    content.innerHTML = `
        <div style="position: relative;">
            <span style="position: absolute; top: 10px; right: 10px; background: var(--gold); color: #000; padding: 5px 15px; border-radius: 20px; font-size: 14px;">
                <i class="far fa-clock"></i> ${getSimpleTimeAgo(product.createdAt)}
            </span>
            <h2 style="text-align: center; margin-bottom: 30px; color: var(--gold);">${product.name}</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <div>
                    <div style="display: grid; gap: 10px;">
                        ${images}
                        ${product.telegramPhoto ? '<p style="color: #4ade80; text-align: center;"><i class="fab fa-telegram"></i> من تلجرام</p>' : ''}
                    </div>
                </div>
                <div>
                    <div style="margin-bottom: 20px;">
                        <span style="background: var(--gold); padding: 5px 15px; border-radius: 20px; color: #000; font-weight: 700;">
                            <i class="${categoryIcon}"></i> ${getCategoryName(product.category)}
                        </span>
                    </div>
                    
                    <p style="margin-bottom: 20px;">منتج من ${product.merchantName}</p>
                    
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
                        <span class="product-stock ${stockClass}">${stockText}</span>
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
        </div>
    `;

    modal.style.display = 'flex';
}

// ========== 15. إرسال طلب شراء مع جدول السلة ==========
async function sendOrderToTelegram(order) {
    try {
        let productsTable = `┌────┬────────────────────┬──────┬─────────┐\n`;
        productsTable += `│ #  │ المنتج             │ الكم │ السعر   │\n`;
        productsTable += `├────┼────────────────────┼──────┼─────────┤\n`;
        
        order.items.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            const productName = item.name.length > 18 ? item.name.substring(0, 15) + '...' : item.name;
            productsTable += `│ ${(index + 1).toString().padEnd(2)} │ ${productName.padEnd(18)} │ ${item.quantity.toString().padEnd(4)} │ ${itemTotal.toString().padEnd(7)} دج │\n`;
        });
        
        productsTable += `└────┴────────────────────┴──────┴─────────┘`;

        const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = 800;
        const total = subtotal + shipping;

        const message = `
🟢 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
🟢         *طلب شراء جديد*         
🟢 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*

👤 *العميل:* ${order.customerName}
📞 *الهاتف:* ${order.customerPhone}
📍 *العنوان:* ${order.customerAddress}

🟢 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
📦 *تفاصيل الطلب:*
${productsTable}

🟢 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
💰 *المجموع الفرعي:* ${subtotal} دج
🚚 *الشحن:* ${shipping} دج
💵 *الإجمالي:* ${total} دج
🟢 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
🔔 *رقم الطلب:* #${order.orderId}
⏰ ${new Date().toLocaleString('ar-DZ')}
        `;

        // إرسال إلى القناة
        await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        // إرسال للمدير
        await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.adminId,
                text: message.replace('🟢', '👑'),
                parse_mode: 'Markdown'
            })
        });

        // إرسال لكل تاجر
        const merchantGroups = {};
        order.items.forEach(item => {
            const merchantName = item.merchantName || 'المتجر';
            if (!merchantGroups[merchantName]) merchantGroups[merchantName] = [];
            merchantGroups[merchantName].push(item);
        });

        for (const [merchantName, items] of Object.entries(merchantGroups)) {
            const merchant = users.find(u => u.storeName === merchantName || u.name === merchantName);
            
            if (merchant?.telegramId) {
                let merchantTable = `┌────┬────────────────────┬──────┬─────────┐\n`;
                merchantTable += `│ #  │ المنتج             │ الكم │ السعر   │\n`;
                merchantTable += `├────┼────────────────────┼──────┼─────────┤\n`;
                
                items.forEach((item, index) => {
                    const itemTotal = item.price * item.quantity;
                    const productName = item.name.length > 18 ? item.name.substring(0, 15) + '...' : item.name;
                    merchantTable += `│ ${(index + 1).toString().padEnd(2)} │ ${productName.padEnd(18)} │ ${item.quantity.toString().padEnd(4)} │ ${itemTotal.toString().padEnd(7)} دج │\n`;
                });
                
                merchantTable += `└────┴────────────────────┴──────┴─────────┘`;

                const merchantMessage = `
🟢 *طلب جديد - ${merchantName}*
━━━━━━━━━━━━━━━━━━━━━━
👤 *العميل:* ${order.customerName}
📞 *الهاتف:* ${order.customerPhone}

📦 *منتجاتك:*
${merchantTable}

💰 *الإجمالي:* ${items.reduce((s, i) => s + (i.price * i.quantity), 0)} دج
🔔 *رقم الطلب:* #${order.orderId}
                `;

                await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: merchant.telegramId,
                        text: merchantMessage,
                        parse_mode: 'Markdown'
                    })
                });
            }
        }

        return true;

    } catch (error) {
        console.error('❌ خطأ في إرسال الطلب:', error);
        return false;
    }
}

// ========== 16. رفع الصور إلى تلجرام ==========
async function uploadImageToTelegram(imageFile) {
    try {
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM.channelId);
        formData.append('photo', imageFile);

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendPhoto`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.ok && data.result.photo) {
            const fileId = data.result.photo[data.result.photo.length - 1].file_id;
            
            const fileResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`);
            const fileData = await fileResponse.json();
            
            if (fileData.ok) {
                return `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`;
            }
        }
        return null;
    } catch (error) {
        console.error('❌ خطأ في رفع الصورة:', error);
        return null;
    }
}

// ========== 17. معالج رفع الصور ==========
async function handleImageUpload(event) {
    const files = event.target.files;
    const preview = document.getElementById('imagePreview');
    const imagesData = [];

    preview.innerHTML = '';

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML += `
                <div style="display: inline-block; margin: 5px; position: relative;">
                    <img src="${e.target.result}" class="preview-image">
                    <div class="upload-progress">⏳...</div>
                </div>
            `;
        };
        reader.readAsDataURL(file);
        
        const imageUrl = await uploadImageToTelegram(file);
        
        if (imageUrl) {
            imagesData.push(imageUrl);
            const progressDivs = document.querySelectorAll('.upload-progress');
            if (progressDivs[i]) {
                progressDivs[i].innerHTML = '✅';
                progressDivs[i].style.background = '#4ade80';
            }
        }
    }

    document.getElementById('productImagesData').value = JSON.stringify(imagesData);
}

// ========== 18. دوال المساعدة ==========
function getSimpleTimeAgo(dateString) {
    if (!dateString) return '';
    const now = new Date();
    const productDate = new Date(dateString);
    const diffInSeconds = Math.floor((now - productDate) / 1000);
    
    if (diffInSeconds < 60) return 'الآن';
    if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
    if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
    return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;
}

function generateStars(rating) {
    let stars = '';
    for (let i = 0; i < 5; i++) {
        if (i < rating) stars += '<i class="fas fa-star star filled"></i>';
        else stars += '<i class="far fa-star star"></i>';
    }
    return stars;
}

function sortProducts(productsArray) {
    switch(sortBy) {
        case 'newest': return [...productsArray].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        case 'price_low': return [...productsArray].sort((a, b) => a.price - b.price);
        case 'price_high': return [...productsArray].sort((a, b) => b.price - a.price);
        default: return productsArray;
    }
}

function changeSort(value) {
    sortBy = value;
    displayProducts();
}

function filterProducts(category) {
    currentFilter = category;
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    displayProducts();
}

function searchProducts() {
    searchTerm = document.getElementById('searchInput').value;
    displayProducts();
}

// ========== 19. إدارة السلة ==========
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
        ToastSystem.show('المنتج غير متوفر', 'error');
        return;
    }

    const existing = cart.find(item => item.productId == productId);
    if (existing) {
        if (existing.quantity < product.stock) {
            existing.quantity++;
        } else {
            ToastSystem.show('الكمية غير كافية', 'warning');
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
    ToastSystem.show('تمت الإضافة', 'success');
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
                <div class="cart-item-image"><i class="fas fa-box"></i></div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${item.price} دج</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="updateCartItem(${item.productId}, ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateCartItem(${item.productId}, ${item.quantity + 1})">+</button>
                        <button class="quantity-btn" onclick="removeFromCart(${item.productId})" style="background: #f87171;">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (totalSpan) totalSpan.textContent = `${total} دج`;
}

function updateCartItem(productId, newQuantity) {
    const item = cart.find(i => i.productId == productId);
    const product = products.find(p => p.id == productId);

    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }

    if (newQuantity > product.stock) {
        ToastSystem.show('الكمية غير متوفرة', 'warning');
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
    ToastSystem.show('تمت الإزالة', 'info');
}

// ========== 20. إتمام الشراء ==========
async function checkoutCart() {
    if (cart.length === 0) {
        ToastSystem.show('السلة فارغة', 'warning');
        return;
    }

    if (!currentUser) {
        ToastSystem.show('سجل دخول أولاً', 'warning');
        openLoginModal();
        return;
    }

    const customerPhone = prompt('رقم الهاتف:', currentUser.phone || '');
    if (!customerPhone) return;
    
    const customerAddress = prompt('العنوان:', '');
    if (!customerAddress) return;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 800;
    const total = subtotal + shipping;

    const order = {
        customerName: currentUser.name,
        customerPhone,
        customerAddress,
        items: cart,
        subtotal,
        shipping,
        total,
        orderId: `ORD${Date.now()}`
    };

    await sendOrderToTelegram(order);

    // واتساب
    cart.forEach(item => {
        const merchant = users.find(u => u.storeName === item.merchantName);
        if (merchant?.phone) {
            const msg = `طلب جديد: ${item.name} - ${item.quantity} قطعة`;
            window.open(`https://wa.me/${merchant.phone}?text=${encodeURIComponent(msg)}`, '_blank');
        }
    });

    cart = [];
    saveCart();
    updateCartCounter();
    toggleCart();
    ToastSystem.show('✅ تم إرسال الطلب', 'success');
}

// ========== 21. إدارة المستخدمين ==========
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
        ToastSystem.show(`مرحباً ${user.name}`, 'success');
    } else {
        ToastSystem.show('بيانات غير صحيحة', 'error');
    }
}

function handleRegister() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const phone = document.getElementById('regPhone')?.value || '';
    const isMerchant = document.getElementById('isMerchant').checked;

    if (!name || !email || !password) {
        ToastSystem.show('املأ جميع الحقول', 'error');
        return;
    }

    if (users.find(u => u.email === email)) {
        ToastSystem.show('البريد مستخدم', 'error');
        return;
    }

    const newUser = {
        id: users.length + 1,
        name,
        email,
        password,
        phone,
        role: isMerchant ? 'merchant_pending' : 'customer',
        status: isMerchant ? 'pending' : 'active',
        createdAt: new Date().toISOString()
    };

    if (isMerchant) {
        newUser.merchantLevel = document.getElementById('merchantLevel').value;
        newUser.merchantDesc = document.getElementById('merchantDesc').value;
        newUser.storeName = document.getElementById('storeName').value || `متجر ${name}`;
        sendMerchantRequestToTelegram(newUser);
        ToastSystem.show('📋 تم إرسال الطلب', 'info');
    } else {
        ToastSystem.show('✅ تم التسجيل', 'success');
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
    } else if (currentUser.role === 'merchant_approved') {
        document.getElementById('userBtn').innerHTML = '<i class="fas fa-store"></i>';
        addMerchantMenuButton();
        showMerchantPanel();
    } else {
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
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    document.getElementById('myProductsBtn')?.classList.add('active');
    displayProducts();
}

function showMerchantPanel() {
    if (!currentUser || currentUser.role !== 'merchant_approved') return;
    
    const merchantProducts = products.filter(p => p.merchantName === currentUser.storeName || p.merchantName === currentUser.name);
    
    document.getElementById('merchantPanelContainer').innerHTML = `
        <div class="merchant-panel">
            <h3><i class="fas fa-store"></i> ${currentUser.storeName || currentUser.name}</h3>
            <div class="stats">
                <div class="stat-item"><div class="number">${merchantProducts.length}</div><div>منتجاتك</div></div>
            </div>
            <button class="btn-gold" onclick="showAddProductModal()">➕ إضافة منتج</button>
        </div>
    `;
    document.getElementById('merchantPanelContainer').style.display = 'block';
}

// ========== 22. إضافة منتج ==========
function showAddProductModal() {
    if (!currentUser || (currentUser.role !== 'merchant_approved' && currentUser.role !== 'admin')) {
        ToastSystem.show('غير مصرح', 'error');
        return;
    }
    document.getElementById('productModal').style.display = 'flex';
}

async function saveProduct() {
    if (!currentUser) return;

    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const imagesData = document.getElementById('productImagesData').value;
    const images = imagesData ? JSON.parse(imagesData) : [];

    if (!name || !category || !price || !stock) {
        ToastSystem.show('املأ جميع الحقول', 'error');
        return;
    }

    const product = {
        id: Date.now(),
        name,
        price,
        category,
        stock,
        merchantName: currentUser.storeName || currentUser.name,
        merchantId: currentUser.id,
        images: images.length ? images : ["https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال"],
        rating: 4.5,
        createdAt: new Date().toISOString()
    };

    const sent = await addProductToTelegram(product);
    
    products.push(product);
    localStorage.setItem('nardoo_products', JSON.stringify(products));
    
    closeModal('productModal');
    displayProducts();
    if (currentUser.role === 'merchant_approved') showMerchantPanel();
}

// ========== 23. التمرير ==========
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToBottom() {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
}

function toggleQuickTopButton() {
    const btn = document.getElementById('quickTopBtn');
    if (btn) btn.classList.toggle('show', window.scrollY > 300);
}

// ========== 24. عداد تنازلي ==========
function updateCountdown() {
    const hours = document.getElementById('marqueeHours');
    const minutes = document.getElementById('marqueeMinutes');
    const seconds = document.getElementById('marqueeSeconds');
    if (!hours || !minutes || !seconds) return;
    
    let h = 12, m = 30, s = 45;
    setInterval(() => {
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 12; m = 30; s = 45; }
        
        hours.textContent = h.toString().padStart(2, '0');
        minutes.textContent = m.toString().padStart(2, '0');
        seconds.textContent = s.toString().padStart(2, '0');
    }, 1000);
}

// ========== 25. تأثير الكتابة ==========
class TypingAnimation {
    constructor(element, texts, speed = 100) {
        this.element = element;
        this.texts = texts;
        this.speed = speed;
        this.index = 0;
        this.text = '';
        this.isDeleting = false;
        this.type();
    }
    
    type() {
        const current = this.texts[this.index];
        this.text = this.isDeleting 
            ? current.substring(0, this.text.length - 1)
            : current.substring(0, this.text.length + 1);
            
        this.element.innerHTML = this.text + '<span class="typing-cursor">|</span>';
        
        let speed = this.speed;
        if (this.isDeleting) speed /= 2;
        
        if (!this.isDeleting && this.text === current) {
            speed = 2000;
            this.isDeleting = true;
        } else if (this.isDeleting && this.text === '') {
            this.isDeleting = false;
            this.index = (this.index + 1) % this.texts.length;
        }
        
        setTimeout(() => this.type(), speed);
    }
}

// ========== 26. التهيئة ==========
window.onload = async function() {
    await loadProductsFromTelegram();
    await loadMerchantsFromTelegram();
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
        if (toggle) toggle.innerHTML = isDarkMode ? '<i class="fas fa-moon"></i><span>ليلي</span>' : '<i class="fas fa-sun"></i><span>نهاري</span>';
    }

    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
    }, 1000);

    window.addEventListener('scroll', toggleQuickTopButton);
    updateCountdown();
    
    const typingElement = document.getElementById('typing-text');
    if (typingElement) {
        new TypingAnimation(typingElement, ['نكهة وجمال', 'تسوق آمن', 'جودة عالية', 'توصيل سريع']);
    }
    
    // التحقق المستمر من أوامر تلجرام
    setInterval(loadMerchantsFromTelegram, 10000);
};

// ========== إغلاق النوافذ ==========
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};
