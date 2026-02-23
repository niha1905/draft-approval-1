import { useAuth } from "@/hooks/use-auth";
import { useDrafts } from "@/hooks/use-drafts";
import { LayoutShell } from "@/components/layout-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Plus, Clock, CheckCircle2, AlertCircle, FileBarChart, Download, TrendingUp, Users } from "lucide-react";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
  Legend
} from "recharts";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: drafts } = useDrafts();

  // Metrics
  const pendingCount = drafts?.filter(d => d.status === 'Pending').length || 0;
  const approvedCount = drafts?.filter(d => d.status === 'Approved').length || 0;
  const changesCount = drafts?.filter(d => d.status === 'Changes Required').length || 0;
  const rejectedCount = drafts?.filter(d => d.status === 'Rejected').length || 0;
  const totalCount = drafts?.length || 0;

  // Chart Data
  const statusData = [
    { name: 'Draft', value: drafts?.filter(d => d.status === 'Draft').length || 0, color: '#94a3b8' },
    { name: 'Pending', value: pendingCount, color: '#fbbf24' },
    { name: 'Approved', value: approvedCount, color: '#10b981' },
    { name: 'Changes', value: changesCount, color: '#6366f1' },
    { name: 'Rejected', value: rejectedCount, color: '#ef4444' },
  ].filter(item => item.value > 0);

  // Type distribution
  const typeData = Object.entries(
    drafts?.reduce((acc: Record<string, number>, d) => {
      acc[d.type] = (acc[d.type] || 0) + 1;
      return acc;
    }, {}) || {}
  ).map(([name, value]) => ({ name, value }));

  // Approval rate
  const approvalRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const rejectionRate = totalCount > 0 ? Math.round((rejectedCount / totalCount) * 100) : 0;

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <Card className="glass-card hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );

  const handleExportAnalytics = (format: 'json' | 'csv') => {
    if (!drafts) return;

    if (format === 'json') {
      const analytics = {
        exportDate: new Date().toISOString(),
        summary: {
          totalDrafts: totalCount,
          pending: pendingCount,
          approved: approvedCount,
          changesRequired: changesCount,
          rejected: rejectedCount,
          approvalRate: `${approvalRate}%`,
          rejectionRate: `${rejectionRate}%`,
        },
        drafts: drafts.map(d => ({
          id: d.id,
          title: d.title,
          type: d.type,
          status: d.status,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        })),
      };
      const dataStr = JSON.stringify(analytics, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `analytics_${new Date().toISOString().split('T')[0]}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } else if (format === 'csv') {
      let csv = 'Title,Type,Status,Created Date,Updated Date\n';
      drafts.forEach(d => {
        csv += `"${d.title}","${d.type}","${d.status}","${new Date(d.createdAt!).toLocaleDateString()}","${new Date(d.updatedAt!).toLocaleDateString()}"\n`;
      });
      const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      const exportFileDefaultName = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  const isManagerOrAdmin = user?.role === 'Manager' || user?.role === 'Head Authority';

  return (
    <LayoutShell>
      <div className="space-y-8">
        {/* Header Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h2>
            <p className="text-muted-foreground mt-1">Overview of your submissions and approvals.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/drafts">
              <Button size="lg" className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                <Plus className="mr-2 h-4 w-4" /> New Draft
              </Button>
            </Link>
            {isManagerOrAdmin && (
              <div className="flex gap-1">
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => handleExportAnalytics('json')}
                  title="Export analytics as JSON"
                  className="shadow-lg shadow-slate-500/10"
                >
                  <Download className="mr-2 h-4 w-4" /> JSON
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => handleExportAnalytics('csv')}
                  title="Export analytics as CSV"
                  className="shadow-lg shadow-slate-500/10"
                >
                  <Download className="mr-2 h-4 w-4" /> CSV
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Drafts" value={totalCount} icon={FileBarChart} color="bg-slate-500" />
          <StatCard title="Pending Approval" value={pendingCount} icon={Clock} color="bg-amber-500" />
          <StatCard title="Approved" value={approvedCount} icon={CheckCircle2} color="bg-emerald-500" />
          <StatCard title="Needs Attention" value={changesCount} icon={AlertCircle} color="bg-indigo-500" />
        </div>

        {/* Manager/Admin Analytics Section */}
        {isManagerOrAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="glass-panel shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Approval Rate</p>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <h3 className="text-3xl font-bold text-emerald-600">{approvalRate}%</h3>
                <p className="text-xs text-muted-foreground mt-1">{approvedCount} of {totalCount} approved</p>
              </CardContent>
            </Card>
            
            <Card className="glass-panel shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Rejection Rate</p>
                  <AlertCircle className="w-4 h-4 text-destructive" />
                </div>
                <h3 className="text-3xl font-bold text-destructive">{rejectionRate}%</h3>
                <p className="text-xs text-muted-foreground mt-1">{rejectedCount} of {totalCount} rejected</p>
              </CardContent>
            </Card>

            <Card className="glass-panel shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Pending Reviews</p>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <h3 className="text-3xl font-bold text-amber-600">{pendingCount}</h3>
                <p className="text-xs text-muted-foreground mt-1">Awaiting action</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <Card className="lg:col-span-2 glass-panel shadow-sm">
            <CardHeader>
              <CardTitle>Submission Status Overview</CardTitle>
              <CardDescription>Distribution of current draft statuses</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Activity List */}
          <Card className="glass-panel shadow-sm flex flex-col">
            <CardHeader>
              <CardTitle>Recent Drafts</CardTitle>
              <CardDescription>Your latest submissions</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <div className="space-y-4">
                {drafts?.slice(0, 5).map(draft => (
                  <Link href={`/drafts?id=${draft.id}`} key={draft.id}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-medium truncate">{draft.title}</p>
                        <p className="text-xs text-muted-foreground">{draft.type}</p>
                      </div>
                      <StatusBadge status={draft.status} />
                    </div>
                  </Link>
                ))}
                {(!drafts || drafts.length === 0) && (
                  <p className="text-sm text-center text-muted-foreground py-8">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Manager/Admin Type Distribution */}
        {isManagerOrAdmin && typeData.length > 0 && (
          <Card className="glass-panel shadow-sm">
            <CardHeader>
              <CardTitle>Document Type Distribution</CardTitle>
              <CardDescription>Count of submissions by document type</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#1e3a8a"
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={['#3b82f6', '#1e40af', '#1e3a8a', '#2563eb', '#0ea5e9'][index % 5]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </LayoutShell>
  );
}
