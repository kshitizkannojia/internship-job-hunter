import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

export default function AnimatedCounter({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const prevValue = useRef(0)

  useEffect(() => {
    if (!inView) return
    const start = prevValue.current
    const range = value - start
    if (range === 0) { setDisplay(value); return }
    const startTime = performance.now()

    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setDisplay(Math.round(start + range * eased))
      if (progress < 1) requestAnimationFrame(tick)
      else prevValue.current = value
    }
    requestAnimationFrame(tick)
  }, [value, inView, duration])

  return <span ref={ref}>{display}</span>
}
