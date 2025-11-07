'use client'
import { useEffect } from 'react'
import { useColorSettings } from '@/components/context/ColorSettingsContext'
export default function RegisterColorOpener() {
  const { setOpen } = useColorSettings()
  useEffect(()=>{
    (window as any).__openColorSettings = () => setOpen(true)
    return () => { delete (window as any).__openColorSettings }
  }, [setOpen])
  return null
}
