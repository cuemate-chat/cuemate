import { Outlet } from 'react-router-dom';
import AppFooter from './Footer';
import Header from './Header';
import MainView from './Main';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
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


