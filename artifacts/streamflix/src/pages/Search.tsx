import { useState } from "react";
import { useListGenres } from "@workspace/api-client-react";
import PosterCard from "@/components/PosterCard";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

function useBrowse(q: string, genre: string, minRating: number) {
  const hasFilter = q.length > 1 || genre !== "all" || minRating > 0;

  return useQuery({
    queryKey: ["/api/search", { q, genre, minRating }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("q", q.trim()); // always send q (even empty) — Zod requires it
      if (genre && genre !== "all") params.set("genre", genre);
      if (minRating > 0) params.set("minRating", String(minRating));
      params.set("limit", "60");
      return customFetch<any[]>(`/api/search?${params.toString()}`);
    },
    enabled: hasFilter,
  });
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string>("all");
  const [minRating, setMinRating] = useState<string>("0");

  const { data: genres = [] } = useListGenres();

  const hasFilter = query.length > 1 || genre !== "all" || Number(minRating) > 0;
  const { data: results, isLoading } = useBrowse(query, genre, Number(minRating));

  const rawResults = results as any;
  const searchData: any[] = Array.isArray(rawResults)
    ? rawResults
    : rawResults?.data || [];

  const activeFilters = [
    query.length > 1 && `"${query}"`,
    genre !== "all" && genre,
    Number(minRating) > 0 && `${Number(minRating) / 10}+ Stars`,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="pt-24 px-4 md:px-12 pb-20 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Search & Filter Bar ── */}
        <div className="flex flex-col md:flex-row gap-4 items-end bg-card/50 p-6 rounded-xl border border-zinc-800 backdrop-blur-sm">

          {/* Text search */}
          <div className="flex-1 w-full space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <SearchIcon className="w-4 h-4" /> Search
            </label>
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

          {/* Genre filter */}
          <div className="w-full md:w-52 space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" /> Genre
            </label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="bg-background border-border py-6">
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="all">All Genres</SelectItem>
                {genres.map((g: string) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rating filter */}
          <div className="w-full md:w-48 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Min Rating</label>
            <Select value={minRating} onValueChange={setMinRating}>
              <SelectTrigger className="bg-background border-border py-6">
                <SelectValue placeholder="Any Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Any Rating</SelectItem>
                <SelectItem value="50">5+ Stars</SelectItem>
                <SelectItem value="60">6+ Stars</SelectItem>
                <SelectItem value="70">7+ Stars</SelectItem>
                <SelectItem value="80">8+ Stars</SelectItem>
                <SelectItem value="85">8.5+ Stars</SelectItem>
                <SelectItem value="90">9+ Stars</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Results ── */}
        {hasFilter ? (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-white">
              {isLoading
                ? "Loading…"
                : searchData.length > 0
                  ? `${searchData.length} results${activeFilters ? ` for ${activeFilters}` : ""}`
                  : `No results found${activeFilters ? ` for ${activeFilters}` : ""}`}
            </h2>

            {isLoading && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] rounded-md bg-zinc-800 animate-pulse" />
                ))}
              </div>
            )}

            {!isLoading && searchData.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {searchData.map((item: any) => (
                  <PosterCard key={item.id} item={item} />
                ))}
              </div>
            )}

            {!isLoading && searchData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
                <SearchIcon className="w-16 h-16 opacity-20" />
                <p className="text-xl">No movies found — try different filters</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
            <SearchIcon className="w-16 h-16 opacity-20" />
            <p className="text-xl">Search by title, or pick a Genre / Rating to browse</p>
          </div>
        )}

      </div>
    </div>
  );
}
