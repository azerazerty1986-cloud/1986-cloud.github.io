// ========== ناردو برو - نظام متكامل مع تلجرام ==========
// ========== النسخة النهائية - مع الجداول والصور ==========

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

// ========== 4. نظام الإشعارات Toast ==========
const ToastSystem = {
    init: function() {
        if (!document.getElementById('toastContainer')) {
            const container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return document.getElementById('toastContainer');
    },

    show: function(message, type = 'info', duration = 3000) {
        const container = this.init();
        const id = 'toast_' + Date.now() + Math.random().toString(36).substr(2, 5);
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle',
            loading: 'fa-spinner fa-spin'
        };

        const icon = icons[type] || icons.info;

        const toast = document.createElement('div');
        toast.id = id;
        toast.className = `toast ${type}`;
        
        toast.innerHTML = `
            <div class="toast-icon"><i class="fas ${icon}"></i></div>
            <div class="toast-content">
                <div class="toast-title">${type === 'success' ? 'نجاح' : type === 'error' ? 'خطأ' : type === 'warning' ? 'تنبيه' : 'معلومات'}</div>
                <div class="toast-message">${message}</div>
            </div>
            <i class="fas fa-times toast-close" onclick="this.parentElement.remove()"></i>
        `;

        container.appendChild(toast);
        return id;
    },

    hide: function(id) {
        const toast = document.getElementById(id);
        if (toast) toast.remove();
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

// ========== 7. إضافة منتج إلى تليجرام مع جدول منسق ==========
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
        
        const topFrame = `🟣 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*\n`;
        const title = `🟣         *منتج جديد*         \n`;
        const separator = `🟣 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*\n\n`;
        
        const photoCaption = `${topFrame}${title}${separator}🖼️ *صورة المنتج*`;

        const bottomTable = `
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
⏰ ${new Date().toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' })}
🔗 *رابط المتجر:* قريباً
🟣 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
        `;

        if (product.images && product.images.length > 0 && !product.images[0].startsWith('data:')) {
            const photoResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendPhoto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM.channelId,
                    photo: product.images[0],
                    caption: photoCaption,
                    parse_mode: 'Markdown'
                })
            });
            
            const photoResult = await photoResponse.json();
            
            if (photoResult.ok) {
                await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: TELEGRAM.channelId,
                        text: bottomTable,
                        parse_mode: 'Markdown'
                    })
                });
                
                ToastSystem.hideAll();
                ToastSystem.show('✅ تم إرسال المنتج إلى تلجرام', 'success');
                return true;
            } else {
                const textResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: TELEGRAM.channelId,
                        text: bottomTable.replace('🟣', '⚠️') + '\n\n⚠️ *ملاحظة:* لم تتم إضافة الصورة',
                        parse_mode: 'Markdown'
                    })
                });
                
                if (textResponse.ok) {
                    ToastSystem.hideAll();
                    ToastSystem.show('⚠️ تم إرسال المنتج بدون صورة', 'warning');
                    return true;
                }
            }
        } else {
            const textResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM.channelId,
                    text: bottomTable,
                    parse_mode: 'Markdown'
                })
            });
            
            if (textResponse.ok) {
                ToastSystem.hideAll();
                ToastSystem.show('✅ تم إرسال المنتج إلى تلجرام', 'success');
                return true;
            }
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

