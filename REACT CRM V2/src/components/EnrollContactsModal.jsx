import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { contacts, contactLists as contactListsApi, dripSequences as dripSequencesApi } from '../api';
import { useModalA11y } from '../hooks/useModalA11y';
import { cn } from '../utils/cn';

const EnrollContactsModal = ({ open, onClose, sequence }) => {
  const queryClient = useQueryClient();
  const ref = useModalA11y(open, onClose);
  const [mode, setMode] = useState('list');
  const [listId, setListId] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [contactQuery, setContactQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (open) {
      setMode('list');
      setListId('');
      setSelectedContacts([]);
      setContactQuery('');
    }
  }, [open]);

  const { data: lists = [] } = useQuery({
    queryKey: ['contact-lists'],
    queryFn: contactListsApi.getContactLists,
    enabled: open,
  });

  const { data: contactsResp, isFetching: contactsFetching } = useQuery({
    queryKey: ['contacts-select', contactQuery],
    queryFn: () => contacts.getContacts({ search: contactQuery || undefined, per_page: 20 }).then((res) => res.data || []),
    enabled: open && mode === 'contacts' && dropdownOpen,
  });

  useEffect(() => {
    if (!dropdownOpen) return undefined;
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const toggleContact = (contact) => {
    setSelectedContacts((prev) =>
      prev.some((c) => c.id === contact.id) ? prev.filter((c) => c.id !== contact.id) : [...prev, contact]
    );
  };

  const mutation = useMutation({
    mutationFn: () =>
      dripSequencesApi.enrollInDripSequence(
        sequence.id,
        mode === 'list' ? { contact_list_id: Number(listId) } : { contact_ids: selectedContacts.map((c) => c.id) }
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['drip-sequences'] });
      toast.success(data.message);
      onClose();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل تسجيل جهات الاتصال'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'list' && !listId) return toast.error('اختر قائمة تواصل');
    if (mode === 'contacts' && selectedContacts.length === 0) return toast.error('اختر جهة اتصال واحدة على الأقل');
    mutation.mutate();
  };

  return (
    <AnimatePresence>
      {open && sequence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-800">تسجيل جهات اتصال</h2>
                <p className="text-slate-400 text-xs font-bold mt-1">السلسلة: {sequence.name}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button type="button" onClick={() => setMode('list')}
                  className={cn('flex-1 h-10 rounded-lg text-sm font-bold transition-all', mode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-slate-500')}>
                  قائمة تواصل
                </button>
                <button type="button" onClick={() => setMode('contacts')}
                  className={cn('flex-1 h-10 rounded-lg text-sm font-bold transition-all', mode === 'contacts' ? 'bg-white shadow text-indigo-600' : 'text-slate-500')}>
                  جهات اتصال محددة
                </button>
              </div>

              {mode === 'list' ? (
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">قائمة التواصل *</label>
                  <select
                    value={listId} onChange={(e) => setListId(e.target.value)}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">اختر قائمة...</option>
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>{l.name} ({l.count})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="relative" ref={pickerRef}>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">جهات الاتصال *</label>
                  {selectedContacts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selectedContacts.map((c) => (
                        <span key={c.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg">
                          {c.name}
                          <button type="button" onClick={() => toggleContact(c)} className="hover:text-rose-600">
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={contactQuery}
                      onFocus={() => setDropdownOpen(true)}
                      onChange={(e) => { setContactQuery(e.target.value); setDropdownOpen(true); }}
                      placeholder="ابحث بالاسم أو الرقم..."
                      className="w-full h-11 pr-9 pl-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  {dropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
                      {contactsFetching ? (
                        <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-indigo-600" /></div>
                      ) : contactsResp?.length ? (
                        contactsResp.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleContact(c)}
                            className={cn('w-full text-right px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors flex items-center justify-between', selectedContacts.some((sc) => sc.id === c.id) && 'bg-indigo-50/60')}
                          >
                            <span>
                              <span className="font-bold text-slate-800">{c.name}</span>
                              <span className="block text-xs text-slate-400">{c.phone}</span>
                            </span>
                            {selectedContacts.some((sc) => sc.id === c.id) && <span className="text-indigo-600 text-xs font-black">مُختار</span>}
                          </button>
                        ))
                      ) : (
                        <p className="text-center text-xs text-slate-400 py-4">لا توجد نتائج</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-slate-400 leading-relaxed">
                سيتم تخطي جهات الاتصال المحظورة أو المسجلة مسبقاً في هذه السلسلة تلقائياً.
              </p>

              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">
                  إلغاء
                </button>
                <button type="submit" disabled={mutation.isPending}
                  className="flex-1 h-12 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                  {mutation.isPending && <Loader2 size={18} className="animate-spin" />}
                  تسجيل
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EnrollContactsModal;
