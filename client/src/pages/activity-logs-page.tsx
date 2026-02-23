import { useAuth } from "@/hooks/use-auth";
import { useActivityLogs } from "@/hooks/use-activity-logs";
import { LayoutShell } from "@/components/layout-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Activity } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ActivityLogsPage() {
  const { user } = useAuth();
  const { data: logs, isLoading, error } = useActivityLogs();

  if (user?.role !== "Head Authority") {
    return (
      <LayoutShell>
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access activity logs. Only Head Authority users can view this section.
            </AlertDescription>
          </Alert>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-8 h-8" /> Activity Logs
          </h2>
          <p className="text-muted-foreground">System audit trail and user activities.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Activities</CardTitle>
            <CardDescription>Complete record of all system events and user actions.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error instanceof Error ? error.message : "Failed to load activity logs"}
                </AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs && logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No activities recorded yet.
              </div>
            ) : (
              <ScrollArea className="h-[600px] rounded-lg border">
                <div className="space-y-0">
                  {logs?.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-4 border-b last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-slate-900 dark:text-white break-words">{log.action}</p>
                          {log.draftId && (
                            <Badge variant="outline" className="ml-auto flex-shrink-0">
                              Draft #{log.draftId}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true,
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">User ID: {log.userId}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">About Activity Logs</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>• All draft creations and deletions are logged</p>
            <p>• Draft status changes (submissions, approvals, rejections) are tracked</p>
            <p>• System auto-approvals by Head Authority are recorded</p>
            <p>• Timestamps are in your local timezone</p>
            <p>• This audit trail helps maintain compliance and accountability</p>
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}
