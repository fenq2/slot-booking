'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'

export function Header() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary">
            Fastcup Сборы
          </Link>

          <nav className="flex items-center gap-4">
            {!loading && (
              <>
                {user ? (
                  <>
                    
                    <div className="flex items-center gap-2">
                      <Link href="/">
                        <Button variant="ghost">Список активных сборов</Button>
                      </Link>
                    
                      <Link href="/my">
                        <Button variant="ghost">Мои сборы</Button>
                      </Link>
                    </div>
                    
                    <span className="text-sm text-gray-500">{user?.email}</span>
                    <Button variant="outline" onClick={handleLogout}>
                       Выйти
                    </Button>
                  </>
                ) : (
                  <Link href="/login">
                    <Button>Вход</Button>
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}

