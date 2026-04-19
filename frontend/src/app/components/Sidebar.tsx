import {
  Users,
  FlaskConical,
  Pill,
  HeartPulse,
  BarChart3,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const navItems = [
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'labs', label: 'Labs', icon: FlaskConical },
    { id: 'medications', label: 'Medications', icon: Pill },
    { id: 'conditions', label: 'Conditions', icon: HeartPulse },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 bg-white border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl tracking-tight">PHR-DB</h1>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    activeView === item.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border">
        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          <Settings className="w-5 h-5" strokeWidth={1.5} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
