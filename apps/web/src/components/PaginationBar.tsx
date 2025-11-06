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
    <div className="[&_.ant-pagination-item]:dark:bg-slate-700 [&_.ant-pagination-item]:dark:border-slate-600 [&_.ant-pagination-item-active]:dark:border-blue-500 [&_.ant-pagination-item-link]:dark:bg-slate-700 [&_.ant-pagination-item-link]:dark:border-slate-600 [&_.ant-select-selector]:dark:!bg-slate-700 [&_.ant-select-selector]:dark:!border-slate-600 [&_.ant-input]:dark:!bg-slate-700 [&_.ant-input]:dark:!border-slate-600 [&_.ant-pagination-item-link]:dark:text-slate-300 [&_.ant-pagination-item]:dark:text-slate-200 [&_.ant-select-arrow]:dark:text-slate-300">
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
    </div>
  );
}
