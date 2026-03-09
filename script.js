// ========== نظام طلب تاجر مع موافقة المدير عبر تلجرام ==========
// نسخة صغيرة جداً للتجربة

// 1️⃣ إعدادات تلجرام
const BOT_TOKEN = '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0';
const ADMIN_ID = '7461896689'; // معرف المدير في تلجرام
const CHANNEL_ID = '-1003822964890'; // قناة الطلبات

// 2️⃣ بيانات تجريبية
let users = [
    { id: 1, name: 'مدير', role: 'admin', email: 'admin@test.com', password: '123' }
];

let pendingMerchants = [];
let approvedMerchants = [];

// 3️⃣ دالة إرسال رسالة تلجرام
async function sendTelegram(chatId, text) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });
        return await response.json();
    } catch (error) {
        console.log('❌ خطأ:', error);
        return { ok: false };
    }
}

// 4️⃣ دالة طلب تسجيل تاجر جديد
async function requestMerchant(name, email, phone, storeName) {
    console.log('📝 جاري إرسال طلب التاجر...');
    
    const merchantId = Date.now();
    const newMerchant = {
        id: merchantId,
        name: name,
        email: email,
        phone: phone,
        storeName: storeName,
        status: 'pending',
        date: new Date().toLocaleString('ar-EG')
    };
    
    pendingMerchants.push(newMerchant);
    
    // إرسال رسالة للمدير في تلجرام
    const message = `
🆕 <b>طلب تاجر جديد</b>

👤 <b>الاسم:</b> ${name}
📧 <b>البريد:</b> ${email}
📞 <b>الهاتف:</b> ${phone}
🏪 <b>اسم المتجر:</b> ${storeName}
🆔 <b>معرف الطلب:</b> ${merchantId}
📅 <b>التاريخ:</b> ${newMerchant.date}

للموافقة: اضغط على الرابط
✅ http://localhost:3000/approve?id=${merchantId}
❌ http://localhost:3000/reject?id=${merchantId}
    `;
    
    const result = await sendTelegram(ADMIN_ID, message);
    
    if (result.ok) {
        console.log('✅ تم إرسال طلب التاجر إلى المدير');
        console.log('🆔 معرف الطلب:', merchantId);
        return { success: true, merchantId: merchantId };
    } else {
        console.log('❌ فشل إرسال الطلب');
        return { success: false };
    }
}

// 5️⃣ دالة موافقة المدير على تاجر
function approveMerchant(merchantId) {
    const merchant = pendingMerchants.find(m => m.id == merchantId);
    
    if (merchant) {
        // نقل من قائمة الانتظار إلى قائمة التجار المعتمدين
        merchant.status = 'approved';
        merchant.approvedAt = new Date().toLocaleString('ar-EG');
        
        approvedMerchants.push(merchant);
        pendingMerchants = pendingMerchants.filter(m => m.id != merchantId);
        
        // إضافة المستخدم كنظام
        const newUser = {
            id: users.length + 1,
            name: merchant.name,
            email: merchant.email,
            password: 'temp123', // كلمة مرور مؤقتة
            role: 'merchant',
            storeName: merchant.storeName,
            status: 'approved'
        };
        
        users.push(newUser);
        
        console.log('✅ تمت الموافقة على التاجر:', merchant.name);
        console.log('🔑 كلمة المرور المؤقتة: temp123');
        
        // إرسال إشعار للتاجر
        sendTelegram(ADMIN_ID, `✅ تمت الموافقة على التاجر ${merchant.name} - ${merchant.storeName}`);
        
        return true;
    }
    
    console.log('❌ التاجر غير موجود');
    return false;
}

// 6️⃣ دالة رفض تاجر
function rejectMerchant(merchantId, reason = 'لم يتم ذكر سبب') {
    const merchant = pendingMerchants.find(m => m.id == merchantId);
    
    if (merchant) {
        merchant.status = 'rejected';
        merchant.rejectReason = reason;
        
        pendingMerchants = pendingMerchants.filter(m => m.id != merchantId);
        
        console.log('❌ تم رفض التاجر:', merchant.name);
        console.log('📋 السبب:', reason);
        
        // إرسال إشعار بالرفض
        sendTelegram(ADMIN_ID, `❌ تم رفض التاجر ${merchant.name} - السبب: ${reason}`);
        
        return true;
    }
    
    return false;
}

