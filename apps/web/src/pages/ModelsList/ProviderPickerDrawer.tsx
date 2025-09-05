import { Button } from 'antd';
import DrawerProvider, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProvider';
import { message } from '../../components/Message';

interface ProviderPickerDrawerProps {
  open: boolean;
  onClose: () => void;
  onPick: (providerId: string) => void;
  providers: {
    public: Array<{ id: string; name: string; icon?: string }>;
    private: Array<{ id: string; name: string; icon?: string }>;
  };
  filterKey?: string;
}

export default function ProviderPickerDrawer({
  open,
  onClose,
  onPick,
  providers,
  filterKey
}: ProviderPickerDrawerProps) {
  // 根据左侧当前节点过滤
  let list: Array<{ id: string; name: string; icon?: string }> = [];
  if (filterKey?.startsWith('scope:')) {
    const sc = filterKey.split(':')[1];
    list = providers[sc as 'public' | 'private'] || [];
  } else {
    list = [...providers.public, ...providers.private];
  }

  // 复制功能
  const handleCopy = () => {
    const content = list.map((p) => `${p.name}: ${p.id}`).join('\n');
    navigator.clipboard
      .writeText(content)
      .then(() => {
        message.success('已复制到剪贴板');
      })
      .catch(() => {
        message.error('复制失败');
      });
  };

  return (
    <DrawerProvider
      open={open}
      onClose={onClose}
      width="60%"
    >
      <DrawerHeader>选择供应商</DrawerHeader>
      <DrawerContent>
        <div className="grid grid-cols-2 gap-3">
          {list.map((p, index) => (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              className="flex items-center border rounded-lg hover:bg-slate-50 relative overflow-hidden group"
            >
              {/* 左侧序号区域 */}
              <div className="w-12 h-full bg-gradient-to-b from-blue-50 to-blue-100 border-r border-blue-200 flex items-center justify-center transition-all duration-200 group-hover:from-blue-100 group-hover:to-blue-200">
                <span className="text-blue-600 text-sm font-semibold group-hover:text-blue-800 transition-colors duration-200">
                  {index + 1}
                </span>
              </div>
              
              {/* 右侧内容区域 */}
              <div className="flex items-center px-4 py-3 flex-1">
                {p.icon &&
                  (() => {
                    const src = `data:image/svg+xml;utf8,${encodeURIComponent(p.icon)}`;
                    return <img src={src} alt="" className="w-6 h-6" />;
                  })()}
                <span className="ml-3 font-medium text-slate-800">{p.name}</span>
              </div>
            </button>
          ))}
        </div>
      </DrawerContent>
      <DrawerFooter>
        <div className="flex justify-end gap-2">
          <Button onClick={handleCopy}>
            复制
          </Button>
          <Button onClick={onClose}>
            关闭
          </Button>
        </div>
      </DrawerFooter>
    </DrawerProvider>
  );
}
