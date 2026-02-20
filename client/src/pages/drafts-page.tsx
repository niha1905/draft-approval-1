import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDrafts, useCreateDraft, useUpdateDraft, useApproveDraft } from "@/hooks/use-drafts";
import { useComments, useCreateComment } from "@/hooks/use-comments";
import { LayoutShell } from "@/components/layout-shell";
import { StatusBadge } from "@/components/status-badge";
import { DraftInput, DraftUpdateInput } from "@shared/routes";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDraftSchema } from "@shared/schema";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Plus, Filter, Search, FileText, Send } from "lucide-react";

// --- Sub-Components for Draft Forms ---

function DynamicDraftForm({ type, form }: { type: string; form: any }) {
  const { register } = form;
  
  switch(type) {
    case 'Operational Updates':
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" {...register("content.date")} required />
            </div>
            <div className="space-y-2">
              <Label>Operation Type</Label>
              <Input placeholder="e.g. Logistics" {...register("content.operationType")} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Details</Label>
            <Textarea placeholder="Describe the operational update..." className="h-32" {...register("content.details")} required />
          </div>
        </>
      );
    case 'Reports':
      return (
        <>
          <div className="space-y-2">
            <Label>Report Title</Label>
            <Input placeholder="Monthly Operations Report" {...register("content.reportTitle")} required />
          </div>
          <div className="space-y-2">
            <Label>Key Metrics</Label>
            <Textarea placeholder="Metric 1: Value..." {...register("content.metrics")} required />
          </div>
          <div className="space-y-2">
            <Label>Executive Summary</Label>
            <Textarea className="h-32" {...register("content.summary")} required />
          </div>
        </>
      );
    default:
      return (
        <div className="space-y-2">
          <Label>General Content</Label>
          <Textarea className="h-40" placeholder="Enter content..." {...register("content.general")} required />
        </div>
      );
  }
}

