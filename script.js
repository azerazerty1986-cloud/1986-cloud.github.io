// ========== 1. إعدادات تلجرام (قناة واحدة متكاملة) ==========
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

// ========== 4. تحميل المستخدمين من localStorage ==========
function loadUsers() {
    const saved = localStorage.getItem('nardoo_users');
    if (saved) {
        users = JSON.parse(saved);
    } else {
        // مستخدم افتراضي (مدير)
        users = [
            { 
                id: 1, 
                name: 'المدير', 
                username: 'admin',
                email: 'admin@nardoo.com', 
                password: 'admin123', 
                role: 'admin',
                phone: '0562243648',
                telegramId: TELEGRAM.adminId,
                storeName: 'نكهة وجمال',
                storeColor: '#d4af37',
                productsLimit: 1000,
                canAddProducts: true,
                canEditProducts: true,
                canDeleteProducts: true,
                canViewStats: true,
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('nardoo_users', JSON.stringify(users));
    }
}
loadUsers();

// ========== 5. جلب المنتجات من قناة تلجرام ==========
async function loadProductsFromTelegram() {
    try {
        console.log('🔄 جاري جلب المنتجات من تلجرام...');
        
        // محاولة جلب المنتجات المحفوظة أولاً
        const savedProducts = localStorage.getItem('nardoo_products');
        let localProducts = savedProducts ? JSON.parse(savedProducts) : [];
        
        // جلب آخر التحديثات من تلجرام
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`
        );
        
        const data = await response.json();
        let newProducts = [];
        
        if (data.ok && data.result) {
            console.log(`✅ تم العثور على ${data.result.length} تحديث في تلجرام`);
            
            // حفظ التحديثات
            telegramUpdates = data.result;
            
            // معالجة التحديثات من الأحدث للأقدم
            const updates = [...data.result].reverse();
            
            for (const update of updates) {
                // التحقق من عدم معالجة هذا التحديث مسبقاً
                if (isUpdateProcessed(update.update_id)) {
                    continue;
                }
                
                // التحقق من وجود رسالة في القناة
                if (update.channel_post) {
                    const post = update.channel_post;
                    
                    // ===== 5.1 معالجة المنتجات الجديدة (🟣) =====
                    if (post.text && post.text.includes('🟣')) {
                        console.log('📦 العثور على منتج جديد:', post.text.substring(0, 50));
                        
                        const product = parseProductFromTelegram(post);
                        if (product) {
                            // التحقق من عدم وجود المنتج مسبقاً
                            const exists = localProducts.some(p => p.telegramId === post.message_id);
                            if (!exists) {
                                newProducts.push(product);
                                markUpdateAsProcessed(update.update_id);
                            }
                        }
                    }
                    
                    // ===== 5.2 معالجة طلبات التجار (🔵) =====
                    if (post.text && post.text.includes('🔵')) {
                        console.log('👤 العثور على طلب تاجر جديد');
                        
                        const merchantRequest = parseMerchantRequestFromTelegram(post);
                        if (merchantRequest) {
                            // التحقق من عدم وجود الطلب مسبقاً
                            const exists = users.some(u => u.email === merchantRequest.email);
                            if (!exists) {
                                // إضافة التاجر كـ pending
                                const newMerchant = {
                                    id: users.length + 1,
                                    name: merchantRequest.name,
                                    email: merchantRequest.email,
                                    password: 'temp_' + Math.random().toString(36).substring(2, 8),
                                    phone: merchantRequest.phone || '',
                                    role: 'merchant_pending',
                                    telegramId: null,
                                    storeName: merchantRequest.storeName,
                                    merchantDesc: merchantRequest.description,
                                    merchantLevel: merchantRequest.level || 1,
                                    productsLimit: getProductsLimit(merchantRequest.level || 1),
                                    telegramMessageId: post.message_id,
                                    createdAt: new Date().toISOString()
                                };
                                
                                users.push(newMerchant);
                                localStorage.setItem('nardoo_users', JSON.stringify(users));
                                
                                // إرسال إشعار للمدير
                                showNotification(`📬 طلب تاجر جديد: ${merchantRequest.name}`, 'info');
                                
                                markUpdateAsProcessed(update.update_id);
                            }
                        }
                    }
                }
            }
        }
        
        // دمج المنتجات الجديدة مع المحفوظة
        if (newProducts.length > 0) {
            localProducts = [...newProducts, ...localProducts];
            localStorage.setItem('nardoo_products', JSON.stringify(localProducts));
            console.log(`✅ تمت إضافة ${newProducts.length} منتج جديد من تلجرام`);
        }
        
        products = localProducts;
        return products;
        
    } catch (error) {
        console.error('❌ خطأ في جلب المنتجات من تلجرام:', error);
        const saved = localStorage.getItem('nardoo_products');
        products = saved ? JSON.parse(saved) : [];
        return products;
    }
}

// ========== 6. تحليل المنتج من رسالة تلجرام ==========
function parseProductFromTelegram(post) {
    try {
        const lines = post.text.split('\n');
        let name = 'منتج';
        let price = 0;
        let category = 'other';
        let stock = 0;
        let merchant = 'المتجر';
        let description = '';
        
        lines.forEach(line => {
            if (line.includes('المنتج:') || line.includes('📦')) {
                name = line.replace(/[📦🟣*]/g, '').replace('المنتج:', '').trim();
            } else if (line.includes('السعر:') || line.includes('💰')) {
                const match = line.match(/\d+/);
                if (match) price = parseInt(match[0]);
            } else if (line.includes('القسم:') || line.includes('🏷️')) {
                const cat = line.replace(/[🏷️🟣*]/g, '').replace('القسم:', '').trim().toLowerCase();
                if (cat.includes('promo') || cat.includes('برموسيو')) category = 'promo';
                else if (cat.includes('spices') || cat.includes('توابل')) category = 'spices';
                else if (cat.includes('cosmetic') || cat.includes('كوسمتيك')) category = 'cosmetic';
                else category = 'other';
            } else if (line.includes('الكمية:') || line.includes('📊')) {
                const match = line.match(/\d+/);
                if (match) stock = parseInt(match[0]);
            } else if (line.includes('التاجر:') || line.includes('👤')) {
                merchant = line.replace(/[👤🟣*]/g, '').replace('التاجر:', '').trim();
            } else if (line.includes('الوصف:') || line.includes('📝')) {
                description = line.replace(/[📝🟣*]/g, '').replace('الوصف:', '').trim();
            }
        });
        
        // البحث عن التاجر في قاعدة البيانات
        const merchantUser = users.find(u => u.name === merchant || u.storeName === merchant);
        
        return {
            id: Date.now() + Math.floor(Math.random() * 1000),
            telegramId: post.message_id,
            name: name,
            price: price || 1000,
            category: category,
            stock: stock || 10,
            merchantName: merchant,
            merchantId: merchantUser?.id || null,
            description: description || 'منتج عالي الجودة',
            images: ["https://via.placeholder.com/300/2c5e4f/ffffff?text=" + encodeURIComponent(name)],
            rating: 4.5,
            soldCount: 0,
            createdAt: new Date(post.date * 1000).toISOString(),
            isActive: true
        };
    } catch (error) {
        console.error('خطأ في تحليل المنتج:', error);
        return null;
    }
}

// ========== 7. تحليل طلب تاجر من رسالة تلجرام ==========
function parseMerchantRequestFromTelegram(post) {
    try {
        const lines = post.text.split('\n');
        let name = '';
        let email = '';
        let phone = '';
        let storeName = '';
        let description = '';
        let level = 1;
        
        lines.forEach(line => {
            if (line.includes('التاجر:') || line.includes('👤')) {
                name = line.replace(/[👤🔵*]/g, '').replace('التاجر:', '').trim();
            } else if (line.includes('البريد:') || line.includes('📧')) {
                email = line.replace(/[📧🔵*]/g, '').replace('البريد:', '').trim();
            } else if (line.includes('الهاتف:') || line.includes('📞')) {
                phone = line.replace(/[📞🔵*]/g, '').replace('الهاتف:', '').trim();
            } else if (line.includes('المتجر:') || line.includes('🏪')) {
                storeName = line.replace(/[🏪🔵*]/g, '').replace('المتجر:', '').trim();
            } else if (line.includes('المستوى:') || line.includes('📊')) {
                const match = line.match(/\d+/);
                if (match) level = parseInt(match[0]);
            } else if (line.includes('الوصف:') || line.includes('📝')) {
                description = line.replace(/[📝🔵*]/g, '').replace('الوصف:', '').trim();
            }
        });
        
        if (!name || !email) return null;
        
        return {
            name,
            email,
            phone,
            storeName: storeName || `متجر ${name}`,
            description: description || 'تاجر جديد',
            level
        };
    } catch (error) {
        console.error('خطأ في تحليل طلب التاجر:', error);
        return null;
    }
}

// ========== 8. إضافة منتج جديد إلى تلجرام ==========
async function addProductToTelegram(product) {
    const message = `
🟣 *منتج جديد في المتجر*
━━━━━━━━━━━━━━━━━━━━━━
📦 *المنتج:* ${product.name}
💰 *السعر:* ${product.price} دج
🏷️ *القسم:* ${product.category}
📊 *الكمية:* ${product.stock}
👤 *التاجر:* ${product.merchantName}
📝 *الوصف:* ${product.description || 'لا يوجد'}
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
            // إنشاء كائن المنتج الكامل
            const newProduct = {
                id: Date.now(),
                telegramId: result.result.message_id,
                name: product.name,
                price: product.price,
                category: product.category,
                stock: product.stock,
                merchantName: product.merchantName,
                merchantId: product.merchantId,
                description: product.description || '',
                images: product.images || ["https://via.placeholder.com/300/2c5e4f/ffffff?text=" + encodeURIComponent(product.name)],
                rating: 4.5,
                soldCount: 0,
                createdAt: new Date().toISOString(),
                isActive: true
            };
            
            // حفظ في localStorage
            let currentProducts = JSON.parse(localStorage.getItem('nardoo_products')) || [];
            currentProducts.unshift(newProduct);
            localStorage.setItem('nardoo_products', JSON.stringify(currentProducts));
            
            products = currentProducts;
            
            return { ok: true, product: newProduct };
        }
        return { ok: false };
    } catch (error) {
        console.error('❌ خطأ في إضافة المنتج:', error);
        return { ok: false };
    }
}

// ========== 9. إرسال طلب تاجر إلى تلجرام ==========
async function sendMerchantRequestToTelegram(merchant) {
    const message = `
🔵 *طلب انضمام تاجر جديد*
━━━━━━━━━━━━━━━━━━━━━━
🏪 *المتجر:* ${merchant.storeName || merchant.name}
👤 *التاجر:* ${merchant.name}
📧 *البريد:* ${merchant.email}
📞 *الهاتف:* ${merchant.phone || 'غير متوفر'}
📊 *المستوى:* ${merchant.merchantLevel || '1'}
📝 *الوصف:* ${merchant.merchantDesc || 'تاجر جديد'}
🆔 *رقم الطلب:* ${merchant.id}

⬇️ *للإجراء من المدير*
✅ للموافقة: /approve_${merchant.id}
❌ للرفض: /reject_${merchant.id}
⚙️ للتخصيص: /customize_${merchant.id}
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
        
        return await response.json();
    } catch (error) {
        console.error('❌ خطأ في إرسال طلب التاجر:', error);
        return { ok: false };
    }
}

// ========== 10. إرسال طلب شراء إلى تلجرام ==========
async function sendOrderToTelegram(order) {
    const message = `
🟢 *طلب شراء جديد*
━━━━━━━━━━━━━━━━━━━━━━
👤 *الزبون:* ${order.customerName}
📞 *الهاتف:* ${order.customerPhone || 'غير متوفر'}
📦 *المنتجات:*
${order.items.map((item, i) => 
    `  ${i+1}. ${item.name} (${item.quantity}) - ${item.price} دج`
).join('\n')}
💰 *الإجمالي:* ${order.total} دج
🕐 *الوقت:* ${new Date().toLocaleString('ar-DZ')}
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

// ========== 11. الموافقة على تاجر ==========
async function approveMerchant(userId) {
    console.log(`📨 الموافقة على التاجر ${userId}`);
    
    const userIndex = users.findIndex(u => u.id == userId);
    
    if (userIndex !== -1 && users[userIndex].role === 'merchant_pending') {
        const username = users[userIndex].email.split('@')[0] + '_' + Math.floor(Math.random()*1000);
        const password = generateStrongPassword();
        const level = users[userIndex].merchantLevel || 1;
        
        // تحديث صلاحيات التاجر
        users[userIndex].role = 'merchant_approved';
        users[userIndex].username = username;
        users[userIndex].password = password;
        users[userIndex].storeColor = '#' + Math.floor(Math.random()*16777215).toString(16);
        users[userIndex].merchantLevel = level;
        users[userIndex].productsLimit = getProductsLimit(level);
        users[userIndex].canAddProducts = true;
        users[userIndex].canEditProducts = true;
        users[userIndex].canDeleteProducts = true;
        users[userIndex].canViewStats = true;
        users[userIndex].approvedAt = new Date().toISOString();
        
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        
        // إرسال رسالة ترحيب في القناة
        const welcomeMessage = `
🎉 *تم قبول تاجر جديد* 🎉
━━━━━━━━━━━━━━━━━━━━━━
🏪 *المتجر:* ${users[userIndex].storeName}
👤 *التاجر:* ${users[userIndex].name}
📊 *المستوى:* ${level}
📦 *حد المنتجات:* ${getProductsLimit(level)} منتج

يمكنه الآن إضافة منتجاته عبر المتجر!
        `;
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: welcomeMessage,
                parse_mode: 'Markdown'
            })
        });
        
        showNotification(`✅ تم قبول التاجر ${users[userIndex].name}`, 'success');
        return true;
    }
    return false;
}

