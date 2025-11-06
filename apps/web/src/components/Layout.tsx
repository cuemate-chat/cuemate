import { Outlet } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import AppFooter from './Footer';
import Header from './Header';
import MainView from './Main';

export default function Layout() {
  useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Header />

      {/* RouterView */}
      <MainView>
        <Outlet />
      </MainView>

      {/* Footer */}
      <AppFooter />
    </div>
  );
}
