// Bộ icon SVG nội bộ (không cần cài thư viện). Dùng: <Icon ten="sua" kichCo={16} />
const DUONG = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  dong: 'M6 6l12 12M18 6L6 18',
  them: 'M12 5v14M5 12h14',
  tim: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M20 20l-3.5-3.5',
  nhieuHon: 'M5 12h.01M12 12h.01M19 12h.01',
  xuongMuiTen: 'M6 9l6 6 6-6',
  phaiMuiTen: 'M9 6l6 6-6 6',
  sua: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  xoa: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  lichSu: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  dangXuat: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  nguoi: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8',
  nhieuNguoi: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  dongHo: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v5l3 2',
  caiDat: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  soDo: 'M10 3h4v4h-4zM3 17h4v4H3zM17 17h4v4h-4zM12 7v5M5 17v-5h14v5',
  chia: 'M21 2l-2 2M15.5 7.5l3 3L22 7l-3-3M10.6 12.4a5.5 5.5 0 1 1-7.8 7.8a5.5 5.5 0 0 1 7.8-7.8zM10.6 12.4L15.5 7.5',
  mat: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6',
  matGach:
    'M17.9 17.9A10.1 10.1 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2M1 1l22 22',
  canhBao: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  tich: 'M20 6L9 17l-5-5',
  thongTin: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 11v5M12 8h.01',
};

export default function Icon({ ten, kichCo = 18, ...props }) {
  const d = DUONG[ten];
  if (!d) return null;
  return (
    <svg
      width={kichCo}
      height={kichCo}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={ten === 'nhieuHon' ? 3 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={d} />
    </svg>
  );
}
