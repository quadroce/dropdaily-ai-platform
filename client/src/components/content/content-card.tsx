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
    
    // For YouTube content, show channel name
    if (drop.content.source === 'youtube' && metadata?.channel) {
      return metadata.channel;
    }
    
    // For RSS/web content, show feed name if available
    if (metadata?.feedName) {
      return metadata.feedName;
    }
    
    // Extract domain from URL as fallback
    if (drop.content.url) {
      try {
        const url = new URL(drop.content.url);
        let domain = url.hostname.replace('www.', '');
        
        // Map common domains to friendly names
        const domainMap: Record<string, string> = {
          'techcrunch.com': 'TechCrunch',
          'theverge.com': 'The Verge',
          'wired.com': 'Wired',
          'arstechnica.com': 'Ars Technica',
          'engadget.com': 'Engadget',
          'fastcompany.com': 'Fast Company',
          'venturebeat.com': 'VentureBeat',
          'hackernews.com': 'Hacker News',
          'zdnet.com': 'ZDNet',
          'cnet.com': 'CNET',
          'gizmodo.com': 'Gizmodo',
          'mashable.com': 'Mashable',
          'recode.net': 'Recode',
          'medium.com': 'Medium',
          'substack.com': 'Substack'
        };
        
        return domainMap[domain] || domain.split('.')[0];
      } catch {
        // Fallback if URL parsing fails
        return 'Web Article';
      }
    }
    
    // Default fallback
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

        {/* Content Layout with Image on Right */}
        <div className="flex gap-6">
          <div className="flex-1">
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
          
          {/* Square Image on Right */}
          <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            <img
              src={drop.content.imageUrl || drop.content.thumbnailUrl || "/fallback-article.svg"}
              alt={drop.content.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.src = "/fallback-article.svg";
              }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