// ========== 8. جلب المنتجات من تليجرام ==========
async function loadProductsFromTelegram() {
    try {
        console.log('🔄 جاري جلب المنتجات من تلجرام...');
        
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`);
        const data = await response.json();
        const telegramProducts = [];
        
        if (data.ok && data.result) {
            console.log(`✅ تم العثور على ${data.result.length} تحديث`);
            
            const updates = [...data.result].reverse();
            
            for (const update of updates) {
                if (update.channel_post) {
                    const post = update.channel_post;
                    
                    if (post.text && post.text.includes('🟣')) {
                        console.log('📦 وجدنا منتج:', post.text.substring(0, 50));
                        
                        const lines = post.text.split('\n');
                        let productData = extractProductData(lines);
                        
                        let productImage = "https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال";
                        
                        if (post.photo) {
                            const photo = post.photo[post.photo.length - 1];
                            const fileId = photo.file_id;
                            
                            const fileResponse = await fetch(
                                `https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${fileId}`
                            );
                            const fileData = await fileResponse.json();
                            
                            if (fileData.ok) {
                                productImage = `https://api.telegram.org/file/bot${TELEGRAM.botToken}/${fileData.result.file_path}`;
                            }
                        }
                        
                        telegramProducts.push({
                            id: post.message_id,
                            name: productData.name,
                            price: productData.price,
                            category: productData.category,
                            stock: productData.stock,
                            merchantName: productData.merchantName,
                            merchantId: productData.merchantId,
                            images: [productImage],
                            rating: 4.5,
                            telegramPhoto: !!post.photo,
                            telegramMessageId: post.message_id,
                            createdAt: new Date(post.date * 1000).toISOString()
                        });
                        
                        console.log(`✅ منتج مضاف: ${productData.name}`);
                    }
                }
            }
        }
        
        const localProducts = JSON.parse(localStorage.getItem('nardoo_products') || '[]');
        const allProducts = [...telegramProducts];
        
        localProducts.forEach(localProduct => {
            if (!allProducts.find(p => p.id === localProduct.id)) {
                allProducts.push(localProduct);
            }
        });
        
        localStorage.setItem('nardoo_products', JSON.stringify(allProducts));
        products = allProducts;
        
        console.log(`✅ تم تحميل ${products.length} منتج`);
        displayProducts();
        return products;
        
    } catch (error) {
        console.error('❌ خطأ في جلب المنتجات:', error);
        const saved = localStorage.getItem('nardoo_products');
        products = saved ? JSON.parse(saved) : [];
        displayProducts();
        return products;
    }
}

// ========== 9. عرض المنتجات في المتجر ==========
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

// ========== 10. عرض تفاصيل المنتج ==========
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
                        ${product.telegramPhoto ? '<p style="color: #4ade80; text-align: center;"><i class="fab fa-telegram"></i> مستورد من تلجرام</p>' : ''}
                    </div>
                </div>
                <div>
                    <div style="margin-bottom: 20px;">
                        <span style="background: var(--gold); padding: 5px 15px; border-radius: 20px; color: #000; font-weight: 700;">
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

