// ========== ناردو برو - نظام متكامل مع تلجرام ==========
// ========== النسخة المصححة - الجداول والصور + الموافقة على التجار ==========

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
        if (!container) {
            console.warn('❌ عنصر toastContainer غير موجود');
            return null;
        }
        
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
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, duration);
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

// ========== 12. رفع الصور إلى تلجرام ==========
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
            // الحصول على أكبر صورة
            const photo = data.result.photo[data.result.photo.length - 1];
            const fileId = photo.file_id;
            
            // الحصول على رابط الصورة
            const fileResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`);
            const fileData = await fileResponse.json();
            
            if (fileData.ok) {
                const imageUrl = `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`;
                console.log('✅ تم رفع الصورة بنجاح:', imageUrl);
                return imageUrl;
            }
        }
        
        console.error('❌ فشل رفع الصورة:', data);
        return null;
        
    } catch (error) {
        console.error('❌ خطأ في رفع الصورة:', error);
        return null;
    }
}

// ========== 13. معالج رفع الصور ==========
async function handleImageUpload(event) {
    const files = event.target.files;
    const preview = document.getElementById('imagePreview');
    const uploadStatus = document.getElementById('uploadStatus');
    const imagesData = [];

    if (!preview) {
        console.error('❌ عنصر imagePreview غير موجود');
        return;
    }

    preview.innerHTML = '';
    
    if (uploadStatus) {
        uploadStatus.innerHTML = '🔄 جاري رفع الصور إلى تلجرام...';
        uploadStatus.style.display = 'block';
        uploadStatus.className = 'upload-status info';
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // عرض معاينة محلية
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML += `
                <div class="image-upload-item" data-index="${i}" style="display: inline-block; margin: 5px; position: relative;">
                    <img src="${e.target.result}" class="preview-image" style="width: 100px; height: 100px; object-fit: cover; border: 2px solid var(--gold); border-radius: 10px;">
                    <div class="upload-progress" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; text-align: center; font-size: 12px; padding: 2px; border-radius: 0 0 10px 10px;">⏳ جاري الرفع...</div>
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
                const progressDiv = document.querySelector(`.image-upload-item[data-index="${i}"] .upload-progress`);
                if (progressDiv) {
                    progressDiv.innerHTML = '✅ تم الرفع';
                    progressDiv.style.background = '#4ade80';
                    progressDiv.style.color = '#000';
                }
                
                console.log(`✅ تم رفع الصورة ${i+1}: ${imageUrl}`);
            } else {
                // استخدام الصورة المحلية كاحتياطي
                const localImageUrl = await new Promise((resolve) => {
                    const fileReader = new FileReader();
                    fileReader.onload = (e) => resolve(e.target.result);
                    fileReader.readAsDataURL(file);
                });
                imagesData.push(localImageUrl);
                
                const progressDiv = document.querySelector(`.image-upload-item[data-index="${i}"] .upload-progress`);
                if (progressDiv) {
                    progressDiv.innerHTML = '⚠️ محلي';
                    progressDiv.style.background = '#fbbf24';
                    progressDiv.style.color = '#000';
                }
                
                console.warn(`⚠️ تم حفظ الصورة ${i+1} محلياً`);
            }
        } catch (error) {
            console.error('❌ خطأ في رفع الصورة:', error);
            const progressDiv = document.querySelector(`.image-upload-item[data-index="${i}"] .upload-progress`);
            if (progressDiv) {
                progressDiv.innerHTML = '❌ فشل';
                progressDiv.style.background = '#f87171';
                progressDiv.style.color = '#000';
            }
        }
    }

    // حفظ روابط الصور
    const imagesInput = document.getElementById('productImagesData');
    if (imagesInput) {
        imagesInput.value = JSON.stringify(imagesData);
        console.log('📸 روابط الصور المحفوظة:', imagesData);
    }
    
    if (uploadStatus) {
        if (imagesData.length > 0) {
            uploadStatus.innerHTML = `✅ تم رفع ${imagesData.length} صورة بنجاح`;
            uploadStatus.className = 'upload-status success';
        } else {
            uploadStatus.innerHTML = '❌ فشل رفع جميع الصور';
            uploadStatus.className = 'upload-status error';
        }
        
        setTimeout(() => {
            uploadStatus.style.display = 'none';
        }, 3000);
    }
}

