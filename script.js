// ========== كود تجربة Reels - مستقل تماماً ==========

(async function testReelsBot() {
    console.log('%c🚀 تجربة بوت Reels', 'color: #00ff00; font-size: 16px');
    console.log('⏳ جاري التشغيل...');
    
    // إعدادات التليجرام
    const TOKEN = '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0';
    const CHANNEL = '-1003822964890';
    
    // روابط Reals للتجربة
    const testUrls = [
        'https://www.instagram.com/reel/Cz7hJZnoIuP/',
        'https://www.instagram.com/reel/C1gkKWdoGk7/',
        'https://www.instagram.com/reel/C0vC-wFoudZ/'
    ];
    
    // اختيار رابط عشوائي
    const randomUrl = testUrls[Math.floor(Math.random() * testUrls.length)];
    
    // استخراج المعرف
    const reelId = randomUrl.match(/instagram\.com\/reel\/([A-Za-z0-9_-]+)/)?.[1] || 'Cz7hJZnoIuP';
    
    // توليد بصمة تجريبية
    const timestamp = Date.now();
    const thumbprint = 'TP_' + reelId.substring(0, 4) + '_' + timestamp.toString().slice(-6);
    
    // إنشاء رسالة جذابة
    const message = `
🎬 **【 تجربة ناجحة 】**

🆔 معرف Reels: \`${reelId}\`
🔍 البصمة المولدة: \`${thumbprint}\`
🔗 الرابط: ${randomUrl}

📊 معلومات إضافية:
• وقت التجربة: ${new Date().toLocaleString('ar-EG')}
• نوع المحتوى: Reels
• حالة البصمة: ✅ فريدة

⚡ هذا اختبار لبوت جلب بصمات Reels
    `;
    
    console.log('📤 سيتم إرسال:');
    console.log('🆔 المعرف:', reelId);
    console.log('🔍 البصمة:', thumbprint);
    console.log('🔗 الرابط:', randomUrl);
    
    try {
        console.log('📡 جاري الإرسال إلى تليجرام...');
        
        const response = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHANNEL,
                text: message,
                parse_mode: 'Markdown',
                disable_web_page_preview: false
            })
        });
        
        const result = await response.json();
        
        if (result.ok) {
            console.log('%c✅ تم الإرسال بنجاح!', 'color: #00ff00; font-size: 14px');
            console.log('📨 رابط الرسالة:', `https://t.me/c/${CHANNEL.replace('-100', '')}/${result.result.message_id}`);
            console.log('📝 البيانات:', result);
            
            // عرض ملخص
            console.log('%c📊 ملخص التجربة:', 'color: #ffff00');
            console.table({
                'الحالة': '✅ نجاح',
                'المعرف': reelId,
                'البصمة': thumbprint,
                'الوقت': new Date().toLocaleTimeString(),
                'رابط القناة': `https://t.me/c/${CHANNEL.replace('-100', '')}`
            });
        } else {
            console.error('%c❌ فشل الإرسال:', 'color: #ff0000', result.description);
        }
    } catch (error) {
        console.error('%c❌ خطأ:', 'color: #ff0000', error.message);
    }
})();
