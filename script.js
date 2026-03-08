// ========== ناردو برو - نظام متكامل مع تلجرام ==========
// ========== النسخة المعدلة بالكامل مع الصور والطلبات ==========

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

// ========== 4. جلب المنتجات من تليجرام ==========
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
                // جلب المنتجات من الصور مع الشرح
                if (update.channel_post && update.channel_post.photo) {
                    const post = update.channel_post;
                    const caption = post.caption || '';
                    
                    if (caption.includes('🟣') || caption.includes('منتج جديد')) {
                        console.log('📦 وجدنا منتج مع صورة:', caption);
                        
                        // الحصول على رابط الصورة
                        const photo = post.photo[post.photo.length - 1];
                        const fileId = photo.file_id;
                        
                        // جلب رابط الصورة
                        const fileResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`);
                        const fileData = await fileResponse.json();
                        
                        let imageUrl = "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال";
                        if (fileData.ok) {
                            imageUrl = `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`;
                        }
                        
                        const lines = caption.split('\n');
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
                            images: [imageUrl],
                            createdAt: new Date(post.date * 1000).toISOString()
                        });
                    }
                }
                
                // جلب المنتجات من النصوص العادية
                if (update.channel_post && update.channel_post.text && update.channel_post.text.includes('🟣')) {
                    const post = update.channel_post;
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
                }
            }
        }
        
        localStorage.setItem('nardoo_products', JSON.stringify(products));
        console.log(`✅ تم تحميل ${products.length} منتج من تلجرام`);
        return products;
        
    } catch (error) {
        console.error('❌ خطأ في جلب المنتجات:', error);
        const saved = localStorage.getItem('nardoo_products');
        return saved ? JSON.parse(saved) : [];
    }
}

// ========== 5. جلب التجار من تليجرام ==========
async function loadMerchantsFromTelegram() {
    try {
        console.log('🔄 جاري جلب طلبات التجار من تلجرام...');
        
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`
        );
        
        const data = await response.json();
        const merchants = [];
        
        if (data.ok && data.result) {
            const updates = [...data.result].reverse();
            
            for (const update of updates) {
                if (update.channel_post && update.channel_post.text && update.channel_post.text.includes('🔵')) {
                    const post = update.channel_post;
                    
                    const lines = post.text.split('\n');
                    let merchantData = {
                        id: post.message_id,
                        name: 'تاجر',
                        storeName: 'متجر',
                        email: '',
                        phone: '',
                        level: '1',
                        desc: '',
                        status: 'pending',
                        telegramId: post.from?.id || null,
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
                    
                    // دمج مع المستخدمين المحليين
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
                            createdAt: merchantData.createdAt
                        });
                    }
                }
            }
        }
        
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        console.log(`✅ تم تحميل ${merchants.length} طلب تاجر من تلجرام`);
        return merchants;
        
    } catch (error) {
        console.error('❌ خطأ في جلب التجار:', error);
        return [];
    }
}

// ========== 6. رفع الصور إلى تلجرام ==========
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
                const imageUrl = `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`;
                return imageUrl;
            }
        }
        return null;
    } catch (error) {
        console.error('❌ خطأ في رفع الصورة:', error);
        return null;
    }
}

