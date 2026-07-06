import { Link } from "wouter";
import { Play, Info } from "lucide-react";
import { Item } from "@workspace/api-client-react/src/generated/api.schemas";
import { Button } from "@/components/ui/button";

interface HeroBannerProps {
  item: Item;
}

export default function HeroBanner({ item }: HeroBannerProps) {
  return (
    <div className="relative w-full h-[60vh] md:h-[80vh] bg-black">
      {item.backdropUrl ? (
        <img
          src={item.backdropUrl}
          alt={item.title}
          className="w-full h-full object-cover opacity-70"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-tr from-black to-card"></div>
      )}
      
      {/* Gradient overlays for cinematic effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent"></div>
      
      <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full md:w-2/3 flex flex-col justify-end">
        {item.genres && item.genres.length > 0 && (
          <div className="flex items-center gap-2 mb-4 text-xs md:text-sm font-semibold tracking-wider text-primary uppercase">
            {item.type === 'movie' ? 'Film' : item.type === 'series' ? 'Series' : 'Documentary'} • {item.genres[0]}
          </div>
        )}
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight drop-shadow-lg tracking-tighter">
          {item.title}
        </h1>
        
        <p className="text-gray-300 text-sm md:text-lg mb-8 line-clamp-3 md:line-clamp-4 max-w-3xl drop-shadow-md">
          {item.description}
        </p>
        
        <div className="flex flex-wrap items-center gap-4">
          <Link href={`/item/${item.id}`}>
            <Button size="lg" className="bg-white text-black hover:bg-white/90 text-lg font-semibold px-8 py-6 rounded-md">
              <Play className="w-6 h-6 mr-2 fill-current" />
              Watch Now
            </Button>
          </Link>
          <Link href={`/item/${item.id}`}>
            <Button size="lg" variant="secondary" className="bg-gray-500/40 text-white hover:bg-gray-500/60 text-lg font-semibold px-8 py-6 rounded-md backdrop-blur-sm border-0">
              <Info className="w-6 h-6 mr-2" />
              More Info
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
