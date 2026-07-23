import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { conversations as conversationsApi } from '../../../api';

const emptyForm = { phone: '', name: '', message: '', template_name: '', template_language: '', variables: [], header_media: null };

export function useNewConversationForm(onDone) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const mutation = useMutation({
    mutationFn: () => conversationsApi.startConversation(form),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('تم بدء المحادثة');
      setForm(emptyForm);
      onDone?.(data.conversation);
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل بدء المحادثة'),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.phone.trim()) return toast.error('رقم الهاتف مطلوب');
    if (!form.message.trim()) return toast.error(form.template_name ? 'اختر قالباً' : 'نص الرسالة مطلوب');
    mutation.mutate();
  };

  return { form, setForm, submit, isSubmitting: mutation.isPending };
}
