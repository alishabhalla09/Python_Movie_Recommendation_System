import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import type { Item } from "@workspace/api-client-react";
import { Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

interface PosterCardProps {
  item: Item;
  onClick?: () => void;
}

export default function PosterCard({ item, onClick }: PosterCardProps) {
  const [imgError, setImgError] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Only call IMDB API if DB doesn't have a poster
  const { data: realPoster, isLoading: isPosterLoading } = useQuery({
    queryKey: ['/api/images/poster', item.title],
    queryFn: () => customFetch<{url: string | null}>(`/api/images/poster?title=${encodeURIComponent(item.title)}`),
    enabled: inView && !item.posterUrl && !imgError,
    staleTime: 1000 * 60 * 60 * 24, // cache 24h
    gcTime: 1000 * 60 * 60 * 24,
  });

  // Priority: DB posterUrl > IMDB API result > AI-generated fallback
  const displayImage = item.posterUrl
    || realPoster?.url
    || (!imgError && !isPosterLoading
      ? `https://image.pollinations.ai/prompt/Movie%20poster%20for%20${encodeURIComponent(item.title)}%20cinematic%20dark?width=300&height=450&nologo=true&seed=${item.id}`
      : null);

  return (
    <Link
      ref={ref}
      href={`/item/${item.id}`}
      className="group relative block aspect-[2/3] rounded-md overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:z-10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background shrink-0"
      onClick={onClick}
    >
      {displayImage && !imgError ? (
        <img
          src={displayImage}
          alt={item.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex flex-col items-center justify-center p-4 text-center">
          <span className="font-bold text-lg md:text-xl text-white opacity-90 drop-shadow-md">{item.title}</span>
          {item.releaseYear && <span className="text-xs md:text-sm text-primary mt-3 font-semibold">{item.releaseYear}</span>}
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
        <h3 className="text-white font-bold text-sm line-clamp-2 leading-tight">{item.title}</h3>
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-300">
          <span className="flex items-center gap-1 text-primary">
            <Star className="w-3 h-3 fill-current" />
            {(item.rating / 10).toFixed(1)}
          </span>
          <span>•</span>
          <span>{item.releaseYear}</span>
        </div>
        {item.genres && item.genres.length > 0 && (
          <div className="text-xs text-gray-400 mt-1 truncate">
            {item.genres.slice(0, 2).join(", ")}
          </div>
        )}
      </div>
    </Link>
  );
}
