import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

// Ngăn xếp các modal đang mở: chỉ modal TRÊN CÙNG xử lý Esc/Tab
// (VD hộp thoại xác nhận mở chồng lên form — Esc chỉ đóng hộp xác nhận).
const ngan = [];

const CO_THE_FOCUS =
  'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ tieuDe, onDong, children, rong = false }) {
  const khung = useRef(null);
  const onDongMoiNhat = useRef(onDong);
  onDongMoiNhat.current = onDong;

  useEffect(() => {
    const dau = {};
    ngan.push(dau);
    const nutTruocDo = document.activeElement;
    const overflowCu = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const goc = khung.current;
    const dich =
      goc.querySelector('[data-autofocus]') ||
      goc.querySelector(
        '.hr-modal-than input:not([disabled]):not([type=hidden]), .hr-modal-than select:not([disabled]), .hr-modal-than textarea:not([disabled])'
      ) ||
      goc.querySelector('.hr-modal-than button') ||
      goc.querySelector('button');
    dich?.focus();

    function khiBamPhim(e) {
      if (ngan[ngan.length - 1] !== dau) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onDongMoiNhat.current?.();
      } else if (e.key === 'Tab') {
        const ds = [...goc.querySelectorAll(CO_THE_FOCUS)];
        if (ds.length === 0) return;
        const dauTien = ds[0];
        const cuoi = ds[ds.length - 1];
        if (e.shiftKey && document.activeElement === dauTien) {
          e.preventDefault();
          cuoi.focus();
        } else if (!e.shiftKey && document.activeElement === cuoi) {
          e.preventDefault();
          dauTien.focus();
        }
      }
    }
    document.addEventListener('keydown', khiBamPhim);
    return () => {
      document.removeEventListener('keydown', khiBamPhim);
      ngan.splice(ngan.indexOf(dau), 1);
      document.body.style.overflow = overflowCu;
      nutTruocDo?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="hr-portal">
      <div className="hr-modal-nen">
        <div
          ref={khung}
          className={`hr-modal ${rong ? 'hr-modal-rong' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={tieuDe}
        >
          <div className="hr-modal-dau">
            <h2>{tieuDe}</h2>
            <button type="button" className="hr-btn hr-btn-icon" onClick={() => onDong?.()} aria-label="Đóng">
              <Icon ten="dong" />
            </button>
          </div>
          <div className="hr-modal-than">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
