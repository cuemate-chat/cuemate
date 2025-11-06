export default function AppFooter() {
  return (
    <footer className="h-12 flex items-center justify-center text-xs text-slate-500 dark:text-slate-100 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      © {new Date().getFullYear()} CueMate. All rights reserved.
    </footer>
  );
}
