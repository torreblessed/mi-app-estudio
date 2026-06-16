'use client'

import Sidebar from './Sidebar'

export default function AppShell({ user, children }) {
  return (
    <div className="app-shell">
      <Sidebar user={user} />
      <div className="app-main">
        {children}
      </div>
    </div>
  )
}
