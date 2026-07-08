import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useGetItem, getGetItemQueryKey, getGetHomeRecommendationsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Play, Plus, Check, Star, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ItemCarousel from "@/components/ItemCarousel";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import PosterCard from "@/components/PosterCard";

// Hooks wrappers for ungenerated/unexported ones
function useCheckWatchlist(itemId: number) {
  return useQuery({
    queryKey: ['/api/watchlist/check', itemId],
    queryFn: () => customFetch<{ inWatchlist: boolean }>(`/api/watchlist/check/${itemId}`),
    enabled: !!itemId
  });
}

function useAddToWatchlist() {
  return useMutation({
    mutationFn: (itemId: number) => customFetch(`/api/watchlist/${itemId}`, { method: 'POST' })
  });
}

function useRemoveFromWatchlist() {
  return useMutation({
    mutationFn: (itemId: number) => customFetch(`/api/watchlist/${itemId}`, { method: 'DELETE' })
  });
}

function useSimilarItems(itemId: number) {
  return useQuery({
    queryKey: ['/api/recommendations/similar', itemId],
    queryFn: () => customFetch<any[]>(`/api/recommendations/similar/${itemId}`),
    enabled: !!itemId
  });
}

function useLogInteraction() {
  return useMutation({
    mutationFn: (data: any) => customFetch(`/api/interactions`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
  });
}

function useGetReviews(itemId: number) {
  return useQuery({
    queryKey: ['/api/reviews', itemId],
    queryFn: () => customFetch<any[]>(`/api/reviews/${itemId}`),
    enabled: !!itemId
  });
}

function useCreateReview() {
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: number, data: any }) => customFetch(`/api/reviews/${itemId}`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
  });
}

