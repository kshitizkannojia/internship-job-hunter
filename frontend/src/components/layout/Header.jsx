import { Moon, Sun, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const pageTitles = {
  dashboard: 'Dashboard',
  companies: 'Companies',
  emails: 'Emails',
  agent: 'Agent',
  settings: 'Settings',
};

export default function Header({ darkMode, onToggleDark, onRefresh, loading, activePage }) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 sm:px-6">
      <div className="pl-10 md:pl-0">
        <h1 className="text-lg font-semibold text-foreground">
          {pageTitles[activePage] || 'Dashboard'}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
        <Button variant="ghost" size="icon" onClick={onToggleDark}>
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
