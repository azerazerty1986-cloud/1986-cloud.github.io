

// ============================================================
// 📦 test.js- ملف تجريبي صغير للمزامنة
// ============================================================

console.log('🟢 ملف تجريبي للمزامنة!');

// بيانات بسيطة
const TestData = {
    name: 'اختبار المزامنة',
    version: '1.0',
    timestamp: Date.now(),
    message: 'مرحباً من التلجرام!'
};

console.log('📦 بيانات الاختبار:', TestData);

// تسجيل خادم تجريبي
window.servers = window.servers || {};
window.servers['test'] = {
    info: function() {
        return {
            name: 'خادم اختبار',
            status: 'نشط',
            data: TestData
        };
    },
    ping: function() {
        return { status: 'online', timestamp: Date.now() };
    }
};

console.log('✅ ملف test.js جاهز للمزامنة!');

