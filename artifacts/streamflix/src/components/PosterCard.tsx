import { Link } from "wouter";
import { Item } from "@workspace/api-client-react/src/generated/api.schemas";
import { Star } from "lucide-react";

interface PosterCardProps {
  item: Item;
  onClick?: () => void;
}

export default function PosterCard({ item, onClick }: PosterCardProps) {
  return (
    <Link href={`/item/${item.id}`} className="group relative block aspect-[2/3] rounded-md overflow-hidden bg-card border border-transparent hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:z-10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background shrink-0" onClick={onClick}>
      {item.posterUrl ? (
        <img
          src={item.posterUrl}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-card to-background flex items-center justify-center p-4 text-center">
          <span className="font-bold text-lg text-white opacity-80">{item.title}</span>
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
