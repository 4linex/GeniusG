import { BiCard } from '@/components/dashboard/bi/BiCard'

export function DashboardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <BiCard key={index} hover={false} className="h-40">
          <div className="h-3 w-24 rounded bg-white/10" />
          <div className="mt-4 h-10 w-20 rounded bg-white/10" />
          <div className="mt-3 h-3 w-32 rounded bg-white/10" />
          <div className="mt-6 h-12 rounded bg-white/5" />
        </BiCard>
      ))}
      <BiCard hover={false} className="h-48">
        <div className="h-4 w-56 rounded bg-white/10" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 rounded-xl bg-white/5" />
          ))}
        </div>
      </BiCard>
      {Array.from({ length: 6 }).map((_, index) => (
        <BiCard key={`chart-${index}`} hover={false} className="h-72">
          <div />
        </BiCard>
      ))}
    </div>
  )
}
