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

export default function ParceirosLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Shimmer className="h-10 w-72 mb-2" />
        <Shimmer className="h-4 w-48" />
      </div>
      <Shimmer className="h-11 w-full" />
      <div className="flex flex-wrap gap-2">
        {[1,2,3,4,5].map((i) => <Shimmer key={i} className="h-7 w-20 rounded-full" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <PartnerCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
