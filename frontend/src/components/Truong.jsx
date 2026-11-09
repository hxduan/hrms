import { useState } from 'react';
import Icon from './Icon';

/**
 * Một ô nhập của form. `truong` là mô tả ô:
 *   { key, nhan, type, batBuoc, options, placeholder, goiY, chiDoc, maxLength, min, max, buoc, rows, autoComplete }
 * type: text | email | password | number | select | textarea
 */
export default function Truong({ id, truong, giaTri, loi, dangKiemTra, onDoi, onRoi, tatCa, datGiaTri }) {
  const [hienMatKhau, setHienMatKhau] = useState(false);
  if (truong.type === 'an') return null; // trường ẩn: có trong dữ liệu gửi đi nhưng không hiển thị
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

  // Ô tự vẽ (VD chọn địa chỉ nhiều cấp): trang truyền hàm render, có thể đặt giá trị cho các trường khác
  if (truong.type === 'tuyChinh') {
    return (
      <div className={`hr-truong ${loi ? 'hr-truong-loi' : ''} ${truong.rong ? 'hr-truong-rong' : ''}`}>
        {truong.nhan && <span className="hr-nhan">{truong.nhan}</span>}
        {truong.render({ id, giaTri, tatCa, datGiaTri, loi, chiDoc: !!truong.chiDoc })}
        {loi && <span className="hr-loi-chu" role="alert">{loi}</span>}
        {truong.goiY && !loi && <span className="hr-goi-y">{truong.goiY}</span>}
      </div>
    );
  }

  if (truong.type === 'checkbox') {
    return (
      <div className={`hr-truong ${truong.rong ? 'hr-truong-rong' : ''}`}>
        <label className="hr-checkbox" htmlFor={id}>
          <input id={id} type="checkbox" checked={!!giaTri} disabled={!!truong.chiDoc} onChange={(e) => onDoi(e.target.checked)} />
          <span>{truong.nhan}</span>
        </label>
        {truong.goiY && <span className="hr-goi-y">{truong.goiY}</span>}
      </div>
    );
  }

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
        type={truong.type === 'number' ? 'number' : truong.type === 'email' ? 'email' : truong.type === 'date' ? 'date' : 'text'}
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
    <div className={`hr-truong ${loi ? 'hr-truong-loi' : ''} ${truong.rong ? 'hr-truong-rong' : ''}`}>
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