// ========== 7. معالج رفع الصور المحسّن ==========
async function handleImageUpload(event) {
    const files = event.target.files;
    const preview = document.getElementById('imagePreview');
    const uploadStatus = document.getElementById('uploadStatus');
    const imagesData = [];

    preview.innerHTML = '';
    
    if (uploadStatus) {
        uploadStatus.innerHTML = '🔄 جاري رفع الصور إلى تلجرام...';
        uploadStatus.style.display = 'block';
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // عرض معاينة محلية
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML += `
                <div class="image-upload-item" data-index="${i}">
                    <img src="${e.target.result}" class="preview-image">
                    <div class="upload-progress">⏳ جاري الرفع...</div>
                </div>
            `;
        };
        reader.readAsDataURL(file);
        
        // رفع الصورة إلى تلجرام
        try {
            const imageUrl = await uploadImageToTelegram(file);
            
            if (imageUrl) {
                imagesData.push(imageUrl);
                
                // تحديث حالة الرفع
                const itemDiv = document.querySelector(`.image-upload-item[data-index="${i}"] .upload-progress`);
                if (itemDiv) {
                    itemDiv.innerHTML = '✅ تم الرفع';
                    itemDiv.style.background = 'rgba(76, 175, 80, 0.9)';
                }
            } else {
                // استخدام الصورة المحلية كاحتياطي
                const localImageUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });
                imagesData.push(localImageUrl);
                
                const itemDiv = document.querySelector(`.image-upload-item[data-index="${i}"] .upload-progress`);
                if (itemDiv) {
                    itemDiv.innerHTML = '⚠️ محلي';
                    itemDiv.style.background = 'rgba(255, 165, 0, 0.9)';
                }
            }
        } catch (error) {
            console.error('خطأ في رفع الصورة:', error);
            const itemDiv = document.querySelector(`.image-upload-item[data-index="${i}"] .upload-progress`);
            if (itemDiv) {
                itemDiv.innerHTML = '❌ فشل';
                itemDiv.style.background = 'rgba(244, 67, 54, 0.9)';
            }
        }
    }

    document.getElementById('productImagesData').value = JSON.stringify(imagesData);
    
    if (uploadStatus) {
        uploadStatus.innerHTML = `✅ تم رفع ${imagesData.length} صورة بنجاح`;
        setTimeout(() => {
            uploadStatus.style.display = 'none';
        }, 3000);
    }
}

