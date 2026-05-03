export default function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <SkelBlock className="lg:col-span-5 lg:row-span-2 h-[280px]" />
      <SkelBlock className="lg:col-span-4 h-[200px]" />
      <SkelBlock className="lg:col-span-3 h-[200px]" />
      <SkelBlock className="lg:col-span-3 h-[180px]" />
      <SkelBlock className="lg:col-span-3 h-[180px]" />
      <SkelBlock className="lg:col-span-3 h-[180px]" />
      <SkelBlock className="lg:col-span-6 h-[180px]" />
      <SkelBlock className="lg:col-span-6 h-[280px]" />
      <SkelBlock className="lg:col-span-12 h-[160px]" />
    </div>
  )
}

function SkelBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-white/60 border-[3px] border-ink/20 rounded-[18px] animate-pulse ${className}`}
    />
  )
}
