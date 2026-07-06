import { useState } from "react";
import { Link } from "wouter";
import { Play, Info } from "lucide-react";
import type { Item } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

interface HeroBannerProps {
  item: Item;
}

export default function HeroBanner({ item }: HeroBannerProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative w-full h-[70vh] md:h-[85vh] bg-black overflow-hidden">
      <div className="absolute inset-0">
        {item.backdropUrl && !imgError ? (
          <img
            src={item.backdropUrl}
            alt={item.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover opacity-80"
          />
        ) : !imgError ? (
          <img
            src={`https://image.pollinations.ai/prompt/Cinematic%20wide%20epic%20background%20landscape%20for%20the%20movie%20${encodeURIComponent(item.title)}?width=1920&height=1080&nologo=true`}
            alt={item.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover opacity-70"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-zinc-900 to-black"></div>
        )}
      </div>
      
      {/* Deep Netflix-style vignette gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent w-full md:w-[60%]"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent h-32"></div>
      
      <div className="absolute bottom-[10%] md:bottom-[15%] left-0 p-6 md:px-12 w-full md:w-[50%] flex flex-col justify-end z-10">
        {item.genres && item.genres.length > 0 && (
          <div className="flex items-center gap-2 mb-3 text-xs md:text-sm font-bold tracking-widest text-white drop-shadow-md">
            <span className="text-primary mr-1 font-extrabold text-lg">S</span>
            {item.type === 'movie' ? 'FILM' : item.type === 'series' ? 'SERIES' : 'DOCUMENTARY'}
            <span className="text-gray-400 mx-1">•</span> 
            {item.genres[0].toUpperCase()}
          </div>
        )}
        
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-4 leading-none drop-shadow-2xl tracking-tight">
          {item.title}
        </h1>
        
        <p className="text-white text-base md:text-xl mb-8 line-clamp-3 md:line-clamp-4 max-w-2xl drop-shadow-lg font-medium text-shadow-sm">
          {item.description}
        </p>
        
        <div className="flex flex-wrap items-center gap-4">
          <Link href={`/item/${item.id}`}>
            <Button size="lg" className="bg-white text-black hover:bg-white/80 text-lg md:text-xl font-bold px-6 md:px-8 py-6 md:py-7 rounded flex items-center transition-transform hover:scale-105 active:scale-95">
              <Play className="w-6 h-6 md:w-8 md:h-8 mr-2 fill-current" />
              Play
            </Button>
          </Link>
          <Link href={`/item/${item.id}`}>
            <Button size="lg" variant="secondary" className="bg-gray-500/50 text-white hover:bg-gray-500/70 text-lg md:text-xl font-bold px-6 md:px-8 py-6 md:py-7 rounded flex items-center backdrop-blur-md border-0 transition-transform hover:scale-105 active:scale-95">
              <Info className="w-6 h-6 md:w-8 md:h-8 mr-2" />
              More Info
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
