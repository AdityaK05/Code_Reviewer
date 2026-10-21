import { toast } from 'react-hot-toast';

export function useToast() {
  const show = (msg: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') toast.success(msg);
    else toast.error(msg);
  };
  return { show };
}
