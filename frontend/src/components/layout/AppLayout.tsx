import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useState, useEffect } from 'react'

export default function AppLayout() {
  const [sidebarW, setSidebarW] = useState(260)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const sidebar = document.querySelector('aside')
      if (sidebar) setSidebarW(sidebar.offsetWidth)
    })
    const sidebar = document.querySelector('aside')
    if (sidebar) observer.observe(sidebar, { attributes: true, attributeFilter: ['style'] })
    return () => observer.disconnect()
  }, [])
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: sidebarW, minHeight: '100vh', background: 'var(--bg-base)', transition: 'margin-left 0.25s ease' }}>
        <Outlet />
      </main>
    </div>
  )
}