// ========== 12. رفض تاجر ==========
async function rejectMerchant(userId) {
    console.log(`📨 رفض التاجر ${userId}`);
    
    const userIndex = users.findIndex(u => u.id == userId);
    
    if (userIndex !== -1 && users[userIndex].role === 'merchant_pending') {
        const merchantName = users[userIndex].name;
        
        // حذف الطلب
        users.splice(userIndex, 1);
        localStorage.setItem('nardoo_users', JSON.stringify(users));
        
        // إرسال إشعار بالرفض
        await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM.channelId,
                text: `❌ تم رفض طلب التاجر: ${merchantName}`,
                parse_mode: 'Markdown'
            })
        });
        
        showNotification(`❌ تم رفض التاجر ${merchantName}`, 'info');
        return true;
    }
    return false;
}

// ========== 13. إنشاء كلمة مرور قوية ==========
function generateStrongPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// ========== 14. تحديد حد المنتجات حسب المستوى ==========
function getProductsLimit(level) {
    const limits = {
        1: 5,
        2: 10,
        3: 15,
        4: 25,
        5: 50
    };
    return limits[level] || 5;
}

// ========== 15. تحميل المنتجات وعرضها ==========
async function loadProducts() {
    products = await loadProductsFromTelegram();
    displayProducts();
}

