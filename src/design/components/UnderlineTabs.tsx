export interface UnderlineTabItem<T extends string = string> {
  key: T;
  label: string;
}

interface UnderlineTabsProps<T extends string> {
  items: UnderlineTabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  className?: string;
}

export function UnderlineTabs<T extends string>({
  items,
  activeKey,
  onChange,
  className = '',
}: UnderlineTabsProps<T>) {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-7 border-b border-[var(--border-subtle)] overflow-x-auto overflow-y-hidden ${className}`}
    >
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <button
            key={item.key}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(item.key)}
            className={`relative pb-3 text-sm transition-colors whitespace-nowrap cursor-pointer ${
              isActive
                ? 'font-medium text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {item.label}
            {isActive && (
              <span className="absolute inset-x-0 bottom-0 h-[1.5px] bg-[var(--text-primary)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