// ========== 14. إضافة منتج إلى تليجرام مع جدول منسق ==========
async function addProductToTelegram(product) {
    try {
        ToastSystem.show('🔄 جاري الإرسال إلى تلجرام...', 'loading', 0);
        
        const categoryIcon = {
            'promo': '🔥',
            'spices': '🧂',
            'cosmetic': '💄',
            'other': '📦'
        }[product.category] || '📦';
        
        // إخفاء معرف التاجر في علامات سبويلر
        const merchantTag = `||👤 معرف التاجر: ${product.merchantId}||`;
        
        // تصميم الجدول بشكل صحيح
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

${merchantTag}

⏰ *تاريخ الإضافة:* ${new Date().toLocaleDateString('ar-DZ', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
})}

🔗 *للطلب:* واتساب 213562243648
🟣 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
        `;

        // التحقق من وجود صورة حقيقية
        if (product.images && product.images.length > 0) {
            const firstImage = product.images[0];
            
            // إذا كانت الصورة رابط حقيقي (وليس Base64)
            if (!firstImage.startsWith('data:')) {
                // إرسال الصورة مع التعليق
                const photoResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendPhoto`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: TELEGRAM.channelId,
                        photo: firstImage,
                        caption: tableMessage,
                        parse_mode: 'Markdown'
                    })
                });
                
                const photoResult = await photoResponse.json();
                
                if (photoResult.ok) {
                    ToastSystem.hideAll();
                    ToastSystem.show('✅ تم إرسال المنتج مع الصورة', 'success');
                    
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
                                        caption: `📸 صورة إضافية ${i} لمنتج: ${product.name}`,
                                        parse_mode: 'Markdown'
                                    })
                                });
                            }
                        }
                    }
                    
                    return true;
                }
            }
        }
        
        // إذا لم توجد صورة أو فشل إرسالها، أرسل النص فقط
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
            ToastSystem.show('✅ تم إرسال المنتج (بدون صورة)', 'warning');
            return true;
        }
        
        ToastSystem.hideAll();
        ToastSystem.show('❌ فشل إرسال المنتج', 'error');
        return false;
        
    } catch (error) {
        console.error('❌ خطأ:', error);
        ToastSystem.hideAll();
        ToastSystem.show('❌ خطأ في الاتصال', 'error');
        return false;
    }
}

// ========== 15. عرض المنتجات في المتجر ==========
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px;">
                <i class="fas fa-box-open" style="font-size: 80px; color: var(--gold); margin-bottom: 20px;"></i>
                <h3 style="color: var(--gold); font-size: 28px;">لا توجد منتجات</h3>
                <p style="color: var(--text-secondary);">أول منتج يضاف في تلجرام سيظهر هنا</p>
                ${currentUser?.role === 'merchant_approved' || currentUser?.role === 'admin' ? `
                    <button class="btn-gold" onclick="showAddProductModal()" style="margin-top: 20px;">
                        <i class="fas fa-plus"></i> إضافة منتج جديد
                    </button>
                ` : ''}
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

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px;">
                <i class="fas fa-search" style="font-size: 80px; color: var(--gold); margin-bottom: 20px;"></i>
                <h3 style="color: var(--gold); font-size: 28px;">لا توجد نتائج</h3>
                <p style="color: var(--text-secondary);">لا توجد منتجات تطابق بحثك</p>
            </div>
        `;
        return;
    }

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
                    ${product.telegramPhoto ? '<span class="telegram-badge"><i class="fab fa-telegram"></i> تلجرام</span>' : ''}
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

// ========== 16. عرض تفاصيل المنتج ==========
function viewProductDetails(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');

    if (!modal || !content) {
        console.error('❌ عناصر modal غير موجودة');
        return;
    }

    const images = product.images?.map(img => `
        <img src="${img}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 20px; margin-bottom: 10px;" onerror="this.src='https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال'">
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

// ========== 17. إرسال طلب شراء مع جدول السلة ==========
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
    if (event && event.target) event.target.classList.add('active');
    displayProducts();
}

function searchProducts() {
    searchTerm = document.getElementById('searchInput').value;
    displayProducts();
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
    
    analyticsManager.trackEvent('addToCart', { productId });
}

function toggleCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    if (cartSidebar) cartSidebar.classList.toggle('open');
    updateCartDisplay();
}

function updateCartDisplay() {
    const itemsDiv = document.getElementById('cartItems');
    const totalSpan = document.getElementById('cartTotal');

    if (!itemsDiv || !totalSpan) return;

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
                <div class="cart-item-image"><i class="fas fa-box"></i></div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${item.price} دج</div>
                    <div class="cart-item-merchant">${item.merchantName || 'المتجر'}</div>
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

    totalSpan.textContent = `${total} دج`;
}

function updateCartItem(productId, newQuantity) {
    const item = cart.find(i => i.productId == productId);
    const product = products.find(p => p.id == productId);

    if (!item || !product) return;

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
        items: cart.map(item => ({...item})),
        subtotal,
        shipping,
        total,
        orderId: `ORD${Date.now()}`
    };

    ToastSystem.show('🔄 جاري إرسال الطلب...', 'loading', 0);
    
    const sent = await sendOrderToTelegram(order);

    // واتساب للتجار
    const merchantPhones = {};
    cart.forEach(item => {
        const merchant = users.find(u => u.storeName === item.merchantName || u.name === item.merchantName);
        if (merchant?.phone) {
            if (!merchantPhones[merchant.phone]) merchantPhones[merchant.phone] = [];
            merchantPhones[merchant.phone].push(item);
        }
    });

    Object.entries(merchantPhones).forEach(([phone, items]) => {
        const msg = `طلب جديد:\n${items.map(i => `${i.name} - ${i.quantity} قطعة`).join('\n')}`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    });

    // واتساب للمتجر
    const storeMsg = `طلب جديد من ${currentUser.name}:\n${cart.map(i => `${i.name} - ${i.quantity} قطعة`).join('\n')}\nالإجمالي: ${total} دج`;
    window.open(`https://wa.me/${whatsappManager.storePhone}?text=${encodeURIComponent(storeMsg)}`, '_blank');

    // حفظ الطلب
    const savedOrder = orderManager.createOrder(order);
    
    // تحديث المخزون
    cart.forEach(item => {
        const product = products.find(p => p.id == item.productId);
        if (product) product.stock -= item.quantity;
    });

    cart = [];
    saveCart();
    updateCartCounter();
    toggleCart();
    
    ToastSystem.hideAll();
    ToastSystem.show(sent ? '✅ تم إرسال الطلب' : '⚠️ تم الطلب محلياً', sent ? 'success' : 'warning');
    
    analyticsManager.trackEvent('purchase', { total, orderId: savedOrder.id });
}

// ========== 21. نظام إدارة الطلبات ==========
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
            customerId: currentUser?.id || null,
            customerName: orderData.customerName,
            customerPhone: orderData.customerPhone,
            customerAddress: orderData.customerAddress,
            items: orderData.items || [],
            subtotal: orderData.subtotal,
            shipping: orderData.shipping,
            total: orderData.total,
            status: 'pending',
            createdAt: new Date().toISOString(),
            timeline: [{
                status: 'pending',
                timestamp: new Date().toISOString(),
                message: 'تم إنشاء الطلب'
            }]
        };

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
            'confirmed': 'تم التأكيد',
            'processing': 'جاري التجهيز',
            'shipped': 'تم الشحن',
            'delivered': 'تم التسليم',
            'cancelled': 'ملغي'
        };
        return messages[status] || status;
    }

    getOrderStatistics() {
        const stats = {
            totalOrders: this.orders.length,
            totalRevenue: 0,
            ordersByStatus: {},
            recentOrders: []
        };

        this.orderStatuses.forEach(s => stats.ordersByStatus[s] = 0);

        this.orders.forEach(order => {
            stats.totalRevenue += order.total;
            stats.ordersByStatus[order.status]++;
        });

        stats.recentOrders = [...this.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

        return stats;
    }
}

