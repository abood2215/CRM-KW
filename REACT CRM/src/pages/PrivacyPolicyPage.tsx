import React from 'react';
import {
  Shield, MessageCircle, Database, Users, Lock,
  Mail, Globe, Calendar, Baby, RefreshCw, Scale, Phone
} from 'lucide-react';

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
    <h2 className="flex items-center gap-3 text-base font-black text-slate-800 mb-4 pb-3 border-b border-slate-100">
      <span className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0">
        {icon}
      </span>
      {title}
    </h2>
    <div className="text-slate-600 text-sm leading-relaxed space-y-2">
      {children}
    </div>
  </div>
);

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-cairo" dir="rtl">

      {/* Header — matches project sidebar color */}
      <header style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)' }} className="text-white py-10 px-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div className="text-right">
            <div className="text-xl font-black">مركز مطمئنة</div>
            <div className="text-sm text-white/70">Motmaina Center — Kuwait</div>
          </div>
        </div>
        <h1 className="text-2xl font-black mb-1">سياسة الخصوصية</h1>
        <p className="text-white/70 text-sm">Privacy Policy</p>
        <span className="inline-block mt-3 px-4 py-1.5 bg-white/10 border border-white/20 rounded-full text-xs font-bold">
          آخر تحديث: مايو 2026
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* Intro */}
        <div className="bg-white rounded-2xl border-r-4 border-indigo-600 shadow-sm p-5 mb-6">
          <p className="text-slate-600 text-sm leading-relaxed">
            يلتزم <strong className="text-slate-800">مركز مطمئنة</strong> بحماية خصوصيتك وأمان بياناتك الشخصية.
            توضح هذه السياسة كيفية جمع معلوماتك واستخدامها وحمايتها عند تفاعلك معنا عبر
            منصة واتساب للأعمال أو موقعنا الإلكتروني أو أي قناة تواصل أخرى.
            باستخدامك لخدماتنا فإنك توافق على الشروط الواردة في هذه الوثيقة.
          </p>
        </div>

        <Section icon={<Database className="w-4 h-4" />} title="البيانات التي نجمعها">
          <p>نجمع المعلومات التالية عند تواصلك معنا:</p>
          <ul className="list-disc pr-5 space-y-1">
            <li><strong className="text-slate-700">معلومات التواصل:</strong> الاسم الكامل، رقم الهاتف (بما فيه رقم واتساب)، البريد الإلكتروني.</li>
            <li><strong className="text-slate-700">بيانات المحادثات:</strong> الرسائل النصية والصوتية عبر واتساب.</li>
            <li><strong className="text-slate-700">بيانات المواعيد:</strong> تواريخ وأوقات الاستشارات المطلوبة.</li>
            <li><strong className="text-slate-700">الاستفسارات:</strong> طبيعة الخدمة أو الاستفسار المقدَّم.</li>
            <li><strong className="text-slate-700">البيانات التقنية:</strong> عنوان IP، طراز الجهاز، توقيت الرسائل.</li>
          </ul>
          <div className="mt-3 p-3 bg-indigo-50 rounded-xl text-indigo-700 text-xs font-bold">
            ✅ لا نطلب أرقام بطاقات ائتمانية أو كلمات مرور عبر واتساب.
          </div>
        </Section>

        <Section icon={<Globe className="w-4 h-4" />} title="كيف نستخدم بياناتك">
          <ul className="list-disc pr-5 space-y-1">
            <li>الرد على استفساراتك وتقديم الدعم اللازم.</li>
            <li>جدولة المواعيد وإرسال تذكيرات بها.</li>
            <li>تحسين جودة خدماتنا.</li>
            <li>إرسال معلومات ذات صلة بالخدمات (بموافقتك).</li>
            <li>الامتثال للمتطلبات القانونية في الكويت.</li>
          </ul>
        </Section>

        <Section icon={<MessageCircle className="w-4 h-4" />} title="استخدام واتساب للأعمال">
          <p>يستخدم مركز مطمئنة <strong className="text-slate-700">واتساب Business API</strong> المقدَّمة من Meta للتواصل مع عملائنا، بالصلاحيات التالية:</p>
          <ul className="list-disc pr-5 space-y-1 mt-2">
            <li><strong className="text-slate-700">whatsapp_business_messaging:</strong> لإرسال واستقبال الرسائل مع العملاء.</li>
            <li><strong className="text-slate-700">whatsapp_business_management:</strong> لإدارة قوالب الرسائل وأرقام الهاتف التجارية.</li>
            <li><strong className="text-slate-700">public_profile:</strong> للوصول إلى بيانات الملف التجاري العام.</li>
          </ul>
          <div className="mt-3 p-3 bg-indigo-50 rounded-xl text-indigo-700 text-xs font-bold">
            🔒 جميع الرسائل مشفَّرة من الطرف إلى الطرف وفقاً لمعايير Meta.
          </div>
        </Section>

        <Section icon={<Users className="w-4 h-4" />} title="مشاركة البيانات مع أطراف ثالثة">
          <p>لا نبيع بياناتك لأي طرف. نشاركها فقط في:</p>
          <ul className="list-disc pr-5 space-y-1 mt-1">
            <li><strong className="text-slate-700">مزودو الخدمة التقنية:</strong> أنظمة CRM والبنية التحتية للخوادم.</li>
            <li><strong className="text-slate-700">Meta / واتساب:</strong> لتشغيل خدمة المراسلة.</li>
            <li><strong className="text-slate-700">الجهات القانونية:</strong> عند الاقتضاء القانوني أو بأمر قضائي.</li>
          </ul>
          <div className="mt-3 p-3 bg-amber-50 rounded-xl text-amber-700 text-xs font-bold">
            ⚠️ لن نشارك بياناتك لأغراض تسويقية دون موافقتك الصريحة.
          </div>
        </Section>

        <Section icon={<Calendar className="w-4 h-4" />} title="مدة الاحتفاظ بالبيانات">
          <ul className="list-disc pr-5 space-y-1">
            <li>نحتفظ ببيانات التواصل والمحادثات لمدة لا تتجاوز <strong className="text-slate-700">3 سنوات</strong> من آخر تفاعل.</li>
            <li>قد تُحتفظ بعض البيانات لفترات أطول إذا اقتضى ذلك القانون.</li>
            <li>عند انتهاء الحاجة، تُحذف البيانات بشكل آمن ونهائي.</li>
          </ul>
        </Section>

        <Section icon={<Scale className="w-4 h-4" />} title="حقوقك">
          <ul className="list-disc pr-5 space-y-1">
            <li><strong className="text-slate-700">الاطلاع:</strong> معرفة البيانات التي نحتفظ بها عنك.</li>
            <li><strong className="text-slate-700">التصحيح:</strong> تصحيح أي بيانات غير دقيقة.</li>
            <li><strong className="text-slate-700">الحذف:</strong> طلب حذف بياناتك.</li>
            <li><strong className="text-slate-700">إلغاء الاشتراك:</strong> إيقاف رسائل واتساب بإرسال "إيقاف" أو "STOP".</li>
          </ul>
        </Section>

        <Section icon={<Lock className="w-4 h-4" />} title="أمان البيانات">
          <ul className="list-disc pr-5 space-y-1">
            <li>تشفير البيانات أثناء النقل (TLS/SSL) وأثناء التخزين.</li>
            <li>التحكم في الوصول القائم على الأدوار.</li>
            <li>جدران الحماية وأنظمة رصد التهديدات.</li>
            <li>نسخ احتياطية منتظمة ومشفرة.</li>
          </ul>
        </Section>

        <Section icon={<Baby className="w-4 h-4" />} title="خصوصية الأطفال">
          <p>
            لا تُوجَّه خدماتنا للأطفال دون سن 18 عاماً مباشرةً.
            إذا علمنا بجمع بيانات طفل دون موافقة ولي الأمر سنحذفها فوراً.
          </p>
        </Section>

        <Section icon={<RefreshCw className="w-4 h-4" />} title="تحديثات السياسة">
          <p>نحتفظ بالحق في تعديل هذه السياسة في أي وقت مع تحديث تاريخ "آخر تحديث".</p>
          <div className="mt-3 p-3 bg-indigo-50 rounded-xl text-indigo-700 text-xs font-bold">
            📅 تاريخ النفاذ: 1 يناير 2025 &nbsp;|&nbsp; آخر تحديث: مايو 2026
          </div>
        </Section>

        {/* Contact */}
        <Section icon={<Phone className="w-4 h-4" />} title="تواصل معنا">
          <p>لأي استفسار حول هذه السياسة أو لممارسة حقوقك:</p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
              <Globe className="w-5 h-5 text-indigo-600 mx-auto mb-1.5" />
              <div className="text-xs text-slate-400 mb-1">الموقع</div>
              <div className="text-xs font-bold text-slate-700">crm.motmaina-center.com</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
              <Mail className="w-5 h-5 text-indigo-600 mx-auto mb-1.5" />
              <div className="text-xs text-slate-400 mb-1">البريد الإلكتروني</div>
              <div className="text-xs font-bold text-slate-700">privacy@motmaina-center.com</div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center">
            سنرد على طلباتك خلال <strong className="text-slate-600">5 أيام عمل</strong>.
          </p>
        </Section>

      </main>

      <footer className="text-center py-6 text-xs text-slate-400 border-t bg-white">
        <p>© {new Date().getFullYear()} <strong className="text-slate-600">مركز مطمئنة — الكويت</strong> — جميع الحقوق محفوظة.</p>
        <p className="mt-1">هذه الصفحة متاحة للعموم دون الحاجة إلى تسجيل دخول.</p>
      </footer>
    </div>
  );
};

export default PrivacyPolicyPage;
