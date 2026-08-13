import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

export function useProfile() {
  const { session } = useAuth()
  const [profile, setProfile] = useState(undefined) // undefined = loading, null = no profile

  useEffect(() => {
    if (!session) {
      setProfile(null)
      return
    }

    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile(data || null))
  }, [session])

  return { profile, loading: profile === undefined }
}
