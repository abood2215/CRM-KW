import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { X, Loader2, Plus, Trash2, Search, Check, Upload, LayoutTemplate, MessageSquare, ChevronDown, Image, List } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const CreateCampaignModal = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const csvRef            = useRef(null);
  const imageRef          = useRef(null);
  const templateImageRef  = useRef(null);

  const [form, setForm] = useState({
    name: '', message_text: '', delay_seconds: '30', scheduled_at: '', image_path: '',
  });
  const [msgMode, setMsgMode]               = useState('text');
  const [imageUploading, setImageUploading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateDrop, setShowTemplateDrop] = useState(false);
  const [selectedNumberId, setSelectedNumberId] = useState(null);

  const [recipients, setRecipients]         = useState([{ phone: '', name: '' }]);
  const [jsonText, setJsonText]             = useState('');
  const [inputMode, setInputMode]           = useState('manual');
  const [contactSearch, setContactSearch]   = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [selectedListId, setSelectedListId] = useState(null);

  const { data: whatsappNumbers = [] } = useQuery({
    queryKey: ['whatsapp-numbers'],
    queryFn: async () => {
      const { data } = await api.get('/whatsapp-numbers');
      return data.whatsapp_numbers ?? [];
    },
    enabled: open,
  });

  const connectedNumbers = whatsappNumbers.filter(n => n.status === 'connected');
  const effectiveNumberId = selectedNumberId ?? connectedNumbers[0]?.id ?? null;

  const { data: approvedTemplates = [] } = useQuery({
    queryKey: ['templates-approved', effectiveNumberId],
    queryFn: async () => {
      const { data } = await api.get('/templates', {
        params: { status: 'approved', whatsapp_number_id: effectiveNumberId },
      });
      return data.templates;
    },
    enabled: open && msgMode === 'template' && !!effectiveNumberId,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-all'],
    queryFn: async () => {
      const { data } = await api.get('/contacts', { params: { per_page: 1000, is_blacklisted: false } });
      return data.contacts?.data ?? data.contacts ?? [];
    },
    enabled: open && inputMode === 'contacts',
  });

  const { data: contactLists = [] } = useQuery({
    queryKey: ['contact-lists'],
    queryFn: async () => {
      const { data } = await api.get('/contact-lists');
      return data.contact_lists ?? [];
    },
    enabled: open && inputMode === 'list',
  });

  const filteredContacts = contacts.filter(c =>
    c.phone?.includes(contactSearch) || c.name?.includes(contactSearch)
  );

  useEffect(() => {
    setSelectedTemplate(null);
    setShowTemplateDrop(false);
  }, [selectedNumberId]);

  const toggleContact = (c) => {
    setSelectedContactIds(ids =>
      ids.includes(c.id) ? ids.filter(i => i !== c.id) : [...ids, c.id]
    );
  };

  const mutation = useMutation({
    mutationFn: (payload) => api.post('/campaigns', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('تم إنشاء الحملة وبدء الإرسال');
      handleClose();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل إنشاء الحملة'),
  });

  const handleClose = () => {
    onClose();
    setForm({ name: '', message_text: '', delay_seconds: '5', scheduled_at: '', image_path: '' });
    setRecipients([{ phone: '', name: '' }]);
    setJsonText('');
    setSelectedContactIds([]);
    setSelectedListId(null);
    setContactSearch('');
    setInputMode('manual');
    setMsgMode('text');
    setSelectedTemplate(null);
    setSelectedNumberId(null);
  };

  const addRecipient = () => setRecipients(r => [...r, { phone: '', name: '' }]);
  const removeRecipient = (i) => setRecipients(r => r.filter((_, idx) => idx !== i));
  const updateRecipient = (i, field, value) =>
    setRecipients(r => r.map((rec, idx) => idx === i ? { ...rec, [field]: value } : rec));

  const parseJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      let result = [];
      if (Array.isArray(parsed)) {
        result = parsed.map((item) => {
          if (typeof item === 'string') return { phone: item.trim(), name: '' };
          return { phone: String(item.phone || item.رقم || '').trim(), name: String(item.name || item.اسم || '') };
        }).filter(r => r.phone);
      }
      if (!result.length) return toast.error('لا توجد أرقام صالحة في JSON');
      setRecipients(result);
      toast.success(`تم تحليل ${result.length} رقم`);
    } catch {
      toast.error('صيغة JSON غير صحيحة');
    }
  };

  const handleCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      const lines = text.trim().split('\n').filter(Boolean);
      const result = [];

      for (const line of lines) {
        const cols = line.split(/[,\t;]/).map(c => c.trim().replace(/^["']|["']$/g, ''));
        const phone = cols[0]?.replace(/[^0-9]/g, '');
        const name  = cols[1] ?? '';
        if (phone && phone.length >= 8) result.push({ phone, name });
      }

      if (!result.length) return toast.error('لم يُعثر على أرقام صالحة في الملف');
      setRecipients(result);
      setInputMode('manual');
      toast.success(`تم استيراد ${result.length} رقم من CSV`);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const recipientCount = (() => {
    if (inputMode === 'contacts') return selectedContactIds.length;
    if (inputMode === 'list') {
      const list = contactLists.find((l) => l.id === selectedListId);
      return list?.count ?? 0;
    }
    return recipients.filter(r => r.phone.trim()).length;
  })();

  const handleImageFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post('/campaigns/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm(f => ({ ...f, image_path: data.url }));
      toast.success('تم رفع الصورة');
    } catch {
      toast.error('فشل رفع الصورة');
    } finally {
      setImageUploading(false);
      e.target.value = '';
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('اسم الحملة مطلوب');

    if (msgMode === 'text' && !form.message_text.trim())
      return toast.error('نص الرسالة مطلوب');
    if (msgMode === 'template' && !selectedTemplate)
      return toast.error('اختر قالباً');
    if (msgMode === 'image' && !form.image_path.trim())
      return toast.error('رابط الصورة مطلوب');

    let finalRecipients = [];
    const payload = {
      name:               form.name,
      delay_seconds:      Number(form.delay_seconds) || 5,
      scheduled_at:       form.scheduled_at || undefined,
      whatsapp_number_id: effectiveNumberId || undefined,
    };

    if (inputMode === 'list') {
      if (!selectedListId) return toast.error('اختر قائمة واحدة على الأقل');
      payload.contact_list_id = selectedListId;
    } else if (inputMode === 'contacts') {
      if (!selectedContactIds.length) return toast.error('اختر جهة اتصال واحدة على الأقل');
      finalRecipients = contacts
        .filter(c => selectedContactIds.includes(c.id))
        .map(c => ({ phone: c.phone, name: c.name || '' }));
      payload.recipients = finalRecipients;
    } else {
      finalRecipients = recipients.filter(r => r.phone.trim());
      if (!finalRecipients.length) return toast.error('أضف مستلماً واحداً على الأقل');
      payload.recipients = finalRecipients;
    }

    if (msgMode === 'template' && selectedTemplate) {
      payload.template_name     = selectedTemplate.name;
      payload.template_language = selectedTemplate.language;
      payload.message_text      = selectedTemplate.body_text;
      if (selectedTemplate.header_type === 'image' && form.image_path)
        payload.image_path = form.image_path;
    } else if (msgMode === 'image') {
      payload.image_path   = form.image_path;
      payload.message_text = form.message_text;
    } else {
      payload.message_text = form.message_text;
    }

    mutation.mutate(payload);
  };

  const recipientModes = [
    { id: 'list',     label: 'قائمة' },
    { id: 'contacts', label: 'جهات الاتصال' },
    { id: 'manual',   label: 'يدوي' },
    { id: 'json',     label: 'JSON' },
    { id: 'csv',      label: 'CSV' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full sm:max-w-2xl relative max-h-[95vh] sm:max-h-[90vh] flex flex-col"
          >
            <div className="px-5 py-4 sm:p-8 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-black text-slate-800">حملة ترويجية جديدة</h2>
              <button onClick={handleClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 sm:p-8 space-y-4 sm:space-y-5 overflow-y-auto flex-1">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">اسم الحملة *</label>
                  <input type="text" required
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="مثال: عروض رمضان 2025" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">التأخير بين الرسائل (ثانية)</label>
                  <input type="number" min="1" max="60"
                    value={form.delay_seconds} onChange={e => setForm(f => ({ ...f, delay_seconds: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
              </div>

              {connectedNumbers.length === 0 && whatsappNumbers.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <p className="text-xs font-bold text-rose-700">⚠ لا يوجد رقم واتساب متصل. يرجى ربط رقم من إعدادات الواتساب.</p>
                </div>
              )}

              {connectedNumbers.length > 1 && (
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">رقم الواتساب المُرسِل *</label>
                  <select
                    value={effectiveNumberId ?? ''}
                    onChange={e => setSelectedNumberId(Number(e.target.value))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {connectedNumbers.map(n => (
                      <option key={n.id} value={n.id}>
                        {n.name ? `${n.name} — ${n.phone}` : n.phone}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-600 mb-2">نوع الرسالة</label>
                <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                  <button type="button" onClick={() => setMsgMode('text')}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all ${msgMode === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                    <MessageSquare size={13} /> نص حر
                  </button>
                  <button type="button" onClick={() => setMsgMode('image')}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all ${msgMode === 'image' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                    <Image size={13} /> صورة
                  </button>
                  <button type="button" onClick={() => setMsgMode('template')}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all ${msgMode === 'template' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                    <LayoutTemplate size={13} /> قالب Template
                  </button>
                </div>
                {msgMode === 'template' && (
                  <p className="text-xs text-indigo-600 mt-1.5 font-medium">
                    ✓ مناسب للأرقام الجديدة التي لم تتواصل معك من قبل
                  </p>
                )}
                {msgMode === 'image' && (
                  <p className="text-xs text-amber-600 mt-1.5 font-medium">
                    ⚠ الرابط يجب أن يكون متاحاً للعامة (HTTPS مباشر)
                  </p>
                )}
              </div>

              {msgMode === 'text' ? (
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">نص الرسالة *</label>
                  <textarea rows={4}
                    value={form.message_text} onChange={e => setForm(f => ({ ...f, message_text: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                    placeholder="اكتب نص الرسالة..." />
                </div>
              ) : msgMode === 'image' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-1.5">الصورة *</label>
                    <input
                      ref={imageRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handleImageFile}
                    />
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={form.image_path}
                        onChange={e => setForm(f => ({ ...f, image_path: e.target.value }))}
                        className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ltr"
                        placeholder="https://example.com/image.jpg"
                      />
                      <button
                        type="button"
                        onClick={() => imageRef.current?.click()}
                        disabled={imageUploading}
                        className="h-11 px-4 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
                      >
                        {imageUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        {imageUploading ? 'جاري الرفع...' : 'رفع من الجهاز'}
                      </button>
                    </div>
                  </div>
                  {form.image_path && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-2">
                      <img
                        src={form.image_path}
                        alt="معاينة"
                        className="max-h-40 mx-auto rounded-lg object-contain"
                        onError={e => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-1.5">تعليق (Caption) — اختياري</label>
                    <textarea rows={2}
                      value={form.message_text} onChange={e => setForm(f => ({ ...f, message_text: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                      placeholder="نص يظهر تحت الصورة..." />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">اختر القالب *</label>
                  <div className="relative">
                    <button type="button" onClick={() => setShowTemplateDrop(v => !v)}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm flex items-center justify-between hover:border-indigo-400 transition-colors">
                      <span className={selectedTemplate ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                        {selectedTemplate ? selectedTemplate.name : 'اختر قالباً معتمداً...'}
                      </span>
                      <ChevronDown size={16} className="text-slate-400" />
                    </button>
                    {showTemplateDrop && (
                      <div className="absolute top-12 right-0 left-0 z-20 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                        {approvedTemplates.length === 0 ? (
                          <p className="text-center text-slate-400 text-sm py-6">لا توجد قوالب معتمدة</p>
                        ) : approvedTemplates.map(t => (
                          <button key={t.id} type="button"
                            onClick={() => {
                              setSelectedTemplate(t);
                              setShowTemplateDrop(false);
                              if (t.header_type === 'image' && t.header_content) {
                                setForm(f => ({ ...f, image_path: t.header_content }));
                              }
                            }}
                            className="w-full flex items-start justify-between gap-2 px-4 py-3 hover:bg-indigo-50 text-right border-b border-slate-50 last:border-0 transition-colors">
                            <div>
                              <p className="text-sm font-bold text-slate-800">{t.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{t.body_text}</p>
                            </div>
                            {selectedTemplate?.id === t.id && <Check size={16} className="text-indigo-600 flex-shrink-0 mt-1" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedTemplate && (
                    <div className="mt-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed border border-slate-200">
                      {selectedTemplate.body_text}
                    </div>
                  )}
                  {selectedTemplate?.header_type === 'image' && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-xs font-bold text-amber-700 mb-2">
                        صورة الـ Header
                        {selectedTemplate.header_content && form.image_path === selectedTemplate.header_content && (
                          <span className="mr-2 text-emerald-600 font-bold">✓ تم تحميلها تلقائياً</span>
                        )}
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={form.image_path}
                          onChange={e => setForm(f => ({ ...f, image_path: e.target.value }))}
                          className="flex-1 h-10 px-3 bg-white border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 ltr"
                          placeholder="https://example.com/image.jpg"
                        />
                        <button type="button" onClick={() => templateImageRef.current?.click()}
                          disabled={imageUploading}
                          className="h-10 px-3 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 disabled:opacity-50 whitespace-nowrap">
                          {imageUploading ? '...' : 'رفع صورة'}
                        </button>
                        <input ref={templateImageRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                      </div>
                      {form.image_path && (
                        <img src={form.image_path} alt="معاينة" className="mt-2 max-h-24 rounded-lg object-contain border border-amber-200" />
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5">جدولة (اختياري)</label>
                <input type="datetime-local"
                  value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <label className="text-xs font-black text-slate-600">
                    المستلمون * {recipientCount > 0 && <span className="text-indigo-600">({recipientCount} رقم)</span>}
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {recipientModes.map(m => (
                      <button key={m.id} type="button" onClick={() => setInputMode(m.id)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${inputMode === m.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {inputMode === 'csv' && (
                  <div
                    onClick={() => csvRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-indigo-200 rounded-xl p-8 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
                  >
                    <input ref={csvRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={handleCSV} />
                    <Upload size={28} className="text-indigo-400" />
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-700">اضغط لرفع ملف CSV</p>
                      <p className="text-xs text-slate-400 mt-1">العمود الأول: رقم الهاتف | العمود الثاني: الاسم (اختياري)</p>
                    </div>
                    {recipients.filter(r=>r.phone).length > 0 && inputMode === 'csv' && (
                      <p className="text-xs font-bold text-indigo-600">تم استيراد {recipients.filter(r=>r.phone).length} رقم</p>
                    )}
                  </div>
                )}

                {inputMode === 'manual' && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {recipients.map((r, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input type="text" placeholder="رقم الهاتف *"
                          value={r.phone} onChange={e => updateRecipient(i, 'phone', e.target.value)}
                          className="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                        <input type="text" placeholder="الاسم (اختياري)"
                          value={r.name} onChange={e => updateRecipient(i, 'name', e.target.value)}
                          className="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                        {recipients.length > 1 && (
                          <button type="button" onClick={() => removeRecipient(i)}
                            className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={addRecipient}
                      className="w-full h-10 border-2 border-dashed border-slate-200 text-slate-400 rounded-xl text-xs font-bold hover:border-indigo-300 hover:text-indigo-500 transition-all flex items-center justify-center gap-2">
                      <Plus size={16} /> إضافة رقم
                    </button>
                  </div>
                )}

                {inputMode === 'json' && (
                  <div className="space-y-3">
                    <textarea rows={5}
                      value={jsonText} onChange={e => setJsonText(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                      placeholder={'["96555344117","96560003501"]\nأو: [{"phone":"96555344117","name":"أحمد"}]'} />
                    <button type="button" onClick={parseJson}
                      className="w-full h-10 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-all">
                      تحليل JSON ({recipients.filter(r => r.phone).length} رقم حالياً)
                    </button>
                  </div>
                )}

                {inputMode === 'list' && (
                  <div className="space-y-3">
                    {contactLists.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                        <List size={28} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 font-bold">لا توجد قوائم</p>
                      </div>
                    ) : (
                      <div className="grid gap-2 max-h-48 overflow-y-auto">
                        {contactLists.map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => setSelectedListId(l.id)}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${selectedListId === l.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
                          >
                            <div className="flex items-center gap-3 text-right">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selectedListId === l.id ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                                <List size={16} className={selectedListId === l.id ? 'text-indigo-600' : 'text-slate-400'} />
                              </div>
                              <div>
                                <p className="font-bold">{l.name}</p>
                                <p className="text-xs text-slate-400">{l.count ?? 0} جهة اتصال</p>
                              </div>
                            </div>
                            {selectedListId === l.id && <Check size={16} className="text-indigo-600 flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {inputMode === 'contacts' && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" placeholder="ابحث بالاسم أو الرقم..."
                        value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                        className="w-full h-10 pr-9 pl-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                      {filteredContacts.length === 0 ? (
                        <p className="text-center text-slate-400 text-sm py-6">لا توجد جهات اتصال</p>
                      ) : filteredContacts.map(c => (
                        <button key={c.id} type="button" onClick={() => toggleContact(c)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 transition-all ${selectedContactIds.includes(c.id) ? 'bg-indigo-50' : ''}`}>
                          <div className="text-right">
                            <p className="font-bold text-slate-700">{c.name || c.phone}</p>
                            <p className="text-xs text-slate-400">{c.phone}</p>
                          </div>
                          {selectedContactIds.includes(c.id) && <Check size={16} className="text-indigo-600 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                    {selectedContactIds.length > 0 && (
                      <p className="text-xs font-bold text-indigo-600">تم اختيار {selectedContactIds.length} جهة اتصال</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2 pb-2">
                <button type="button" onClick={handleClose}
                  className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm">
                  إلغاء
                </button>
                <button type="submit" disabled={mutation.isPending}
                  className="flex-1 h-12 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2 text-sm">
                  {mutation.isPending && <Loader2 size={18} className="animate-spin" />}
                  إطلاق الحملة
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateCampaignModal;
