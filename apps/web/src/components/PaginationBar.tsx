import { Pagination } from 'antd';

export default function PaginationBar({
  page,
  pageSize = 6,
  total,
  onChange,
}: {
  page: number;
  pageSize?: number;
  total: number;
  onChange: (p: number) => void;
}) {
  return (
    <Pagination
      current={page}
      pageSize={pageSize}
      total={total}
      onChange={(p) => onChange(p)}
      showSizeChanger={false}
      showTotal={(t) => `共 ${t} 条`}
    />
  );
}