export default function ItemDetail() {
  const { id } = useParams();
  const itemId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: item, isLoading } = useGetItem(itemId, { query: { enabled: !!itemId, queryKey: getGetItemQueryKey(itemId) } });
  const { data: similar = [] } = useSimilarItems(itemId);
  const { data: watchlistStatus, refetch: refetchWatchlist } = useCheckWatchlist(itemId);
  const { data: reviews = [], refetch: refetchReviews } = useGetReviews(itemId);
  
  const { data: realPoster } = useQuery({
    queryKey: ['/api/images/poster', item?.title],
    queryFn: () => customFetch<{url: string | null}>(`/api/images/poster?title=${encodeURIComponent(item!.title)}`),
    enabled: !!item && !item.backdropUrl && !item.posterUrl && !imgError,
    staleTime: 1000 * 60 * 60 * 24, // cache 24h
  });

  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();
  const logInteraction = useLogInteraction();
  const createReview = useCreateReview();

  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(10);
  const [imgError, setImgError] = useState(false);

  // Log view interaction
  useEffect(() => {
    if (itemId) {
      logInteraction.mutate({ itemId, eventType: 'view' });
    }
  }, [itemId]);

  if (isLoading) return <div className="min-h-screen bg-black animate-pulse"></div>;
  if (!item) return <div className="min-h-screen pt-24 text-center">Item not found</div>;

  const inWatchlist = watchlistStatus?.inWatchlist;
  const rawReviews = reviews as any;
  const reviewsData: any[] = Array.isArray(rawReviews) ? rawReviews : (rawReviews?.data || []);

  const toggleWatchlist = () => {
    if (inWatchlist) {
      removeFromWatchlist.mutate(itemId, {
        onSuccess: () => {
          toast({ title: "Removed from My List" });
          refetchWatchlist();
        }
      });
    } else {
      addToWatchlist.mutate(itemId, {
        onSuccess: () => {
          toast({ title: "Added to My List" });
          logInteraction.mutate({ itemId, eventType: 'watch' }, {
            onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetHomeRecommendationsQueryKey() })
          });
          refetchWatchlist();
        }
      });
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createReview.mutate({ itemId, data: { rating, comment: reviewText } }, {
      onSuccess: () => {
        toast({ title: "Review posted" });
        setReviewText("");
        logInteraction.mutate({ itemId, eventType: 'rate', rating }, {
          onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetHomeRecommendationsQueryKey() })
        });
        refetchReviews();
      }
    });
  };

  return (
    <div className="bg-black min-h-screen pb-20">
      {/* Hero Backdrop */}
      <div className="relative w-full h-[60vh] md:h-[80vh]">
        {item.backdropUrl && !imgError ? (
          <img src={item.backdropUrl} alt={item.title} onError={() => setImgError(true)} className="w-full h-full object-cover opacity-50" />
        ) : item.posterUrl && !imgError ? (
          <img src={item.posterUrl} alt={item.title} onError={() => setImgError(true)} className="w-full h-full object-cover opacity-40 md:blur-sm" />
        ) : realPoster?.url && !imgError ? (
          <img src={realPoster.url} alt={item.title} onError={() => setImgError(true)} className="w-full h-full object-cover opacity-40 md:blur-sm" />
        ) : !imgError ? (
          <img src={`https://image.pollinations.ai/prompt/Cinematic%20wide%20epic%20background%20landscape%20for%20the%20movie%20${encodeURIComponent(item.title)}?width=1920&height=1080&nologo=true`} alt={item.title} onError={() => setImgError(true)} className="w-full h-full object-cover opacity-40" />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-zinc-900 to-black"></div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent w-full md:w-3/4"></div>

        <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full md:w-2/3">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tighter">{item.title}</h1>
          
          <div className="flex items-center gap-4 text-sm font-semibold text-gray-300 mb-6">
            <span className="text-green-500">{item.rating}% Match</span>
            <span>{item.releaseYear}</span>
            {item.duration && <span>{Math.floor(item.duration / 60)}h {item.duration % 60}m</span>}
            <span className="border border-gray-600 px-2 rounded-sm text-xs py-0.5">{item.type}</span>
          </div>
          
          <p className="text-gray-300 text-lg mb-8 line-clamp-4 max-w-2xl">{item.description}</p>
          
          <div className="flex items-center gap-4">
            <Button size="lg" className="bg-white text-black hover:bg-white/90 font-bold px-8" onClick={() => {
              toast({title:"Playback started!"});
              logInteraction.mutate({ itemId, eventType: 'watch', watchDuration: 3600 }, {
                onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetHomeRecommendationsQueryKey() })
              });
            }}>
              <Play className="w-6 h-6 mr-2 fill-current" /> Play
            </Button>
            
            <Button size="lg" variant="outline" className="bg-zinc-800/50 border-zinc-600 text-white hover:bg-zinc-800/80 px-4" onClick={toggleWatchlist}>
              {inWatchlist ? <Check className="w-6 h-6 mr-2" /> : <Plus className="w-6 h-6 mr-2" />}
              {inWatchlist ? 'My List' : 'My List'}
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-12 mt-12 grid grid-cols-1 md:grid-cols-3 gap-12 max-w-7xl">
        <div className="md:col-span-2 space-y-12">
          {/* Cast & Info */}
          <div className="space-y-4 text-sm text-zinc-400">
            {item.director && (
              <p><span className="text-zinc-600">Director:</span> <span className="text-white">{item.director}</span></p>
            )}
            {item.cast && item.cast.length > 0 && (
              <p><span className="text-zinc-600">Cast:</span> <span className="text-white">{item.cast.join(', ')}</span></p>
            )}
            {item.genres && item.genres.length > 0 && (
              <p><span className="text-zinc-600">Genres:</span> <span className="text-white">{item.genres.join(', ')}</span></p>
            )}
          </div>

          {/* Reviews Section */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2"><MessageSquare className="w-6 h-6" /> Reviews</h3>
            
            <form onSubmit={handleReviewSubmit} className="space-y-4 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Rating (1-10)</label>
                <input 
                  type="range" min="1" max="10" value={rating} 
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="text-right text-primary font-bold">{rating}/10</div>
              </div>
              <Textarea 
                placeholder="What did you think?" 
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                className="bg-black border-zinc-800 focus-visible:ring-primary text-white"
              />
              <Button type="submit" disabled={createReview.isPending}>Post Review</Button>
            </form>

            <div className="space-y-4">
              {reviewsData.map((r: any) => (
                <div key={r.id} className="bg-zinc-900/30 p-4 rounded-lg border border-zinc-800/50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-white">{r.userEmail?.split('@')[0]}</div>
                    <div className="flex items-center text-primary text-sm font-bold"><Star className="w-3 h-3 fill-current mr-1"/> {r.rating}/10</div>
                  </div>
                  <p className="text-zinc-400 text-sm">{r.comment}</p>
                  <div className="text-xs text-zinc-600 mt-2">{format(new Date(r.createdAt), "MMM d, yyyy")}</div>
                </div>
              ))}
              {reviewsData.length === 0 && <p className="text-zinc-500">No reviews yet. Be the first!</p>}
            </div>
          </div>
        </div>

        {/* Sidebar / More Like This */}
        <div>
          <h3 className="text-lg font-bold text-white mb-6">More Like This</h3>
          <div className="grid grid-cols-2 gap-4">
            {similar.slice(0,6).map((sim: any) => (
              <PosterCard key={sim.id} item={sim} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
