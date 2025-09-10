import { Pagination } from 'antd';

interface WindowFooterProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
}

export function WindowFooter({ 
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
          simple={Math.ceil(totalItems / pageSize) > 4}
          showLessItems={true}
          itemRender={(page, type, originalElement) => {
            if (type === 'page') {
              return <span style={{ padding: '0 6px', fontSize: '12px' }}>{page}</span>;
            }
            return originalElement;
          }}
          className="custom-pagination"
        />
      </div>
    </div>
  );
}


