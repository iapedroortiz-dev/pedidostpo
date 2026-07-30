'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'Panel', icon: '▦', roles: ['admin', 'pedidos', 'representante'] },
  { href: '/pedidos', label: 'Pedidos', icon: '◫', roles: ['admin', 'pedidos', 'representante'] },
  { href: '/catalog', label: 'Catálogo', icon: '◇', roles: ['admin'] },
  { href: '/usuarios', label: 'Usuarios', icon: '◌', roles: ['admin'] }
];

const roleLabels = {
  admin: 'Administración',
  pedidos: 'Departamento de pedidos',
  representante: 'Representante'
};

export default function AppShell({ profile, children }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem('po-sidebar-collapsed') === 'true');
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('po-sidebar-collapsed', String(next));
      return next;
    });
  }

  return (
    <div className={`app-frame ${collapsed ? 'is-collapsed' : ''}`}>
      <aside className="app-sidebar" aria-label="Navegación principal">
        <div className="app-brand"><span className="app-brand-mark">PO</span><strong>pedidos.</strong></div>
        <button className="sidebar-collapse" type="button" onClick={toggleSidebar} aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'} title={collapsed ? 'Expandir menú' : 'Contraer menú'}>‹</button>
        <nav className="app-nav">
          {links.filter((link) => link.roles.includes(profile.role)).map((link) => (
            <Link className={`app-nav-link ${pathname === link.href ? 'active' : ''}`} href={link.href} key={link.href} title={collapsed ? link.label : undefined}>
              <span aria-hidden="true">{link.icon}</span><span>{link.label}</span>
            </Link>
          ))}
        </nav>
        <div className="app-sidebar-user"><span>{(profile.full_name || 'U').split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()}</span><div><strong>{profile.full_name || 'Usuario'}</strong><small>{roleLabels[profile.role] || profile.role}</small></div></div>
      </aside>
      <div className="app-content">{children}</div>
    </div>
  );
}
