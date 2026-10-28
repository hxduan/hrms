import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Modal from './Modal';
import Icon from './Icon';

const ToastCtx = createContext(null);
const ConfirmCtx = createContext(null);

/**
 * Cung cấp 2 hook cho toàn ứng dụng:
 *   const toast = useToast();      toast.thanhCong('Đã lưu');  toast.loi('Không lưu được');
 *   const xacNhan = useXacNhan();  if (await xacNhan({ tieuDe, noiDung, nguyHiem: true })) {...}
 * Thay cho alert()/confirm() của trình duyệt để giao diện nhất quán và dùng được bàn phím.
 */
export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [hopThoai, setHopThoai] = useState(null);
  const demId = useRef(0);
  const giaiQuyet = useRef(null);

  const them = useCallback((loai, noiDung) => {
    const id = ++demId.current;
    setToasts((t) => [...t, { id, loai, noiDung }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), loai === 'loi' ? 6500 : 3800);
  }, []);
  const toast = useMemo(() => ({ thanhCong: (m) => them('ok', m), loi: (m) => them('loi', m) }), [them]);

  const xacNhan = useCallback(
    (tuyChon) =>
      new Promise((resolve) => {
        giaiQuyet.current?.(false);
        giaiQuyet.current = resolve;
        setHopThoai(tuyChon);
      }),
    []
  );
  const dongHopThoai = (ketQua) => {
    giaiQuyet.current?.(ketQua);
    giaiQuyet.current = null;
    setHopThoai(null);
  };

  return (
    <ToastCtx.Provider value={toast}>
      <ConfirmCtx.Provider value={xacNhan}>
        {children}
        {createPortal(
          <div className="hr-portal">
            <div className="hr-toast-khu" role="status" aria-live="polite">
              {toasts.map((t) => (
                <div key={t.id} className={`hr-toast hr-toast-${t.loai}`}>
                  <Icon ten={t.loai === 'ok' ? 'tich' : 'canhBao'} kichCo={18} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{t.noiDung}</span>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
        {hopThoai && (
          <Modal tieuDe={hopThoai.tieuDe ?? 'Xác nhận'} onDong={() => dongHopThoai(false)}>
            <div style={{ marginBottom: 18 }}>{hopThoai.noiDung}</div>
            <div className="hr-modal-chan">
              {hopThoai.nutHuy !== null && (
                <button
                  type="button"
                  className="hr-btn"
                  data-autofocus={hopThoai.nguyHiem ? '' : undefined}
                  onClick={() => dongHopThoai(false)}
                >
                  {hopThoai.nutHuy ?? 'Hủy'}
                </button>
              )}
              <button
                type="button"
                className={`hr-btn ${hopThoai.nguyHiem ? 'hr-btn-nguy-hiem' : 'hr-btn-chinh'}`}
                data-autofocus={hopThoai.nguyHiem ? undefined : ''}
                onClick={() => dongHopThoai(true)}
              >
                {hopThoai.nutXacNhan ?? 'Đồng ý'}
              </button>
            </div>
          </Modal>
        )}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
export const useXacNhan = () => useContext(ConfirmCtx);