// ========== 8. إضافة منتج إلى تليجرام مع الصور ==========
async function addProductToTelegram(product) {
    try {
        let message = `
🟣 *منتج جديد في المتجر*
━━━━━━━━━━━━━━━━━━━━━━
📦 *المنتج:* ${product.name}
💰 *السعر:* ${product.price} دج
🏷️ *القسم:* ${product.category}
📊 *الكمية:* ${product.stock}
👤 *التاجر:* ${product.merchantName}
🕐 *تاريخ الإضافة:* ${new Date().toLocaleString('ar-DZ')}
        `;

        // إذا كان هناك صور، أرسل أول صورة مع الرسالة
        if (product.images && product.images.length > 0 && !product.images[0].startsWith('data:')) {
            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendPhoto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM.channelId,
                    photo: product.images[0],
                    caption: message,
                    parse_mode: 'Markdown'
                })
            });
            
            const result = await response.json();
            
            // إرسال الصور الإضافية إن وجدت
            if (product.images.length > 1) {
                for (let i = 1; i < product.images.length; i++) {
                    if (!product.images[i].startsWith('data:')) {
                        await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendPhoto`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: TELEGRAM.channelId,
                                photo: product.images[i],
                                caption: `📸 صورة إضافية ${i+1} لمنتج: ${product.name}`,
                                parse_mode: 'Markdown'
                            })
                        });
                    }
                }
            }
            
            return result.ok;
        } else {
            // إرسال رسالة نصية فقط
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
        }
    } catch (error) {
        console.error('❌ خطأ في إضافة المنتج:', error);
        return false;
    }
}

// ========== 9. إرسال طلب انضمام تاجر ==========
async function sendMerchantRequestToTelegram(merchant) {
    const message = `
🔵 *طلب انضمام تاجر جديد*
━━━━━━━━━━━━━━━━━━━━━━
🏪 *المتجر:* ${merchant.storeName}
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

// ========== 10. إرسال طلب شراء محسّن ==========
async function sendOrderToTelegram(order) {
    try {
        // 1️⃣ إرسال للقناة (عام)
        const channelMessage = `
🟢 *طلب شراء جديد - عام*
━━━━━━━━━━━━━━━━━━━━━━
👤 *الزبون:* ${order.customerName}
📞 *الهاتف:* ${order.customerPhone}
📍 *العنوان:* ${order.customerAddress}
📦 *عدد المنتجات:* ${order.items.length}
💰 *الإجمالي:* ${order.total} دج
🕐 *الوقت:* ${new Date().toLocaleString('ar-DZ')}
🔔 *رقم الطلب:* #${order.orderId}
        `;

        const channelResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: channelMessage,
                parse_mode: 'Markdown'
            })
        });

        // 2️⃣ إرسال للمدير (خاص)
        const adminMessage = `
🟢 *طلب شراء جديد - للمدير*
━━━━━━━━━━━━━━━━━━━━━━
👤 *الزبون:* ${order.customerName}
📞 *الهاتف:* ${order.customerPhone}
📍 *العنوان:* ${order.customerAddress}
🔔 *رقم الطلب:* #${order.orderId}

📦 *تفاصيل المنتجات:*
${order.items.map((item, i) => 
    `  ${i+1}. *${item.name}*
     • الكمية: ${item.quantity}
     • السعر: ${item.price} دج
     • التاجر: ${item.merchantName || 'المتجر'}`
).join('\n\n')}

💰 *المجموع الفرعي:* ${order.subtotal} دج
🚚 *الشحن:* ${order.shipping} دج
💵 *الإجمالي:* ${order.total} دج

🔔 *حالة الطلب:* جديد - في انتظار التأكيد
        `;

        await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.adminId,
                text: adminMessage,
                parse_mode: 'Markdown'
            })
        });

        // 3️⃣ تجميع المنتجات حسب التاجر
        const merchantOrders = {};
        order.items.forEach(item => {
            const merchantName = item.merchantName || 'المتجر';
            if (!merchantOrders[merchantName]) {
                merchantOrders[merchantName] = [];
            }
            merchantOrders[merchantName].push(item);
        });

        // 4️⃣ إرسال لكل تاجر على حدة
        for (const [merchantName, items] of Object.entries(merchantOrders)) {
            const merchant = users.find(u => 
                u.storeName === merchantName || 
                u.name === merchantName
            );

            if (merchant?.telegramId) {
                const merchantMessage = `
🟢 *طلب شراء جديد - للتاجر ${merchantName}*
━━━━━━━━━━━━━━━━━━━━━━
👤 *الزبون:* ${order.customerName}
📞 *الهاتف:* ${order.customerPhone}
📍 *العنوان:* ${order.customerAddress}
🔔 *رقم الطلب:* #${order.orderId}

📦 *منتجاتك في هذا الطلب:*
${items.map((item, i) => 
    `  ${i+1}. *${item.name}*
     • الكمية: ${item.quantity}
     • السعر: ${item.price} دج`
).join('\n\n')}

💰 *إجمالي منتجاتك:* ${items.reduce((sum, item) => sum + (item.price * item.quantity), 0)} دج
🚚 *الشحن:* 800 دج (سيضاف عند التسليم)

📞 *تواصل مع الزبون:* ${order.customerPhone}
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

        const result = await channelResponse.json();
        console.log('✅ تم إرسال الطلب إلى تلجرام:', result);
        return result.ok;

    } catch (error) {
        console.error('❌ خطأ في إرسال الطلب إلى تلجرام:', error);
        return false;
    }
}

// ========== 11. الموافقة على تاجر ==========
async function approveMerchant(merchantId) {
    const merchant = users.find(u => u.id == merchantId);
    if (!merchant) return;

    merchant.role = 'merchant_approved';
    merchant.status = 'approved';
    localStorage.setItem('nardoo_users', JSON.stringify(users));

    // إرسال إشعار الموافقة
    const message = `
✅ *تمت الموافقة على تاجر*
━━━━━━━━━━━━━━━━━━━━━━
🏪 *المتجر:* ${merchant.storeName}
👤 *التاجر:* ${merchant.name}
🎉 *مبروك! يمكنك الآن إضافة منتجاتك*
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

    // إرسال رسالة خاصة للتاجر إذا كان لديه معرف تلجرام
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

    showAdvancedNotification(`تمت الموافقة على التاجر: ${merchant.name}`, 'success');
}

// ========== 12. رفض تاجر ==========
async function rejectMerchant(merchantId) {
    const merchant = users.find(u => u.id == merchantId);
    if (!merchant) return;

    merchant.role = 'customer';
    merchant.status = 'rejected';
    localStorage.setItem('nardoo_users', JSON.stringify(users));

    const message = `
❌ *تم رفض طلب تاجر*
━━━━━━━━━━━━━━━━━━━━━━
🏪 *المتجر:* ${merchant.storeName}
👤 *التاجر:* ${merchant.name}
😞 *نأسف، لم تتم الموافقة على طلبك*
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

    showAdvancedNotification(`تم رفض طلب التاجر: ${merchant.name}`, 'info');
}

// ========== 13. نظام إدارة الطلبات ==========
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

// ========== 14. نظام الواتساب ==========
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

// ========== 15. نظام التحليلات ==========
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

// ========== 16. إنشاء الكائنات ==========
const orderManager = new OrderManagementSystem();
const whatsappManager = new WhatsAppIntegration();
const analyticsManager = new AnalyticsSystem();

// ========== 17. دوال المساعدة والإشعارات ==========
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

// ========== 18. دوال التاريخ والوقت ==========
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

// ========== 19. دوال تقييم النجوم ==========
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

// ========== 20. دوال الفرز ==========
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

// ========== 21. تحميل المنتجات وعرضها ==========
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
                <h3 style="color: var(--gold); font-size: 28px; margin-bottom: 15px;">لا توجد منتجات</h3>
                <p style="color: var(--text-secondary); font-size: 18px; margin-bottom: 30px;">أول منتج يضاف سيظهر هنا</p>
                ${currentUser ? (currentUser.role === 'merchant_approved' || currentUser.role === 'admin' ? `
                    <button class="btn-gold" onclick="showAddProductModal()" style="font-size: 18px; padding: 15px 40px;">
                        <i class="fas fa-plus"></i> إضافة منتج جديد
                    </button>
                ` : '') : `
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
            merchantName: product.merchantName,
            merchantId: product.merchantId
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
                    <div class="cart-item-merchant" style="font-size: 12px; color: var(--gold);">${item.merchantName || 'المتجر'}</div>
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

// ========== 23. إتمام الشراء المحسّن ==========
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
        items: cart.map(item => ({
            ...item,
            merchantName: item.merchantName || 'المتجر'
        })),
        subtotal: subtotal,
        shipping: shipping,
        total: total,
        paymentMethod: 'الواتساب',
        orderId: `ORD${Date.now()}`
    };

    // 🟢 إرسال إلى تلجرام (محسّن)
    showAdvancedNotification('🔄 جاري إرسال الطلب إلى تلجرام...', 'info');
    
    const sent = await sendOrderToTelegram(order);
    
    if (sent) {
        showAdvancedNotification('✅ تم إرسال الطلب إلى تلجرام بنجاح', 'success');
    } else {
        showAdvancedNotification('⚠️ تم إرسال الطلب ولكن فشل إشعار تلجرام', 'warning');
    }

    // إرسال واتساب للتجار
    const merchantsPhones = {};
    cart.forEach(item => {
        const merchant = users.find(u => u.storeName === item.merchantName || u.name === item.merchantName);
        if (merchant?.phone) {
            if (!merchantsPhones[merchant.phone]) {
                merchantsPhones[merchant.phone] = [];
            }
            merchantsPhones[merchant.phone].push(item);
        }
    });

    Object.entries(merchantsPhones).forEach(([phone, items]) => {
        const merchantOrder = {
            ...order,
            items: items,
            total: items.reduce((s, i) => s + (i.price * i.quantity), 0) + shipping
        };
        whatsappManager.sendOrder(merchantOrder, phone);
    });

    // حفظ الطلب في النظام
    const savedOrder = orderManager.createOrder(order);
    
    // تحديث المخزون
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
    
    showAdvancedNotification(`✅ تم إرسال الطلب #${savedOrder.id} بنجاح`, 'success');
    analyticsManager.trackEvent('purchase', { total: total, orderId: savedOrder.id });
}

