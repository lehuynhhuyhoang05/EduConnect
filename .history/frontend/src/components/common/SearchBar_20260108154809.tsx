import { useState, useCallback, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  value: controlledValue,
  onChange,
  onSearch,
  placeholder = 'Tìm kiếm...',
  debounceMs = 300,
  className,
  autoFocus = false,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(controlledValue || '');
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  useEffect(() => {
    if (!onSearch) return;

    const timer = setTimeout(() => {
      onSearch(value);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs, onSearch]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInternalValue(newValue);
      onChange?.(newValue);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    setInternalValue('');
    onChange?.('');
    onSearch?.('');
  }, [onChange, onSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        onSearch?.(value);
      }
      if (e.key === 'Escape') {
        handleClear();
      }
    },
    [value, onSearch, handleClear]
  );

  return (
    <div className={cn('relative', className)}>
      <Input
        type="search"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        leftIcon={<Search className="h-4 w-4" />}
        rightIcon={
          value ? (
            <button
              onClick={handleClear}
              className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : undefined
        }
      />
    </div>
  );
}
