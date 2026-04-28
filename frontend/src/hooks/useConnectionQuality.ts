import { useEffect, useState } from 'react'

export type EffectiveConnectionType = 'slow-2g' | '2g' | '3g' | '4g' | 'unknown'

export interface ConnectionQuality {
  effectiveType: EffectiveConnectionType
  downlinkMbps: number | null
  saveData: boolean
}

interface NetworkInformation extends EventTarget {
  effectiveType?: EffectiveConnectionType
  downlink?: number
  saveData?: boolean
}

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformation
  mozConnection?: NetworkInformation
  webkitConnection?: NetworkInformation
}

const getConnection = (): NetworkInformation | null => {
  if (typeof navigator === 'undefined') return null
  const nav = navigator as NavigatorWithConnection
  return nav.connection || nav.mozConnection || nav.webkitConnection || null
}

const readSnapshot = (): ConnectionQuality => {
  const conn = getConnection()
  if (!conn) {
    return { effectiveType: 'unknown', downlinkMbps: null, saveData: false }
  }
  return {
    effectiveType: conn.effectiveType ?? 'unknown',
    downlinkMbps: typeof conn.downlink === 'number' ? conn.downlink : null,
    saveData: conn.saveData ?? false,
  }
}

export const useConnectionQuality = (): ConnectionQuality => {
  const [quality, setQuality] = useState<ConnectionQuality>(readSnapshot)

  useEffect(() => {
    const conn = getConnection()
    if (!conn) return

    const update = () => setQuality(readSnapshot())
    conn.addEventListener('change', update)
    return () => conn.removeEventListener('change', update)
  }, [])

  return quality
}

export interface HlsAbrHint {
  defaultEstimate: number
  capHeight: 360 | 480 | 720 | null
}

export const hlsHintFromConnection = (conn: ConnectionQuality): HlsAbrHint => {
  if (conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
    return { defaultEstimate: 700_000, capHeight: 360 }
  }
  if (conn.effectiveType === '3g') {
    return { defaultEstimate: 1_400_000, capHeight: 480 }
  }
  if (conn.effectiveType === '4g' && conn.downlinkMbps !== null && conn.downlinkMbps < 3) {
    return { defaultEstimate: 2_500_000, capHeight: 720 }
  }
  if (conn.effectiveType === '4g' && conn.downlinkMbps !== null) {
    const seeded = Math.round(conn.downlinkMbps * 1_000_000)
    return { defaultEstimate: Math.min(seeded, 5_000_000), capHeight: null }
  }
  return { defaultEstimate: 2_000_000, capHeight: null }
}
