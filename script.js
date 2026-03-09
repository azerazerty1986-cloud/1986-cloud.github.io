// ========== كود تجريبي - المعرف التلقائي ==========

const TELEGRAM = {
    botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
    channelId: '-1003822964890'
};

// ===== 1. إضافة منتج =====
async function addProduct() {
    const file = document.getElementById('imgInput').files[0];
    if (!file) return alert('اختر صورة');
    
    const name = prompt('الاسم:');
    const price = prompt('السعر:');
    const qty = prompt('الكمية:');
    
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM.channelId);
    formData.append('photo', file);
    formData.append('caption', `${name}\n${price}\n${qty}`);
    
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendPhoto`, {
        method: 'POST',
        body: formData
    });
    
    const data = await res.json();
    if (data.ok) {
        alert(`✅ تم الإرسال\nالمعرف: ${data.result.message_id}`);
    }
}

// ===== 2. جلب المنتجات =====
async function getProducts() {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getUpdates`);
    const data = await res.json();
    
    let html = '';
    
    for (const update of data.result || []) {
        const msg = update.channel_post;
        if (!msg?.photo) continue;
        
        const file = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/getFile?file_id=${msg.photo.pop().file_id}`);
        const f = await file.json();
        
        const lines = (msg.caption || '').split('\n');
        html += `
            <div style="border:2px solid gold; margin:10px; padding:10px; background:#1a2f28;">
                <div style="color:gold;">🆔 ${msg.message_id}</div>
                <img src="https://api.telegram.org/file/bot${TELEGRAM.botToken}/${f.result.file_path}" width="100%">
                <div style="color:white;">${lines[0] || 'منتج'}</div>
                <div style="color:gold;">💰 ${lines[1] || '0'} دج</div>
                <div style="color:#888;">📦 ${lines[2] || '0'}</div>
            </div>
        `;
    }
    
    document.getElementById('productsContainer').innerHTML = html || 'لا توجد منتجات';
    alert(`✅ تم جلب المنتجات`);
}

// ===== 3. واجهة بسيطة =====
document.body.innerHTML += `
    <div style="position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#0a1a15; padding:15px; border:2px solid gold; border-radius:50px; z-index:9999;">
        <input type="file" id="imgInput" accept="image/*" style="display:none;">
        <button onclick="imgInput.click()" style="background:gold; padding:10px 20px; border:none; border-radius:30px;">📸 صورة</button>
        <button onclick="addProduct()" style="background:#2c5e4f; color:white; padding:10px 20px; border:none; border-radius:30px;">➕ إضافة</button>
        <button onclick="getProducts()" style="background:#3498db; color:white; padding:10px 20px; border:none; border-radius:30px;">🔄 تحديث</button>
    </div>
`;

// جلب المنتجات أول مرة
getProducts();
