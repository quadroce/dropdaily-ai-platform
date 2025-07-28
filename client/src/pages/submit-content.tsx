import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Topic, UserSubmission } from "@shared/schema";
import { ExternalLink, Info, Plus, Clock, CheckCircle, XCircle } from "lucide-react";

const submitContentSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().max(1000, "Description is too long").optional(),
  suggestedTopics: z.array(z.string()).min(1, "Please select at least one topic"),
});

type SubmitContentForm = z.infer<typeof submitContentSchema>;

export default function SubmitContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SubmitContentForm>({
    resolver: zodResolver(submitContentSchema),
    defaultValues: {
      url: "",
      title: "",
      description: "",
      suggestedTopics: [],
    },
  });

  const { data: topics, isLoading: topicsLoading } = useQuery<Topic[]>({
    queryKey: ["/api/topics"],
  });

  const { data: userSubmissions, isLoading: submissionsLoading } = useQuery<UserSubmission[]>({
    queryKey: ["/api/users", user?.id, "submissions"],
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: (data: SubmitContentForm) =>
      apiRequest("POST", `/api/users/${user?.id}/submissions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "submissions"] });
      form.reset();
      toast({
        title: "Content submitted",
        description: "Your content has been submitted for review. We'll notify you once it's approved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SubmitContentForm) => {
    submitMutation.mutate(data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="space-y-8">
        {/* Submit Content Form */}
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="flex items-center">
              <Plus className="mr-2 h-5 w-5" />
              Submit Content
            </CardTitle>
            <CardDescription>
              Share valuable content with the DropDaily community
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/article"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        YouTube videos, blog posts, articles, and other educational content
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter a descriptive title"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide a brief description of the content and why it's valuable..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="suggestedTopics"
                  render={() => (
                    <FormItem>
                      <FormLabel>Suggested Topics</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {topicsLoading ? (
                          <div className="col-span-full">Loading topics...</div>
                        ) : (
                          topics?.map((topic) => (
                            <FormField
                              key={topic.id}
                              control={form.control}
                              name="suggestedTopics"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(topic.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, topic.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== topic.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal cursor-pointer">
                                    {topic.name}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Content Guidelines */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium text-blue-800">Content Guidelines</h3>
                        <ul className="mt-2 text-xs text-blue-700 list-disc pl-5 space-y-1">
                          <li>Submit high-quality, educational content</li>
                          <li>Ensure content is relevant to professional development</li>
                          <li>Avoid promotional or sales-focused material</li>
                          <li>Content will be reviewed before appearing in feeds</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                    disabled={submitMutation.isPending}
                  >
                    Clear Form
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="min-w-[120px]"
                  >
                    {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle>Your Recent Submissions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {submissionsLoading ? (
              <div className="p-6 text-center text-gray-500">Loading submissions...</div>
            ) : userSubmissions && userSubmissions.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {userSubmissions.map((submission) => (
                  <div key={submission.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          {getStatusIcon(submission.status)}
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {submission.title}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          Submitted {new Date(submission.createdAt).toLocaleDateString()}
                        </p>
                        {submission.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {submission.description}
                          </p>
                        )}
                        <a
                          href={submission.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {submission.url}
                        </a>
                      </div>
                      <div className="flex items-center space-x-3 ml-4">
                        {getStatusBadge(submission.status)}
                      </div>
                    </div>
                    {submission.moderationNotes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-xs font-medium text-gray-900 mb-1">Moderator Notes:</p>
                        <p className="text-xs text-gray-700">{submission.moderationNotes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <Plus className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p>No submissions yet</p>
                <p className="text-sm">Submit your first piece of content above!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
