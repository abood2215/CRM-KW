<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>سياسة الخصوصية — مركز مطمئنة</title>
    <meta name="description" content="Privacy Policy for Motmaina Center — Kuwait">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Cairo', 'Segoe UI', sans-serif;
            background: #f1f5f9;
            color: #1e293b;
            line-height: 1.8;
            font-size: 15px;
        }

        /* ── Header ── */
        header {
            background: linear-gradient(135deg, #1e1b4b 0%, #312e81 55%, #4338ca 100%);
            color: white;
            padding: 48px 20px 40px;
            text-align: center;
        }
        .logo-wrap {
            display: inline-flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 20px;
        }
        .logo-icon {
            width: 56px; height: 56px;
            background: rgba(255,255,255,0.12);
            border: 1.5px solid rgba(255,255,255,0.25);
            border-radius: 16px;
            display: flex; align-items: center; justify-content: center;
            font-size: 26px;
            backdrop-filter: blur(4px);
        }
        .logo-text-ar { font-size: 1.35rem; font-weight: 900; line-height: 1.2; }
        .logo-text-en { font-size: 0.78rem; color: rgba(255,255,255,0.65); margin-top: 2px; }
        header h1 { font-size: 2rem; font-weight: 900; letter-spacing: -0.5px; }
        header h1 span { font-size: 1rem; font-weight: 400; opacity: 0.7; margin-right: 10px; }
        .badge {
            display: inline-block;
            margin-top: 12px;
            padding: 5px 18px;
            background: rgba(255,255,255,0.12);
            border: 1px solid rgba(255,255,255,0.22);
            border-radius: 50px;
            font-size: 0.8rem;
            font-weight: 700;
        }

        /* ── Layout ── */
        main { max-width: 820px; margin: 36px auto; padding: 0 16px 60px; }

        /* ── Intro card ── */
        .intro {
            background: white;
            border-radius: 18px;
            border-right: 5px solid #4f46e5;
            padding: 22px 26px;
            margin-bottom: 20px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .intro p { color: #475569; font-size: 0.9rem; }
        .intro p + p { margin-top: 6px; color: #94a3b8; font-size: 0.82rem; direction: ltr; text-align: left; }

        /* ── Section cards ── */
        .card {
            background: white;
            border-radius: 18px;
            padding: 24px 26px;
            margin-bottom: 16px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .card-title {
            display: flex;
            align-items: center;
            gap: 10px;
            padding-bottom: 14px;
            margin-bottom: 14px;
            border-bottom: 1.5px solid #f1f5f9;
        }
        .card-icon {
            width: 34px; height: 34px;
            background: #eef2ff;
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 16px;
            flex-shrink: 0;
        }
        .card-title-text { flex: 1; }
        .card-title-text .ar { font-size: 1rem; font-weight: 900; color: #1e1b4b; }
        .card-title-text .en { font-size: 0.72rem; color: #94a3b8; font-weight: 600; }

        /* ── Bilingual body ── */
        .bilingual { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .lang-ar { border-left: 2px solid #e0e7ff; padding-left: 16px; }
        .lang-en { direction: ltr; text-align: left; border-right: 2px solid #e0e7ff; padding-right: 16px; }
        .lang-label {
            font-size: 0.68rem;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 8px;
            padding: 2px 8px;
            border-radius: 4px;
            display: inline-block;
        }
        .lang-ar .lang-label { background: #eef2ff; color: #4f46e5; }
        .lang-en .lang-label { background: #f8fafc; color: #64748b; }

        p, li { color: #475569; font-size: 0.87rem; margin-bottom: 6px; }
        strong { color: #1e1b4b; }
        ul { padding-right: 18px; margin-top: 6px; }
        .lang-en ul { padding-right: 0; padding-left: 18px; }
        li { margin-bottom: 5px; }
        li::marker { color: #6366f1; }

        /* ── Notice boxes ── */
        .note {
            margin-top: 14px;
            padding: 11px 16px;
            border-radius: 10px;
            font-size: 0.82rem;
            font-weight: 700;
        }
        .note-indigo { background: #eef2ff; color: #3730a3; }
        .note-amber  { background: #fffbeb; color: #92400e; }
        .note-blue   { background: #eff6ff; color: #1e40af; }

        /* ── Contact grid ── */
        .contact-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 14px; }
        .contact-item {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px;
            text-align: center;
        }
        .contact-icon { font-size: 20px; margin-bottom: 5px; }
        .contact-ar { font-size: 0.75rem; color: #1e1b4b; font-weight: 700; }
        .contact-en { font-size: 0.7rem; color: #94a3b8; direction: ltr; }

        /* ── Footer ── */
        footer {
            background: white;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            padding: 22px 16px;
            font-size: 0.78rem;
            color: #94a3b8;
        }
        footer strong { color: #475569; }

        @media (max-width: 600px) {
            .bilingual { grid-template-columns: 1fr; }
            .lang-ar { border-left: none; border-bottom: 2px solid #e0e7ff; padding: 0 0 14px; }
            .lang-en { border-right: none; padding: 14px 0 0; }
            .contact-grid { grid-template-columns: 1fr 1fr; }
            header h1 { font-size: 1.5rem; }
        }
    </style>
</head>
<body>

<header>
    <div class="logo-wrap">
        <div class="logo-icon">🛡️</div>
        <div style="text-align:right;">
            <div class="logo-text-ar">مركز مطمئنة</div>
            <div class="logo-text-en">Motmaina Center — Kuwait</div>
        </div>
    </div>
    <h1>سياسة الخصوصية <span>Privacy Policy</span></h1>
    <div class="badge">آخر تحديث: مايو 2026 &nbsp;|&nbsp; Last Updated: May 2026</div>
</header>

<main>

    <!-- Intro -->
    <div class="intro">
        <p>يلتزم <strong>مركز مطمئنة</strong> بحماية خصوصيتك وأمان بياناتك عند تواصلك معنا عبر واتساب أو أي قناة أخرى. باستخدامك لخدماتنا فإنك توافق على هذه السياسة.</p>
        <p><strong>Motmaina Center</strong> is committed to protecting your privacy when you interact with us via WhatsApp or any other channel. By using our services, you agree to this policy.</p>
    </div>

    <!-- 1 -->
    <div class="card">
        <div class="card-title">
            <div class="card-icon">🗂️</div>
            <div class="card-title-text">
                <div class="ar">البيانات التي نجمعها</div>
                <div class="en">Data We Collect</div>
            </div>
        </div>
        <div class="bilingual">
            <div class="lang-ar">
                <span class="lang-label">عربي</span>
                <ul>
                    <li><strong>معلومات التواصل:</strong> الاسم، رقم الهاتف، البريد الإلكتروني.</li>
                    <li><strong>بيانات المحادثات:</strong> الرسائل النصية والصوتية عبر واتساب.</li>
                    <li><strong>بيانات المواعيد:</strong> تواريخ وأوقات الاستشارات المطلوبة.</li>
                    <li><strong>الاستفسارات:</strong> طبيعة الخدمة المطلوبة.</li>
                    <li><strong>البيانات التقنية:</strong> عنوان IP وطراز الجهاز.</li>
                </ul>
            </div>
            <div class="lang-en">
                <span class="lang-label">English</span>
                <ul>
                    <li><strong>Contact info:</strong> Name, phone number, email address.</li>
                    <li><strong>Conversation data:</strong> Text and voice messages via WhatsApp.</li>
                    <li><strong>Appointment data:</strong> Dates and times of requested consultations.</li>
                    <li><strong>Inquiries:</strong> Nature of the requested service.</li>
                    <li><strong>Technical data:</strong> IP address and device model.</li>
                </ul>
            </div>
        </div>
        <div class="note note-indigo">✅ لا نطلب بيانات بطاقات ائتمانية أو كلمات مرور عبر واتساب — We never ask for credit card details or passwords via WhatsApp.</div>
    </div>

    <!-- 2 -->
    <div class="card">
        <div class="card-title">
            <div class="card-icon">🎯</div>
            <div class="card-title-text">
                <div class="ar">كيف نستخدم بياناتك</div>
                <div class="en">How We Use Your Data</div>
            </div>
        </div>
        <div class="bilingual">
            <div class="lang-ar">
                <span class="lang-label">عربي</span>
                <ul>
                    <li>الرد على استفساراتك وتقديم الدعم.</li>
                    <li>جدولة المواعيد وإرسال التذكيرات.</li>
                    <li>تحسين جودة خدماتنا.</li>
                    <li>إرسال معلومات ذات صلة (بموافقتك).</li>
                    <li>الامتثال للمتطلبات القانونية في الكويت.</li>
                </ul>
            </div>
            <div class="lang-en">
                <span class="lang-label">English</span>
                <ul>
                    <li>Respond to your inquiries and provide support.</li>
                    <li>Schedule appointments and send reminders.</li>
                    <li>Improve our service quality.</li>
                    <li>Send relevant information (with your consent).</li>
                    <li>Comply with legal requirements in Kuwait.</li>
                </ul>
            </div>
        </div>
    </div>

    <!-- 3 -->
    <div class="card">
        <div class="card-title">
            <div class="card-icon">💬</div>
            <div class="card-title-text">
                <div class="ar">استخدام واتساب للأعمال</div>
                <div class="en">WhatsApp Business Usage</div>
            </div>
        </div>
        <div class="bilingual">
            <div class="lang-ar">
                <span class="lang-label">عربي</span>
                <p>نستخدم <strong>واتساب Business API</strong> من Meta بالصلاحيات التالية:</p>
                <ul>
                    <li><strong>whatsapp_business_messaging:</strong> إرسال واستقبال الرسائل.</li>
                    <li><strong>whatsapp_business_management:</strong> إدارة القوالب والأرقام.</li>
                    <li><strong>public_profile:</strong> بيانات الملف التجاري العام.</li>
                </ul>
            </div>
            <div class="lang-en">
                <span class="lang-label">English</span>
                <p>We use Meta's <strong>WhatsApp Business API</strong> with these permissions:</p>
                <ul>
                    <li><strong>whatsapp_business_messaging:</strong> Send and receive messages.</li>
                    <li><strong>whatsapp_business_management:</strong> Manage templates and numbers.</li>
                    <li><strong>public_profile:</strong> Access business profile info.</li>
                </ul>
            </div>
        </div>
        <div class="note note-indigo">🔒 جميع الرسائل مشفّرة من الطرف إلى الطرف — All messages are end-to-end encrypted per Meta standards.</div>
    </div>

    <!-- 4 -->
    <div class="card">
        <div class="card-title">
            <div class="card-icon">🤝</div>
            <div class="card-title-text">
                <div class="ar">مشاركة البيانات مع أطراف ثالثة</div>
                <div class="en">Third-Party Data Sharing</div>
            </div>
        </div>
        <div class="bilingual">
            <div class="lang-ar">
                <span class="lang-label">عربي</span>
                <p>لا نبيع بياناتك. نشاركها فقط مع:</p>
                <ul>
                    <li><strong>مزودو التقنية:</strong> أنظمة CRM والخوادم.</li>
                    <li><strong>Meta / واتساب:</strong> لتشغيل المراسلة.</li>
                    <li><strong>الجهات القانونية:</strong> عند الاقتضاء القانوني.</li>
                </ul>
            </div>
            <div class="lang-en">
                <span class="lang-label">English</span>
                <p>We do not sell your data. We share it only with:</p>
                <ul>
                    <li><strong>Tech providers:</strong> CRM systems and hosting.</li>
                    <li><strong>Meta / WhatsApp:</strong> To operate messaging.</li>
                    <li><strong>Legal authorities:</strong> When legally required.</li>
                </ul>
            </div>
        </div>
        <div class="note note-amber">⚠️ لن نشارك بياناتك لأغراض تسويقية دون موافقتك — We will not share your data for marketing without your explicit consent.</div>
    </div>

    <!-- 5 -->
    <div class="card">
        <div class="card-title">
            <div class="card-icon">📅</div>
            <div class="card-title-text">
                <div class="ar">مدة الاحتفاظ بالبيانات</div>
                <div class="en">Data Retention</div>
            </div>
        </div>
        <div class="bilingual">
            <div class="lang-ar">
                <span class="lang-label">عربي</span>
                <ul>
                    <li>نحتفظ بالبيانات لمدة <strong>3 سنوات</strong> من آخر تفاعل.</li>
                    <li>قد تُحتفظ بعض البيانات لفترة أطول بحكم القانون.</li>
                    <li>عند انتهاء الحاجة تُحذف البيانات بشكل آمن.</li>
                </ul>
            </div>
            <div class="lang-en">
                <span class="lang-label">English</span>
                <ul>
                    <li>We retain data for up to <strong>3 years</strong> from the last interaction.</li>
                    <li>Some data may be kept longer if required by law.</li>
                    <li>When no longer needed, data is securely deleted.</li>
                </ul>
            </div>
        </div>
    </div>

    <!-- 6 -->
    <div class="card">
        <div class="card-title">
            <div class="card-icon">⚖️</div>
            <div class="card-title-text">
                <div class="ar">حقوقك</div>
                <div class="en">Your Rights</div>
            </div>
        </div>
        <div class="bilingual">
            <div class="lang-ar">
                <span class="lang-label">عربي</span>
                <ul>
                    <li><strong>الاطلاع:</strong> معرفة البيانات التي نحتفظ بها عنك.</li>
                    <li><strong>التصحيح:</strong> تصحيح أي بيانات غير دقيقة.</li>
                    <li><strong>الحذف:</strong> طلب حذف بياناتك.</li>
                    <li><strong>إلغاء الاشتراك:</strong> أرسل "إيقاف" أو "STOP" لإيقاف الرسائل.</li>
                </ul>
            </div>
            <div class="lang-en">
                <span class="lang-label">English</span>
                <ul>
                    <li><strong>Access:</strong> Know what data we hold about you.</li>
                    <li><strong>Correction:</strong> Fix any inaccurate data.</li>
                    <li><strong>Deletion:</strong> Request your data be deleted.</li>
                    <li><strong>Opt-out:</strong> Send "STOP" to unsubscribe from messages.</li>
                </ul>
            </div>
        </div>
    </div>

    <!-- 7 -->
    <div class="card">
        <div class="card-title">
            <div class="card-icon">🔐</div>
            <div class="card-title-text">
                <div class="ar">أمان البيانات</div>
                <div class="en">Data Security</div>
            </div>
        </div>
        <div class="bilingual">
            <div class="lang-ar">
                <span class="lang-label">عربي</span>
                <ul>
                    <li>تشفير TLS/SSL أثناء النقل والتخزين.</li>
                    <li>التحكم في الوصول القائم على الأدوار.</li>
                    <li>جدران حماية وأنظمة رصد التهديدات.</li>
                    <li>نسخ احتياطية منتظمة ومشفرة.</li>
                </ul>
            </div>
            <div class="lang-en">
                <span class="lang-label">English</span>
                <ul>
                    <li>TLS/SSL encryption in transit and at rest.</li>
                    <li>Role-based access control.</li>
                    <li>Firewalls and threat monitoring systems.</li>
                    <li>Regular encrypted backups.</li>
                </ul>
            </div>
        </div>
    </div>

    <!-- 8 -->
    <div class="card">
        <div class="card-title">
            <div class="card-icon">🔄</div>
            <div class="card-title-text">
                <div class="ar">تحديثات السياسة</div>
                <div class="en">Policy Updates</div>
            </div>
        </div>
        <div class="bilingual">
            <div class="lang-ar">
                <span class="lang-label">عربي</span>
                <p>نحتفظ بالحق في تعديل هذه السياسة في أي وقت مع تحديث تاريخ "آخر تحديث".</p>
            </div>
            <div class="lang-en">
                <span class="lang-label">English</span>
                <p>We reserve the right to update this policy at any time. The "Last Updated" date will reflect any changes.</p>
            </div>
        </div>
        <div class="note note-blue">📅 تاريخ النفاذ: 1 يناير 2025 &nbsp;|&nbsp; Effective Date: January 1, 2025</div>
    </div>

    <!-- Contact -->
    <div class="card">
        <div class="card-title">
            <div class="card-icon">📞</div>
            <div class="card-title-text">
                <div class="ar">تواصل معنا</div>
                <div class="en">Contact Us</div>
            </div>
        </div>
        <div class="bilingual">
            <div class="lang-ar">
                <span class="lang-label">عربي</span>
                <p>لأي استفسار حول هذه السياسة أو لممارسة حقوقك، تواصل معنا وسنرد خلال <strong>5 أيام عمل</strong>.</p>
            </div>
            <div class="lang-en">
                <span class="lang-label">English</span>
                <p>For any questions about this policy or to exercise your rights, contact us and we will respond within <strong>5 business days</strong>.</p>
            </div>
        </div>
        <div class="contact-grid">
            <div class="contact-item">
                <div class="contact-icon">🌐</div>
                <div class="contact-ar">crm.motmaina-center.com</div>
                <div class="contact-en">Website</div>
            </div>
            <div class="contact-item">
                <div class="contact-icon">📧</div>
                <div class="contact-ar">privacy@motmaina-center.com</div>
                <div class="contact-en">Email</div>
            </div>
            <div class="contact-item">
                <div class="contact-icon">📍</div>
                <div class="contact-ar">الكويت</div>
                <div class="contact-en">Kuwait</div>
            </div>
            <div class="contact-item">
                <div class="contact-icon">💬</div>
                <div class="contact-ar">واتساب للأعمال</div>
                <div class="contact-en">WhatsApp Business</div>
            </div>
        </div>
    </div>

</main>

<footer>
    <p>&copy; {{ date('Y') }} <strong>مركز مطمئنة — Kuwait</strong>. All rights reserved — جميع الحقوق محفوظة.</p>
    <p style="margin-top:5px;font-size:0.72rem;">This page is publicly accessible without login — هذه الصفحة متاحة للعموم دون تسجيل دخول.</p>
</footer>

</body>
</html>
