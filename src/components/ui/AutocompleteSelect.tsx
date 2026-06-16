import React from 'react';
import { cn } from '../../lib/utils';
import { Search, ChevronDown, Check, X } from 'lucide-react';

interface AutocompleteSelectProps {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export const AutocompleteSelect: React.FC<AutocompleteSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Buscar o seleccionar...',
  disabled = false,
  error,
  className
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    return options.filter((opt) =>
      opt.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  // Reset search when the closed/open state resets or when value changes
  React.useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  // Click outside to close standard dropdown behavior
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectOption = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div className={cn("w-full space-y-1.5 relative text-left", className)} ref={containerRef}>
      <label className="text-xs font-black text-slate-400 uppercase tracking-wider block ml-1">
        {label}
      </label>

      {/* Styled Selector Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full text-slate-700 bg-white border border-slate-200 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary rounded-2xl p-4 text-sm transition-all outline-none cursor-pointer select-none",
          disabled && "bg-slate-50 text-slate-405 border-slate-100 cursor-not-allowed opacity-70",
          error && "border-red-300 focus-within:ring-red-100 focus-within:border-red-500",
          isOpen && "border-primary ring-1 ring-primary"
        )}
      >
        <span className={cn("truncate font-medium", !value && "text-slate-400 font-normal")}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={14} className="text-slate-400 hover:text-slate-600" />
            </button>
          )}
          <ChevronDown
            size={16}
            className={cn("text-slate-400 transition-transform duration-200", isOpen && "transform rotate-180")}
          />
        </div>
      </div>

      {/* Dropdown Options List */}
      {isOpen && !disabled && (
        <div 
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ maxHeight: '280px', display: 'flex', flexDirection: 'column' }}
        >
          {/* Search Box Input */}
          <div className="p-2 border-b border-slate-50 flex items-center gap-2 bg-slate-50/50">
            <Search size={14} className="text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Escribe para buscar..."
              autoFocus
              className="w-full bg-transparent text-xs text-slate-700 outline-none p-1.5 font-semibold placeholder:text-slate-400"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Scrollable list */}
          <div className="overflow-y-auto" style={{ maxHeight: '200px' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt === value;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-xs font-bold transition-all flex items-center justify-between cursor-pointer hover:bg-slate-50/80",
                      isSelected ? "text-primary bg-primary/5 hover:bg-primary/10" : "text-slate-650"
                    )}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check size={13} className="text-primary shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="py-8 text-center text-[11px] text-slate-450 font-bold italic">
                No se encontraron resultados
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 ml-1 mt-1">{error}</p>}
    </div>
  );
};
