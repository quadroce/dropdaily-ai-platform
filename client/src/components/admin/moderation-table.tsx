import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { UserSubmissionWithUser } from "@shared/schema";
import { ExternalLink, Play, FileText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface ModerationTableProps {
  submissions: UserSubmissionWithUser[];
}

export function ModerationTable({ submissions }: ModerationTableProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
  const [moderationDialog, setModerationDialog] = useState<{
    open: boolean;
    submission: UserSubmissionWithUser | null;
    action: 'approve' | 'reject';
  }>({
    open: false,
    submission: null,
    action: 'approve'
  });
  const [moderationNotes, setModerationNotes] = useState("");

  const moderationMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      apiRequest("PATCH", `/api/admin/submissions/${id}`, {
        status,
        moderatedBy: user?.id,
        moderationNotes: notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/submissions"] });
      setModerationDialog({ open: false, submission: null, action: 'approve' });
      setModerationNotes("");
      toast({
        title: "Submission updated",
        description: "The submission has been successfully moderated.",
      });
    },
  });

  const handleModeration = (submission: UserSubmissionWithUser, action: 'approve' | 'reject') => {
    setModerationDialog({ open: true, submission, action });
  };

  const confirmModeration = () => {
    if (!moderationDialog.submission) return;

    moderationMutation.mutate({
      id: moderationDialog.submission.id,
      status: moderationDialog.action === 'approve' ? 'approved' : 'rejected',
      notes: moderationNotes.trim() || undefined,
    });
  };

  const getSourceIcon = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return <Play className="h-4 w-4 text-red-500" />;
    }
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  const toggleSubmissionSelection = (id: string) => {
    setSelectedSubmissions(prev =>
      prev.includes(id)
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSubmissions.length === submissions.length) {
      setSelectedSubmissions([]);
    } else {
      setSelectedSubmissions(submissions.map(s => s.id));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="status-badge status-pending">Pending</Badge>;
      case 'approved':
        return <Badge className="status-badge status-approved">Approved</Badge>;
      case 'rejected':
        return <Badge className="status-badge status-rejected">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedSubmissions.length === submissions.length && submissions.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Submitter</TableHead>
              <TableHead>Topics</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((submission) => (
              <TableRow key={submission.id} className="hover:bg-gray-50">
                <TableCell>
                  <Checkbox
                    checked={selectedSubmissions.includes(submission.id)}
                    onCheckedChange={() => toggleSubmissionSelection(submission.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-start space-x-3">
                    {getSourceIcon(submission.url)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {submission.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {submission.url}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt={`${submission.user.firstName} ${submission.user.lastName}`} />
                      <AvatarFallback>
                        {submission.user.firstName[0]}{submission.user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {submission.user.firstName} {submission.user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{submission.user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {submission.suggestedTopics && Array.isArray(submission.suggestedTopics) && 
                      (submission.suggestedTopics as string[]).slice(0, 2).map((topicId: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          Topic {index + 1}
                        </Badge>
                      ))
                    }
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(submission.status)}</TableCell>
                <TableCell className="text-sm text-gray-500">
                  {new Date(submission.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {submission.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleModeration(submission, 'approve')}
                          className="text-green-600 hover:text-green-700 border-green-300 hover:border-green-400"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleModeration(submission, 'reject')}
                          className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(submission.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Moderation Dialog */}
      <Dialog open={moderationDialog.open} onOpenChange={(open) => 
        setModerationDialog({ ...moderationDialog, open })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moderationDialog.action === 'approve' ? 'Approve' : 'Reject'} Submission
            </DialogTitle>
            <DialogDescription>
              {moderationDialog.action === 'approve' 
                ? 'This submission will be processed and added to the content library.'
                : 'This submission will be rejected and the user will be notified.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {moderationDialog.submission && (
            <div className="py-4">
              <h4 className="font-medium text-gray-900 mb-2">
                {moderationDialog.submission.title}
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                {moderationDialog.submission.description}
              </p>
              <p className="text-xs text-gray-500 break-all">
                {moderationDialog.submission.url}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Moderation Notes {moderationDialog.action === 'reject' && '(Required)'}
            </label>
            <Textarea
              placeholder={
                moderationDialog.action === 'approve'
                  ? 'Optional notes about the approval...'
                  : 'Please provide a reason for rejection...'
              }
              value={moderationNotes}
              onChange={(e) => setModerationNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModerationDialog({ ...moderationDialog, open: false })}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmModeration}
              disabled={
                moderationMutation.isPending ||
                (moderationDialog.action === 'reject' && !moderationNotes.trim())
              }
              className={
                moderationDialog.action === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {moderationMutation.isPending ? 'Processing...' : 
                moderationDialog.action === 'approve' ? 'Approve' : 'Reject'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
