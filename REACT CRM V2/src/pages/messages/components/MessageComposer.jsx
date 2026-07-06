import React, { useRef, useState } from 'react';
import { Send, Smile, Paperclip, Lock, Loader2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';
import { campaigns as campaignsApi } from '../../../api';

const COMMON_EMOJIS = ['😀', '😂', '😍', '👍', '🙏', '❤️', '😢', '🎉', '🔥', '✅'];

const MessageComposer = ({ onSend, isSending, onOpenTemplatePicker }) => {
  const [text, setText] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend({ content: text.trim(), isPrivate, type: 'text' });
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('الملفات المدعومة: صور فقط');

    setUploading(true);
    try {
      const { url } = await campaignsApi.uploadCampaignImage(file);
      onSend({ content: url, isPrivate: false, type: 'image' });
    } catch {
      toast.error('فشل رفع الملف');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="border-t border-slate-100 bg-white p-4 flex-shrink-0">
      {isPrivate && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 mb-2">
          <Lock size={12} />
          ملاحظة داخلية (لن تُرسل للعميل)
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setIsPrivate((p) => !p)}
            className={cn('w-9 h-9 rounded-xl flex items-center justify-center', isPrivate ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:bg-slate-50')}
            title="ملاحظة داخلية"
          >
            <Lock size={16} />
          </button>
          <button type="button" onClick={onOpenTemplatePicker} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50" title="إرسال قالب">
            <FileText size={16} />
          </button>
          <div className="relative">
            <button type="button" onClick={() => setShowEmoji((s) => !s)} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50">
              <Smile size={16} />
            </button>
            {showEmoji && (
              <div className="absolute bottom-11 right-0 bg-white border border-slate-200 rounded-xl shadow-lg p-2 grid grid-cols-5 gap-1 z-10">
                {COMMON_EMOJIS.map((emoji) => (
                  <button key={emoji} onClick={() => { setText((t) => t + emoji); setShowEmoji(false); }} className="text-lg hover:bg-slate-50 rounded p-1">
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={isPrivate ? 'اكتب ملاحظة داخلية...' : 'اكتب رسالة...'}
          className="flex-1 resize-none max-h-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />

        <button
          onClick={handleSend}
          disabled={isSending || !text.trim()}
          className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0"
        >
          {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
};

export default MessageComposer;
