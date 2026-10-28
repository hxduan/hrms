import { useEffect, useState } from 'react';

/** Trả về giá trị sau khi người dùng ngừng thay đổi `ms` mili-giây (dùng cho ô tìm kiếm gọi API). */
export default function useDebounce(giaTri, ms = 300) {
  const [v, setV] = useState(giaTri);
  useEffect(() => {
    const t = setTimeout(() => setV(giaTri), ms);
    return () => clearTimeout(t);
  }, [giaTri, ms]);
  return v;
}
