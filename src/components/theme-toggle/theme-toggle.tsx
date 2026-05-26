import React, { useEffect, useState } from 'react'

import { ICON_MOON } from 'src/components/icons/icon-moon'
import { ICON_SUN } from 'src/components/icons/icon-sun'
import { Button } from 'src/components/ui/button'

function getInitialDark(): boolean {
  const stored = localStorage.getItem('theme')
  if (stored) return stored === 'dark'
  return true
}

export function ThemeToggle() {
  const [dark, setDark] = useState(getInitialDark)

  useEffect(() => {
    const el = document.documentElement
    if (dark) {
      el.classList.add('dark')
    } else {
      el.classList.remove('dark')
    }
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setDark(isDark => !isDark)}
      className="ml-2 mr-2 rounded-full text-muted-foreground hover:text-foreground"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? ICON_SUN : ICON_MOON}
    </Button>
  )
}