function CommentSection({ draftId }: { draftId: number }) {
  const { data: comments } = useComments(draftId);
  const createComment = useCreateComment();
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    createComment.mutate({ draftId, data: { content } }, {
      onSuccess: () => setContent("")
    });
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="font-semibold mb-4 px-4">Discussion</h3>
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4">
          {comments?.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">U</AvatarFallback>
              </Avatar>
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-sm flex-1">
                <p className="font-medium text-xs mb-1 text-primary">User {comment.userId}</p>
                <p>{comment.content}</p>
                <p className="text-[10px] text-muted-foreground mt-2 text-right">
                  {new Date(comment.createdAt!).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {comments?.length === 0 && (
            <p className="text-center text-muted-foreground text-sm italic">No comments yet.</p>
          )}
        </div>
      </ScrollArea>
      <form onSubmit={handleSubmit} className="p-4 mt-auto border-t">
        <div className="flex gap-2">
          <Input 
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
            placeholder="Add a comment..." 
            className="flex-1"
          />
          <Button size="icon" type="submit" disabled={createComment.isPending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function DraftsPage() {
  const { user } = useAuth();
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  const { data: drafts, isLoading } = useDrafts();
  const createDraft = useCreateDraft();
  const updateDraft = useUpdateDraft();
  const approveDraft = useApproveDraft();

  const form = useForm<DraftInput>({
    resolver: zodResolver(insertDraftSchema),
    defaultValues: { 
      type: "Operational Updates",
      status: "Draft",
      submitterId: user?.id || 1, 
      content: {},
      files: []
    }
  });

  const onSubmit = (data: DraftInput) => {
    // Ensure submitterId is set
    const payload = { ...data, submitterId: user!.id };
    createDraft.mutate(payload, {
      onSuccess: () => {
        setIsCreateOpen(false);
        form.reset();
      }
    });
  };

  const handleStatusChange = (status: "Approved" | "Rejected" | "Changes Required") => {
    if (!selectedDraftId) return;
    approveDraft.mutate({ 
      id: selectedDraftId, 
      data: { status, comment: "Status updated via quick action" } 
    });
  };

  const filteredDrafts = drafts?.filter(d => 
    filterStatus === "all" ? true : d.status === filterStatus
  );

  const selectedDraft = drafts?.find(d => d.id === selectedDraftId);
  const canApprove = user?.role === 'Manager' || user?.role === 'Head Authority';

  return (
    <LayoutShell>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Drafts & Approvals</h2>
            <p className="text-muted-foreground">Manage and review document submissions.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Create New
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Draft</DialogTitle>
                <DialogDescription>Submit a new document for approval.</DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input placeholder="e.g. Q4 Ops Update" {...form.register("title")} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select onValueChange={(v) => form.setValue("type", v)} defaultValue="Operational Updates">
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Operational Updates">Operational Updates</SelectItem>
                        <SelectItem value="Reports">Reports</SelectItem>
                        <SelectItem value="Proposals">Proposals</SelectItem>
                        <SelectItem value="Maintenance Updates">Maintenance Updates</SelectItem>
                        <SelectItem value="Compliance Documents">Compliance Documents</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Dynamic Form Fields */}
                <Card className="bg-slate-50 dark:bg-slate-900 border-dashed">
                  <CardContent className="pt-6">
                    <DynamicDraftForm type={form.watch("type")} form={form} />
                  </CardContent>
                </Card>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createDraft.isPending}>
                    {createDraft.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Draft
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-6 h-full">
          {/* List View */}
          <div className="w-1/3 flex flex-col bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search drafts..." className="pl-9 bg-slate-50 border-0 focus-visible:ring-1" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {['all', 'Draft', 'Pending', 'Approved', 'Changes Required'].map(status => (
                  <Button 
                    key={status} 
                    variant={filterStatus === status ? "default" : "outline"} 
                    size="sm"
                    className="h-7 text-xs whitespace-nowrap"
                    onClick={() => setFilterStatus(status)}
                  >
                    {status === 'all' ? 'All' : status}
                  </Button>
                ))}
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="divide-y">
                {isLoading && <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></div>}
                {filteredDrafts?.map(draft => (
                  <div 
                    key={draft.id}
                    onClick={() => setSelectedDraftId(draft.id)}
                    className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selectedDraftId === draft.id ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`font-medium text-sm line-clamp-1 ${selectedDraftId === draft.id ? 'text-primary' : ''}`}>{draft.title}</h4>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(draft.createdAt!).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{draft.type}</span>
                      <StatusBadge status={draft.status} />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Detail View */}
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border shadow-sm flex flex-col overflow-hidden">
            {selectedDraft ? (
              <div className="flex h-full">
                {/* Draft Content */}
                <div className="flex-1 flex flex-col overflow-hidden border-r">
                  <div className="p-6 border-b flex justify-between items-start bg-slate-50/30">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <StatusBadge status={selectedDraft.status} />
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{selectedDraft.type}</span>
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedDraft.title}</h2>
                      <p className="text-sm text-muted-foreground mt-1">Submitted on {new Date(selectedDraft.createdAt!).toLocaleDateString()}</p>
                    </div>
                    
                    {/* Approval Actions */}
                    {canApprove && selectedDraft.status === 'Pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange("Changes Required")}>Request Changes</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleStatusChange("Rejected")}>Reject</Button>
                        <Button size="sm" onClick={() => handleStatusChange("Approved")}>Approve</Button>
                      </div>
                    )}
                  </div>

                  <ScrollArea className="flex-1 p-8">
                    <div className="prose dark:prose-invert max-w-none">
                      <div className="grid grid-cols-2 gap-6 mb-8">
                         {Object.entries(selectedDraft.content as Record<string, any>).map(([key, value]) => (
                           <div key={key} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border">
                             <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                             <p className="text-sm font-medium">{value}</p>
                           </div>
                         ))}
                      </div>
                    </div>
                  </ScrollArea>
                </div>

                {/* Sidebar Comments */}
                <div className="w-80 bg-slate-50/50 dark:bg-slate-900/50">
                  <CommentSection draftId={selectedDraft.id} />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                  <FileText className="w-12 h-12 text-slate-300" />
                </div>
                <p>Select a draft to view details and feedback</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
