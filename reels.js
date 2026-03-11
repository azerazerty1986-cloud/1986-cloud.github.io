<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
    <title>نكهة وجمال | ناردو برو - المتجر الذكي المتكامل 2026</title>
    
    <!-- تحسينات SEO -->
    <meta name="description" content="ناردو برو - منصة التجارة الإلكترونية المتكاملة للتوابل والكوسمتيك والعروض">
    <meta name="keywords" content="ناردو, توابل, كوسمتيك, عروض, تسوق, جزائر">
    <meta name="author" content="ناردو برو">
    
    <!-- فتح Graph للتواصل الاجتماعي -->
    <meta property="og:title" content="نكهة وجمال | ناردو برو">
    <meta property="og:description" content="منصة التجارة الإلكترونية المتكاملة">
    <meta property="og:type" content="website">
    
    <!-- ===== الخطوط ===== -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    
    <!-- ===== Font Awesome 6 ===== -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    
    <!-- ===== AOS Library للتمرير المتحرك ===== -->
    <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
    
    <style>
        /* ===== أنماط أساسية مؤقتة لحين تحميل CSS ===== */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Cairo', sans-serif;
            background: #0a1a15;
            color: #ffffff;
            line-height: 1.6;
            transition: all 0.3s ease;
            min-height: 100vh;
            overflow-x: hidden;
        }
        .loader {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #0a1a15;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            transition: opacity 0.5s;
        }
        .loader-spinner {
            width: 80px;
            height: 80px;
            border: 5px solid #d4af37;
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        .loader-spinner-small {
            width: 40px;
            height: 40px;
            border: 3px solid #d4af37;
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .container {
            width: 95%;
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 15px;
        }
        .reels-loader {
            display: flex;
            align-items: center;
            gap: 15px;
            color: #888;
            min-width: 200px;
        }
    </style>
    
    <!-- ===== ربط ملف CSS الرئيسي ===== -->
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <!-- ===== شاشة التحميل ===== -->
    <div class="loader" id="loader">
        <div class="loader-spinner"></div>
    </div>

    <!-- ===== نظام الإشعارات ===== -->
    <div class="toast-container" id="toastContainer"></div>

    <!-- ===== سلة التسوق الجانبية ===== -->
    <div class="cart-sidebar" id="cartSidebar">
        <div class="cart-header">
            <h3><i class="fas fa-shopping-cart"></i> سلة التسوق</h3>
            <i class="fas fa-times close-cart" onclick="toggleCart()"></i>
        </div>
        <div class="cart-items" id="cartItems">
            <div style="text-align: center; padding: 40px; color: #888;">
                <i class="fas fa-shopping-basket" style="font-size: 60px; margin-bottom: 20px;"></i>
                <p>سلة التسوق فارغة</p>
            </div>
        </div>
        <div class="cart-footer">
            <div class="cart-total">
                <span>المجموع:</span>
                <span id="cartTotal">0 دج</span>
            </div>
            <button class="checkout-btn" onclick="checkoutCart()">
                <i class="fab fa-whatsapp"></i> إتمام الطلب
            </button>
        </div>
    </div>

    <!-- ===== الشريط العلوي ===== -->
    <div class="top-bar">
        <div class="container">
            <div class="top-bar-item" data-aos="fade-left" data-aos-delay="100">
                <i class="fas fa-truck-fast"></i>
                <span>شحن مجاني للطلبات فوق 5000 دج</span>
            </div>
            <div class="top-bar-item" data-aos="fade-left" data-aos-delay="200">
                <i class="fas fa-headset"></i>
                <span>دعم VIP 24/7</span>
            </div>
            <div class="top-bar-item" data-aos="fade-left" data-aos-delay="300">
                <i class="fas fa-gem"></i>
                <span>منتجات أصلية 100%</span>
            </div>
            <div class="theme-toggle" onclick="toggleTheme()" id="themeToggle">
                <i class="fas fa-moon"></i>
                <span>ليلي</span>
            </div>
        </div>
    </div>

    <!-- ===== شريط العروض المتحرك ===== -->
    <div class="marquee-bar">
        <div class="marquee-content" id="marqueeContent">
            <div class="marquee-item float-item">
                <i class="fas fa-fire"></i>
                <span>تخفيضات تصل 50%</span>
                <div class="marquee-progress"><div class="marquee-progress-fill" style="width:50%"></div></div>
            </div>
            <div class="marquee-item bounce-item">
                <i class="fas fa-gem"></i>
                <span>عروض حصرية</span>
                <div class="marquee-progress"><div class="marquee-progress-fill" style="width:75%"></div></div>
            </div>
            <div class="marquee-item pulse-item">
                <i class="fas fa-clock"></i>
                <span>الوقت: <span id="marqueeHours">12</span>:<span id="marqueeMinutes">30</span>:<span id="marqueeSeconds">45</span></span>
                <div class="marquee-progress"><div class="marquee-progress-fill" style="width:60%"></div></div>
            </div>
            <div class="marquee-item rotate-item">
                <i class="fas fa-star"></i>
                <span>عرض خاص: 1+1 مجاناً</span>
                <div class="marquee-progress"><div class="marquee-progress-fill" style="width:30%"></div></div>
            </div>
            <div class="marquee-item">
                <i class="fas fa-gift"></i>
                <span>هدية مع كل طلب</span>
                <div class="marquee-progress"><div class="marquee-progress-fill" style="width:90%"></div></div>
            </div>
        </div>
    </div>

    <!-- ===== شريط Reels من تلجرام ===== -->
    <div class="reels-promo-bar">
        <div class="container">
            <div class="reels-header-brand">
                <span class="brand-realme">realme</span>
                <span class="brand-protection">حماية معايير السلكية</span>
            </div>
            
            <div class="reels-product-showcase">
                <div class="product-info">
                    <h2 class="product-title">realme C71</h2>
                    <div class="product-battery">
                        <span class="battery-value">6000mAh</span>
                        <span class="battery-label">بطارية ضخمة</span>
                    </div>
                </div>
                
                <div class="product-charging">
                    <div class="charging-speed">
                        <span class="speed-value">45W</span>
                        <span class="speed-label">شحن سريع</span>
                    </div>
                </div>
            </div>
            
            <div class="charging-tagline">
                <span class="tagline-charge">شحن لساعة</span>
                <span class="tagline-usage">و استعمال اليومين</span>
            </div>
            
            <div class="reels-divider">
                <span class="divider-text">reels حصرية</span>
                <span class="divider-line"></span>
                <span class="divider-icon">🎬</span>
            </div>
            
            <div class="reels-scroll-container">
                <button class="reels-scroll-btn left" onclick="scrollReels('left')" id="scrollLeftBtn">
                    <i class="fas fa-chevron-right"></i>
                </button>
                
                <div class="reels-track" id="reelsTrack">
                    <div class="reels-loader">
                        <div class="loader-spinner-small"></div>
                        <span>جاري تحميل الريلز...</span>
                    </div>
                </div>
                
                <button class="reels-scroll-btn right" onclick="scrollReels('right')" id="scrollRightBtn">
                    <i class="fas fa-chevron-left"></i>
                </button>
            </div>
        </div>
    </div>

    <!-- ===== الهيدر الرئيسي ===== -->
    <header class="main-header">
        <div class="container header-content">
            <div class="logo" data-aos="fade-right">
                <div class="logo-icon"><i class="fas fa-leaf"></i></div>
                <div class="logo-text">
                    <h1>نكهة وجمال</h1>
                    <span>ناردو برو 2026</span>
                </div>
            </div>
            
            <div class="search-wrapper" data-aos="zoom-in">
                <div class="search-box">
                    <input type="text" id="searchInput" placeholder="ابحث عن منتج..." onkeyup="searchProducts()">
                    <button onclick="searchProducts()"><i class="fas fa-search"></i></button>
                </div>
            </div>
            
            <div class="header-actions" data-aos="fade-left">
                <button class="action-btn" onclick="openLoginModal()" id="userBtn" title="حسابي">
                    <i class="far fa-user"></i>
                </button>
                <button class="action-btn" onclick="toggleCart()" title="سلة التسوق">
                    <i class="fas fa-shopping-cart"></i>
                    <span class="cart-count" id="cartCounter">0</span>
                </button>
                <button class="action-btn" onclick="openDashboard()" id="dashboardBtn" style="display: none;" title="لوحة التحكم">
                    <i class="fas fa-chart-line"></i>
                </button>
            </div>
        </div>
    </header>

    <!-- ===== القائمة الرئيسية ===== -->
    <div class="container">
        <nav class="nav-menu" id="mainNav" data-aos="fade-up">
            <a class="nav-link active" onclick="filterProducts('all')"><i class="fas fa-home"></i><span>الرئيسية</span></a>
            <a class="nav-link" onclick="filterProducts('promo')"><i class="fas fa-fire"></i><span>برموسيو</span></a>
            <a class="nav-link" onclick="filterProducts('spices')"><i class="fas fa-mortar-pestle"></i><span>توابل</span></a>
            <a class="nav-link" onclick="filterProducts('cosmetic')"><i class="fas fa-spa"></i><span>كوسمتيك</span></a>
            <a class="nav-link" onclick="filterProducts('other')"><i class="fas fa-gem"></i><span>منتوجات أخرى</span></a>
            <a class="nav-link" onclick="findProductById()"><i class="fas fa-search"></i><span>بحث بالمعرف</span></a>
        </nav>
    </div>

    <!-- ===== خيارات الفرز ===== -->
    <div class="container">
        <div class="sort-options" data-aos="fade-up">
            <select class="sort-select" id="sortSelect" onchange="changeSort(this.value)">
                <option value="newest">📅 الأحدث أولاً</option>
                <option value="price_low">💰 السعر: من الأقل للأعلى</option>
                <option value="price_high">💰 السعر: من الأعلى للأقل</option>
                <option value="rating">⭐ التقييم: الأعلى أولاً</option>
            </select>
        </div>
    </div>

    <!-- ===== نص متحرك ===== -->
    <div class="container">
        <div class="typing-container" data-aos="fade-up">
            <span id="typing-text"></span>
        </div>
    </div>

    <!-- ===== لوحة التاجر ===== -->
    <div class="container" id="merchantPanelContainer" style="display: none;"></div>

    <!-- ===== المنتجات ===== -->
    <div class="container">
        <div class="products-grid" id="productsContainer">
            <!-- سيتم تعبئتها ديناميكياً من JavaScript -->
        </div>
    </div>

    <!-- ===== لوحة التحكم (للمدير) ===== -->
    <div class="container dashboard-section" id="dashboardSection" style="display: none;">
        <div class="dashboard-tabs" id="dashboardTabs">
            <button class="dashboard-tab active" onclick="switchDashboardTab('overview')">📊 نظرة عامة</button>
            <button class="dashboard-tab" onclick="switchDashboardTab('orders')">🛒 الطلبات</button>
            <button class="dashboard-tab" onclick="switchDashboardTab('products')">📦 المنتجات</button>
            <button class="dashboard-tab" onclick="switchDashboardTab('merchants')">👨‍💼 التجار</button>
            <button class="dashboard-tab" onclick="switchDashboardTab('users')">👥 المستخدمين</button>
        </div>
        <div class="dashboard-content" id="dashboardContent"></div>
    </div>

    <!-- ===== الفوتر ===== -->
    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-col" data-aos="fade-up" data-aos-delay="100">
                    <h3>نكهة وجمال</h3>
                    <p><i class="fas fa-store"></i> المتجر الذكي المتكامل</p>
                    <p><i class="fas fa-star"></i> التقييم: 4.8/5</p>
                    <p><i class="fas fa-users"></i> +5000 عميل</p>
                </div>
                <div class="footer-col" data-aos="fade-up" data-aos-delay="200">
                    <h3>اتصل بنا</h3>
                    <p><i class="fab fa-whatsapp"></i> +213 562243648</p>
                    <p><i class="fas fa-envelope"></i> info@nardoo.com</p>
                    <p><i class="fab fa-telegram"></i> @nardoo_support</p>
                </div>
                <div class="footer-col" data-aos="fade-up" data-aos-delay="300">
                    <h3>روابط سريعة</h3>
                    <p><i class="fas fa-chevron-left"></i> سياسة الخصوصية</p>
                    <p><i class="fas fa-chevron-left"></i> شروط الاستخدام</p>
                    <p><i class="fas fa-chevron-left"></i> طرق الدفع</p>
                </div>
            </div>
            <div class="copyright">© 2026 نكهة وجمال | جميع الحقوق محفوظة</div>
        </div>
    </footer>

    <!-- ===== أيقونات ثابتة ===== -->
    <div class="fixed-cart" onclick="toggleCart()" id="fixedCart" title="سلة التسوق">
        <i class="fas fa-shopping-cart"></i>
        <span class="fixed-cart-count" id="fixedCartCounter">0</span>
    </div>

    <div class="navigation-buttons">
        <button class="nav-btn up-btn" onclick="scrollToTop()" title="الانتقال للأعلى">
            <i class="fas fa-arrow-up"></i>
        </button>
        <button class="nav-btn down-btn" onclick="scrollToBottom()" title="الانتقال للأسفل">
            <i class="fas fa-arrow-down"></i>
        </button>
    </div>

    <button class="quick-top-btn" onclick="scrollToTop()" id="quickTopBtn" title="العودة للأعلى">
        <i class="fas fa-chevron-up"></i>
    </button>

    <!-- ===== نافذة تسجيل الدخول ===== -->
    <div class="modal" id="loginModal" onclick="if(event.target===this) closeModal('loginModal')">
        <div class="modal-content">
            <div style="text-align:center; margin-bottom:30px;">
                <div style="font-size: 60px; color: var(--gold); margin-bottom: 10px;">
                    <i class="fas fa-user-circle"></i>
                </div>
                <h2 style="color:var(--gold);">تسجيل الدخول</h2>
            </div>
            
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <button class="btn-gold" style="flex:1;" onclick="switchAuthTab('login')">دخول</button>
                <button class="btn-outline-gold" style="flex:1;" onclick="switchAuthTab('register')">تسجيل</button>
            </div>

            <!-- ===== نموذج تسجيل الدخول ===== -->
            <form id="loginForm" onsubmit="event.preventDefault(); handleLogin();">
                <div class="form-group">
                    <label><i class="fas fa-envelope"></i> البريد الإلكتروني</label>
                    <input type="email" class="form-control" id="loginEmail" required placeholder="example@email.com">
                </div>
                <div class="form-group">
                    <label><i class="fas fa-lock"></i> كلمة المرور</label>
                    <input type="password" class="form-control" id="loginPassword" required placeholder="أدخل كلمة المرور">
                </div>
                <button type="submit" class="btn-gold" style="width:100%;">دخول</button>
            </form>

            <!-- ===== نموذج التسجيل الجديد مع جميع الحقول ===== -->
            <form id="registerForm" style="display:none;" onsubmit="event.preventDefault(); handleRegister();">
                <div class="form-group">
                    <label><i class="fas fa-user"></i> الاسم الكامل</label>
                    <input type="text" class="form-control" id="regName" required placeholder="أدخل اسمك الكامل">
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-envelope"></i> البريد الإلكتروني</label>
                    <input type="email" class="form-control" id="regEmail" required placeholder="example@email.com">
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-lock"></i> كلمة المرور</label>
                    <input type="password" class="form-control" id="regPassword" required placeholder="أدخل كلمة المرور">
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-phone"></i> رقم الهاتف</label>
                    <input type="tel" class="form-control" id="regPhone" required placeholder="05XXXXXXXX">
                </div>
                
                <div class="form-group">
                    <label><i class="fab fa-telegram"></i> معرف تليجرام (اختياري)</label>
                    <input type="text" class="form-control" id="regTelegram" placeholder="@username">
                    <small style="color: #888; display: block; margin-top: 5px;">أدخل معرفك في تليجرام ليتواصل معك العملاء</small>
                </div>
                
                <div class="form-group">
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                        <input type="checkbox" id="isMerchant" onchange="toggleMerchantFields()">
                        <span><i class="fas fa-store"></i> تسجيل كتاجر</span>
                    </label>
                </div>
                
                <!-- ===== حقول التاجر (تظهر عند اختيار تسجيل كتاجر) ===== -->
                <div id="merchantFields" style="display:none;">
                    <div class="form-group">
                        <label><i class="fas fa-store-alt"></i> اسم المتجر</label>
                        <input type="text" class="form-control" id="storeName" placeholder="أدخل اسم متجرك">
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-tag"></i> تخصص المتجر</label>
                        <select class="form-control" id="merchantCategory">
                            <option value="spices">توابل</option>
                            <option value="cosmetic">كوسمتيك</option>
                            <option value="promo">برومسيون</option>
                            <option value="other">أخرى</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-chart-line"></i> مستوى التاجر</label>
                        <select class="form-control" id="merchantLevel">
                            <option value="1">المستوى الأول</option>
                            <option value="2" selected>المستوى الثاني</option>
                            <option value="3">المستوى الثالث</option>
                        </select>
                    </div>
                </div>
                
                <button type="submit" class="btn-gold" style="width:100%; margin-top:20px;">تسجيل</button>
            </form>

            <button class="btn-outline-gold" style="width:100%; margin-top:15px;" onclick="closeModal('loginModal')">إلغاء</button>
        </div>
    </div>

    <!-- ===== نافذة إضافة منتج ===== -->
    <div class="modal" id="productModal" onclick="if(event.target===this) closeModal('productModal')">
        <div class="modal-content modal-lg">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color:var(--gold);"><i class="fas fa-plus-circle"></i> إضافة منتج جديد</h2>
                <button class="close-btn" onclick="closeModal('productModal')" style="background: none; border: none; color: var(--gold); font-size: 28px; cursor: pointer;">&times;</button>
            </div>
            
            <form id="productForm" class="product-form" onsubmit="event.preventDefault(); saveProduct();">
                <!-- حقل معرف تليجرام (يظهر إذا كان المستخدم تاجر وليس لديه معرف) -->
                <div class="form-group" id="merchantTelegramField" style="display: none;">
                    <label><i class="fab fa-telegram"></i> معرف تليجرام الخاص بك</label>
                    <input type="text" class="form-control" id="merchantTelegram" placeholder="@username">
                    <small style="color: #888;">أدخل معرفك في تليجرام ليتمكن العملاء من التواصل</small>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-box"></i> اسم المنتج</label>
                    <input type="text" class="form-control" id="productName" required placeholder="أدخل اسم المنتج">
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-tags"></i> القسم</label>
                    <select class="form-control" id="productCategory" required>
                        <option value="promo">برموسيو</option>
                        <option value="spices">توابل</option>
                        <option value="cosmetic">كوسمتيك</option>
                        <option value="other">منتوجات أخرى</option>
                    </select>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="form-group">
                        <label><i class="fas fa-coins"></i> السعر (دج)</label>
                        <input type="number" class="form-control" id="productPrice" required min="0" placeholder="0">
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-cubes"></i> الكمية</label>
                        <input type="number" class="form-control" id="productStock" required min="0" placeholder="0">
                    </div>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-align-left"></i> وصف المنتج</label>
                    <textarea class="form-control" id="productDescription" rows="3" placeholder="أدخل وصف المنتج..."></textarea>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-link"></i> رابط الصورة (اختياري)</label>
                    <input type="url" class="form-control" id="productImage" placeholder="https://example.com/image.jpg">
                </div>
                
                <div class="image-upload-area" onclick="document.getElementById('productImages').click()">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>أو اضغط لرفع صورة من جهازك</p>
                </div>
                
                <input type="file" id="productImages" accept="image/*" style="display:none;" onchange="handleImageUpload(event)" multiple>
                <div class="image-preview" id="imagePreview"></div>
                <input type="hidden" id="productImagesData">

                <div style="display: flex; gap: 15px; margin-top: 20px;">
                    <button type="submit" class="btn-gold" style="flex: 2;">
                        <i class="fas fa-cloud-upload-alt"></i> حفظ المنتج
                    </button>
                    <button type="button" class="btn-outline-gold" style="flex: 1;" onclick="closeModal('productModal')">
                        إلغاء
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- ===== نافذة تفاصيل المنتج ===== -->
    <div class="modal" id="productDetailModal" onclick="if(event.target===this) closeModal('productDetailModal')">
        <div class="modal-content modal-lg" id="productDetailContent"></div>
    </div>

    <!-- ===== نافذة لوحة التاجر ===== -->
    <div class="modal" id="merchantDashboardModal" onclick="if(event.target===this) closeModal('merchantDashboardModal')">
        <div class="modal-content" style="max-width: 1200px;">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color:var(--gold);"><i class="fas fa-store"></i> لوحة تحكم التاجر</h2>
                <button class="close-btn" onclick="closeModal('merchantDashboardModal')" style="background: none; border: none; color: var(--gold); font-size: 28px; cursor: pointer;">&times;</button>
            </div>
            <div class="modal-body" id="merchantDashboardContent" style="max-height: 80vh; overflow-y: auto;"></div>
        </div>
    </div>
    
    <!-- ===== نافذة منتجات التاجر ===== -->
    <div class="modal" id="merchantProductsModal" onclick="if(event.target===this) closeModal('merchantProductsModal')">
        <div class="modal-content" style="max-width: 1000px;">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color:var(--gold);"><i class="fas fa-boxes"></i> منتجاتي</h2>
                <button class="close-btn" onclick="closeModal('merchantProductsModal')" style="background: none; border: none; color: var(--gold); font-size: 28px; cursor: pointer;">&times;</button>
            </div>
            <div class="modal-body" id="merchantProductsContent" style="max-height: 80vh; overflow-y: auto;"></div>
        </div>
    </div>
    
    <!-- ===== نافذة طلبات التاجر ===== -->
    <div class="modal" id="merchantOrdersModal" onclick="if(event.target===this) closeModal('merchantOrdersModal')">
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color:var(--gold);"><i class="fas fa-shopping-bag"></i> طلباتي</h2>
                <button class="close-btn" onclick="closeModal('merchantOrdersModal')" style="background: none; border: none; color: var(--gold); font-size: 28px; cursor: pointer;">&times;</button>
            </div>
            <div class="modal-body" id="merchantOrdersContent" style="max-height: 80vh; overflow-y: auto;"></div>
        </div>
    </div>

    <!-- ===== نافذة عرض Reel ===== -->
    <div class="modal" id="reelViewModal" onclick="if(event.target===this) closeModal('reelViewModal')">
        <div class="modal-content reel-modal-content">
            <div class="reel-modal-header">
                <h3><i class="fas fa-film" style="color: var(--gold);"></i> reel</h3>
                <button class="close-btn" onclick="closeModal('reelViewModal')">&times;</button>
            </div>
            <div class="reel-modal-body" id="reelViewContent"></div>
        </div>
    </div>

    <!-- ===== إحصائيات الموقع (مخفية) ===== -->
    <div style="display: none;" id="siteStats">
        <span id="visitorCount">0</span>
    </div>

    <!-- ===== مكتبات خارجية ===== -->
    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    
    <script>
        // تهيئة AOS للتمرير المتحرك
        document.addEventListener('DOMContentLoaded', function() {
            AOS.init({
                duration: 800,
                once: true,
                offset: 100
            });
        });
        
        // دالة وهمية لفتح لوحة التحكم (سيتم استبدالها من الملف الرئيسي)
        function openDashboard() {
            if (typeof showAdminDashboard === 'function') {
                showAdminDashboard();
            }
        }
        
        // دالة وهمية لتبديل تبويبات لوحة التحكم
        function switchDashboardTab(tab) {
            if (tab === 'overview' && typeof showDashboardOverview === 'function') {
                showDashboardOverview();
            } else if (tab === 'orders' && typeof showAllOrders === 'function') {
                showAllOrders();
            } else if (tab === 'merchants' && typeof showApprovedMerchants === 'function') {
                showApprovedMerchants();
            }
        }
    </script>

    <!-- ===== ربط ملفات JavaScript بالترتيب الصحيح ===== -->
    <!-- أولاً: الملف الرئيسي -->
    <script src="nardoo-pro.js"></script>
    <!-- ثانياً: ملف Reels -->
    <script src="reels.js"></script>
</body>
</html>
