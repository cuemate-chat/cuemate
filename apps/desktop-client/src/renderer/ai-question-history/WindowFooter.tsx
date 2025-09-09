import { Pagination } from './components/Pagination';

interface WindowFooterProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
}

export function WindowFooter({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalItems, 
  pageSize 
}: WindowFooterProps) {
  return (
    <div className="ai-window-footer">
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        showInfo={true}
        totalItems={totalItems}
        pageSize={pageSize}
      />
    </div>
  );
}


