interface WindowFooterProps {
  totalItems: number;
}

export function MockInterviewHistoryFooter({
  totalItems
}: WindowFooterProps) {
  return (
    <div className="ai-window-footer">
      <div className="total-count-wrapper">
        <span className="total-count">共 {totalItems} 条</span>
      </div>
    </div>
  );
}


