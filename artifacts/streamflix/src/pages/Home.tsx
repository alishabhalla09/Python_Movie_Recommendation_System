import { useGetHomeRecommendations, useLogInteraction } from "@workspace/api-client-react";
import HeroBanner from "@/components/HeroBanner";
import ItemCarousel from "@/components/ItemCarousel";

export default function Home() {
  const { data: rows, isLoading, isError } = useGetHomeRecommendations();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col pt-20">
        <div className="w-full h-[60vh] bg-card animate-pulse"></div>
        <div className="p-8 space-y-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-4">
              <div className="h-8 w-48 bg-card rounded animate-pulse"></div>
              <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3, 4, 5].map(j => (
                  <div key={j} className="w-[200px] aspect-[2/3] bg-card rounded animate-pulse shrink-0"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !rows) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-center px-4">
        <div>
          <h2 className="text-3xl font-bold mb-4 text-white">Something went wrong</h2>
          <p className="text-muted-foreground">Unable to load recommendations. Please try again later.</p>
        </div>
      </div>
    );
  }

  // Extract actual array whether it's wrapped in data or not
  const rowData: any[] = Array.isArray(rows) ? rows : ((rows as any)?.data || []);

  if (!rowData || rowData.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-center px-4">
        <div>
          <h2 className="text-3xl font-bold mb-4 text-white">Something went wrong</h2>
          <p className="text-muted-foreground">Unable to load recommendations. Please try again later.</p>
        </div>
      </div>
    );
  }

  // Find a hero item (e.g. from trending)
  const trendingRow = rowData.find(r => r.reason === 'trending');
  const heroItem = trendingRow?.items?.[0] || rowData[0]?.items?.[0];

  return (
    <div className="pb-20 bg-background min-h-screen">
      {heroItem && <HeroBanner item={heroItem} />}
      
      <div className="flex flex-col gap-8 -mt-24 md:-mt-32 relative z-10 w-full overflow-hidden">
        {rowData.map((row, idx) => (
          row.items.length > 0 && (
            <ItemCarousel 
              key={`${row.reason}-${idx}`} 
              title={row.title} 
              items={row.items} 
            />
          )
        ))}
      </div>
    </div>
  );
}
