import { Pagination } from 'antd';

interface WindowFooterProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (current: number, size: number) => void;
  totalItems: number;
  pageSize: number;
}

export function WindowFooter({ 
  currentPage, 
  onPageChange, 
  onPageSizeChange,
  totalItems, 
  pageSize 
}: WindowFooterProps) {
  return (
    <div className="ai-window-footer">
      <div className="pagination-wrapper">
        <Pagination
          current={currentPage}
          total={totalItems}
          pageSize={pageSize}
          onChange={onPageChange}
          showTotal={(total, range) => 
            `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }
          showQuickJumper={false}
          showSizeChanger={false}
          size="small"
          simple={totalItems > pageSize * 10}
          showLessItems={true}
          className="custom-pagination"
        />
      </div>
    </div>
  );
}


