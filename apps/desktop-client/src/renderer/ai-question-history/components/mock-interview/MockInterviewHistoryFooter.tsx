import { Pagination } from 'antd';

interface WindowFooterProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
}

export function MockInterviewHistoryFooter({ 
  currentPage, 
  onPageChange, 
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
          showTotal={(total) => 
            `共 ${total} 条`
          }
          showQuickJumper={false}
          showSizeChanger={false}
          size="small"
          showLessItems={true}
          className="custom-pagination"
        />
      </div>
    </div>
  );
}


