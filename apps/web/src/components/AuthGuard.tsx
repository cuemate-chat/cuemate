import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { storage } from '../api/http';

interface Props {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = storage.getToken();
    if (!token) {
      navigate('/login', { replace: true, state: { from: location.pathname } });
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    const onStorage = () => {
      const token = storage.getToken();
      if (!token) navigate('/login', { replace: true });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [navigate]);

  return <>{children}</>;
}