// 7️⃣ دالة عرض طلبات التجار
function showPendingMerchants() {
    console.log('\n⏳ طلبات التجار المعلقة:');
    console.log('='.repeat(40));
    
    if (pendingMerchants.length === 0) {
        console.log('لا توجد طلبات معلقة');
        return;
    }
    
    pendingMerchants.forEach((m, i) => {
        console.log(`${i+1}. ${m.storeName} - ${m.name}`);
        console.log(`   📧 ${m.email} | 📞 ${m.phone}`);
        console.log(`   🆔 ${m.id} | 📅 ${m.date}`);
        console.log('-'.repeat(30));
    });
}

// 8️⃣ دالة عرض التجار المعتمدين
function showApprovedMerchants() {
    console.log('\n✅ التجار المعتمدين:');
    console.log('='.repeat(40));
    
    if (approvedMerchants.length === 0) {
        console.log('لا يوجد تجار معتمدين');
        return;
    }
    
    approvedMerchants.forEach((m, i) => {
        console.log(`${i+1}. ${m.storeName} - ${m.name}`);
        console.log(`   📧 ${m.email} | 📞 ${m.phone}`);
        console.log(`   ✅ معتمد منذ: ${m.approvedAt}`);
        console.log('-'.repeat(30));
    });
}

// 9️⃣ دالة إضافة منتج (للتاجر فقط)
function addProduct(merchantEmail, productName, price, stock) {
    const merchant = approvedMerchants.find(m => m.email === merchantEmail);
    
    if (!merchant) {
        console.log('❌ أنت لست تاجراً معتمداً');
        return false;
    }
    
    const product = {
        id: Date.now(),
        name: productName,
        price: price,
        stock: stock,
        merchantId: merchant.id,
        merchantName: merchant.storeName,
        date: new Date().toLocaleString('ar-EG')
    };
    
    // هنا يمكن حفظ المنتج في مصفوفة products
    console.log(`✅ تم إضافة منتج ${productName} بواسطة ${merchant.storeName}`);
    console.log('📦 تفاصيل المنتج:', product);
    
    // إرسال إشعار للمدير بالمنتج الجديد
    sendTelegram(ADMIN_ID, `🆕 منتج جديد من ${merchant.storeName}: ${productName} - ${price} دج`);
    
    return product;
}

// 🔟 تجربة سريعة
async function runTest() {
    console.log('\n🚀 بدء تجربة نظام طلب التجار...\n');
    
    // 1. تاجر يقدم طلب
    console.log('1️⃣ تاجر يقدم طلب:');
    await requestMerchant(
        'أحمد محمد',
        'ahmed@test.com',
        '0555123456',
        'متجر أحمد الإلكتروني'
    );
    
    // 2. المدير يشوف الطلبات
    console.log('\n2️⃣ المدير يشوف الطلبات:');
    showPendingMerchants();
    
    // 3. المدير يوافق على التاجر
    console.log('\n3️⃣ المدير يوافق على التاجر:');
    if (pendingMerchants.length > 0) {
        approveMerchant(pendingMerchants[0].id);
    }
    
    // 4. عرض التجار المعتمدين
    console.log('\n4️⃣ التجار المعتمدين:');
    showApprovedMerchants();
    
    // 5. التاجر يضيف منتج
    console.log('\n5️⃣ التاجر يضيف منتج:');
    if (approvedMerchants.length > 0) {
        addProduct('ahmed@test.com', 'قهوة تركية', 800, 15);
    }
    
    console.log('\n✨ انتهت التجربة');
}

// أوامر سريعة للاستخدام
console.log('\n📋 أوامر التجربة:');
console.log('runTest()                              - تشغيل تجربة كاملة');
console.log('requestMerchant(الاسم, البريد, الهاتف, المتجر) - طلب تاجر جديد');
console.log('approveMerchant(معرف_الطلب)            - موافقة على تاجر');
console.log('rejectMerchant(معرف_الطلب, "سبب")     - رفض تاجر');
console.log('showPendingMerchants()                 - عرض الطلبات المعلقة');
console.log('showApprovedMerchants()                - عرض التجار المعتمدين');
console.log('addProduct(بريد_التاجر, اسم, سعر, كمية) - إضافة منتج');

// تنفيذ تجربة سريعة
// runTest();
