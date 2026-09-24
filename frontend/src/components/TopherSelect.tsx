import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface TopherSelectOption {
  value: string;
  label: string;
}

interface TopherSelectProps {
  value: string;
  options: TopherSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  required?: boolean;
}

const TopherSelect: React.FC<TopherSelectProps> = ({
  value, options, onChange, placeholder = 'Seleccionar...', disabled = false, className = '', compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === String(value));

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`topher-select-root ${compact ? 'topher-select-compact' : ''} ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className="topher-select-trigger"
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selected ? 'text-white' : 'text-white/45'}>{selected?.label || placeholder}</span>
        <ChevronDown className={`topher-select-chevron ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={listboxId} role="listbox" className="topher-select-menu">
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === String(value)}
              key={option.value}
              className={`topher-select-option ${option.value === String(value) ? 'is-selected' : ''}`}
              onClick={() => choose(option.value)}
            >
              <span>{option.label}</span>
              {option.value === String(value) && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopherSelect;