// ========== 22. نظام الواتساب ==========
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
        const { items = [], customerName, customerPhone, customerAddress, orderId } = orderData;

        let message = '🛍️ *طلب جديد*\n\n';
        message += `👤 *العميل:* ${customerName}\n`;
        message += `📞 *الهاتف:* ${customerPhone}\n`;
        message += `📍 *العنوان:* ${customerAddress}\n\n`;
        message += '📦 *المنتجات:*\n';

        items.forEach((item, i) => {
            message += `${i+1}. ${item.name} - ${item.quantity} × ${item.price} دج = ${item.price * item.quantity} دج\n`;
        });

        const subtotal = items.reduce((s, i) => s + (i.price * i.quantity), 0);
        message += `\n💰 *المجموع:* ${subtotal} دج`;
        message += `\n🚚 *الشحن:* 800 دج`;
        message += `\n💵 *الإجمالي:* ${subtotal + 800} دج`;
        if (orderId) message += `\n🔔 *رقم الطلب:* #${orderId}`;

        return message;
    }

    sendOrder(orderData, recipientPhone = null) {
        const message = this.formatOrderMessage(orderData);
        const phone = recipientPhone || this.storePhone;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');

        const order = {
            id: `WH${Date.now()}`,
            ...orderData,
            timestamp: new Date().toISOString()
        };
        this.orderHistory.push(order);
        this.saveOrderHistory();

        return order.id;
    }
}

