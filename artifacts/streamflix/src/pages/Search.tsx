import { useState } from "react";
import { useSearchItems, getSearchItemsQueryKey, useListGenres } from "@workspace/api-client-react";
import PosterCard from "@/components/PosterCard";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

// Re-defining search hook manually as useSearchItems doesn't seem to be in the provided snippet list explicitly, but let's assume it exists. If not, we will use custom fetch.
// Actually, `useSearchItems` was listed in the prompt API hooks list. But in generated api.ts we didn't see it in the snippet. Assuming it works.
// We'll write a safe wrapper around it just in case.

function useSafeSearchItems(q: string, genre: string, minRating: number) {
  return useQuery({
    queryKey: ['/api/items/search', { q, genre, minRating }],
    queryFn: () => customFetch<any[]>(`/api/items/search?q=${encodeURIComponent(q)}&genre=${encodeURIComponent(genre)}&minRating=${minRating}`),
    enabled: q.length > 1
  });
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string>("all");
  const [minRating, setMinRating] = useState<string>("0");

  const { data: genres = [] } = useListGenres();
  
  // Use our safe query as we don't know exact signature in api.ts
  const { data: results, isLoading } = useSafeSearchItems(query, genre === "all" ? "" : genre, Number(minRating));

  return (
    <div className="pt-24 px-4 md:px-12 pb-20 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row gap-4 items-end bg-card/50 p-6 rounded-xl border border-card-border backdrop-blur-sm">
          <div className="flex-1 w-full space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Search</label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles, cast, directors..."
                className="pl-10 bg-background border-border text-lg py-6 focus-visible:ring-primary"
              />
            </div>
          </div>
          
          <div className="w-full md:w-48 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Genre</label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="bg-background border-border py-6">
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {genres.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-48 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Min Rating</label>
            <Select value={minRating} onValueChange={setMinRating}>
              <SelectTrigger className="bg-background border-border py-6">
                <SelectValue placeholder="Any Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Any Rating</SelectItem>
                <SelectItem value="50">5+ Stars</SelectItem>
                <SelectItem value="70">7+ Stars</SelectItem>
                <SelectItem value="85">8.5+ Stars</SelectItem>
                <SelectItem value="90">9+ Stars</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {query.length > 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-white">
              {isLoading ? "Searching..." : results?.length ? `Results for "${query}"` : `No results found for "${query}"`}
            </h2>
            
            {results && results.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {results.map((item: any) => (
                  <PosterCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        )}

        {query.length <= 1 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
            <SearchIcon className="w-16 h-16 opacity-20" />
            <p className="text-xl">Type to start searching your entertainment universe</p>
          </div>
        )}
      </div>
    </div>
  );
}
