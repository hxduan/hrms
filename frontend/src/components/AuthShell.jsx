/** Khung chung cho các trang trước khi đăng nhập (đăng nhập, đăng ký, quên/đặt lại mật khẩu). */
export default function AuthShell({ tieuDe, moTa, children, duoi }) {
  return (
    <div className="hr-app">
      <div className="hr-xac-thuc">
        <div className="hr-the hr-xac-thuc-the">
          <div className="hr-logo" style={{ padding: '0 0 16px' }}>
            <span className="hr-logo-o">H</span> HRMS
          </div>
          <h1>{tieuDe}</h1>
          {moTa && <p>{moTa}</p>}
          {children}
          {duoi && <div className="hr-lien-ket-duoi">{duoi}</div>}
        </div>
      </div>
    </div>
  );
}
