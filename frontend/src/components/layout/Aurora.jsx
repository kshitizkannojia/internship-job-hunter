// Animated purple aurora gradient backdrop
export default function Aurora() {
  return (
    <>
      <div
        className="fixed -top-[200px] -left-[200px] w-[700px] h-[700px] pointer-events-none z-0 blur-[60px] animate-aurora-drift"
        style={{
          background: 'radial-gradient(circle, hsla(270,90%,50%,0.25) 0%, hsla(270,90%,50%,0.08) 40%, transparent 70%)',
          animation: 'aurora-drift 20s ease-in-out infinite, aurora-pulse 8s ease-in-out infinite',
        }}
      />
      <div
        className="fixed -bottom-[300px] -right-[200px] w-[600px] h-[600px] pointer-events-none z-0 blur-[80px]"
        style={{
          background: 'radial-gradient(circle, hsla(250,80%,45%,0.12) 0%, transparent 65%)',
          animation: 'aurora-drift-2 25s ease-in-out infinite, aurora-pulse 12s ease-in-out 3s infinite',
        }}
      />
    </>
  )
}
