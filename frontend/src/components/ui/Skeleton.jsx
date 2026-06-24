import { cn } from '@/lib/utils'

export default function Skeleton({ className }) {
  return (
    <div
      className={cn(
        'rounded-md bg-gradient-to-r from-[#111] via-[#1a1a1a] to-[#111] bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]',
        className
      )}
    />
  )
}
