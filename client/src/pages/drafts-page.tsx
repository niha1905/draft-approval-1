import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDrafts, useCreateDraft, useUpdateDraft, useApproveDraft, useDeleteDraft } from "@/hooks/use-drafts";
import { useComments, useCreateComment } from "@/hooks/use-comments";
import { useDraftVersions } from "@/hooks/use-versions";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Plus, Filter, Search, FileText, Send, Upload, Download, File, X, CheckCircle2, AlertCircle, FileJson, Clock, History, Trash2, Edit, MoreVertical } from "lucide-react";

// --- Sub-Components for Draft Forms ---

function FileUploadSection({ files, onFilesChange }: { files: any[]; onFilesChange: (files: any[]) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFilesAdded = (newFiles: FileList | null) => {
    if (!newFiles) return;

    const fileArray = Array.from(newFiles).map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));

    onFilesChange([...files, ...fileArray]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesAdded(e.dataTransfer.files);
  };

  const handleRemove = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
          }`}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="font-medium text-sm mb-1">Drag files here or click to browse</p>
        <p className="text-xs text-muted-foreground mb-4">Supported: PDF, DOC, DOCX, XLS, XLSX, TXT, Images</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Select Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFilesAdded(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2 border">
          <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FileJson className="w-4 h-4" /> {files.length} File(s) Selected
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded border text-sm">
                <div className="flex items-center gap-2 flex-1">
                  <File className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="truncate font-medium text-slate-900 dark:text-white">{file.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{formatFileSize(file.size)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded ml-2"
                >
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DynamicDraftForm({ type, form }: { type: string; form: any }) {
  const { register } = form;

  return (
    <>
      {/* Standard Project Details - Common to all submission types */}
      <div className="mb-6 pb-6 border-b">
        <h4 className="font-semibold text-sm mb-4 text-slate-900 dark:text-white">Project Information</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project" className="font-medium">Project Name</Label>
              <Input
                id="project"
                placeholder="e.g. Q4 Infrastructure Upgrade"
                {...register("content.project")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" className="font-medium">Status</Label>
              <Select onValueChange={(v) => form.setValue("content.status", v)} defaultValue={form.getValues("content.status") || "In Progress"}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planning">Planning</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="In Review">In Review</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="font-medium">Description</Label>
            <Textarea
              id="description"
              placeholder="Provide a detailed description of the project..."
              className="h-24"
              {...register("content.description")}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="font-medium">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                {...register("content.startDate")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="completionDate" className="font-medium">Completion Date</Label>
              <Input
                id="completionDate"
                type="date"
                {...register("content.completionDate")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration" className="font-medium">Duration (Days)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="e.g. 30"
                {...register("content.duration")}
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Type-Specific Fields */}
      <div>
        <h4 className="font-semibold text-sm mb-4 text-slate-900 dark:text-white">Type-Specific Details</h4>
        {type === 'Operational Updates' ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="font-medium">Operation Date</Label>
                <Input type="date" id="date" {...register("content.date")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="operationType" className="font-medium">Operation Type</Label>
                <Input id="operationType" placeholder="e.g. Logistics, Maintenance" {...register("content.operationType")} required />
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <Label htmlFor="details" className="font-medium">Operational Details</Label>
              <Textarea id="details" placeholder="Describe the operational update..." className="h-32" {...register("content.details")} required />
            </div>
          </>
        ) : type === 'Reports' ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="reportTitle" className="font-medium">Report Title</Label>
              <Input id="reportTitle" placeholder="Monthly Operations Report" {...register("content.reportTitle")} required />
            </div>
            <div className="space-y-2 mt-4">
              <Label htmlFor="metrics" className="font-medium">Key Metrics</Label>
              <Textarea id="metrics" placeholder="Metric 1: Value&#10;Metric 2: Value" {...register("content.metrics")} required />
            </div>
            <div className="space-y-2 mt-4">
              <Label htmlFor="summary" className="font-medium">Executive Summary</Label>
              <Textarea id="summary" className="h-32" placeholder="Summarize key findings and recommendations..." {...register("content.summary")} required />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="general" className="font-medium">General Content</Label>
              <Textarea id="general" className="h-40" placeholder="Enter content..." {...register("content.general")} required />
            </div>
          </>
        )}
      </div>
    </>
  );
}

function CommentSection({ draftId }: { draftId: number }) {
  const { data: comments, isLoading: commentsLoading } = useComments(draftId);
  const createComment = useCreateComment();
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const commentText = content.trim();
    setContent(""); // Clear immediately for better UX

    createComment.mutate({ draftId, data: { content: commentText } }, {
      onSuccess: () => {
        // Content already cleared above
      },
      onError: () => {
        // Restore content if submission fails
        setContent(commentText);
      }
    });
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="font-semibold mb-4 px-4 pt-4">Discussion</h3>
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4">
          {commentsLoading && <p className="text-sm text-muted-foreground text-center py-4">Loading comments...</p>}
          {comments?.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">U</AvatarFallback>
              </Avatar>
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-sm flex-1">
                <p className="font-medium text-xs mb-1 text-primary">User {comment.userId}</p>
                <p className="text-slate-900 dark:text-white">{comment.content}</p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {new Date(comment.createdAt!).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {!commentsLoading && comments?.length === 0 && (
            <p className="text-center text-muted-foreground text-sm italic py-4">No comments yet.</p>
          )}
        </div>
      </ScrollArea>
      <form onSubmit={handleSubmit} className="p-4 mt-auto border-t space-y-2">
        <div className="flex gap-2">
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 h-9"
            disabled={createComment.isPending}
          />
          <Button
            size="icon"
            type="submit"
            disabled={createComment.isPending || !content.trim()}
            className="h-9 w-9"
          >
            {createComment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}

function VersionHistoryViewer({ draftId, isOpen, onOpenChange }: { draftId: number; isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: versions, isLoading: versionsLoading } = useDraftVersions(draftId);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" /> Version History
          </DialogTitle>
          <DialogDescription>
            View all changes made to this draft
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {versionsLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {versions && versions.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No version history yet</p>
          )}

          {versions?.map((version: any) => (
            <div key={version.id} className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                    <span className="text-xs font-semibold text-primary">v{version.versionNumber}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">
                      {version.changeDescription || `Version ${version.versionNumber}`}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" /> {new Date(version.createdAt!).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {version.status}
                </span>
              </div>

              {version.content && Object.keys(version.content).length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded p-3 text-xs space-y-2 mt-2">
                  {Object.entries(version.content as Record<string, any>)
                    .slice(0, 3)
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">{key}:</span>
                        <span className="text-slate-900 dark:text-white font-medium truncate ml-2 max-w-xs">
                          {String(value).substring(0, 50)}
                        </span>
                      </div>
                    ))}
                  {Object.keys(version.content).length > 3 && (
                    <p className="text-muted-foreground italic">+ {Object.keys(version.content).length - 3} more fields</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DraftsPage() {
  const { user } = useAuth();
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const { data: drafts, isLoading } = useDrafts();
  const { data: versions, isLoading: versionsLoading } = useDraftVersions(selectedDraftId || 0);
  const createDraft = useCreateDraft();
  const updateDraft = useUpdateDraft();
  const approveDraft = useApproveDraft();
  const deleteDraft = useDeleteDraft();

  const form = useForm<any>({
    resolver: zodResolver(insertDraftSchema),
    defaultValues: {
      type: "Operational Updates",
      status: "Draft",
      submitterId: user?.id || 1,
      title: "",
      content: {
        project: "",
        description: "",
        startDate: "",
        completionDate: "",
        duration: "",
        status: "Planning"
      },
      files: []
    }
  });

  const editForm = useForm<any>({
    resolver: zodResolver(insertDraftSchema),
  });

  const onEditOpen = (draft: any) => {
    editForm.reset({
      ...draft,
      content: draft.content || {},
      files: draft.files || []
    });
    setIsEditOpen(true);
  };

  // Auto-save effect for draft edits
  useEffect(() => {
    if (!selectedDraftId || !form.formState.isDirty) return;

    const autoSaveTimer = setTimeout(() => {
      const formData = form.getValues();
      if (!formData.content || !formData.content.project) return; // Don't auto-save empty drafts

      setAutoSaveStatus("saving");
      updateDraft.mutate({
        id: selectedDraftId,
        data: formData
      }, {
        onSuccess: () => {
          setAutoSaveStatus("saved");
          setTimeout(() => setAutoSaveStatus("idle"), 2000);
        },
        onError: () => {
          setAutoSaveStatus("idle");
        }
      });
    }, 30000); // Auto-save every 30 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [selectedDraftId, form, updateDraft, form.formState.isDirty]);

  const onSubmit = async (data: any) => {
    try {
      let finalFiles = [];

      // Upload files if any
      if (uploadedFiles.length > 0) {
        const formData = new FormData();
        uploadedFiles.forEach(f => {
          if (f.file) formData.append("files", f.file);
        });

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });

        if (uploadRes.ok) {
          const { filenames } = await uploadRes.json();
          finalFiles = filenames;
        }
      }

      const payload: DraftInput = {
        ...data,
        submitterId: user!.id,
        files: finalFiles,
        status: 'Draft' // Save as draft
      };

      createDraft.mutate(payload, {
        onSuccess: () => {
          setIsCreateOpen(false);
          form.reset();
          setUploadedFiles([]);
        }
      });
    } catch (err) {
      console.error("Failed to upload files or create draft", err);
    }
  };

  const handleStatusChange = (status: "Approved" | "Rejected" | "Changes Required") => {
    if (!selectedDraftId) return;
    approveDraft.mutate({
      id: selectedDraftId,
      data: { status, comment: "Status updated via quick action" }
    });
  };

  const handleExportDraft = (format: 'json' | 'csv') => {
    if (!selectedDraft) return;

    if (format === 'json') {
      const dataStr = JSON.stringify(selectedDraft, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `draft_${selectedDraft.id}_${selectedDraft.title.replace(/\s+/g, '_')}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } else if (format === 'csv') {
      let csv = 'Field,Value\n';
      csv += `ID,${selectedDraft.id}\n`;
      csv += `Title,"${selectedDraft.title}"\n`;
      csv += `Type,${selectedDraft.type}\n`;
      csv += `Status,${selectedDraft.status}\n`;
      csv += `Created,${new Date(selectedDraft.createdAt!).toLocaleString()}\n`;
      csv += `Updated,${new Date(selectedDraft.updatedAt!).toLocaleString()}\n`;

      Object.entries(selectedDraft.content as Record<string, any>).forEach(([key, value]) => {
        csv += `"${key}","${value}"\n`;
      });

      const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      const exportFileDefaultName = `draft_${selectedDraft.id}_${selectedDraft.title.replace(/\s+/g, '_')}.csv`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  const filteredDrafts = drafts?.filter(d => {
    const statusMatch = filterStatus === "all" ? true : d.status === filterStatus;
    const searchLower = searchQuery.toLowerCase();
    const searchMatch = searchQuery === "" ? true : (
      d.title.toLowerCase().includes(searchLower) ||
      d.type.toLowerCase().includes(searchLower) ||
      (d.content as any)?.project?.toLowerCase().includes(searchLower) ||
      (d.content as any)?.description?.toLowerCase().includes(searchLower)
    );
    return statusMatch && searchMatch;
  });

  const selectedDraft = drafts?.find(d => d.id === selectedDraftId);
  const canApprove = user?.role === 'Manager' || user?.role === 'Head Authority';
  const canExport = user?.role === 'Manager' || user?.role === 'Head Authority';

  const onEditSubmit = (data: any) => {
    if (!selectedDraft) return;
    updateDraft.mutate({ id: selectedDraft.id, data }, {
      onSuccess: () => {
        setIsEditOpen(false);
      }
    });
  };

  const [isEditOpen, setIsEditOpen] = useState(false);


  const handleDelete = () => {
    if (!selectedDraft) return;
    if (!confirm('Are you sure you want to delete this draft? This action cannot be undone.')) return;
    deleteDraft.mutate(selectedDraft.id, {
      onSuccess: () => {
        setSelectedDraftId(null);
      }
    });
  };

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
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Draft</DialogTitle>
                <DialogDescription>Submit a new document for approval.</DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                {/* Header Section */}
                <Alert className="border-primary/20 bg-primary/5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    Your draft will be saved as a work in progress. You can continue editing and submit for approval when ready.
                  </AlertDescription>
                </Alert>

                {/* Title and Type Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="font-semibold">Document Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g. Q4 Operations Update"
                      {...form.register("title")}
                      required
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type" className="font-semibold">Document Type</Label>
                    <Select onValueChange={(v) => form.setValue("type", v)} defaultValue="Operational Updates">
                      <SelectTrigger id="type" className="h-10">
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
                <div className="border rounded-lg">
                  <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 border-b font-semibold text-sm">
                    Content Details
                  </div>
                  <Card className="bg-slate-50 dark:bg-slate-900 border-0 shadow-none">
                    <CardContent className="pt-6">
                      <DynamicDraftForm type={form.watch("type")} form={form} />
                    </CardContent>
                  </Card>
                </div>

                {/* File Upload Section */}
                <div className="border rounded-lg">
                  <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 border-b font-semibold text-sm flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Attachments
                  </div>
                  <div className="p-6">
                    <FileUploadSection files={uploadedFiles} onFilesChange={setUploadedFiles} />
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsCreateOpen(false);
                    setUploadedFiles([]);
                    form.reset();
                  }}>Cancel</Button>
                  <Button type="submit" disabled={createDraft.isPending}>
                    {createDraft.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {createDraft.isPending ? 'Saving...' : 'Save Draft'}
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
                <Input
                  placeholder="Search drafts..."
                  className="pl-9 bg-slate-50 border-0 focus-visible:ring-1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
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
                {isLoading && <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}
                {filteredDrafts?.map(draft => (
                  <div
                    key={draft.id}
                    onClick={() => setSelectedDraftId(draft.id)}
                    className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group ${selectedDraftId === draft.id ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`font-medium text-sm line-clamp-1 ${selectedDraftId === draft.id ? 'text-primary' : ''}`}>{draft.title}</h4>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(draft.createdAt!).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{draft.type}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <StatusBadge status={draft.status} />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditOpen(draft);
                          }}
                          title="Edit draft"
                        >
                          <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!confirm('Delete this draft? This cannot be undone.')) return;
                            deleteDraft.mutate(draft.id, { onSuccess: () => { if (selectedDraftId === draft.id) setSelectedDraftId(null); } });
                          }}
                          title="Delete draft"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
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
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <StatusBadge status={selectedDraft.status} />
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{selectedDraft.type}</span>
                      </div>
                      <>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedDraft.title}</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          Project: <span className="font-semibold">{(selectedDraft.content as any)?.project || 'N/A'}</span>
                        </p>
                      </>
                      <p className="text-sm text-muted-foreground mt-1">Submitted on {new Date(selectedDraft.createdAt!).toLocaleDateString()}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-col sm:flex-row ml-4 items-start">
                      <div className="flex gap-2 flex-col sm:flex-row">
                        {selectedDraft.status === 'Draft' && (user?.id === selectedDraft.submitterId || user?.role === 'Manager') && (
                          <Button
                            size="sm"
                            onClick={() => {
                              updateDraft.mutate({
                                id: selectedDraft.id,
                                data: { status: 'Pending' }
                              });
                            }}
                            disabled={updateDraft.isPending}
                          >
                            {updateDraft.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Submit for Approval
                          </Button>
                        )}
                        {canApprove && selectedDraft.status === 'Pending' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleStatusChange("Changes Required")}>Request Changes</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleStatusChange("Rejected")}>Reject</Button>
                            <Button size="sm" onClick={() => handleStatusChange("Approved")}>Approve</Button>
                          </>
                        )}
                        {canExport && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleExportDraft('json')}
                              title="Export as JSON"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleExportDraft('csv')}
                              title="Export as CSV"
                            >
                              <FileJson className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowVersionHistory(true)}
                          title="View version history"
                        >
                          <History className="w-4 h-4 mr-2" /> Version History
                        </Button>

                        {/* Actions Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEditOpen(selectedDraft)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Auto-save Status */}
                      {autoSaveStatus !== "idle" && (
                        <div className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${autoSaveStatus === 'saving'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200'
                          }`}>
                          {autoSaveStatus === 'saving' ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Saved
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-8">
                    <div className="prose dark:prose-invert max-w-none">
                      {/* Project Information Card */}
                      <div className="mb-8 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-6">
                        <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Project Overview</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-primary/10">
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Project Name</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{(selectedDraft.content as any)?.project || 'N/A'}</p>
                          </div>
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-primary/10">
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Project Status</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{(selectedDraft.content as any)?.status || 'N/A'}</p>
                          </div>
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-primary/10">
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Duration</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{(selectedDraft.content as any)?.duration ? `${(selectedDraft.content as any).duration} days` : 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Project Description */}
                      {(selectedDraft.content as any)?.description && (
                        <div className="mb-8 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Description</p>
                          <p className="text-sm text-slate-900 dark:text-white">{(selectedDraft.content as any).description}</p>
                        </div>
                      )}

                      {/* Timeline Section */}
                      <div className="mb-8 bg-gradient-to-br from-amber-50 to-amber-50/50 dark:from-amber-900/20 dark:to-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
                        <h4 className="font-semibold text-sm mb-4 text-amber-900 dark:text-amber-100">Timeline</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-amber-100 dark:border-amber-800/50">
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Start Date</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {(selectedDraft.content as any)?.startDate
                                ? new Date((selectedDraft.content as any).startDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })
                                : 'N/A'
                              }
                            </p>
                          </div>
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-amber-100 dark:border-amber-800/50">
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Completion Date</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {(selectedDraft.content as any)?.completionDate
                                ? new Date((selectedDraft.content as any).completionDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })
                                : 'N/A'
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Files Section */}
                      {selectedDraft.files && selectedDraft.files.length > 0 && (
                        <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <p className="font-semibold text-sm mb-3 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                            <File className="w-4 h-4" /> Attached Files ({selectedDraft.files.length})
                          </p>
                          <div className="space-y-2">
                            {selectedDraft.files.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2 text-sm text-blue-800 dark:text-blue-200 p-2 bg-white dark:bg-slate-800 rounded border border-blue-100 dark:border-blue-700">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <File className="w-4 h-4 flex-shrink-0" />
                                  <span className="truncate">{file}</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 flex-shrink-0"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = `/api/download/${file}`;
                                    link.download = file;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }}
                                  title="Download file"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Type-Specific Details */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                        <h4 className="font-semibold text-sm mb-4 text-slate-900 dark:text-white">Type-Specific Details</h4>
                        <div className="grid grid-cols-2 gap-6">
                          {Object.entries(selectedDraft.content as Record<string, any>)
                            .filter(([key]) => !['project', 'description', 'startDate', 'completionDate', 'duration', 'status'].includes(key))
                            .map(([key, value]) => (
                              <div key={key} className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">{key.replace(/([A-Z])/g, ' $1').trim()}</h5>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{String(value)}</p>
                              </div>
                            ))}
                        </div>
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

      {/* Version History Viewer */}
      {selectedDraftId && (
        <VersionHistoryViewer
          draftId={selectedDraftId}
          isOpen={showVersionHistory}
          onOpenChange={setShowVersionHistory}
        />
      )}

      {/* Edit Draft Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Draft: {selectedDraft?.title}</DialogTitle>
            <DialogDescription>Modify any details of this draft.</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="font-semibold">Document Title</Label>
                <Input
                  id="edit-title"
                  {...editForm.register("title")}
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type" className="font-semibold">Document Type</Label>
                <Select
                  onValueChange={(v) => editForm.setValue("type", v)}
                  defaultValue={editForm.getValues("type")}
                >
                  <SelectTrigger id="edit-type" className="h-10">
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

            <div className="border rounded-lg">
              <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 border-b font-semibold text-sm">
                Content Details
              </div>
              <Card className="bg-slate-50 dark:bg-slate-900 border-0 shadow-none">
                <CardContent className="pt-6">
                  <DynamicDraftForm type={editForm.watch("type")} form={editForm} />
                </CardContent>
              </Card>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateDraft.isPending}>
                {updateDraft.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {updateDraft.isPending ? 'Saving...' : 'Update Draft'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </LayoutShell>
  );
}