// ========== 24. دوال التمرير ==========
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

// ========== 25. عداد تنازلي ==========
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

// ========== 26. أشرطة التقدم ==========
function updateProgressBars() {
    setInterval(() => {
        document.querySelectorAll('.progress-fill, .marquee-progress-fill').forEach(fill => {
            fill.style.width = Math.floor(Math.random() * 50) + 50 + '%';
        });
    }, 5000);
}

// ========== 27. عرض تفاصيل المنتج ==========
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

// ========== 28. إدارة المستخدمين ==========
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

// ========== 29. تسجيل تاجر جديد ==========
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
        status: isMerchant ? 'pending' : 'active',
        createdAt: new Date().toISOString()
    };

    if (isMerchant) {
        newUser.merchantLevel = document.getElementById('merchantLevel').value;
        newUser.merchantDesc = document.getElementById('merchantDesc').value;
        newUser.storeName = document.getElementById('storeName').value || 'متجر ' + name;
        
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
    const btn = document.getElementById('myProductsBtn');
    if (btn) btn.classList.add('active');
    displayProducts();
}

function showMerchantPanel() {
    if (!currentUser || currentUser.role !== 'merchant_approved') return;
    
    const merchantProducts = products.filter(p => p.merchantName === currentUser.storeName || p.merchantName === currentUser.name);
    const totalSales = merchantProducts.reduce((sum, p) => sum + (p.price * (p.soldCount || 0)), 0);
    
    const panel = document.getElementById('merchantPanelContainer');
    panel.style.display = 'block';
    panel.innerHTML = `
        <div class="merchant-panel">
            <h3><i class="fas fa-store"></i> لوحة التاجر - ${currentUser.storeName || currentUser.name}</h3>
            <div class="stats" style="display: flex; gap: 20px; justify-content: center; margin: 20px 0;">
                <div style="text-align: center;">
                    <div style="font-size: 32px; font-weight: 800; color: var(--gold);">${merchantProducts.length}</div>
                    <div>إجمالي المنتجات</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 32px; font-weight: 800; color: var(--gold);">${merchantProducts.filter(p => p.stock > 0).length}</div>
                    <div>المنتجات المتاحة</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 32px; font-weight: 800; color: var(--gold);">${totalSales.toLocaleString()} دج</div>
                    <div>إجمالي المبيعات</div>
                </div>
            </div>
            <div style="display: flex; gap: 15px; margin-top: 20px; justify-content: center;">
                <button class="btn-gold" onclick="showAddProductModal()"><i class="fas fa-plus"></i> إضافة منتج جديد</button>
                <button class="btn-outline-gold" onclick="viewMyProducts()"><i class="fas fa-box"></i> عرض منتجاتي</button>
            </div>
        </div>
    `;
}

