import { PartnerCardSkeleton } from '@/components/portal/PartnerCard';

function Shimmer({ className }: { className: string }) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{
        background: 'linear-gradient(90deg,#1a1a1a 25%,#222 50%,#1a1a1a 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease infinite',
      }}
    />
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
        <Shimmer className="h-4 w-28 mb-3" />
        <Shimmer className="h-10 w-52" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map((i) => (
          <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <Shimmer className="h-3 w-20 mb-3" />
            <Shimmer className="h-12 w-16" />
          </div>
        ))}
      </div>
      <div>
        <Shimmer className="h-7 w-48 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => <PartnerCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}
