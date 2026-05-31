'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import {
  Shield,
  LayoutDashboard,
  History,
  MapPin,
  Settings,
  Menu,
  X,
  Users,
  User,
} from 'lucide-react';

const navigationItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/history', label: 'History', icon: History },
  { href: '/benefits', label: 'Benefits', icon: MapPin },
  { href: '/social', label: 'Social', icon: Users },
  { href: '/account', label: 'Account', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const navItems = (
    <>
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsMobileOpen(false)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 whitespace-nowrap
              ${active
                ? 'bg-primary/20 text-primary neon-text-pink shadow-lg'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }
            `}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-primary/10 bg-background/50 backdrop-blur-sm p-6 flex-col gap-8 md:min-h-screen shrink-0 sticky top-0">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 px-2 hover:opacity-80 transition-opacity"
        >
          <div className="relative">
            <Shield className="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(255,0,255,0.8)]" />
          </div>
          <span className="font-extrabold text-xl tracking-widest uppercase italic neon-text-pink text-primary">
            SeedGuard
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 flex-1">
          {navItems}
        </nav>

        {/* Footer */}
        <div className="pt-4 border-t border-primary/10">
          <p className="text-xs text-muted-foreground text-center">
            v2.0.0
          </p>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between h-16 px-4 border-b border-primary/10 bg-background/50 backdrop-blur-sm sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary drop-shadow-[0_0_8px_rgba(255,0,255,0.8)]" />
          <span className="font-bold text-sm tracking-wider uppercase italic neon-text-pink text-primary">
            SeedGuard
          </span>
        </Link>

        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Mobile Menu */}
          <nav className="md:hidden fixed left-0 top-16 w-full bg-background/95 backdrop-blur-md border-b border-primary/10 z-40 animate-slide-in-from-top">
            <div className="p-4 grid grid-cols-3 gap-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`
                      flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg transition-all duration-200
                      ${active
                        ? 'bg-primary/20 text-primary neon-text-pink'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium text-xs">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </>
      )}
    </>
  );
}