// ========== 30. إضافة المنتجات مع الصور ==========
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

// ========== 31. حفظ المنتج مع الصور ==========
async function saveProduct() {
    if (!currentUser) {
        showAdvancedNotification('يجب تسجيل الدخول أولاً', 'error');
        return;
    }

    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    
    const imagesData = document.getElementById('productImagesData').value;
    const images = imagesData ? JSON.parse(imagesData) : [];
    
    if (!name || !category || !price || !stock) {
        showAdvancedNotification('الرجاء ملء جميع الحقول', 'error');
        return;
    }

    showAdvancedNotification('🔄 جاري حفظ المنتج وإرساله إلى تلجرام...', 'info');

    const product = {
        name: name,
        price: price,
        category: category,
        stock: stock,
        merchantName: currentUser.storeName || currentUser.name,
        merchantId: currentUser.id,
        images: images.length > 0 ? images : ["https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال"],
        rating: 4.5,
        createdAt: new Date().toISOString()
    };

    // 🟣 إرسال المنتج مع الصور إلى تلجرام
    const sent = await addProductToTelegram(product);
    
    if (sent) {
        // إضافة المنتج محلياً
        const newProduct = {
            id: Date.now(),
            ...product
        };
        
        products.push(newProduct);
        localStorage.setItem('nardoo_products', JSON.stringify(products));
        
        showAdvancedNotification('✅ تم إضافة المنتج مع الصور بنجاح', 'success');
        closeModal('productModal');
        
        displayProducts();
        if (currentUser?.role === 'merchant_approved') {
            showMerchantPanel();
        }
    } else {
        showAdvancedNotification('❌ فشل إضافة المنتج إلى تلجرام', 'error');
    }
}

