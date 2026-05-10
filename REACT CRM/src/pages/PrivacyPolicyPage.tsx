import React from 'react';
import { Shield, MessageCircle, Database, Users, Lock, Phone, Mail, Globe, Calendar, Baby, RefreshCw, Scale } from 'lucide-react';

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-7 mb-6">
    <h2 className="flex items-center gap-3 text-lg font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100">
      <span className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 flex-shrink-0">
        {icon}
      </span>
      {title}
    </h2>
    <div className="text-slate-600 text-sm leading-relaxed space-y-3">
      {children}
    </div>
  </div>
);

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-cairo" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-l from-emerald-800 to-slate-800 text-white py-12 px-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-emerald-700" />
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">مركز مطمئنة الطبي</div>
            <div className="text-sm opacity-80">Motmaina Medical Center</div>
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2">سياسة الخصوصية</h1>
        <p className="text-white/80 text-sm">Privacy Policy</p>
        <span className="inline-block mt-3 px-4 py-1.5 bg-white/20 rounded-full text-sm border border-white/30">
          آخر تحديث: مايو 2026
        </span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">

        {/* Intro */}
        <div className="bg-white rounded-2xl shadow-sm border-r-4 border-emerald-600 p-6 mb-8">
          <p className="text-slate-600 text-sm leading-relaxed">
            يلتزم <strong className="text-slate-800">مركز مطمئنة الطبي</strong> بحماية خصوصيتك وأمان بياناتك الشخصية.
            توضح هذه السياسة كيفية جمع معلوماتك واستخدامها وحمايتها عند تفاعلك معنا عبر
            منصة واتساب للأعمال أو موقعنا الإلكتروني أو أي قناة تواصل أخرى.
          </p>
        </div>

        <Section icon={<Database className="w-5 h-5" />} title="البيانات التي نجمعها">
          <p>نجمع المعلومات التالية عند تواصلك معنا:</p>
          <ul className="list-disc pr-5 space-y-1.5">
            <li><strong>معلومات التواصل:</strong> الاسم الكامل، رقم الهاتف (بما في ذلك رقم واتساب)، البريد الإلكتروني.</li>
            <li><strong>بيانات المحادثات:</strong> الرسائل النصية والصوتية المرسلة والمستقبلة عبر واتساب.</li>
            <li><strong>بيانات المواعيد:</strong> تواريخ وأوقات الاستشارات والمواعيد الطبية المطلوبة.</li>
            <li><strong>الاستفسارات الصحية:</strong> طبيعة الخدمة الطبية المطلوبة أو الاستفسار المقدَّم.</li>
            <li><strong>البيانات التقنية:</strong> عنوان IP، طراز الجهاز، توقيت الرسائل (بواسطة منصة واتساب).</li>
          </ul>
          <div className="mt-3 p-3 bg-emerald-50 rounded-xl text-emerald-800 text-xs">
            ✅ لا نطلب أرقام بطاقات ائتمانية أو كلمات مرور عبر واتساب أو أي قناة تواصل.
          </div>
        </Section>

        <Section icon={<Globe className="w-5 h-5" />} title="كيف نستخدم بياناتك">
          <ul className="list-disc pr-5 space-y-1.5">
            <li>الرد على استفساراتك وطلباتك وتقديم الدعم اللازم.</li>
            <li>جدولة المواعيد الطبية وإرسال تذكيرات بها.</li>
            <li>تحسين جودة خدماتنا وتطوير أنظمة الرعاية الصحية.</li>
            <li>إرسال معلومات ذات صلة بالخدمات الطبية (بموافقتك).</li>
            <li>الامتثال للمتطلبات القانونية والتنظيمية.</li>
          </ul>
        </Section>

        <Section icon={<MessageCircle className="w-5 h-5" />} title="استخدام واتساب للأعمال">
          <p>
            يستخدم مركز مطمئنة <strong>واتساب Business API</strong> المقدَّمة من Meta Platforms للتواصل مع عملائنا.
          </p>
          <ul className="list-disc pr-5 space-y-1.5">
            <li><strong>whatsapp_business_messaging:</strong> لإرسال واستقبال الرسائل مع العملاء.</li>
            <li><strong>whatsapp_business_management:</strong> لإدارة قوالب الرسائل وأرقام الهاتف التجارية.</li>
            <li><strong>public_profile:</strong> للوصول إلى بيانات الملف التجاري العام.</li>
          </ul>
          <div className="mt-3 p-3 bg-emerald-50 rounded-xl text-emerald-800 text-xs">
            🔒 جميع الرسائل المرسلة عبر واتساب مشفَّرة من الطرف إلى الطرف وفقاً لمعايير Meta.
          </div>
        </Section>

        <Section icon={<Users className="w-5 h-5" />} title="مشاركة البيانات مع أطراف ثالثة">
          <p>لا نبيع بياناتك الشخصية. نشارك بياناتك فقط في:</p>
          <ul className="list-disc pr-5 space-y-1.5">
            <li><strong>مزودو الخدمة التقنية:</strong> أنظمة CRM والبنية التحتية للخوادم.</li>
            <li><strong>Meta / واتساب:</strong> لتشغيل خدمة المراسلة.</li>
            <li><strong>الجهات القانونية:</strong> عند الاقتضاء القانوني أو بأمر قضائي.</li>
            <li><strong>حالات الطوارئ الطبية:</strong> لحماية سلامة المريض.</li>
          </ul>
          <div className="mt-3 p-3 bg-amber-50 rounded-xl text-amber-800 text-xs">
            ⚠️ لن نشارك بياناتك لأغراض التسويق الخارجي دون موافقتك الصريحة.
          </div>
        </Section>

        <Section icon={<Calendar className="w-5 h-5" />} title="مدة الاحتفاظ بالبيانات">
          <ul className="list-disc pr-5 space-y-1.5">
            <li>نحتفظ ببيانات التواصل وسجلات المحادثات لمدة لا تتجاوز <strong>3 سنوات</strong> من آخر تفاعل.</li>
            <li>يتم حذف البيانات الطبية وفق الأنظمة الصحية المعتمدة محلياً.</li>
            <li>عند انتهاء الحاجة، تُحذف البيانات بشكل آمن ونهائي.</li>
          </ul>
        </Section>

        <Section icon={<Scale className="w-5 h-5" />} title="حقوقك">
          <ul className="list-disc pr-5 space-y-1.5">
            <li><strong>الاطلاع:</strong> معرفة البيانات التي نحتفظ بها عنك.</li>
            <li><strong>التصحيح:</strong> تصحيح أي بيانات غير دقيقة.</li>
            <li><strong>الحذف:</strong> طلب حذف بياناتك.</li>
            <li><strong>إلغاء الاشتراك:</strong> إيقاف رسائل واتساب بإرسال "إيقاف" أو "STOP".</li>
          </ul>
        </Section>

        <Section icon={<Lock className="w-5 h-5" />} title="أمان البيانات">
          <ul className="list-disc pr-5 space-y-1.5">
            <li>تشفير البيانات أثناء النقل (TLS/SSL) وأثناء التخزين.</li>
            <li>التحكم في الوصول القائم على الأدوار.</li>
            <li>جدران الحماية وأنظمة رصد التهديدات.</li>
            <li>نسخ احتياطية منتظمة ومشفرة.</li>
          </ul>
        </Section>

        <Section icon={<Baby className="w-5 h-5" />} title="خصوصية الأطفال">
          <p>
            لا تُوجَّه خدماتنا للأطفال دون سن 18 عاماً مباشرةً.
            إذا علمنا بجمع بيانات طفل دون موافقة ولي الأمر، سنحذفها فوراً.
          </p>
        </Section>

        <Section icon={<RefreshCw className="w-5 h-5" />} title="تحديثات السياسة">
          <p>
            نحتفظ بالحق في تعديل هذه السياسة في أي وقت. سيتم نشر التعديلات على هذه الصفحة.
          </p>
          <div className="mt-3 p-3 bg-blue-50 rounded-xl text-blue-800 text-xs">
            📅 تاريخ النفاذ: 1 يناير 2025 | آخر تحديث: مايو 2026
          </div>
        </Section>

        {/* Contact */}
        <Section icon={<Phone className="w-5 h-5" />} title="تواصل معنا">
          <p>لأي استفسار حول هذه السياسة أو لممارسة حقوقك:</p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[
              { icon: <Globe className="w-5 h-5" />, label: 'الموقع', value: 'crm.motmaina-center.com' },
              { icon: <Mail className="w-5 h-5" />, label: 'البريد الإلكتروني', value: 'privacy@motmaina-center.com' },
            ].map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                <div className="flex justify-center text-emerald-600 mb-2">{item.icon}</div>
                <div className="text-xs text-slate-400 mb-1">{item.label}</div>
                <div className="text-sm font-semibold text-slate-700">{item.value}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center">
            سنرد على طلباتك خلال <strong>5 أيام عمل</strong> من تاريخ استلامها.
          </p>
        </Section>

      </main>

      <footer className="text-center py-6 text-sm text-slate-400 border-t bg-white">
        <p>© {new Date().getFullYear()} <strong className="text-slate-600">مركز مطمئنة الطبي</strong> — جميع الحقوق محفوظة.</p>
        <p className="mt-1 text-xs">هذه الصفحة متاحة للعموم دون الحاجة إلى تسجيل دخول.</p>
      </footer>
    </div>
  );
};

export default PrivacyPolicyPage;