// ========== 23. نظام التحليلات ==========
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
            id: `EVT${Date.now()}`,
            type: eventType,
            data: eventData,
            timestamp: new Date().toISOString()
        };
        this.events.push(event);
        this.saveEvents();
    }

    trackPageView(pageName) {
        this.pageViews.push({
            id: `PV${Date.now()}`,
            pageName,
            timestamp: new Date().toISOString()
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

// ========== 24. إنشاء الكائنات ==========
const orderManager = new OrderManagementSystem();
const whatsappManager = new WhatsAppIntegration();
const analyticsManager = new AnalyticsSystem();

// ========== 25. إدارة المستخدمين ==========
function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm && registerForm) {
        loginForm.style.display = tab === 'login' ? 'block' : 'none';
        registerForm.style.display = tab === 'register' ? 'block' : 'none';
    }
}

function toggleMerchantFields() {
    const isMerchant = document.getElementById('isMerchant')?.checked || false;
    const merchantFields = document.getElementById('merchantFields');
    if (merchantFields) {
        merchantFields.style.display = isMerchant ? 'block' : 'none';
    }
}

function handleLogin() {
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;

    if (!email || !password) {
        ToastSystem.show('أدخل البريد وكلمة المرور', 'warning');
        return;
    }

    const user = users.find(u => (u.email === email || u.name === email) && u.password === password);

    if (user) {
        currentUser = user;
        localStorage.setItem('current_user', JSON.stringify(user));
        closeModal('loginModal');
        updateUIBasedOnRole();
        ToastSystem.show(`مرحباً ${user.name}`, 'success');
        analyticsManager.trackEvent('login', { userId: user.id });
    } else {
        ToastSystem.show('بيانات غير صحيحة', 'error');
    }
}

function handleRegister() {
    const name = document.getElementById('regName')?.value;
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const phone = document.getElementById('regPhone')?.value || '';
    const isMerchant = document.getElementById('isMerchant')?.checked || false;

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
        newUser.merchantLevel = document.getElementById('merchantLevel')?.value || '1';
        newUser.merchantDesc = document.getElementById('merchantDesc')?.value || '';
        newUser.storeName = document.getElementById('storeName')?.value || `متجر ${name}`;
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
    
    const merchantPanel = document.getElementById('merchantPanelContainer');
    if (merchantPanel) merchantPanel.style.display = 'none';
    
    const myProductsBtn = document.getElementById('myProductsBtn');
    if (myProductsBtn) myProductsBtn.remove();

    const userBtn = document.getElementById('userBtn');
    const dashboardBtn = document.getElementById('dashboardBtn');

    if (currentUser.role === 'admin') {
        if (dashboardBtn) dashboardBtn.style.display = 'flex';
        if (userBtn) userBtn.innerHTML = '<i class="fas fa-crown"></i>';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
        ToastSystem.show('مرحباً أيها المدير', 'success');
    } else if (currentUser.role === 'merchant_approved') {
        if (dashboardBtn) dashboardBtn.style.display = 'none';
        if (userBtn) userBtn.innerHTML = '<i class="fas fa-store"></i>';
        addMerchantMenuButton();
        showMerchantPanel();
        ToastSystem.show('مرحباً أيها التاجر', 'info');
    } else {
        if (dashboardBtn) dashboardBtn.style.display = 'none';
        if (userBtn) userBtn.innerHTML = '<i class="fas fa-user"></i>';
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
    const btn = document.getElementById('myProductsBtn');
    if (btn) btn.classList.add('active');
    displayProducts();
}

function showMerchantPanel() {
    if (!currentUser || currentUser.role !== 'merchant_approved') return;
    
    const merchantProducts = products.filter(p => p.merchantName === currentUser.storeName || p.merchantName === currentUser.name || p.merchantId == currentUser.id);
    const totalSales = merchantProducts.reduce((sum, p) => sum + (p.price * (p.soldCount || 0)), 0);
    
    const panel = document.getElementById('merchantPanelContainer');
    if (!panel) return;
    
    panel.style.display = 'block';
    panel.innerHTML = `
        <div class="merchant-panel">
            <h3><i class="fas fa-store"></i> ${currentUser.storeName || currentUser.name}</h3>
            <div class="stats">
                <div class="stat-item"><div class="number">${merchantProducts.length}</div><div>منتجاتك</div></div>
                <div class="stat-item"><div class="number">${merchantProducts.filter(p => p.stock > 0).length}</div><div>متاح</div></div>
                <div class="stat-item"><div class="number">${totalSales.toLocaleString()} دج</div><div>مبيعات</div></div>
            </div>
            <div style="display: flex; gap: 15px; margin-top: 20px; justify-content: center;">
                <button class="btn-gold" onclick="showAddProductModal()"><i class="fas fa-plus"></i> إضافة منتج</button>
                <button class="btn-outline-gold" onclick="viewMyProducts()"><i class="fas fa-box"></i> منتجاتي</button>
            </div>
        </div>
    `;
}

// ========== 26. إضافة منتج ==========
function showAddProductModal() {
    if (!currentUser) {
        ToastSystem.show('سجل دخول أولاً', 'warning');
        openLoginModal();
        return;
    }

    if (currentUser.role !== 'merchant_approved' && currentUser.role !== 'admin') {
        ToastSystem.show('غير مصرح', 'error');
        return;
    }

    const nameInput = document.getElementById('productName');
    const categorySelect = document.getElementById('productCategory');
    const priceInput = document.getElementById('productPrice');
    const stockInput = document.getElementById('productStock');
    const preview = document.getElementById('imagePreview');
    const imagesData = document.getElementById('productImagesData');
    const modal = document.getElementById('productModal');

    if (nameInput) nameInput.value = '';
    if (categorySelect) categorySelect.value = '';
    if (priceInput) priceInput.value = '';
    if (stockInput) stockInput.value = '';
    if (preview) preview.innerHTML = '';
    if (imagesData) imagesData.value = '';
    if (modal) modal.style.display = 'flex';
}

async function saveProduct() {
    if (!currentUser) return;

    const name = document.getElementById('productName')?.value;
    const category = document.getElementById('productCategory')?.value;
    const price = parseInt(document.getElementById('productPrice')?.value);
    const stock = parseInt(document.getElementById('productStock')?.value);
    const imagesData = document.getElementById('productImagesData')?.value;
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
        createdAt: new Date().toISOString(),
        soldCount: 0
    };

    // حفظ محلياً
    const existingProducts = JSON.parse(localStorage.getItem('nardoo_products') || '[]');
    existingProducts.push(product);
    localStorage.setItem('nardoo_products', JSON.stringify(existingProducts));
    products = existingProducts;

    // إرسال لتلجرام
    ToastSystem.show('🔄 جاري الإرسال...', 'loading', 0);
    const sent = await addProductToTelegram(product);
    
    ToastSystem.hideAll();
    if (sent) {
        ToastSystem.show('✅ تم إضافة المنتج ونشره', 'success');
    } else {
        ToastSystem.show('⚠️ تم الحفظ محلياً فقط', 'warning');
    }

    closeModal('productModal');
    displayProducts();
    
    if (currentUser.role === 'merchant_approved') {
        showMerchantPanel();
    }
}

// ========== 27. لوحة التحكم ==========
function openDashboard() {
    if (!currentUser || currentUser.role !== 'admin') {
        ToastSystem.show('غير مصرح', 'error');
        return;
    }

    const dashboard = document.getElementById('dashboardSection');
    if (dashboard) {
        dashboard.style.display = 'block';
        dashboard.scrollIntoView({ behavior: 'smooth' });
    }
}

function switchDashboardTab(tab) {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');

    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    if (tab === 'overview') showDashboardOverview(content);
    else if (tab === 'orders') showDashboardOrders(content);
    else if (tab === 'products') showDashboardProducts(content);
    else if (tab === 'merchants') showDashboardMerchants(content);
}

function showDashboardOverview(container) {
    const orderStats = orderManager.getOrderStatistics();
    const analytics = analyticsManager.getVisitStatistics();

    container.innerHTML = `
        <h3 style="margin-bottom: 30px; color: var(--gold);">نظرة عامة</h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px;">
            <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                <i class="fas fa-shopping-cart" style="font-size: 40px; color: var(--gold);"></i>
                <div style="font-size: 32px;">${orderStats.totalOrders}</div>
                <div>إجمالي الطلبات</div>
            </div>
            <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                <i class="fas fa-coins" style="font-size: 40px; color: var(--gold);"></i>
                <div style="font-size: 32px;">${orderStats.totalRevenue.toLocaleString()} دج</div>
                <div>الإيرادات</div>
            </div>
            <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                <i class="fas fa-eye" style="font-size: 40px; color: var(--gold);"></i>
                <div style="font-size: 32px;">${analytics.totalPageViews}</div>
                <div>مشاهدات</div>
            </div>
            <div style="background: var(--glass); padding: 20px; border-radius: 15px; text-align: center;">
                <i class="fas fa-percent" style="font-size: 40px; color: var(--gold);"></i>
                <div style="font-size: 32px;">${analyticsManager.getConversionRate()}%</div>
                <div>تحويل</div>
            </div>
        </div>
        
        <h4 style="margin: 30px 0 20px;">آخر الطلبات</h4>
        <table>
            <thead><tr><th>#</th><th>العميل</th><th>المجموع</th><th>الحالة</th><th>التاريخ</th></tr></thead>
            <tbody>
                ${orderStats.recentOrders.map(order => `
                    <tr>
                        <td>${order.id}</td>
                        <td>${order.customerName}</td>
                        <td>${order.total} دج</td>
                        <td><span class="status-badge status-${order.status}">${orderManager.getStatusMessage(order.status)}</span></td>
                        <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function showDashboardOrders(container) {
    const orders = orderManager.orders;
    container.innerHTML = `
        <h3 style="margin-bottom: 20px;">جميع الطلبات</h3>
        <table>
            <thead><tr><th>رقم</th><th>العميل</th><th>المجموع</th><th>الحالة</th><th>التاريخ</th></tr></thead>
            <tbody>
                ${orders.map(order => `
                    <tr>
                        <td>${order.id}</td>
                        <td>${order.customerName}</td>
                        <td>${order.total} دج</td>
                        <td>
                            <select onchange="orderManager.updateOrderStatus('${order.id}', this.value)">
                                ${orderManager.orderStatuses.map(s => 
                                    `<option value="${s}" ${order.status === s ? 'selected' : ''}>${orderManager.getStatusMessage(s)}</option>`
                                ).join('')}
                            </select>
                        </td>
                        <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function showDashboardProducts(container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <h3>المنتجات (${products.length})</h3>
            <button class="btn-gold" onclick="showAddProductModal()">➕ إضافة</button>
        </div>
        <table>
            <thead><tr><th>#</th><th>الصورة</th><th>المنتج</th><th>السعر</th><th>الكمية</th><th>التاجر</th></tr></thead>
            <tbody>
                ${products.map((p, i) => `
                    <tr>
                        <td>${i+1}</td>
                        <td><img src="${p.images[0]}" style="width:50px;height:50px;object-fit:cover;border-radius:5px;" onerror="this.src='https://via.placeholder.com/50/2c5e4f/ffffff?text=خطأ'"></td>
                        <td>${p.name}</td>
                        <td>${p.price} دج</td>
                        <td>${p.stock}</td>
                        <td>${p.merchantName}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function showDashboardMerchants(container) {
    const pending = users.filter(u => u.role === 'merchant_pending');
    const approved = users.filter(u => u.role === 'merchant_approved');

    container.innerHTML = `
        <h3 style="margin-bottom: 20px;">طلبات التجار (${pending.length})</h3>
        ${pending.map(m => `
            <div class="merchant-card" style="border-left-color: #fbbf24; margin-bottom: 15px; padding: 15px; background: var(--glass); border-radius: 10px;">
                <h4>${m.storeName || m.name}</h4>
                <p>👤 ${m.name} | 📧 ${m.email} | 📞 ${m.phone || '—'}</p>
                <p>📊 المستوى ${m.merchantLevel || '1'}</p>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button class="btn-gold" onclick="approveMerchant(${m.id})">✅ موافقة</button>
                    <button class="btn-outline-gold" onclick="rejectMerchant(${m.id})">❌ رفض</button>
                </div>
            </div>
        `).join('') || '<p>لا توجد طلبات</p>'

        }

        <h3 style="margin: 40px 0 20px;">التجار المعتمدون (${approved.length})</h3>
        <table>
            <thead><tr><th>#</th><th>المتجر</th><th>التاجر</th><th>المستوى</th><th>المنتجات</th></tr></thead>
            <tbody>
                ${approved.map((m, i) => {
                    const count = products.filter(p => p.merchantId == m.id || p.merchantName === m.storeName).length;
                    return `<tr><td>${i+1}</td><td>${m.storeName}</td><td>${m.name}</td><td>${m.merchantLevel || '1'}</td><td>${count}</td></tr>`;
                }).join('')}
            </tbody>
        </table>
    `;
}

// ========== 28. دوال التمرير ==========
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

// ========== 29. عداد تنازلي ==========
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

// ========== 30. تأثير الكتابة ==========
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
        if (!this.element) return;
        
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

// ========== 31. جسيمات متحركة ==========
function createParticles() {
    const container = document.createElement('div');
    container.className = 'particles';
    document.body.appendChild(container);
    
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 10 + 's';
        p.style.animationDuration = (Math.random() * 10 + 10) + 's';
        container.appendChild(p);
    }
}

// ========== 32. تأثير الماوس ==========
function createMouseEffect() {
    const cursor = document.createElement('div');
    cursor.className = 'mouse-effect';
    document.body.appendChild(cursor);
    
    const dot = document.createElement('div');
    dot.className = 'mouse-effect-dot';
    document.body.appendChild(dot);
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.transform = `translate(${e.clientX - 10}px, ${e.clientY - 10}px)`;
        dot.style.transform = `translate(${e.clientX - 2}px, ${e.clientY - 2}px)`;
    });
    
    document.querySelectorAll('a, button, .product-card').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
}

// ========== 33. شريط التقدم ==========
function updateProgressBars() {
    setInterval(() => {
        document.querySelectorAll('.marquee-progress-fill').forEach(fill => {
            fill.style.width = Math.floor(Math.random() * 50) + 50 + '%';
        });
    }, 5000);
}

// ========== 34. التهيئة ==========
window.onload = async function() {
    console.log('🚀 بدء تشغيل النظام...');
    
    const loader = document.getElementById('loader');
    
    // تحميل البيانات
    await loadProductsFromTelegram();
    await loadMerchantsFromTelegram();
    loadCart();

    // إنشاء التأثيرات
    createParticles();
    createMouseEffect();

    // استعادة المستخدم
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            updateUIBasedOnRole();
        } catch (e) {
            console.error('خطأ في قراءة المستخدم:', e);
        }
    }

    // استعادة الثيم
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

    // إخفاء شاشة التحميل
    setTimeout(() => {
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
    }, 1000);

    // إعدادات إضافية
    window.addEventListener('scroll', toggleQuickTopButton);
    updateCountdown();
    updateProgressBars();
    
    const typing = document.getElementById('typing-text');
    if (typing) {
        new TypingAnimation(typing, ['نكهة وجمال', 'تسوق آمن', 'جودة عالية', 'توصيل سريع']);
    }
    
    // تحديث مستمر
    setInterval(loadMerchantsFromTelegram, 10000);
    setInterval(loadProductsFromTelegram, 30000);
    
    if (!currentUser) {
        setTimeout(() => {
            ToastSystem.show('👋 مرحباً بك في نكهة وجمال', 'info', 5000);
        }, 1500);
    }
    
    console.log('✅ تم تهيئة النظام بنجاح');
};

// ========== إغلاق النوافذ ==========
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};
