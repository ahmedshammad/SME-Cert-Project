import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Shield, Menu, X, ChevronDown, ExternalLink,
  FileCheck, BookOpen, Building2, Mail, Globe2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/state/auth';
import { cn } from '@/lib/utils';

const platformLinks = [
  { to: '/about', label: 'About' },
  { to: '/why-blockchain', label: 'Why Blockchain' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/docs', label: 'Documentation' },
  { to: '/blockchain', label: 'Blockchain Explorer' },
];

const businessLinks = [
  { to: '/pricing', label: 'Pricing' },
  { to: '/deployment', label: 'Deployment' },
  { to: '/onboarding', label: 'Get Started' },
  { to: '/contact', label: 'Contact' },
];

export function PublicLayout() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const [businessOpen, setBusinessOpen] = useState(false);
  const platformRef = useRef<HTMLDivElement>(null);
  const businessRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on Escape key and on outside click
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPlatformOpen(false); setBusinessOpen(false); }
    };
    const handleClick = (e: MouseEvent) => {
      if (platformRef.current && !platformRef.current.contains(e.target as Node)) setPlatformOpen(false);
      if (businessRef.current && !businessRef.current.contains(e.target as Node)) setBusinessOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => { document.removeEventListener('keydown', handleKey); document.removeEventListener('mousedown', handleClick); };
  }, []);

  const getDashboardPath = () => {
    switch (user?.role) {
      case 'ISSUER_ADMIN':
      case 'ISSUER_OPERATOR':
        return '/issuer';
      case 'SME_USER':
        return '/holder';
      case 'VERIFIER_USER':
        return '/verifier';
      default:
        return '/';
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 bg-egypt-navy rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold text-egypt-navy">SME Cert</span>
              <span className="text-xs text-muted-foreground block -mt-1 leading-none">Trust Platform</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              to="/verify"
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive('/verify') ? 'text-egypt-navy bg-egypt-navy/5' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {t('nav.verify', 'Verify')}
            </Link>

            {/* Platform Dropdown — click-toggle with keyboard support */}
            <div className="relative" ref={platformRef}>
              <button
                onClick={() => { setPlatformOpen(o => !o); setBusinessOpen(false); }}
                aria-haspopup="true"
                aria-expanded={platformOpen}
                aria-label="Platform menu"
                className={cn(
                  'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  platformLinks.some(l => isActive(l.to))
                    ? 'text-egypt-navy bg-egypt-navy/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                Platform
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', platformOpen && 'rotate-180')} aria-hidden="true" />
              </button>
              {platformOpen && (
                <div className="absolute top-full left-0 pt-1 w-52" role="menu">
                  <div className="bg-white rounded-lg shadow-lg border p-1.5">
                    {platformLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        role="menuitem"
                        onClick={() => setPlatformOpen(false)}
                        className={cn(
                          'block px-3 py-2 text-sm rounded-md transition-colors',
                          isActive(link.to)
                            ? 'text-egypt-navy bg-egypt-navy/5 font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        )}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Business Dropdown — click-toggle with keyboard support */}
            <div className="relative" ref={businessRef}>
              <button
                onClick={() => { setBusinessOpen(o => !o); setPlatformOpen(false); }}
                aria-haspopup="true"
                aria-expanded={businessOpen}
                aria-label="Business menu"
                className={cn(
                  'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  businessLinks.some(l => isActive(l.to))
                    ? 'text-egypt-navy bg-egypt-navy/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                Business
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', businessOpen && 'rotate-180')} aria-hidden="true" />
              </button>
              {businessOpen && (
                <div className="absolute top-full left-0 pt-1 w-52" role="menu">
                  <div className="bg-white rounded-lg shadow-lg border p-1.5">
                    {businessLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        role="menuitem"
                        onClick={() => setBusinessOpen(false)}
                        className={cn(
                          'block px-3 py-2 text-sm rounded-md transition-colors',
                          isActive(link.to)
                            ? 'text-egypt-navy bg-egypt-navy/5 font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        )}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center gap-2">
            {isAuthenticated ? (
              <Link to={getDashboardPath()}>
                <Button variant="outline" size="sm">{t('nav.dashboard', 'Dashboard')}</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">{t('nav.login', 'Sign In')}</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="bg-egypt-navy hover:bg-egypt-navy/90">
                    {t('nav.register', 'Register')}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-md hover:bg-muted/50"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileOpen && (
          <div className="lg:hidden border-t bg-white animate-fade-in">
            <div className="container mx-auto px-4 py-4 space-y-1">
              <Link to="/verify" onClick={closeMobile} className={cn('block px-3 py-2.5 text-sm font-medium rounded-md', isActive('/verify') ? 'text-egypt-navy bg-egypt-navy/5' : 'text-muted-foreground')}>
                Verify Certificate
              </Link>

              <div className="pt-2 pb-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Platform</div>
              {platformLinks.map((link) => (
                <Link key={link.to} to={link.to} onClick={closeMobile} className={cn('block px-3 py-2.5 text-sm rounded-md', isActive(link.to) ? 'text-egypt-navy bg-egypt-navy/5 font-medium' : 'text-muted-foreground')}>
                  {link.label}
                </Link>
              ))}

              <div className="pt-2 pb-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business</div>
              {businessLinks.map((link) => (
                <Link key={link.to} to={link.to} onClick={closeMobile} className={cn('block px-3 py-2.5 text-sm rounded-md', isActive(link.to) ? 'text-egypt-navy bg-egypt-navy/5 font-medium' : 'text-muted-foreground')}>
                  {link.label}
                </Link>
              ))}

              <div className="border-t pt-3 mt-3 flex gap-2">
                {isAuthenticated ? (
                  <Link to={getDashboardPath()} onClick={closeMobile} className="flex-1">
                    <Button variant="outline" className="w-full">{t('nav.dashboard', 'Dashboard')}</Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={closeMobile} className="flex-1">
                      <Button variant="outline" className="w-full">{t('nav.login', 'Sign In')}</Button>
                    </Link>
                    <Link to="/register" onClick={closeMobile} className="flex-1">
                      <Button className="w-full bg-egypt-navy hover:bg-egypt-navy/90">{t('nav.register', 'Register')}</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-egypt-navy text-white">
        {/* Main Footer */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-egypt-gold" />
                </div>
                <div>
                  <span className="text-lg font-bold">SME Cert</span>
                  <span className="text-xs text-white/60 block -mt-1 leading-none">Trust Platform</span>
                </div>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                Blockchain-powered digital certificate issuance, verification, and management for Egyptian SMEs. Aligned with Egypt Vision 2030.
              </p>
              <div className="flex items-center gap-2 text-xs text-white/50">
                <Globe2 className="h-3.5 w-3.5" />
                <span>Powered by Hyperledger Fabric</span>
              </div>
            </div>

            {/* Platform Links */}
            <div>
              <h4 className="font-semibold mb-4 text-white/90">Platform</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/about" className="text-white/60 hover:text-white transition-colors">About</Link></li>
                <li><Link to="/why-blockchain" className="text-white/60 hover:text-white transition-colors">Why Blockchain</Link></li>
                <li><Link to="/how-it-works" className="text-white/60 hover:text-white transition-colors">How It Works</Link></li>
                <li><Link to="/docs" className="text-white/60 hover:text-white transition-colors">Documentation</Link></li>
                <li><Link to="/verify" className="text-white/60 hover:text-white transition-colors">Verify Certificate</Link></li>
                <li><Link to="/blockchain" className="text-white/60 hover:text-white transition-colors">Blockchain Explorer</Link></li>
              </ul>
            </div>

            {/* Business Links */}
            <div>
              <h4 className="font-semibold mb-4 text-white/90">Business</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/pricing" className="text-white/60 hover:text-white transition-colors">Pricing</Link></li>
                <li><Link to="/deployment" className="text-white/60 hover:text-white transition-colors">Deployment Options</Link></li>
                <li><Link to="/onboarding" className="text-white/60 hover:text-white transition-colors">Get Started</Link></li>
                <li><Link to="/contact" className="text-white/60 hover:text-white transition-colors">Contact Sales</Link></li>
              </ul>
            </div>

            {/* Contact & Trust */}
            <div>
              <h4 className="font-semibold mb-4 text-white/90">Contact</h4>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2 text-white/60">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <a href="mailto:ahmeds_hammad@hotmail.com" className="hover:text-white transition-colors">ahmeds_hammad@hotmail.com</a>
                </li>
                <li className="flex items-center gap-2 text-white/60">
                  <span className="shrink-0">+20</span>
                  <a href="tel:+2001273715537" className="hover:text-white transition-colors">127 371 5537</a>
                </li>
                <li className="flex items-center gap-2 text-white/60">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Alexandria, Egypt</span>
                </li>
              </ul>
              <div className="mt-6 p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <FileCheck className="h-4 w-4 text-egypt-gold" />
                  <span className="text-xs font-semibold text-egypt-gold">Egypt Vision 2030</span>
                </div>
                <p className="text-xs text-white/50">Supporting digital transformation and economic empowerment</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10">
          <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-white/40">
              &copy; {new Date().getFullYear()} SME Certificate Trust Platform. All rights reserved.
            </p>
            <p className="text-xs text-white/40">
              Developed by Ahmed Hammad &middot; Under the supervision of Prof. Ghada El Khayat — Alexandria University
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
