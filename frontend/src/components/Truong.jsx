import { useState } from 'react';
import Icon from './Icon';

/**
 * Một ô nhập của form. `truong` là mô tả ô:
 *   { key, nhan, type, batBuoc, options, placeholder, goiY, chiDoc, maxLength, min, max, buoc, rows, autoComplete }
 * type: text | email | password | number | select | textarea
 */
export default function Truong({ id, truong, giaTri, loi, dangKiemTra, onDoi, onRoi }) {
  const [hienMatKhau, setHienMatKhau] = useState(false);
  const idLoi = `${id}-loi`;
  const idGoiY = `${id}-goi-y`;
  const chung = {
    id,
    value: giaTri ?? '',
    disabled: !!truong.chiDoc,
    onChange: (e) => onDoi(e.target.value),
    onBlur: () => onRoi?.(),
    'aria-invalid': loi ? true : undefined,
    'aria-describedby': [loi && idLoi, truong.goiY && idGoiY].filter(Boolean).join(' ') || undefined,
    'aria-required': truong.batBuoc || undefined,
  };

  let o;
  if (truong.type === 'select') {
    o = (
      <select className="hr-select" {...chung}>
        <option value="">{truong.placeholder ?? '— Chọn —'}</option>
        {(truong.options ?? []).map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>
    );
  } else if (truong.type === 'textarea') {
    o = <textarea className="hr-textarea" rows={truong.rows ?? 3} maxLength={truong.maxLength} placeholder={truong.placeholder} {...chung} />;
  } else if (truong.type === 'password') {
    o = (
      <div className="hr-o-mat-khau">
        <input
          className="hr-input"
          type={hienMatKhau ? 'text' : 'password'}
          autoComplete={truong.autoComplete ?? 'new-password'}
          maxLength={truong.maxLength ?? 72}
          placeholder={truong.placeholder}
          {...chung}
        />
        <button
          type="button"
          className="hr-btn hr-btn-icon"
          onClick={() => setHienMatKhau((v) => !v)}
          aria-label={hienMatKhau ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          tabIndex={-1}
        >
          <Icon ten={hienMatKhau ? 'matGach' : 'mat'} kichCo={17} />
        </button>
      </div>
    );
  } else {
    o = (
      <input
        className="hr-input"
        type={truong.type === 'number' ? 'number' : truong.type === 'email' ? 'email' : 'text'}
        inputMode={truong.type === 'number' ? 'numeric' : undefined}
        min={truong.min}
        max={truong.max}
        step={truong.buoc}
        maxLength={truong.maxLength}
        autoComplete={truong.autoComplete ?? 'off'}
        placeholder={truong.placeholder}
        {...chung}
      />
    );
  }

  return (
    <div className={`hr-truong ${loi ? 'hr-truong-loi' : ''}`}>
      <label className="hr-nhan" htmlFor={id}>
        {truong.nhan}
        {truong.batBuoc && (
          <span className="hr-bat-buoc" aria-hidden="true" title="Bắt buộc">
            *
          </span>
        )}
      </label>
      {o}
      {dangKiemTra && <span className="hr-goi-y">Đang kiểm tra...</span>}
      {loi && (
        <span className="hr-loi-chu" id={idLoi} role="alert">
          {loi}
        </span>
      )}
      {truong.goiY && !loi && (
        <span className="hr-goi-y" id={idGoiY}>
          {truong.goiY}
        </span>
      )}
    </div>
  );
}
