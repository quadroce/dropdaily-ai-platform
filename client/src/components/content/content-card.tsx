import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DailyDropWithContent } from "@shared/schema";
import { ExternalLink, Bookmark, Share, Clock, Eye, Play, FileText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface ContentCardProps {
  drop: DailyDropWithContent;
}

export function ContentCard({ drop }: ContentCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isBookmarked, setIsBookmarked] = useState(drop.wasBookmarked);

  const viewMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/users/${user?.id}/daily-drops/${drop.contentId}/view`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "daily-drops"] });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/users/${user?.id}/daily-drops/${drop.contentId}/bookmark`),
    onSuccess: () => {
      setIsBookmarked(!isBookmarked);
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "daily-drops"] });
      toast({
        title: isBookmarked ? "Bookmark removed" : "Bookmarked",
        description: isBookmarked ? "Content removed from bookmarks" : "Content saved to bookmarks",
      });
    },
  });

  const handleCardClick = () => {
    if (!drop.wasViewed) {
      viewMutation.mutate();
    }
    window.open(drop.content.url, "_blank");
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    bookmarkMutation.mutate();
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: drop.content.title,
        text: drop.content.description || "Check out this content from DropDaily",
        url: drop.content.url,
      });
    } else {
      navigator.clipboard.writeText(drop.content.url);
      toast({
        title: "Link copied",
        description: "Content link copied to clipboard",
      });
    }
  };

  const getSourceIcon = () => {
    switch (drop.content.source) {
      case 'youtube':
        return <Play className="h-5 w-5 text-red-500" />;
      case 'podcast':
        return <i className="fas fa-podcast text-purple-500 text-lg" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSourceLabel = () => {
    const metadata = drop.content.metadata as any;
    if (drop.content.source === 'youtube' && metadata?.channel) {
      return metadata.channel;
    }
    return drop.content.source.charAt(0).toUpperCase() + drop.content.source.slice(1);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <article className="content-card cursor-pointer" onClick={handleCardClick}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getSourceIcon()}
            <div>
              <p className="text-sm font-medium text-gray-900">{getSourceLabel()}</p>
              <p className="text-xs text-gray-500">
                {new Date(drop.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {drop.content.topics.slice(0, 2).map((topic) => (
              <Badge key={topic.id} variant="secondary" className="text-xs">
                {topic.name}
              </Badge>
            ))}
            <div className="match-score">
              <i className="fas fa-robot mr-1"></i>
              <span>{Math.round(drop.matchScore * 100)}% match</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-2 hover:text-primary transition-colors">
              {drop.content.title}
            </h2>
            <p className="text-gray-600 text-sm mb-4 line-clamp-3">
              {drop.content.description}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                {drop.content.duration && (
                  <span className="flex items-center">
                    <Clock className="mr-1 h-4 w-4" />
                    {formatDuration(drop.content.duration)}
                  </span>
                )}
                {drop.content.viewCount && (
                  <span className="flex items-center">
                    <Eye className="mr-1 h-4 w-4" />
                    {drop.content.viewCount.toLocaleString()} views
                  </span>
                )}
                {drop.content.contentType && (
                  <Badge variant="outline" className="text-xs">
                    {drop.content.contentType}
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBookmark}
                  className={`${
                    isBookmarked
                      ? "text-primary hover:text-primary/80"
                      : "text-gray-400 hover:text-primary"
                  } transition-colors`}
                >
                  <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="text-gray-400 hover:text-primary transition-colors"
                >
                  <Share className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="md:col-span-1">
            {drop.content.thumbnailUrl && (
              <img
                src={drop.content.thumbnailUrl}
                alt={drop.content.title}
                className="w-full h-40 object-cover rounded-lg"
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
