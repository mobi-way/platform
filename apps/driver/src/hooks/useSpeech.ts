import { useRef, useEffect, useCallback } from 'react'

export function useSpeech() {
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    synthRef.current = window.speechSynthesis

    const loadVoices = () => {
      voicesRef.current = synthRef.current?.getVoices() ?? []
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices

    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])

  const speak = useCallback((text: string) => {
    const synth = synthRef.current
    if (!synth) return
    if (synth.speaking) return

    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'pt-BR'
    utter.rate = 1.1

    const preferred = voicesRef.current.find(
      (v) => v.name.includes('Google') || v.name.includes('Microsoft'),
    )
    if (preferred) utter.voice = preferred

    synth.speak(utter)
  }, [])

  return { speak }
}
