import { ChevronDown } from 'lucide-react';

interface FilterBarProps {
  sexFilter: string;
  onSexFilterChange: (sex: string) => void;
  birthYearFilter: string;
  onBirthYearFilterChange: (year: string) => void;
  conditionFilter: string;
  onConditionFilterChange: (code: string) => void;
}

export function FilterBar({
  sexFilter,
  onSexFilterChange,
  birthYearFilter,
  onBirthYearFilterChange,
  conditionFilter,
  onConditionFilterChange,
}: FilterBarProps) {
  return (
    <div className="flex items-center gap-3 mb-6 flex-wrap">
      <div className="relative">
        <select
          value={sexFilter}
          onChange={(e) => onSexFilterChange(e.target.value)}
          className="pl-4 pr-10 py-2 bg-white border border-border rounded-lg text-sm appearance-none cursor-pointer hover:border-blue-300 transition-colors outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">All Sex</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
          <option value="O">Other</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>

      <div className="relative">
        <select
          value={birthYearFilter}
          onChange={(e) => onBirthYearFilterChange(e.target.value)}
          className="pl-4 pr-10 py-2 bg-white border border-border rounded-lg text-sm appearance-none cursor-pointer hover:border-blue-300 transition-colors outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">All Years</option>
          <option value="1940-1960">1940-1960</option>
          <option value="1961-1980">1961-1980</option>
          <option value="1981-2000">1981-2000</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>

      <div className="relative">
        <select
          value={conditionFilter}
          onChange={(e) => onConditionFilterChange(e.target.value)}
          className="pl-4 pr-10 py-2 bg-white border border-border rounded-lg text-sm appearance-none cursor-pointer hover:border-blue-300 transition-colors outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">All Conditions</option>
          <option value="DIABETES">Diabetes</option>
          <option value="HYPERTENSION">Hypertension</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}
