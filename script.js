// ========== ناردو برو - النظام النهائي الكامل ==========

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
                phone: '0555000000',
                telegram: '@admin_nardoo',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('nardoo_users', JSON.stringify(users));
    }
}
loadUsers();

// ========== 4. تحميل المنتجات ==========
function loadProducts() {
    const saved = localStorage.getItem('nardoo_products');
    if (saved) {
        products = JSON.parse(saved);
    }
}
loadProducts();

// ========== 5. تحميل السلة ==========
function loadCart() {
    const saved = localStorage.getItem('nardoo_cart');
    if (saved) {
        cart = JSON.parse(saved);
    }
}
loadCart();

// ========== 6. حفظ البيانات ==========
function saveUsers() {
    localStorage.setItem('nardoo_users', JSON.stringify(users));
}

function saveProducts() {
    localStorage.setItem('nardoo_products', JSON.stringify(products));
}

function saveCart() {
    localStorage.setItem('nardoo_cart', JSON.stringify(cart));
}

// ========== 7. دوال تليجرام ==========
async function sendTelegramMessage(chatId, message) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        return await response.json();
    } catch (error) {
        console.error('خطأ تليجرام:', error);
        return { ok: false };
    }
}

async function sendTelegramPhoto(chatId, imageFile, caption) {
    try {
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('photo', imageFile);
        formData.append('caption', caption);

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendPhoto`, {
            method: 'POST',
            body: formData
        });
        return await response.json();
    } catch (error) {
        console.error('خطأ في إرسال الصورة:', error);
        return { ok: false };
    }
}

// ========== 8. إرسال طلب تاجر للمدير ==========
async function sendMerchantRequestToAdmin(merchant) {
    const message = `
🆕 **طلب تاجر جديد ينتظر الموافقة**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 **الاسم:** ${merchant.name}
🏪 **المتجر:** ${merchant.storeName}
📧 **البريد:** ${merchant.email}
📱 **الهاتف:** ${merchant.phone}
📱 **تليجرام:** ${merchant.telegram || 'غير محدد'}
📊 **المستوى:** ${merchant.merchantLevel}
📅 **التاريخ:** ${new Date().toLocaleString('ar-EG')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ **للموافقة:** سجل دخول كمدير
    `;
    return await sendTelegramMessage(TELEGRAM.adminId, message);
}

// ========== 9. إرسال إشعار موافقة للتاجر ==========
async function sendApprovalToMerchant(merchant) {
    const message = `
🎉 **تهانينا! تمت الموافقة على طلبك**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏪 **متجرك:** ${merchant.storeName}
👤 **اسمك:** ${merchant.name}
📱 **تليجرام:** ${merchant.telegram}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ **يمكنك الآن:**
✅ إضافة منتجات جديدة
✅ إدارة متجرك
✅ متابعة طلباتك
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 **رابط المتجر:** ${window.location.origin}
    `;
    if (merchant.telegram) {
        return await sendTelegramMessage(merchant.telegram.replace('@', ''), message);
    }
    return { ok: false };
}

// ========== 10. إرسال منتج إلى قناة تليجرام ==========
async function sendProductToChannel(product, imageFile) {
    const caption = `
🛍️ **منتج جديد في المتجر**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 **الاسم:** ${product.name}
💰 **السعر:** ${product.price} دج
📊 **الكمية:** ${product.stock}
🏷️ **القسم:** ${getCategoryName(product.category)}
👤 **التاجر:** ${product.merchantName}
📱 **تليجرام:** ${product.merchantTelegram || 'غير محدد'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ **للطلب:** تواصل مع التاجر مباشرة
    `;
    return await sendTelegramPhoto(TELEGRAM.channelId, imageFile, caption);
}

// ========== 11. إرسال طلب جديد للتاجر ==========
async function sendOrderToMerchant(merchantTelegram, order) {
    const message = `
🟢 **طلب جديد من متجرك**
━━━━━━━━━━━━━━━━━━━━━━━━
👤 **الزبون:** ${order.customerName}
📞 **الهاتف:** ${order.customerPhone}
📍 **العنوان:** ${order.customerAddress}

📦 **المنتجات:**
${order.items.map(i => `  • ${i.name} x${i.quantity} = ${i.price * i.quantity} دج`).join('\n')}

💰 **الإجمالي:** ${order.total} دج
📅 **التاريخ:** ${new Date().toLocaleString('ar-EG')}
    `;
    if (merchantTelegram) {
        return await sendTelegramMessage(merchantTelegram.replace('@', ''), message);
    }
}

// ========== 12. اسم القسم ==========
function getCategoryName(cat) {
    const names = {
        'promo': 'برومسيون',
        'spices': 'توابل',
        'cosmetic': 'كوسمتيك',
        'other': 'منتوجات أخرى'
    };
    return names[cat] || cat;
}

// ========== 13. القائمة الرئيسية ==========
function showMainMenu() {
    console.clear();
    console.log('\n🛍️ **ناردو برو - المتجر الذكي**');
    console.log('═══════════════════════════════');
    
    const stats = {
        products: products.length,
        merchants: users.filter(u => u.role === 'merchant_approved').length,
        pending: users.filter(u => u.role === 'merchant_pending').length,
        users: users.length
    };
    
    console.log(`📊 **إحصائيات سريعة:**`);
    console.log(`• المنتجات: ${stats.products}`);
    console.log(`• التجار المعتمدين: ${stats.merchants}`);
    console.log(`• التجار المنتظرين: ${stats.pending}`);
    console.log(`• المستخدمين: ${stats.users}`);
    console.log('═══════════════════════════════');
    console.log('1️⃣ تسجيل الدخول');
    console.log('2️⃣ تسجيل كتاجر جديد');
    console.log('3️⃣ تصفح المنتجات');
    console.log('4️⃣ عرض السلة');
    console.log('5️⃣ عرض الإحصائيات');
    console.log('6️⃣ خروج');
    console.log('═══════════════════════════════');
    
    const choice = prompt('اختر رقم:');
    
    switch(choice) {
        case '1': login(); break;
        case '2': registerMerchant(); break;
        case '3': browseProducts(); break;
        case '4': showCart(); break;
        case '5': showStatistics(); break;
        case '6': console.log('👋 وداعاً'); break;
        default: showMainMenu();
    }
}

// ========== 14. تسجيل الدخول ==========
function login() {
    console.clear();
    console.log('\n🔐 **تسجيل الدخول**');
    console.log('══════════════════');
    
    const email = prompt('📧 البريد الإلكتروني:');
    const password = prompt('🔑 كلمة المرور:');
    
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('current_user', JSON.stringify(user));
        console.log(`✅ مرحباً ${user.name}`);
        
        if (user.role === 'admin') {
            showAdminMenu();
        } else if (user.role === 'merchant_approved') {
            showMerchantMenu();
        } else if (user.role === 'merchant_pending') {
            console.log('⏳ حسابك قيد المراجعة، انتظر موافقة المدير');
            setTimeout(showMainMenu, 2000);
        } else {
            showCustomerMenu();
        }
    } else {
        console.log('❌ بيانات غير صحيحة');
        setTimeout(showMainMenu, 2000);
    }
}

// ========== 15. تسجيل تاجر جديد ==========
async function registerMerchant() {
    console.clear();
    console.log('\n📝 **تسجيل تاجر جديد**');
    console.log('══════════════════════');
    
    const name = prompt('👤 الاسم الكامل:');
    if (!name) return showMainMenu();
    
    const email = prompt('📧 البريد الإلكتروني:');
    if (!email) return showMainMenu();
    
    if (users.find(u => u.email === email)) {
        console.log('❌ البريد مستخدم بالفعل');
        setTimeout(showMainMenu, 2000);
        return;
    }
    
    const password = prompt('🔑 كلمة المرور:');
    if (!password) return showMainMenu();
    
    const phone = prompt('📱 رقم الهاتف:');
    if (!phone) return showMainMenu();
    
    const telegram = prompt('📱 معرف تليجرام (اختياري):', '@username');
    const storeName = prompt('🏪 اسم المتجر:');
    if (!storeName) return showMainMenu();
    
    const merchantLevel = prompt('📊 مستوى التاجر (1-2-3):', '2');

    const newMerchant = {
        id: users.length + 1,
        name,
        email,
        password,
        phone,
        telegram: telegram || '@' + name.replace(/\s+/g, ''),
        storeName,
        merchantLevel: merchantLevel || '2',
        role: 'merchant_pending',
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    users.push(newMerchant);
    saveUsers();
    
    console.log('📤 جاري إرسال طلبك للمدير...');
    
    const result = await sendMerchantRequestToAdmin(newMerchant);
    
    if (result.ok) {
        console.log('✅ تم إرسال طلبك للمدير، انتظر الموافقة');
    } else {
        console.log('⚠️ تم التسجيل ولكن فشل إرسال الإشعار');
    }
    
    setTimeout(showMainMenu, 3000);
}

// ========== 16. قائمة المدير ==========
function showAdminMenu() {
    console.clear();
    console.log(`\n👑 **قائمة المدير** - ${currentUser.name}`);
    console.log('═══════════════════════════');
    
    const pendingCount = users.filter(u => u.role === 'merchant_pending').length;
    const merchantsCount = users.filter(u => u.role === 'merchant_approved').length;
    const productsCount = products.length;
    
    console.log(`📊 **إحصائيات:**`);
    console.log(`• التجار المنتظرين: ${pendingCount}`);
    console.log(`• التجار المعتمدين: ${merchantsCount}`);
    console.log(`• المنتجات: ${productsCount}`);
    console.log('═══════════════════════════');
    console.log('1️⃣ الموافقة على طلبات التجار');
    console.log('2️⃣ عرض جميع المنتجات');
    console.log('3️⃣ عرض جميع المستخدمين');
    console.log('4️⃣ إضافة منتج (كمدير)');
    console.log('5️⃣ تسجيل خروج');
    console.log('═══════════════════════════');
    
    const choice = prompt('اختر رقم:');
    
    switch(choice) {
        case '1': approveMerchants(); break;
        case '2': viewAllProducts(); break;
        case '3': viewAllUsers(); break;
        case '4': addProductAsAdmin(); break;
        case '5': 
            currentUser = null;
            localStorage.removeItem('current_user');
            showMainMenu();
            break;
        default: showAdminMenu();
    }
}

// ========== 17. الموافقة على التجار ==========
function approveMerchants() {
    console.clear();
    const pending = users.filter(u => u.role === 'merchant_pending');
    
    if (pending.length === 0) {
        console.log('✅ لا يوجد تجار في انتظار الموافقة');
        setTimeout(showAdminMenu, 2000);
        return;
    }
    
    console.log('\n📋 **قائمة التجار المنتظرين:**');
    console.log('══════════════════════════════');
    
    pending.forEach((m, i) => {
        console.log(`\n${i+1}. **${m.storeName}**`);
        console.log(`   👤 ${m.name}`);
        console.log(`   📧 ${m.email}`);
        console.log(`   📱 ${m.phone}`);
        console.log(`   📱 ${m.telegram}`);
        console.log(`   📅 ${new Date(m.createdAt).toLocaleDateString('ar-EG')}`);
    });
    
    const num = prompt('\nأدخل رقم التاجر للموافقة (أو 0 للرجوع):');
    if (!num || num === '0') return showAdminMenu();
    
    const index = parseInt(num) - 1;
    if (index >= 0 && index < pending.length) {
        const merchant = pending[index];
        
        merchant.role = 'merchant_approved';
        merchant.status = 'approved';
        merchant.approvedAt = new Date().toISOString();
        merchant.approvedBy = currentUser.id;
        
        saveUsers();
        
        // إرسال إشعار للتاجر
        sendApprovalToMerchant(merchant);
        
        console.log(`✅ تمت الموافقة على ${merchant.storeName}`);
        console.log(`📧 تم إرسال إشعار إلى ${merchant.telegram}`);
    }
    
    setTimeout(showAdminMenu, 3000);
}

// ========== 18. إضافة منتج كمدير ==========
async function addProductAsAdmin() {
    console.clear();
    console.log('\n📦 **إضافة منتج جديد (كمدير)**');
    console.log('═══════════════════════════');
    
    const name = prompt('📦 اسم المنتج:');
    if (!name) return showAdminMenu();
    
    const price = parseInt(prompt('💰 السعر (دج):'));
    if (!price) return showAdminMenu();
    
    const stock = parseInt(prompt('📊 الكمية:'));
    if (!stock) return showAdminMenu();
    
    const category = prompt('🏷️ القسم (promo/spices/cosmetic/other):', 'spices');
    
    console.log('⚠️ للتجربة: سيتم استخدام صورة افتراضية');
    
    // منتج جديد
    const product = {
        id: Date.now(),
        name,
        price,
        stock,
        category,
        merchantName: 'المدير ' + currentUser.name,
        merchantTelegram: currentUser.telegram,
        images: ['https://via.placeholder.com/300'],
        createdAt: new Date().toISOString(),
        rating: 5.0
    };
    
    products.push(product);
    saveProducts();
    
    console.log('✅ تم إضافة المنتج بنجاح');
    console.log(`📦 ${name} - ${price} دج - الكمية: ${stock}`);
    
    setTimeout(showAdminMenu, 2000);
}

// ========== 19. عرض جميع المنتجات ==========
function viewAllProducts() {
    console.clear();
    
    if (products.length === 0) {
        console.log('📭 لا توجد منتجات');
        setTimeout(showAdminMenu, 2000);
        return;
    }
    
    console.log('\n📦 **جميع المنتجات:**');
    console.log('═══════════════════');
    
    products.forEach((p, i) => {
        console.log(`\n${i+1}. **${p.name}**`);
        console.log(`   💰 ${p.price} دج`);
        console.log(`   📊 الكمية: ${p.stock}`);
        console.log(`   🏪 التاجر: ${p.merchantName}`);
        console.log(`   🏷️ ${getCategoryName(p.category)}`);
        console.log(`   ⭐ ${p.rating || 4.5}`);
    });
    
    console.log(`\n📊 إجمالي: ${products.length} منتج`);
    
    setTimeout(showAdminMenu, 5000);
}

// ========== 20. عرض جميع المستخدمين ==========
function viewAllUsers() {
    console.clear();
    
    console.log('\n👥 **جميع المستخدمين:**');
    console.log('════════════════════');
    
    users.forEach((u, i) => {
        let roleIcon = u.role === 'admin' ? '👑' : 
                      u.role === 'merchant_approved' ? '✅' :
                      u.role === 'merchant_pending' ? '⏳' : '👤';
        
        let roleName = u.role === 'admin' ? 'مدير' : 
                      u.role === 'merchant_approved' ? 'تاجر معتمد' :
                      u.role === 'merchant_pending' ? 'تاجر منتظر' : 'عميل';
        
        console.log(`\n${i+1}. ${roleIcon} **${u.name}**`);
        console.log(`   📧 ${u.email}`);
        console.log(`   📱 ${u.phone || 'غير محدد'}`);
        console.log(`   📱 ${u.telegram || 'غير محدد'}`);
        console.log(`   🏷️ ${roleName}`);
        if (u.storeName) console.log(`   🏪 ${u.storeName}`);
    });
    
    console.log(`\n📊 إجمالي: ${users.length} مستخدم`);
    
    setTimeout(showAdminMenu, 5000);
}

// ========== 21. قائمة التاجر ==========
function showMerchantMenu() {
    console.clear();
    console.log(`\n👨‍💼 **قائمة التاجر** - ${currentUser.storeName}`);
    console.log('═══════════════════════════════');
    
    const myProducts = products.filter(p => p.merchantName === currentUser.storeName);
    const inStock = myProducts.filter(p => p.stock > 0).length;
    
    console.log(`📊 **إحصائيات متجرك:**`);
    console.log(`• إجمالي المنتجات: ${myProducts.length}`);
    console.log(`• المنتجات المتاحة: ${inStock}`);
    console.log('═══════════════════════════════');
    console.log('1️⃣ إضافة منتج جديد');
    console.log('2️⃣ عرض منتجاتي');
    console.log('3️⃣ تحديث كمية منتج');
    console.log('4️⃣ حذف منتج');
    console.log('5️⃣ تسجيل خروج');
    console.log('═══════════════════════════════');
    
    const choice = prompt('اختر رقم:');
    
    switch(choice) {
        case '1': addProductAsMerchant(); break;
        case '2': viewMyProducts(); break;
        case '3': updateProductStock(); break;
        case '4': deleteMyProduct(); break;
        case '5': 
            currentUser = null;
            localStorage.removeItem('current_user');
            showMainMenu();
            break;
        default: showMerchantMenu();
    }
}

// ========== 22. إضافة منتج كتاجر ==========
async function addProductAsMerchant() {
    console.clear();
    console.log('\n📦 **إضافة منتج جديد**');
    console.log('═══════════════════════');
    
    const name = prompt('📦 اسم المنتج:');
    if (!name) return showMerchantMenu();
    
    const price = parseInt(prompt('💰 السعر (دج):'));
    if (!price) return showMerchantMenu();
    
    const stock = parseInt(prompt('📊 الكمية:'));
    if (!stock) return showMerchantMenu();
    
    const category = prompt('🏷️ القسم (promo/spices/cosmetic/other):', 'spices');
    
    console.log('📤 جاري إرسال المنتج إلى تليجرام...');
    
    // منتج جديد
    const product = {
        id: Date.now(),
        name,
        price,
        stock,
        category,
        merchantName: currentUser.storeName,
        merchantTelegram: currentUser.telegram,
        images: ['https://via.placeholder.com/300'],
        createdAt: new Date().toISOString(),
        rating: 4.5
    };
    
    products.push(product);
    saveProducts();
    
    console.log('✅ تم إضافة المنتج بنجاح');
    console.log(`📦 ${name} - ${price} دج - الكمية: ${stock}`);
    console.log('📱 المنتج سيظهر في المتجر وقناة تليجرام');
    
    setTimeout(showMerchantMenu, 3000);
}

// ========== 23. عرض منتجات التاجر ==========
function viewMyProducts() {
    console.clear();
    
    const myProducts = products.filter(p => p.merchantName === currentUser.storeName);
    
    if (myProducts.length === 0) {
        console.log('📭 لا توجد منتجات');
        setTimeout(showMerchantMenu, 2000);
        return;
    }
    
    console.log(`\n📦 **منتجات ${currentUser.storeName}:**`);
    console.log('═══════════════════════════');
    
    myProducts.forEach((p, i) => {
        const stockStatus = p.stock > 0 ? `📦 ${p.stock}` : '❌ نفذ';
        console.log(`\n${i+1}. **${p.name}**`);
        console.log(`   💰 ${p.price} دج - ${stockStatus}`);
        console.log(`   🏷️ ${getCategoryName(p.category)}`);
        console.log(`   ⭐ ${p.rating || 4.5}`);
    });
    
    console.log(`\n📊 إجمالي: ${myProducts.length} منتج`);
    
    setTimeout(showMerchantMenu, 4000);
}

// ========== 24. تحديث كمية منتج ==========
function updateProductStock() {
    console.clear();
    
    const myProducts = products.filter(p => p.merchantName === currentUser.storeName);
    
    if (myProducts.length === 0) {
        console.log('📭 لا توجد منتجات');
        setTimeout(showMerchantMenu, 2000);
        return;
    }
    
    console.log('\n📊 **اختر منتج لتحديث الكمية:**');
    console.log('═══════════════════════════════');
    
    myProducts.forEach((p, i) => {
        console.log(`${i+1}. ${p.name} - الكمية الحالية: ${p.stock}`);
    });
    
    const num = prompt('\nأدخل رقم المنتج:');
    if (!num) return showMerchantMenu();
    
    const index = parseInt(num) - 1;
    if (index >= 0 && index < myProducts.length) {
        const product = myProducts[index];
        const newStock = parseInt(prompt(`الكمية الجديدة لـ ${product.name}:`, product.stock));
        
        if (newStock >= 0) {
            product.stock = newStock;
            saveProducts();
            console.log(`✅ تم تحديث الكمية إلى ${newStock}`);
        }
    }
    
    setTimeout(showMerchantMenu, 2000);
}

// ========== 25. حذف منتج ==========
function deleteMyProduct() {
    console.clear();
    
    const myProducts = products.filter(p => p.merchantName === currentUser.storeName);
    
    if (myProducts.length === 0) {
        console.log('📭 لا توجد منتجات');
        setTimeout(showMerchantMenu, 2000);
        return;
    }
    
    console.log('\n🗑️ **اختر منتج للحذف:**');
    console.log('═══════════════════════');
    
    myProducts.forEach((p, i) => {
        console.log(`${i+1}. ${p.name}`);
    });
    
    const num = prompt('\nأدخل رقم المنتج:');
    if (!num) return showMerchantMenu();
    
    const index = parseInt(num) - 1;
    if (index >= 0 && index < myProducts.length) {
        const product = myProducts[index];
        
        if (confirm(`هل أنت متأكد من حذف ${product.name}؟`)) {
            products = products.filter(p => p.id !== product.id);
            saveProducts();
            console.log(`✅ تم حذف ${product.name}`);
        }
    }
    
    setTimeout(showMerchantMenu, 2000);
}

// ========== 26. قائمة العميل ==========
function showCustomerMenu() {
    console.clear();
    console.log(`\n🛒 **قائمة العميل** - ${currentUser.name}`);
    console.log('═══════════════════════════');
    
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    console.log(`🛍️ السلة: ${cartCount} منتج`);
    console.log('═══════════════════════════');
    console.log('1️⃣ تصفح المنتجات');
    console.log('2️⃣ عرض السلة');
    console.log('3️⃣ إتمام الشراء');
    console.log('4️⃣ تسجيل خروج');
    console.log('═══════════════════════════');
    
    const choice = prompt('اختر رقم:');
    
    switch(choice) {
        case '1': browseProducts(); break;
        case '2': showCart(); break;
        case '3': checkout(); break;
        case '4': 
            currentUser = null;
            localStorage.removeItem('current_user');
            showMainMenu();
            break;
        default: showCustomerMenu();
    }
}

// ========== 27. تصفح المنتجات ==========
function browseProducts() {
    console.clear();
    
    if (products.length === 0) {
        console.log('📭 لا توجد منتجات');
        setTimeout(() => {
            currentUser ? showCustomerMenu() : showMainMenu();
        }, 2000);
        return;
    }
    
    console.log('\n🛍️ **جميع المنتجات:**');
    console.log('════════════════════');
    
    products.forEach((p, i) => {
        const stockStatus = p.stock > 0 ? `📦 ${p.stock}` : '❌ نفذ';
        console.log(`\n${i+1}. **${p.name}**`);
        console.log(`   💰 ${p.price} دج - ${stockStatus}`);
        console.log(`   🏪 ${p.merchantName}`);
        console.log(`   🏷️ ${getCategoryName(p.category)}`);
        console.log(`   ⭐ ${p.rating || 4.5}`);
    });
    
    if (currentUser) {
        const num = prompt('\nأدخل رقم المنتج للإضافة للسلة (أو 0 للرجوع):');
        if (num && num !== '0') {
            const index = parseInt(num) - 1;
            if (index >= 0 && index < products.length) {
                addToCart(products[index]);
            }
        } else {
            showCustomerMenu();
        }
    } else {
        console.log('\n🔐 سجل دخول للشراء');
        setTimeout(showMainMenu, 3000);
    }
}

// ========== 28. إضافة للسلة ==========
function addToCart(product) {
    if (product.stock <= 0) {
        console.log('❌ المنتج غير متوفر');
        setTimeout(browseProducts, 1500);
        return;
    }
    
    const qty = parseInt(prompt(`الكمية المطلوبة من ${product.name}:`, '1'));
    
    if (!qty || qty <= 0) return browseProducts();
    
    if (qty > product.stock) {
        console.log(`❌ الكمية المطلوبة (${qty}) أكبر من المتوفر (${product.stock})`);
        setTimeout(browseProducts, 1500);
        return;
    }
    
    const existing = cart.find(item => item.productId === product.id);
    
    if (existing) {
        existing.quantity += qty;
    } else {
        cart.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: qty,
            merchantName: product.merchantName,
            merchantTelegram: product.merchantTelegram
        });
    }
    
    // تحديث المخزون
    product.stock -= qty;
    saveProducts();
    saveCart();
    
    console.log(`✅ تمت إضافة ${qty} من ${product.name} إلى السلة`);
    setTimeout(browseProducts, 1500);
}

// ========== 29. عرض السلة ==========
function showCart() {
    console.clear();
    
    if (cart.length === 0) {
        console.log('🛒 السلة فارغة');
        setTimeout(() => {
            currentUser ? showCustomerMenu() : showMainMenu();
        }, 1500);
        return;
    }
    
    console.log('\n🛒 **سلة التسوق:**');
    console.log('══════════════════');
    
    let total = 0;
    cart.forEach((item, i) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        console.log(`\n${i+1}. **${item.name}**`);
        console.log(`   🏪 ${item.merchantName}`);
        console.log(`   ${item.quantity} × ${item.price} = ${itemTotal} دج`);
    });
    
    console.log(`\n💰 **الإجمالي: ${total} دج**`);
    console.log('══════════════════');
    console.log('1️⃣ إتمام الشراء');
    console.log('2️⃣ تعديل الكمية');
    console.log('3️⃣ إزالة منتج');
    console.log('4️⃣ رجوع');
    
    const choice = prompt('اختر رقم:');
    
    if (choice === '1') {
        checkout();
    } else if (choice === '2') {
        updateCartQuantity();
    } else if (choice === '3') {
        removeFromCart();
    } else {
        currentUser ? showCustomerMenu() : showMainMenu();
    }
}

// ========== 30. تحديث كمية في السلة ==========
function updateCartQuantity() {
    console.clear();
    
    console.log('\n📝 **تحديث الكمية:**');
    console.log('═══════════════════');
    
    cart.forEach((item, i) => {
        console.log(`${i+1}. ${item.name} - الكمية: ${item.quantity}`);
    });
    
    const num = prompt('\nأدخل رقم المنتج:');
    if (!num) return showCart();
    
    const index = parseInt(num) - 1;
    if (index >= 0 && index < cart.length) {
        const item = cart[index];
        const product = products.find(p => p.id === item.productId);
        
        const newQty = parseInt(prompt('الكمية الجديدة:', item.quantity));
        
        if (newQty > 0) {
            // إعادة الكمية القديمة للمخزون
            product.stock += item.quantity;
            // خذ الكمية الجديدة
            if (newQty <= product.stock) {
                item.quantity = newQty;
                product.stock -= newQty;
                saveProducts();
                saveCart();
                console.log('✅ تم التحديث');
            } else {
                console.log('❌ الكمية غير متوفرة');
            }
        } else if (newQty === 0) {
            // إزالة من السلة
            product.stock += item.quantity;
            cart.splice(index, 1);
            saveProducts();
            saveCart();
            console.log('✅ تمت الإزالة من السلة');
        }
    }
    
    setTimeout(showCart, 1500);
}

// ========== 31. إزالة من السلة ==========
function removeFromCart() {
    console.clear();
    
    console.log('\n🗑️ **إزالة من السلة:**');
    console.log('═══════════════════');
    
    cart.forEach((item, i) => {
        console.log(`${i+1}. ${item.name}`);
    });
    
    const num = prompt('\nأدخل رقم المنتج:');
    if (!num) return showCart();
    
    const index = parseInt(num) - 1;
    if (index >= 0 && index < cart.length) {
        const item = cart[index];
        const product = products.find(p => p.id === item.productId);
        
        // إعادة الكمية للمخزون
        product.stock += item.quantity;
        cart.splice(index, 1);
        
        saveProducts();
        saveCart();
        
        console.log(`✅ تمت إزالة ${item.name} من السلة`);
    }
    
    setTimeout(showCart, 1500);
}

// ========== 32. إتمام الشراء ==========
async function checkout() {
    if (cart.length === 0) {
        console.log('🛒 السلة فارغة');
        setTimeout(showMainMenu, 1500);
        return;
    }
    
    console.clear();
    console.log('\n📋 **إتمام الشراء**');
    console.log('══════════════════');
    
    const phone = prompt('📞 رقم الهاتف للتوصيل:', currentUser?.phone || '');
    if (!phone) return showCart();
    
    const address = prompt('📍 عنوان التوصيل:');
    if (!address) return showCart();
    
    // حساب الإجمالي
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 800;
    const total = subtotal + shipping;
    
    const order = {
        orderId: Date.now(),
        customerName: currentUser?.name || 'زائر',
        customerPhone: phone,
        customerAddress: address,
        items: [...cart],
        subtotal,
        shipping,
        total,
        createdAt: new Date().toISOString()
    };
    
    console.log('📤 جاري إرسال الطلب...');
    
    // إرسال للقناة
    const channelMessage = `
🟢 **طلب جديد في المتجر**
━━━━━━━━━━━━━━━━━━━━━━━━
👤 **الزبون:** ${order.customerName}
📞 **الهاتف:** ${order.customerPhone}
📍 **العنوان:** ${order.customerAddress}

📦 **المنتجات:**
${order.items.map(i => `  • ${i.name} x${i.quantity} = ${i.price * i.quantity} دج (${i.merchantName})`).join('\n')}

💰 **الإجمالي:** ${order.total} دج
🆔 **رقم الطلب:** ${order.orderId}
    `;
    
    await sendTelegramMessage(TELEGRAM.channelId, channelMessage);
    
    // إرسال لكل تاجر
    const ordersByMerchant = {};
    cart.forEach(item => {
        if (!ordersByMerchant[item.merchantName]) {
            ordersByMerchant[item.merchantName] = {
                merchantTelegram: item.merchantTelegram,
                items: []
            };
        }
        ordersByMerchant[item.merchantName].items.push(item);
    });
    
    for (const [merchantName, data] of Object.entries(ordersByMerchant)) {
        const merchantTotal = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const merchantMessage = `
🟢 **طلب جديد**
━━━━━━━━━━━━━━
👤 الزبون: ${order.customerName}
📞 الهاتف: ${order.customerPhone}
📍 العنوان: ${order.customerAddress}

📦 **منتجاتك:**
${data.items.map(i => `  • ${i.name} x${i.quantity} = ${i.price * i.quantity} دج`).join('\n')}

💰 الإجمالي: ${merchantTotal} دج
🆔 رقم الطلب: ${order.orderId}
        `;
        
        if (data.merchantTelegram) {
            await sendTelegramMessage(data.merchantTelegram.replace('@', ''), merchantMessage);
        }
    }
    
    // إفراغ السلة
    cart = [];
    saveCart();
    
    // حفظ الطلب
    const orders = JSON.parse(localStorage.getItem('nardoo_orders') || '[]');
    orders.push(order);
    localStorage.setItem('nardoo_orders', JSON.stringify(orders));
    
    console.log('✅ تم إرسال طلبك بنجاح');
    console.log('📱 سيتم التواصل معك قريباً');
    
    setTimeout(() => {
        currentUser ? showCustomerMenu() : showMainMenu();
    }, 3000);
}

// ========== 33. عرض الإحصائيات ==========
function showStatistics() {
    console.clear();
    
    const stats = {
        products: products.length,
        users: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        approvedMerchants: users.filter(u => u.role === 'merchant_approved').length,
        pendingMerchants: users.filter(u => u.role === 'merchant_pending').length,
        customers: users.filter(u => u.role === 'customer').length,
        orders: JSON.parse(localStorage.getItem('nardoo_orders') || '[]').length
    };
    
    // إحصائيات الأقسام
    const categories = {};
    products.forEach(p => {
        categories[p.category] = (categories[p.category] || 0) + 1;
    });
    
    console.log('\n📊 **إحصائيات المتجر**');
    console.log('════════════════════');
    console.log(`📦 إجمالي المنتجات: ${stats.products}`);
    console.log(`👥 إجمالي المستخدمين: ${stats.users}`);
    console.log(`👑 المديرين: ${stats.admins}`);
    console.log(`✅ التجار المعتمدين: ${stats.approvedMerchants}`);
    console.log(`⏳ التجار المنتظرين: ${stats.pendingMerchants}`);
    console.log(`👤 العملاء: ${stats.customers}`);
    console.log(`🛒 إجمالي الطلبات: ${stats.orders}`);
    console.log('\n🏷️ **الأقسام:**');
    
    Object.keys(categories).forEach(cat => {
        console.log(`• ${getCategoryName(cat)}: ${categories[cat]}`);
    });
    
    setTimeout(showMainMenu, 5000);
}

// ========== 34. بدء التشغيل ==========
window.onload = function() {
    console.log('✅ نظام ناردو برو جاهز');
    console.log('👑 المدير: azer@admin.com / 123456');
    console.log('📱 تليجرام متكامل');
    showMainMenu();
};