function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    let filtered = products.filter(p => p.stock > 0 && p.isActive !== false);
    
    // تصفية حسب المنتجات الخاصة بالتاجر
    if (currentFilter === 'my_products' && currentUser?.role === 'merchant_approved') {
        filtered = filtered.filter(p => p.merchantName === currentUser.name || p.merchantName === currentUser.storeName);
    }
    else if (currentFilter !== 'all') {
        filtered = filtered.filter(p => p.category === currentFilter);
    }

    // تصفية حسب البحث
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    // ترتيب المنتجات
    filtered = sortProducts(filtered);

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
        const merchant = users.find(u => u.name === product.merchantName || u.storeName === product.merchantName);
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
                        ${currentUser?.role === 'admin' || (currentUser?.role === 'merchant_approved' && (currentUser?.name === product.merchantName || currentUser?.storeName === product.merchantName)) ? `
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

// ========== 16. دوال المساعدة ==========
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

// ========== 17. دوال التصفية والبحث ==========
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

// ========== 18. إدارة السلة ==========
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

// ========== 19. إتمام الشراء ==========
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

    // إرسال الطلب إلى تلجرام
    await sendOrderToTelegram(order);

    // تفريغ السلة
    cart = [];
    saveCart();
    updateCartCounter();
    toggleCart();
    showNotification('✅ تم إرسال الطلب بنجاح', 'success');
}

// ========== 20. إدارة المستخدمين ==========
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

// ========== 21. تسجيل الدخول ==========
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
            showNotification(`🎉 مرحباً أيها التاجر ${user.name}`, 'success', 'تاجر ناردو');
        } else if (user.role === 'admin') {
            showNotification(`👑 مرحباً بك يا مدير ${user.name}`, 'success', 'مدير');
        } else {
            showNotification(`👤 مرحباً ${user.name}`, 'success');
        }
    } else {
        showNotification('❌ اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
    }
}

// ========== 22. تسجيل تاجر جديد ==========
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
        productsLimit: isMerchant ? getProductsLimit(parseInt(document.getElementById('merchantLevel')?.value || '1')) : 0,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('nardoo_users', JSON.stringify(users));

    if (isMerchant) {
        // إرسال طلب التاجر إلى تلجرام
        await sendMerchantRequestToTelegram(newUser);
        showNotification('📋 تم إرسال طلب التسجيل إلى المدير', 'info');
        showNotification('⏳ في انتظار الموافقة...', 'warning');
    } else {
        showNotification('✅ تم التسجيل كعميل بنجاح', 'success');
        switchAuthTab('login');
    }
    
    closeModal('loginModal');
}

// ========== 23. تحديث الواجهة حسب الدور ==========
function updateUIBasedOnRole() {
    if (!currentUser) return;

    // إخفاء العناصر الخاصة
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.merchant-only').forEach(el => el.style.display = 'none');
    document.getElementById('merchantPanelContainer').style.display = 'none';
    
    if (currentUser.role === 'admin') {
        document.getElementById('dashboardBtn').style.display = 'flex';
        document.getElementById('userBtn').innerHTML = '<i class="fas fa-crown"></i>';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
        showAdminPanel();
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

// ========== 24. عرض لوحة التاجر ==========
function showMerchantPanel() {
    if (!currentUser || currentUser.role !== 'merchant_approved') return;
    
    const merchantProducts = products.filter(p => p.merchantName === currentUser.name || p.merchantName === currentUser.storeName);
    const totalSales = merchantProducts.reduce((sum, p) => sum + (p.price * (p.soldCount || 0)), 0);
    const remainingProducts = (currentUser.productsLimit || 5) - merchantProducts.length;
    
    document.getElementById('merchantPanelContainer').style.display = 'block';
    document.getElementById('merchantPanelContainer').innerHTML = `
        <div class="merchant-panel" style="border: 3px solid ${currentUser.storeColor || '#9b59b6'};">
            <h3><i class="fas fa-store"></i> لوحة التاجر - ${currentUser.storeName || currentUser.name}</h3>
            <div class="stats">
                <div class="stat-item"><div class="number">${merchantProducts.length}</div><div>إجمالي المنتجات</div></div>
                <div class="stat-item"><div class="number">${merchantProducts.filter(p => p.stock > 0).length}</div><div>المنتجات المتاحة</div></div>
                <div class="stat-item"><div class="number">${totalSales.toLocaleString()} دج</div><div>إجمالي المبيعات</div></div>
                <div class="stat-item"><div class="number" style="color: ${remainingProducts > 0 ? '#4ade80' : '#f87171'}">${remainingProducts}</div><div>المنتجات المتبقية</div></div>
            </div>
            <div style="display: flex; gap: 15px; margin-top: 20px; justify-content: center;">
                ${remainingProducts > 0 ? `
                    <button class="btn-gold" onclick="showAddProductModal()"><i class="fas fa-plus"></i> إضافة منتج جديد</button>
                ` : `
                    <button class="btn-gold" disabled style="opacity: 0.5;"><i class="fas fa-ban"></i> وصلت للحد الأقصى</button>
                `}
                <button class="btn-outline-gold" onclick="viewMyProducts()"><i class="fas fa-box"></i> عرض منتجاتي</button>
            </div>
        </div>
    `;
    
    // إضافة زر "منتجاتي" للقائمة إذا لم يكن موجوداً
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

// ========== 25. عرض لوحة المدير ==========
function showAdminPanel() {
    const pendingMerchants = users.filter(u => u.role === 'merchant_pending');
    
    if (pendingMerchants.length > 0) {
        showNotification(`📬 لديك ${pendingMerchants.length} طلب تاجر جديد`, 'info');
    }
}

// ========== 26. فتح لوحة التحكم ==========
function openDashboard() {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('غير مصرح', 'error');
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
    else if (tab === 'pending') showDashboardPendingMerchants(content);
}

function showDashboardOverview(container) {
    const pendingMerchants = users.filter(u => u.role === 'merchant_pending').length;
    const approvedMerchants = users.filter(u => u.role === 'merchant_approved').length;
    const totalProducts = products.length;
    const totalUsers = users.length;

    container.innerHTML = `
        <h3 style="margin-bottom: 30px; color: var(--gold);">نظرة عامة على المتجر</h3>
        <div class="stats-grid">
            <div class="stat-card"><i class="fas fa-box"></i><div class="stat-value">${totalProducts}</div><div class="stat-label">إجمالي المنتجات</div></div>
            <div class="stat-card"><i class="fas fa-store"></i><div class="stat-value">${approvedMerchants}</div><div class="stat-label">التجار النشطين</div></div>
            <div class="stat-card"><i class="fas fa-user-clock"></i><div class="stat-value">${pendingMerchants}</div><div class="stat-label">طلبات تجار</div></div>
            <div class="stat-card"><i class="fas fa-users"></i><div class="stat-value">${totalUsers}</div><div class="stat-label">إجمالي المستخدمين</div></div>
        </div>
        
        ${pendingMerchants > 0 ? `
            <div style="text-align: center; margin: 30px 0;">
                <button class="btn-gold" onclick="showPendingMerchantsModal()" style="padding: 15px 40px;">
                    <i class="fas fa-bell"></i> عرض طلبات التجار (${pendingMerchants})
                </button>
            </div>
        ` : ''}
    `;
}

function showDashboardOrders(container) {
    container.innerHTML = `
        <h3 style="margin-bottom: 20px; color: var(--gold);">الطلبات</h3>
        <p style="text-align: center; padding: 50px;">قريباً - نظام إدارة الطلبات</p>
    `;
}

function showDashboardAnalytics(container) {
    container.innerHTML = `
        <h3 style="margin-bottom: 20px; color: var(--gold);">التحليلات</h3>
        <p style="text-align: center; padding: 50px;">قريباً - نظام التحليلات المتقدم</p>
    `;
}

function showDashboardProducts(container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <h3 style="color: var(--gold);">المنتجات</h3>
            <button class="btn-gold" onclick="showAddProductModal()">إضافة منتج</button>
        </div>
        <table>
            <thead><tr><th>المنتج</th><th>السعر</th><th>الكمية</th><th>التاجر</th><th>الإجراءات</th></tr></thead>
            <tbody>
                ${products.slice(0, 10).map(p => `
                    <tr>
                        <td>${p.name}</td>
                        <td>${p.price} دج</td>
                        <td>${p.stock}</td>
                        <td style="color: ${users.find(u => u.name === p.merchantName)?.storeColor || '#9b59b6'}; font-weight: bold;">${p.merchantName}</td>
                        <td>
                            <button class="btn-outline-gold" onclick="editProduct(${p.id})" style="padding: 3px 8px;">تعديل</button>
                            <button class="btn-outline-gold" onclick="deleteProduct(${p.id})" style="padding: 3px 8px; background: #f87171;">حذف</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function showDashboardMerchants(container) {
    const approvedMerchants = users.filter(u => u.role === 'merchant_approved');

    container.innerHTML = `
        <h3 style="margin-bottom: 20px; color: var(--gold);">التجار المعتمدون</h3>
        ${approvedMerchants.map(m => `
            <div style="background: var(--glass); border: 2px solid ${m.storeColor || '#4ade80'}; border-radius: 10px; padding: 15px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 20px; height: 20px; border-radius: 50%; background: ${m.storeColor || '#9b59b6'};"></div>
                    <div style="flex: 1;">
                        <p><strong>${m.name}</strong> - ${m.storeName}</p>
                        <p>👤 ${m.username || m.email} | 🔐 ${m.password}</p>
                        <p>📦 ${products.filter(p => p.merchantName === m.name || p.merchantName === m.storeName).length}/${m.productsLimit || 5} منتج</p>
                    </div>
                </div>
            </div>
        `).join('')}
    `;
}

function showDashboardPendingMerchants(container) {
    const pendingMerchants = users.filter(u => u.role === 'merchant_pending');

    container.innerHTML = `
        <h3 style="margin-bottom: 20px; color: var(--gold);">طلبات التجار (${pendingMerchants.length})</h3>
        ${pendingMerchants.map(m => `
            <div style="background: var(--glass); border: 1px solid var(--gold); border-radius: 10px; padding: 15px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="width: 50px; height: 50px; background: var(--gold); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-user" style="font-size: 25px;"></i>
                    </div>
                    <div style="flex: 1;">
                        <p><strong>${m.name}</strong> - ${m.email}</p>
                        <p>متجر: ${m.storeName || 'غير محدد'} | مستوى: ${m.merchantLevel || 1}</p>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn-gold" onclick="approveMerchant(${m.id})" style="padding: 5px 10px;">✅ قبول</button>
                        <button class="btn-outline-gold" onclick="rejectMerchant(${m.id})" style="padding: 5px 10px;">❌ رفض</button>
                    </div>
                </div>
            </div>
        `).join('')}
    `;
}

function showPendingMerchantsModal() {
    const pendingMerchants = users.filter(u => u.role === 'merchant_pending');
    const list = document.getElementById('merchantRequestsList');
    
    list.innerHTML = pendingMerchants.map(m => `
        <div style="background: var(--glass); border: 2px solid var(--gold); border-radius: 20px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 15px;">
                <div style="width: 60px; height: 60px; background: var(--gold); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-store" style="font-size: 30px; color: var(--bg-primary);"></i>
                </div>
                <div>
                    <h3 style="color: var(--gold); font-size: 20px;">${m.name}</h3>
                    <p><i class="fas fa-envelope"></i> ${m.email}</p>
                    <p><i class="fas fa-phone"></i> ${m.phone || 'غير متوفر'}</p>
                </div>
            </div>
            
            <div style="background: rgba(212, 175, 55, 0.1); padding: 15px; border-radius: 15px; margin-bottom: 15px;">
                <p><strong>🏪 اسم المتجر:</strong> ${m.storeName || 'غير محدد'}</p>
                <p><strong>📝 الوصف:</strong> ${m.merchantDesc || 'لا يوجد وصف'}</p>
                <p><strong>📊 المستوى المطلوب:</strong> ${m.merchantLevel || '1'}</p>
            </div>
            
            <div style="display: flex; gap: 15px;">
                <button class="btn-gold" onclick="approveMerchant(${m.id}); closeModal('merchantRequestsModal');" style="flex: 1;">
                    <i class="fas fa-check"></i> قبول
                </button>
                <button class="btn-outline-gold" onclick="rejectMerchant(${m.id}); closeModal('merchantRequestsModal');" style="flex: 1;">
                    <i class="fas fa-times"></i> رفض
                </button>
            </div>
        </div>
    `).join('');
    
    document.getElementById('merchantRequestsModal').style.display = 'flex';
}

// ========== 27. إدارة المنتجات ==========
function showAddProductModal() {
    if (!currentUser) {
        showNotification('يجب تسجيل الدخول أولاً', 'warning');
        openLoginModal();
        return;
    }

    if (currentUser.role === 'merchant_approved' || currentUser.role === 'admin') {
        // التحقق من حد المنتجات للتاجر
        if (currentUser.role === 'merchant_approved') {
            const merchantProducts = products.filter(p => p.merchantName === currentUser.name || p.merchantName === currentUser.storeName).length;
            const maxProducts = currentUser.productsLimit || 5;
            
            if (merchantProducts >= maxProducts && !currentUser.canAddProducts) {
                showNotification(`❌ وصلت للحد الأقصى (${maxProducts} منتج)`, 'error');
                return;
            }
        }
        
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
        merchantName: currentUser.storeName || currentUser.name,
        merchantId: currentUser.id
    };

    const result = await addProductToTelegram(product);
    
    if (result.ok) {
        showNotification(`✅ تم إضافة المنتج ${name} بنجاح`, 'success');
        closeModal('productModal');
        
        // تحديث المنتجات
        await loadProducts();
        
        // تحديث لوحة التاجر
        if (currentUser.role === 'merchant_approved') {
            showMerchantPanel();
        }
    } else {
        showNotification('❌ فشل إضافة المنتج', 'error');
    }
}

function editProduct(id) {
    const product = products.find(p => p.id == id);
    if (!product) return;
    
    if (currentUser.role !== 'admin' && currentUser.name !== product.merchantName && currentUser.storeName !== product.merchantName) {
        showNotification('❌ لا يمكنك تعديل منتجات الآخرين', 'error');
        return;
    }
    
    document.getElementById('modalTitle').textContent = 'تعديل المنتج';
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('editingProductId').value = id;
    document.getElementById('productModal').style.display = 'flex';
    
    // عرض الصور الموجودة
    if (product.images && product.images.length > 0) {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = product.images.map(img => 
            `<img src="${img}" class="preview-image">`
        ).join('');
        document.getElementById('productImagesData').value = JSON.stringify(product.images);
    }
}

function deleteProduct(id) {
    const product = products.find(p => p.id == id);
    if (!product) return;
    
    if (currentUser.role !== 'admin' && currentUser.name !== product.merchantName && currentUser.storeName !== product.merchantName) {
        showNotification('❌ لا يمكنك حذف منتجات الآخرين', 'error');
        return;
    }
    
    if (confirm(`هل أنت متأكد من حذف المنتج: ${product.name}؟`)) {
        products = products.filter(p => p.id != id);
        localStorage.setItem('nardoo_products', JSON.stringify(products));
        displayProducts();
        showNotification(`✅ تم حذف المنتج ${product.name}`, 'info');
        
        // تحديث لوحة التاجر
        if (currentUser.role === 'merchant_approved') {
            showMerchantPanel();
        }
    }
}

function viewProductDetails(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');

    const images = product.images?.map(img => `
        <img src="${img}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 20px; margin-bottom: 10px;">
    `).join('') || '<div style="height: 300px; background: var(--nardoo); display: flex; align-items: center; justify-content: center; border-radius: 20px;"><i class="fas fa-image" style="font-size: 80px; color: var(--gold);"></i></div>';

    const merchant = users.find(u => u.name === product.merchantName || u.storeName === product.merchantName);
    const merchantColor = merchant?.storeColor || '#9b59b6';

    content.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 20px; color: var(--gold);">${product.name}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <div><div style="display: grid; gap: 10px;">${images}</div></div>
            <div>
                <div style="margin-bottom: 20px;">
                    <span style="background: var(--gold); padding: 5px 15px; border-radius: 20px; color: var(--bg-primary); font-weight: 700;">${getCategoryName(product.category)}</span>
                </div>
                <p style="margin-bottom: 20px;">${product.description}</p>
                <p style="margin-bottom: 20px;">منتج من 
                    <span style="color: ${merchantColor}; font-weight: bold;">${product.merchantName}</span>
                </p>
                <div class="product-rating"><div class="stars-container">${generateStars(product.rating || 4.5)}</div><span class="rating-value">${(product.rating || 4.5).toFixed(1)}</span></div>
                <div style="margin-bottom: 20px;"><span style="font-size: 32px; font-weight: 800; color: var(--gold);">${product.price.toLocaleString()} دج</span></div>
                <div style="margin-bottom: 20px;"><span class="product-stock ${product.stock <= 0 ? 'out-of-stock' : product.stock < 5 ? 'low-stock' : 'in-stock'}">${product.stock <= 0 ? 'غير متوفر' : product.stock < 5 ? `كمية محدودة (${product.stock})` : `متوفر (${product.stock})`}</span></div>
                <div style="display: flex; gap: 15px;">
                    <button class="btn-gold" onclick="addToCart(${product.id}); closeModal('productDetailModal')">أضف للسلة</button>
                    <button class="btn-outline-gold" onclick="closeModal('productDetailModal')">إغلاق</button>
                    ${currentUser?.role === 'admin' || (currentUser?.role === 'merchant_approved' && (currentUser?.name === product.merchantName || currentUser?.storeName === product.merchantName)) ? `
                        <button class="btn-outline-gold" onclick="editProduct(${product.id}); closeModal('productDetailModal')">تعديل</button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

// ========== 28. نظام الإشعارات ==========
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

// ========== 29. دوال التمرير ==========
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

// ========== 31. تأثيرات إضافية ==========
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

// ========== 32. الاستماع لأوامر تلجرام ==========
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
}, 10000); // كل 10 ثواني

// ========== 33. التهيئة ==========
window.onload = function() {
    // تحميل المنتجات
    loadProducts();
    
    // تحميل السلة
    loadCart();

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

    // إخفاء شاشة التحميل
    setTimeout(() => {
        document.getElementById('loader').style.opacity = '0';
        setTimeout(() => document.getElementById('loader').style.display = 'none', 500);
    }, 1000);

    // إضافة مستمعين
    window.addEventListener('scroll', toggleQuickTopButton);
    
    // إضافة تأثيرات
    updateCountdown();
    initMouseEffects();
    initScrollProgress();
    initParticles();
    
    // تأثير الكتابة
    const typingElement = document.getElementById('typing-text');
    if (typingElement) {
        const texts = ['نكهة وجمال', 'ناردو برو', 'تسوق آمن', 'جودة عالية', 'منتجات أصلية'];
        let i = 0;
        setInterval(() => {
            typingElement.innerHTML = texts[i % texts.length] + '<span class="typing-cursor">|</span>';
            i++;
        }, 2000);
    }
    
    console.log('✅ تم تهيئة المتجر بنجاح');
};

// ========== 34. إغلاق النوافذ المنبثقة ==========
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// ========== 35. عرض التحديثات المعالجة ==========
function showProcessedUpdates() {
    const processed = JSON.parse(localStorage.getItem(PROCESSED_UPDATES_KEY)) || [];
    console.log('📋 آخر التحديثات المعالجة:', processed);
    showNotification(`📋 عدد التحديثات المعالجة: ${processed.length}`, 'info');
}

// ========== 36. تصدير الدوال للاستخدام العام ==========
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
window.showProcessedUpdates = showProcessedUpdates;
window.showPendingMerchantsModal = showPendingMerchantsModal;
