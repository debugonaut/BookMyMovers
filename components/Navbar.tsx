'use client'

import { useState, useEffect } from 'react'
import { Menu, X, Zap } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => setMenuOpen(false), [pathname])

  const links = [
    { href: '/request-service', label: 'Request Service' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/test-tools', label: 'Test Tools' },
  ]

  return (
    <nav className="navbar" style={{ boxShadow: scrolled ? '0 2px 16px rgba(0,0,0,0.08)' : undefined }}>
      {/* Brand */}
      <Link href="/" className="navbar-brand">
        <Zap size={22} fill="currentColor" />
        Prowider
      </Link>

      {/* Center links */}
      <div className={`navbar-links${menuOpen ? ' open' : ''}`}>
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link${pathname === link.href ? ' active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Right */}
      <div className="navbar-right">
        <ThemeToggle />
        <button
          className="hamburger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menu"
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
    </nav>
  )
}
