import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';

/**
 * Tải danh sách từ API và giữ trạng thái đang tải / lỗi.
 *   const { duLieu, dangTai, loi, maLoi, taiLai } = useTaiDuLieu('/phong-ban', { nam: 2026 });
 * Bỏ qua phản hồi cũ nếu tham số đổi trong lúc đang chờ (tránh dữ liệu "nhảy" sai khi gõ nhanh).
 */
export default function useTaiDuLieu(url, params, { khoiTao = [], tat = false } = {}) {
  const [duLieu, setDuLieu] = useState(khoiTao);
  const [dangTai, setDangTai] = useState(!tat);
  const [loi, setLoi] = useState('');
  const [maLoi, setMaLoi] = useState('');
  const lanGoi = useRef(0);
  const khoa = JSON.stringify(params ?? {});

  const taiLai = useCallback(async () => {
    if (tat) return;
    const lan = ++lanGoi.current;
    setDangTai(true);
    setLoi('');
    setMaLoi('');
    try {
      const r = await api.get(url, { params });
      if (lan === lanGoi.current) setDuLieu(r.data);
    } catch (e) {
      if (lan === lanGoi.current) {
        setLoi(e.response?.data?.message ?? 'Không tải được dữ liệu');
        setMaLoi(e.response?.data?.maLoi ?? '');
      }
    } finally {
      if (lan === lanGoi.current) setDangTai(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, khoa, tat]);

  useEffect(() => {
    taiLai();
  }, [taiLai]);

  return { duLieu, dangTai, loi, maLoi, taiLai };
}
