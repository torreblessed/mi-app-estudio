'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

function IconBook()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/></svg> }
function IconGrid()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> }
function IconLayers()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 10 6.5-10 6.5L2 8.5z"/><path d="m2 15.5 10 6.5 10-6.5"/><path d="m2 12 10 6.5 10-6.5"/></svg> }
function IconFileText(){ return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg> }
function IconCalendar(){ return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg> }
function IconSettings(){ return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg> }
function IconLogout()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg> }
function IconMenu()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg> }
function IconX()       { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg> }

const NAV = [
  { href: '/',             label: 'Dashboard',    icon: IconGrid },
  { href: '/materias',     label: 'Materias',     icon: IconLayers },
  { href: '/notas',        label: 'Notas',        icon: IconFileText },
  { href: '/calendario',   label: 'Calendario',   icon: IconCalendar },
  { href: '/configuracion',label: 'Configuración',icon: IconSettings },
]

export default function Sidebar({ user }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const [open, setOpen] = useState(false)

  const initial     = user?.email ? user.email[0].toUpperCase() : 'U'
  const displayName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.name?.split(' ')[0]
    || user?.email?.split('@')[0] || 'Estudiante'

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  function isActive(href) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile toggle */}
      <button className="sidebar-toggle" onClick={() => setOpen(o => !o)} aria-label="Menú">
        {open ? <IconX /> : <IconMenu />}
      </button>

      {/* Overlay on mobile */}
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand" onClick={() => router.push('/')}>
          <div className="sidebar-brand-mark"><IconBook /></div>
          <span className="sidebar-brand-name">Aula</span>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV.map(({ href, label, icon: Icon }) => (
            <a key={href} href={href}
              className={`sidebar-link${isActive(href) ? ' sidebar-link-active' : ''}`}
              onClick={e => { e.preventDefault(); setOpen(false); router.push(href) }}>
              <Icon />
              <span>{label}</span>
            </a>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initial}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{displayName}</div>
              <div className="sidebar-user-mail">{user?.email}</div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={cerrarSesion} title="Cerrar sesión">
            <IconLogout />
          </button>
        </div>
      </aside>
    </>
  )
}
