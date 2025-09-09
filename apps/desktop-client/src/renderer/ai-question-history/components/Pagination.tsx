import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
  totalItems?: number;
  pageSize?: number;
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange,
  showInfo = true,
  totalItems = 0,
  pageSize = 5
}: PaginationProps) {
  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 7;
    
    if (totalPages <= maxVisiblePages) {
      // 如果总页数少于等于7，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 复杂分页逻辑
      if (currentPage <= 4) {
        // 当前页在前部
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // 当前页在后部
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // 当前页在中间
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (totalPages <= 1) {
    return showInfo ? (
      <div className="pagination-info">
        共 {totalItems} 条
      </div>
    ) : null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="pagination-container">
      {showInfo && (
        <div className="pagination-info">
          第 {startItem}-{endItem} 条，共 {totalItems} 条
        </div>
      )}
      
      <div className="pagination-controls">
        {/* 上一页按钮 */}
        <button
          className="pagination-btn pagination-nav"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="上一页"
        >
          <ChevronLeft size={16} />
        </button>

        {/* 页码按钮 */}
        {generatePageNumbers().map((page, index) => (
          <div key={index}>
            {page === '...' ? (
              <span className="pagination-dots">...</span>
            ) : (
              <button
                className={`pagination-btn pagination-page ${
                  page === currentPage ? 'pagination-page-active' : ''
                }`}
                onClick={() => onPageChange(page as number)}
              >
                {page}
              </button>
            )}
          </div>
        ))}

        {/* 下一页按钮 */}
        <button
          className="pagination-btn pagination-nav"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          title="下一页"
        >
          <ChevronRight size={16} />
        </button>

        {/* 跳转输入框 */}
        {totalPages > 5 && (
          <div className="pagination-jump">
            <span>跳转</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              className="pagination-jump-input"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const value = parseInt((e.target as HTMLInputElement).value);
                  if (value >= 1 && value <= totalPages) {
                    onPageChange(value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
              placeholder="页码"
            />
            <span>页</span>
          </div>
        )}
      </div>
    </div>
  );
}