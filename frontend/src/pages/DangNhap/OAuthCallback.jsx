import { useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ManHinhTai } from '../../components/ui';

/** Backend chuyển hướng về đây sau khi Google xác thực xong, kèm token trên URL. */
export default function OAuthCallback() {
  const [params] = useSearchParams();
  const dieuHuong = useNavigate();
  const { luuPhien } = useAuth();
  const accessToken = params.get('accessToken');
  const refreshToken = params.get('refreshToken');

  useEffect(() => {
    if (!accessToken || !refreshToken) return;
    // Xóa token khỏi thanh địa chỉ/lịch sử trình duyệt ngay lập tức
    window.history.replaceState(null, '', '/oauth-callback');
    luuPhien({ accessToken, refreshToken }).then((nd) => dieuHuong(nd ? '/' : '/dang-nhap', { replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!accessToken || !refreshToken) return <Navigate to="/dang-nhap" replace />;
  return (
    <div className="hr-app">
      <ManHinhTai noiDung="Đang hoàn tất đăng nhập Google..." />
    </div>
  );
}
