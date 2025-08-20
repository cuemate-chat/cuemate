import { Pagination } from 'antd';

export default function PaginationBar({
  page,
  pageSize = 6,
  total,
  onChange,
  onPageSizeChange,
  showSizeChanger = false,
  pageSizeOptions = ['10', '20', '50', '100'],
}: {
  page: number;
  pageSize?: number;
  total: number;
  onChange: (p: number) => void;
  onPageSizeChange?: (current: number, size: number) => void;
  showSizeChanger?: boolean;
  pageSizeOptions?: string[];
}) {
  return (
    <Pagination
      current={page}
      pageSize={pageSize}
      total={total}
      onChange={(p) => onChange(p)}
      onShowSizeChange={onPageSizeChange}
      showSizeChanger={showSizeChanger}
      pageSizeOptions={pageSizeOptions}
      showTotal={(t, range) => 
        showSizeChanger 
          ? `第 ${range[0]}-${range[1]} 条，共 ${t} 条` 
          : `共 ${t} 条`
      }
      showQuickJumper={showSizeChanger}
    />
  );
}
