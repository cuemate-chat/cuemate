export default function AppFooter() {
  return (
    <footer className="h-12 flex items-center justify-center text-xs text-slate-500 border-t border-slate-200 bg-white">
      © {new Date().getFullYear()} CueMate. All rights reserved.
    </footer>
  );
}