// ========== 32. لوحة التحكم ==========
function openDashboard() {
    if (!currentUser || currentUser.role !== 'admin') {
        showAdvancedNotification('غير مصرح', 'error');
        return;
    }

    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('dashboardSection').scrollIntoView({ behavior: 'smooth' });
}

function switchDashboardTab(tab) {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    const content = document.getElementById('dashboardContent');
    
    if (tab === 'overview') showDashboardOverview(content);
    else if (tab === 'orders') showDashboardOrders(content);
    else if (tab === 'products') showDashboardProducts(content);
    else if (tab === 'merchants') showDashboardMerchants(content);
}

function showDashboardOverview(container) {
    const orderStats = orderManager.getOrderStatistics();
    const analytics = analyticsManager.getVisitStatistics();

    container.innerHTML = `
        <h3 style="margin-bottom: 30px; color: var(--gold);">نظرة عامة على المتجر</h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px;">
            <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                <i class="fas fa-shopping-cart" style="font-size: 40px; color: var(--gold); margin-bottom: 10px;"></i>
                <div style="font-size: 32px; font-weight: 800;">${orderStats.totalOrders}</div>
                <div style="color: var(--text-secondary);">إجمالي الطلبات</div>
            </div>
            <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                <i class="fas fa-coins" style="font-size: 40px; color: var(--gold); margin-bottom: 10px;"></i>
                <div style="font-size: 32px; font-weight: 800;">${orderStats.totalRevenue.toLocaleString()}</div>
                <div style="color: var(--text-secondary);">الإيرادات (دج)</div>
            </div>
            <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                <i class="fas fa-eye" style="font-size: 40px; color: var(--gold); margin-bottom: 10px;"></i>
                <div style="font-size: 32px; font-weight: 800;">${analytics.totalPageViews}</div>
                <div style="color: var(--text-secondary);">مشاهدات الصفحات</div>
            </div>
            <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                <i class="fas fa-percent" style="font-size: 40px; color: var(--gold); margin-bottom: 10px;"></i>
                <div style="font-size: 32px; font-weight: 800;">${analyticsManager.getConversionRate()}%</div>
                <div style="color: var(--text-secondary);">معدل التحويل</div>
            </div>
        </div>
        
        <h4 style="margin: 30px 0 20px; color: var(--gold);">الطلبات الأخيرة</h4>
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: var(--gold); color: var(--bg-primary);">
                        <th style="padding: 12px;">رقم الطلب</th>
                        <th style="padding: 12px;">العميل</th>
                        <th style="padding: 12px;">المجموع</th>
                        <th style="padding: 12px;">الحالة</th>
                        <th style="padding: 12px;">التاريخ</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderStats.recentOrders.map(order => `
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 12px;">${order.id}</td>
                            <td style="padding: 12px;">${order.customerName}</td>
                            <td style="padding: 12px; color: var(--gold); font-weight: 700;">${order.total.toLocaleString()} دج</td>
                            <td style="padding: 12px;">
                                <span style="background: ${order.status === 'delivered' ? '#4ade80' : order.status === 'cancelled' ? '#f87171' : '#fbbf24'}; color: #000; padding: 5px 10px; border-radius: 20px; font-size: 12px;">
                                    ${orderManager.getStatusMessage(order.status)}
                                </span>
                            </td>
                            <td style="padding: 12px;">${new Date(order.createdAt).toLocaleDateString('ar-DZ')}</td>
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
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: var(--gold); color: var(--bg-primary);">
                        <th style="padding: 12px;">رقم الطلب</th>
                        <th style="padding: 12px;">العميل</th>
                        <th style="padding: 12px;">المجموع</th>
                        <th style="padding: 12px;">الحالة</th>
                        <th style="padding: 12px;">التاريخ</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 12px;">${order.id}</td>
                            <td style="padding: 12px;">${order.customerName}</td>
                            <td style="padding: 12px;">${order.total} دج</td>
                            <td style="padding: 12px;">
                                <select onchange="orderManager.updateOrderStatus('${order.id}', this.value)" style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--gold); padding: 5px; border-radius: 5px;">
                                    ${orderManager.orderStatuses.map(status => `
                                        <option value="${status}" ${order.status === status ? 'selected' : ''}>${orderManager.getStatusMessage(status)}</option>
                                    `).join('')}
                                </select>
                            </td>
                            <td style="padding: 12px;">${new Date(order.createdAt).toLocaleDateString('ar-DZ')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
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
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: var(--gold); color: var(--bg-primary);">
                        <th style="padding: 12px;">المنتج</th>
                        <th style="padding: 12px;">السعر</th>
                        <th style="padding: 12px;">الكمية</th>
                        <th style="padding: 12px;">التاجر</th>
                        <th style="padding: 12px;">صورة</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 12px;">${p.name}</td>
                            <td style="padding: 12px;">${p.price} دج</td>
                            <td style="padding: 12px;">${p.stock}</td>
                            <td style="padding: 12px;">${p.merchantName}</td>
                            <td style="padding: 12px;">
                                <img src="${p.images?.[0] || 'https://via.placeholder.com/50'}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function showDashboardMerchants(container) {
    const pendingMerchants = users.filter(u => u.role === 'merchant_pending' || u.status === 'pending');
    const approvedMerchants = users.filter(u => u.role === 'merchant_approved' && u.status === 'approved');
    
    let pendingHTML = '';
    if (pendingMerchants.length === 0) {
        pendingHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">لا يوجد طلبات تجار في الانتظار</p>';
    } else {
        pendingHTML = pendingMerchants.map(m => `
            <div style="background: var(--glass); border: 1px solid var(--gold); border-radius: 10px; padding: 15px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <span style="background: #fbbf24; color: #000; padding: 5px 10px; border-radius: 20px; font-size: 12px;">⏳ في انتظار الموافقة</span>
                            <span style="background: var(--gold); color: var(--bg-primary); padding: 5px 10px; border-radius: 20px; font-size: 12px;">مستوى ${m.merchantLevel || '1'}</span>
                        </div>
                        
                        <p style="font-size: 18px; font-weight: 700; margin-bottom: 5px; color: var(--gold);">
                            <i class="fas fa-store"></i> ${m.storeName || 'متجر ' + m.name}
                        </p>
                        
                        <p style="margin-bottom: 3px;">
                            <i class="fas fa-user" style="color: var(--gold); width: 20px;"></i> ${m.name}
                        </p>
                        
                        <p style="margin-bottom: 3px;">
                            <i class="fas fa-envelope" style="color: var(--gold); width: 20px;"></i> ${m.email}
                        </p>
                        
                        <p style="margin-bottom: 3px;">
                            <i class="fas fa-phone" style="color: var(--gold); width: 20px;"></i> ${m.phone || 'غير متوفر'}
                        </p>
                        
                        ${m.merchantDesc ? `
                        <p style="margin-top: 5px; font-size: 13px; color: var(--text-secondary); background: var(--glass); padding: 8px; border-radius: 10px;">
                            <i class="fas fa-info-circle" style="color: var(--gold);"></i> ${m.merchantDesc}
                        </p>
                        ` : ''}
                        
                        <p style="margin-top: 5px; font-size: 12px; color: var(--text-secondary);">
                            <i class="far fa-calendar-alt" style="color: var(--gold);"></i> تاريخ التسجيل: ${new Date(m.createdAt).toLocaleDateString('ar-DZ')}
                        </p>
                        
                        ${m.telegramId ? `
                        <p style="margin-top: 5px; font-size: 12px; color: #4ade80;">
                            <i class="fab fa-telegram"></i> معرف تلجرام: موجود
                        </p>
                        ` : ''}
                    </div>
                    
                    <div style="display: flex; gap: 10px; flex-direction: column;">
                        <button class="btn-gold" onclick="approveMerchant(${m.id})" style="padding: 12px 25px;">
                            <i class="fas fa-check"></i> موافقة
                        </button>
                        <button class="btn-outline-gold" onclick="rejectMerchant(${m.id})" style="padding: 12px 25px;">
                            <i class="fas fa-times"></i> رفض
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    let approvedHTML = '';
    if (approvedMerchants.length === 0) {
        approvedHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">لا يوجد تجار معتمدين</p>';
    } else {
        approvedHTML = `
            <div style="overflow-x: auto; margin-top: 20px;">
                <table style="width: 100%; border-collapse: collapse; background: var(--glass); border-radius: 15px; overflow: hidden;">
                    <thead>
                        <tr style="background: var(--gold); color: var(--bg-primary);">
                            <th style="padding: 15px; text-align: center;">#</th>
                            <th style="padding: 15px; text-align: right;">المتجر</th>
                            <th style="padding: 15px; text-align: right;">التاجر</th>
                            <th style="padding: 15px; text-align: center;">المستوى</th>
                            <th style="padding: 15px; text-align: center;">المنتجات</th>
                            <th style="padding: 15px; text-align: center;">البريد</th>
                            <th style="padding: 15px; text-align: center;">الهاتف</th>
                            <th style="padding: 15px; text-align: center;">تلجرام</th>
                            <th style="padding: 15px; text-align: center;">تاريخ التسجيل</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${approvedMerchants.map((m, index) => {
                            const merchantProducts = products.filter(p => 
                                p.merchantName === m.storeName || 
                                p.merchantName === m.name || 
                                p.merchantId == m.id
                            );
                            
                            return `
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <td style="padding: 15px; text-align: center; font-weight: 700;">${index + 1}</td>
                                    <td style="padding: 15px; font-weight: 700;">
                                        <i class="fas fa-store" style="color: var(--gold); margin-left: 5px;"></i>
                                        ${m.storeName || 'متجر ' + m.name}
                                    </td>
                                    <td style="padding: 15px;">${m.name}</td>
                                    <td style="padding: 15px; text-align: center;">
                                        <span style="background: var(--gold); color: var(--bg-primary); padding: 5px 15px; border-radius: 20px; font-weight: 700;">
                                            المستوى ${m.merchantLevel || '1'}
                                        </span>
                                    </td>
                                    <td style="padding: 15px; text-align: center; color: var(--gold); font-weight: 700; font-size: 18px;">
                                        ${merchantProducts.length}
                                    </td>
                                    <td style="padding: 15px; text-align: center; font-size: 13px;">${m.email}</td>
                                    <td style="padding: 15px; text-align: center;">${m.phone || '—'}</td>
                                    <td style="padding: 15px; text-align: center;">
                                        ${m.telegramId ? '✅' : '❌'}
                                    </td>
                                    <td style="padding: 15px; text-align: center; font-size: 12px;">${new Date(m.createdAt).toLocaleDateString('ar-DZ')}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    container.innerHTML = `
        <h3 style="margin-bottom: 20px; color: var(--gold);">
            <i class="fas fa-clock"></i> طلبات التجار (${pendingMerchants.length})
        </h3>
        ${pendingHTML}

        <h3 style="margin: 40px 0 20px; color: var(--gold);">
            <i class="fas fa-check-circle"></i> التجار المعتمدون (${approvedMerchants.length})
        </h3>
        ${approvedHTML}
    `;
}

// ========== 33. تأثيرات الكتابة ==========
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

// ========== 34. الاستماع لأوامر تلجرام ==========
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
                }
            }
        }
    } catch (error) {
        console.error('خطأ في التحقق من أوامر تلجرام:', error);
    }
}, 30000);

// ========== 35. التهيئة (onload) ==========
window.onload = async function() {
    await loadProducts();
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

    analyticsManager.trackPageView('home');
    
    window.addEventListener('scroll', toggleQuickTopButton);
    updateCountdown();
    updateProgressBars();
    
    const typingElement = document.getElementById('typing-text');
    if (typingElement) {
        new TypingAnimation(typingElement, ['نكهة وجمال', 'تسوق آمن', 'جودة عالية', 'توصيل سريع'], 100, 2000).start();
    }
    
    console.log('✅ تم تهيئة النظام - النسخة المعدلة بالكامل');
};

// ========== إغلاق النوافذ عند النقر خارجها ==========
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};
