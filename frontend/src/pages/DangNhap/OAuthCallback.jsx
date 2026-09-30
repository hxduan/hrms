import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const dieuHuong = useNavigate();

  useEffect(() => {
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    if (accessToken && refreshToken) {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      dieuHuong('/');
    } else {
      dieuHuong('/dang-nhap');
    }
  }, [params, dieuHuong]);

  return <p>Đang đăng nhập...</p>;
}