// ========== 11. إرسال طلب شراء مع جدول السلة ==========
async function sendOrderToTelegram(order) {
    try {
        ToastSystem.show('🔄 جاري إرسال الطلب إلى تلجرام...', 'loading', 0);
        
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
⏰ ${new Date().toLocaleString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        `;

        const channelResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        const channelResult = await channelResponse.json();

        if (channelResult.ok) {
            console.log('✅ تم إرسال الطلب إلى القناة');
            
            await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM.adminId,
                    text: message.replace('🟢', '👑') + '\n\n👑 *هذه نسخة المدير*',
                    parse_mode: 'Markdown'
                })
            });

            const merchantOrders = {};
            order.items.forEach(item => {
                const merchantName = item.merchantName || 'المتجر';
                if (!merchantOrders[merchantName]) {
                    merchantOrders[merchantName] = [];
                }
                merchantOrders[merchantName].push(item);
            });

            for (const [merchantName, items] of Object.entries(merchantOrders)) {
                const merchant = users.find(u => 
                    u.storeName === merchantName || 
                    u.name === merchantName
                );

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

                    const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    
                    const merchantMessage = `
🟢 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
🟢   *طلب جديد - ${merchantName}*   
🟢 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*

👤 *العميل:* ${order.customerName}
📞 *الهاتف:* ${order.customerPhone}
📍 *العنوان:* ${order.customerAddress}

🟢 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
📦 *منتجاتك:*
${merchantTable}

🟢 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
💰 *إجمالي منتجاتك:* ${itemsTotal} دج
🚚 *الشحن:* 800 دج (يضاف عند التسليم)
💵 *الإجمالي:* ${itemsTotal + 800} دج
🟢 *⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯*
🔔 *رقم الطلب:* #${order.orderId}
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

            ToastSystem.hideAll();
            ToastSystem.show('✅ تم إرسال الطلب إلى تلجرام', 'success');
            return true;
        } else {
            ToastSystem.hideAll();
            ToastSystem.show('❌ فشل إرسال الطلب', 'error');
            return false;
        }

    } catch (error) {
        console.error('❌ خطأ في إرسال الطلب:', error);
        ToastSystem.hideAll();
        ToastSystem.show('❌ خطأ في الاتصال', 'error');
        return false;
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

// ========== 13. معالج رفع الصور ==========
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
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML += `
                <div class="image-upload-item" data-index="${i}" style="display: inline-block; margin: 5px; position: relative;">
                    <img src="${e.target.result}" class="preview-image">
                    <div class="upload-progress">⏳ جاري الرفع...</div>
                </div>
            `;
        };
        reader.readAsDataURL(file);
        
        try {
            const imageUrl = await uploadImageToTelegram(file);
            
            if (imageUrl) {
                imagesData.push(imageUrl);
                
                const progressDiv = document.querySelector(`.image-upload-item[data-index="${i}"] .upload-progress`);
                if (progressDiv) {
                    progressDiv.innerHTML = '✅ تم الرفع';
                    progressDiv.style.background = 'rgba(76, 175, 80, 0.9)';
                }
            } else {
                const reader = new FileReader();
                const localImageUrl = await new Promise((resolve) => {
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });
                imagesData.push(localImageUrl);
                
                const progressDiv = document.querySelector(`.image-upload-item[data-index="${i}"] .upload-progress`);
                if (progressDiv) {
                    progressDiv.innerHTML = '⚠️ محلي';
                    progressDiv.style.background = 'rgba(255, 165, 0, 0.9)';
                }
            }
        } catch (error) {
            console.error('خطأ في رفع الصورة:', error);
            const progressDiv = document.querySelector(`.image-upload-item[data-index="${i}"] .upload-progress`);
            if (progressDiv) {
                progressDiv.innerHTML = '❌ فشل';
                progressDiv.style.background = 'rgba(244, 67, 54, 0.9)';
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

// ========== 14. إرسال طلب انضمام تاجر ==========
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

// ========== 15. الموافقة على تاجر ==========
async function approveMerchant(merchantId) {
    const merchant = users.find(u => u.id == merchantId);
    if (!merchant) return;

    merchant.role = 'merchant_approved';
    merchant.status = 'approved';
    localStorage.setItem('nardoo_users', JSON.stringify(users));

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

    ToastSystem.show(`تمت الموافقة على التاجر: ${merchant.name}`, 'success');
}

// ========== 16. رفض تاجر ==========
async function rejectMerchant(merchantId) {
    const merchant = users.find(u => u.id == merchantId);
    if (!merchant) return;

    merchant.role = 'customer';
    merchant.status = 'rejected';
    localStorage.setItem('nardoo_users', JSON.stringify(users));

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

    ToastSystem.show(`تم رفض طلب التاجر: ${merchant.name}`, 'info');
}

// ========== 17. نظام إدارة الطلبات ==========
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

// ========== 18. نظام الواتساب ==========
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
        const { items = [], customerName = currentUser?.name || 'عميل', customerPhone = '', customerAddress = '', orderId = '' } = orderData;

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

// ========== 19. نظام التحليلات ==========
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

// ========== 20. إنشاء الكائنات ==========
const orderManager = new OrderManagementSystem();
const whatsappManager = new WhatsAppIntegration();
const analyticsManager = new AnalyticsSystem();

// ========== 21. دوال المساعدة ==========
function showAdvancedNotification(message, type = 'info', title = '') {
    return ToastSystem.show(message, type, 3000);
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

// ========== 22. فلترة المنتجات ==========
function filterProducts(category) {
    currentFilter = category;
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    displayProducts();
}

// ========== 23. البحث عن المنتجات ==========
function searchProducts() {
    searchTerm = document.getElementById('searchInput').value;
    displayProducts();
    analyticsManager.trackEvent('search', { searchTerm });
}

// ========== 24. إدارة السلة ==========
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
            ToastSystem.show('الكمية المتوفرة غير كافية', 'warning');
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
    ToastSystem.show('تمت الإضافة إلى السلة', 'success');
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
                    <div class="cart-item-merchant">${item.merchantName || 'المتجر'}</div>
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
    ToastSystem.show('تمت إزالة المنتج من السلة', 'info');
}

// ========== 25. إتمام الشراء ==========
async function checkoutCart() {
    if (cart.length === 0) {
        ToastSystem.show('السلة فارغة', 'warning');
        return;
    }

    if (!currentUser) {
        ToastSystem.show('يجب تسجيل الدخول أولاً', 'warning');
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

    const sent = await sendOrderToTelegram(order);

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

    const savedOrder = orderManager.createOrder(order);
    
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
    
    ToastSystem.show(`✅ تم إرسال الطلب #${savedOrder.id}`, 'success');
    analyticsManager.trackEvent('purchase', { total: total, orderId: savedOrder.id });
}

// ========== 26. دوال التمرير ==========
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

// ========== 27. عداد تنازلي ==========
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

// ========== 28. أشرطة التقدم ==========
function updateProgressBars() {
    setInterval(() => {
        document.querySelectorAll('.progress-fill, .marquee-progress-fill').forEach(fill => {
            fill.style.width = Math.floor(Math.random() * 50) + 50 + '%';
        });
    }, 5000);
}

// ========== 29. إدارة المستخدمين ==========
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
        ToastSystem.show(`مرحباً ${user.name}`, 'success');
        analyticsManager.trackEvent('login', { userId: user.id });
    } else {
        ToastSystem.show('بيانات الدخول غير صحيحة', 'error');
    }
}

// ========== 30. تسجيل تاجر جديد ==========
function handleRegister() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const phone = document.getElementById('regPhone')?.value || '';
    const isMerchant = document.getElementById('isMerchant').checked;

    if (!name || !email || !password) {
        ToastSystem.show('الرجاء ملء جميع الحقول', 'error');
        return;
    }

    if (users.find(u => u.email === email)) {
        ToastSystem.show('البريد الإلكتروني مستخدم بالفعل', 'error');
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
        
        sendMerchantRequestToTelegram(newUser);
        ToastSystem.show('📋 تم إرسال طلب التسجيل إلى المدير', 'info');
    } else {
        ToastSystem.show('✅ تم التسجيل بنجاح', 'success');
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
        ToastSystem.show('مرحباً بك يا مدير', 'success');
    } else if (currentUser.role === 'merchant_approved') {
        document.getElementById('dashboardBtn').style.display = 'none';
        document.getElementById('userBtn').innerHTML = '<i class="fas fa-store"></i>';
        addMerchantMenuButton();
        showMerchantPanel();
        ToastSystem.show('مرحباً أيها التاجر', 'info');
    } else {
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
    panel.style.display = 'block';
    panel.innerHTML = `
        <div class="merchant-panel">
            <h3><i class="fas fa-store"></i> لوحة التاجر - ${currentUser.storeName || currentUser.name}</h3>
            <div class="stats">
                <div class="stat-item">
                    <div class="number">${merchantProducts.length}</div>
                    <div>إجمالي المنتجات</div>
                </div>
                <div class="stat-item">
                    <div class="number">${merchantProducts.filter(p => p.stock > 0).length}</div>
                    <div>المنتجات المتاحة</div>
                </div>
                <div class="stat-item">
                    <div class="number">${totalSales.toLocaleString()} دج</div>
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

// ========== 31. إضافة المنتجات مع الصور ==========
function showAddProductModal() {
    if (!currentUser) {
        ToastSystem.show('يجب تسجيل الدخول أولاً', 'warning');
        openLoginModal();
        return;
    }

    if (currentUser.role === 'merchant_approved' || currentUser.role === 'admin') {
        document.getElementById('modalTitle').textContent = 'إضافة منتج جديد';
        document.getElementById('productName').value = '';
        document.getElementById('productCategory').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productStock').value = '';
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('productImagesData').value = '';
        document.getElementById('productModal').style.display = 'flex';
    } else {
        ToastSystem.show('فقط المدير والتجار يمكنهم إضافة منتجات', 'error');
    }
}

// ========== 32. حفظ المنتج مع الصور ==========
async function saveProduct() {
    if (!currentUser) {
        ToastSystem.show('يجب تسجيل الدخول أولاً', 'error');
        return;
    }

    if (currentUser.role !== 'merchant_approved' && currentUser.role !== 'admin') {
        ToastSystem.show('فقط التجار والمدير يمكنهم إضافة منتجات', 'error');
        return;
    }

    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    
    const imagesData = document.getElementById('productImagesData').value;
    let images = [];
    
    try {
        images = imagesData ? JSON.parse(imagesData) : [];
    } catch (e) {
        console.error('خطأ في قراءة الصور:', e);
    }

    if (!name || !category || !price || !stock) {
        ToastSystem.show('الرجاء ملء جميع الحقول', 'error');
        return;
    }

    const product = {
        id: Date.now(),
        name: name,
        price: price,
        category: category,
        stock: stock,
        merchantName: currentUser.storeName || currentUser.name,
        merchantId: currentUser.id,
        images: images.length > 0 ? images : ["https://via.placeholder.com/300/2c5e4f/ffffff?text=نكهة+وجمال"],
        rating: 4.5,
        createdAt: new Date().toISOString(),
        soldCount: 0
    };

    let existingProducts = JSON.parse(localStorage.getItem('nardoo_products') || '[]');
    existingProducts.push(product);
    localStorage.setItem('nardoo_products', JSON.stringify(existingProducts));
    
    products = existingProducts;

    const sent = await addProductToTelegram(product);
    
    if (!sent) {
        ToastSystem.show('⚠️ تم حفظ المنتج محلياً فقط', 'warning');
    }

    closeModal('productModal');
    displayProducts();
    
    if (currentUser.role === 'merchant_approved') {
        showMerchantPanel();
    }

    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('productImagesData').value = '';
}

// ========== 33. لوحة التحكم ==========
function openDashboard() {
    if (!currentUser || currentUser.role !== 'admin') {
        ToastSystem.show('غير مصرح', 'error');
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
            <table>
                <thead>
                    <tr>
                        <th>رقم الطلب</th>
                        <th>العميل</th>
                        <th>المجموع</th>
                        <th>الحالة</th>
                        <th>التاريخ</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderStats.recentOrders.map(order => `
                        <tr>
                            <td>${order.id}</td>
                            <td>${order.customerName}</td>
                            <td style="color: var(--gold); font-weight: 700;">${order.total.toLocaleString()} دج</td>
                            <td><span class="status-badge status-${order.status}">${orderManager.getStatusMessage(order.status)}</span></td>
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
        <div style="overflow-x: auto;">
            <table>
                <thead>
                    <tr>
                        <th>رقم الطلب</th>
                        <th>العميل</th>
                        <th>المجموع</th>
                        <th>الحالة</th>
                        <th>التاريخ</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td>${order.id}</td>
                            <td>${order.customerName}</td>
                            <td>${order.total} دج</td>
                            <td>
                                <select onchange="orderManager.updateOrderStatus('${order.id}', this.value)" style="background: var(--glass); color: var(--text-primary); border: 1px solid var(--gold); padding: 5px; border-radius: 5px;">
                                    ${orderManager.orderStatuses.map(status => `
                                        <option value="${status}" ${order.status === status ? 'selected' : ''}>${orderManager.getStatusMessage(status)}</option>
                                    `).join('')}
                                </select>
                            </td>
                            <td>${new Date(order.createdAt).toLocaleDateString('ar-DZ')}</td>
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
            <h3 style="color: var(--gold);">المنتجات (${products.length})</h3>
            <button class="btn-gold" onclick="showAddProductModal()">إضافة منتج</button>
        </div>
        <div style="overflow-x: auto;">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>الصورة</th>
                        <th>المنتج</th>
                        <th>السعر</th>
                        <th>الكمية</th>
                        <th>التاجر</th>
                        <th>المصدر</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map((p, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td><img src="${p.images?.[0] || 'https://via.placeholder.com/50'}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;"></td>
                            <td>${p.name}</td>
                            <td>${p.price} دج</td>
                            <td>${p.stock}</td>
                            <td>${p.merchantName}</td>
                            <td>${p.telegramPhoto ? '<span style="color: #4ade80;"><i class="fab fa-telegram"></i> تلجرام</span>' : 'محلي'}</td>
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
            <div class="merchant-card" style="border-left-color: #fbbf24;">
                <div class="merchant-card-header">
                    <div class="merchant-color-sample" style="background: #fbbf24;"></div>
                    <h4>${m.storeName || 'متجر ' + m.name}</h4>
                    <span class="status-badge status-pending">في انتظار الموافقة</span>
                </div>
                <p><i class="fas fa-user"></i> ${m.name}</p>
                <p><i class="fas fa-envelope"></i> ${m.email}</p>
                <p><i class="fas fa-phone"></i> ${m.phone || 'غير متوفر'}</p>
                <p><i class="fas fa-chart-line"></i> المستوى ${m.merchantLevel || '1'}</p>
                ${m.merchantDesc ? `<p><i class="fas fa-info-circle"></i> ${m.merchantDesc}</p>` : ''}
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="btn-gold" onclick="approveMerchant(${m.id})" style="flex: 1;"><i class="fas fa-check"></i> موافقة</button>
                    <button class="btn-outline-gold" onclick="rejectMerchant(${m.id})" style="flex: 1;"><i class="fas fa-times"></i> رفض</button>
                </div>
            </div>
        `).join('');
    }
    
    let approvedHTML = '';
    if (approvedMerchants.length === 0) {
        approvedHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">لا يوجد تجار معتمدين</p>';
    } else {
        approvedHTML = `
            <div style="overflow-x: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>المتجر</th>
                            <th>التاجر</th>
                            <th>المستوى</th>
                            <th>المنتجات</th>
                            <th>البريد</th>
                            <th>الهاتف</th>
                            <th>تلجرام</th>
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
                                <tr>
                                    <td>${index + 1}</td>
                                    <td><i class="fas fa-store" style="color: var(--gold);"></i> ${m.storeName || 'متجر ' + m.name}</td>
                                    <td>${m.name}</td>
                                    <td><span class="status-badge status-approved">المستوى ${m.merchantLevel || '1'}</span></td>
                                    <td style="color: var(--gold); font-weight: 700;">${merchantProducts.length}</td>
                                    <td>${m.email}</td>
                                    <td>${m.phone || '—'}</td>
                                    <td>${m.telegramId ? '✅' : '❌'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    container.innerHTML = `
        <h3 style="margin-bottom: 20px; color: var(--gold);"><i class="fas fa-clock"></i> طلبات التجار (${pendingMerchants.length})</h3>
        ${pendingHTML}

        <h3 style="margin: 40px 0 20px; color: var(--gold);"><i class="fas fa-check-circle"></i> التجار المعتمدون (${approvedMerchants.length})</h3>
        ${approvedHTML}
    `;
}

// ========== 34. تأثيرات الكتابة ==========
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

// ========== 35. الاستماع لأوامر تلجرام ==========
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

// ========== 36. التهيئة (onload) ==========
window.onload = async function() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';
    
    await loadProductsFromTelegram();
    await loadMerchantsFromTelegram();
    loadCart();

    createParticles();
    createMouseEffect();

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
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
    }, 1000);

    window.addEventListener('scroll', toggleQuickTopButton);
    window.addEventListener('scroll', updateScrollProgress);
    updateCountdown();
    updateProgressBars();
    
    const typingElement = document.getElementById('typing-text');
    if (typingElement) {
        new TypingAnimation(typingElement, ['نكهة وجمال', 'تسوق آمن', 'جودة عالية', 'توصيل سريع'], 100, 2000).start();
    }
    
    console.log('✅ تم تهيئة النظام - المنتجات جاهزة');
    
    if (!currentUser) {
        ToastSystem.show('👋 مرحباً بك في نكهة وجمال', 'info', 5000);
    }
};

// ========== 37. جسيمات متحركة ==========
function createParticles() {
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles';
    document.body.appendChild(particlesContainer);
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 10 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        particlesContainer.appendChild(particle);
    }
}

// ========== 38. تأثير الماوس ==========
function createMouseEffect() {
    const cursor = document.createElement('div');
    cursor.className = 'mouse-effect';
    document.body.appendChild(cursor);
    
    const cursorDot = document.createElement('div');
    cursorDot.className = 'mouse-effect-dot';
    document.body.appendChild(cursorDot);
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.transform = `translate(${e.clientX - 10}px, ${e.clientY - 10}px)`;
        cursorDot.style.transform = `translate(${e.clientX - 2}px, ${e.clientY - 2}px)`;
    });
    
    document.querySelectorAll('a, button, .product-card, .nav-link').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
}

// ========== 39. تحديث شريط تقدم التمرير ==========
function updateScrollProgress() {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    
    let progressBar = document.querySelector('.scroll-progress');
    if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress';
        document.body.appendChild(progressBar);
    }
    progressBar.style.width = scrolled + '%';
}

// ========== 40. جلب التجار من تليجرام ==========
async function loadMerchantsFromTelegram() {
    try {
        console.log('🔄 جاري جلب طلبات التجار من تلجرام...');
        
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`);
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

// ========== إغلاق النوافذ عند النقر خارجها ==========
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};
