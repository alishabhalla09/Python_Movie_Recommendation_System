import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, Film, Activity, Bookmark, MessageSquare } from "lucide-react";

function useAdminStats() {
  return useQuery({
    queryKey: ['/api/admin/stats'],
    queryFn: () => customFetch<any>(`/api/admin/stats`)
  });
}

function useAnalytics() {
  return useQuery({
    queryKey: ['/api/admin/analytics'],
    queryFn: () => customFetch<any>(`/api/admin/analytics`)
  });
}

const COLORS = ['#e11d48', '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c'];

export default function Admin() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics();

  if (statsLoading || analyticsLoading) {
    return <div className="pt-24 min-h-screen flex justify-center text-white">Loading admin dashboard...</div>;
  }

  if (!stats || !analytics) {
    return <div className="pt-24 min-h-screen flex justify-center text-white">Failed to load admin data</div>;
  }

  return (
    <div className="pt-24 px-4 md:px-12 pb-20 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-white">Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
        {[
          { label: "Total Users", value: stats.totalUsers, icon: Users },
          { label: "Total Items", value: stats.totalItems, icon: Film },
          { label: "Interactions", value: stats.totalInteractions, icon: Activity },
          { label: "Watchlist Saves", value: stats.totalWatchlistEntries, icon: Bookmark },
          { label: "Total Reviews", value: stats.totalReviews, icon: MessageSquare }
        ].map((stat, idx) => (
          <div key={idx} className="bg-card p-6 rounded-xl border border-card-border flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Genre Distribution */}
        <div className="bg-card p-6 rounded-xl border border-card-border">
          <h2 className="text-xl font-bold mb-6 text-white">Genre Distribution</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.genreDistribution}>
                <XAxis dataKey="genre" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#333'}} contentStyle={{backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px'}} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interaction Types */}
        <div className="bg-card p-6 rounded-xl border border-card-border">
          <h2 className="text-xl font-bold mb-6 text-white">Interactions by Type</h2>
          <div className="h-80 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.interactionsByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="eventType"
                >
                  {analytics.interactionsByType.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
