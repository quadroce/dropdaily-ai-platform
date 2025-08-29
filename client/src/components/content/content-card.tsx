import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DailyDropWithContent } from "@shared/schema";
import { ExternalLink, Bookmark, Share, Clock, Play, FileText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface ContentCardProps {
  drop: DailyDropWithContent;
}

export function ContentCard({ drop }: ContentCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- DEBUG: log props at mount / change
  useEffect(() => {
    console.groupCollapsed("[ContentCard] props");
    console.log("drop:", drop);
    console.groupEnd();
  }, [drop]);

  // --- Guard clauses to avoid runtime crashes
  const content = drop?.content;
  const contentId = drop?.contentId;
  const userId = user?.id;

  // If something critical is missing, don't render and log
  const isRenderable = Boolean(
    drop &&
      content &&
      typeof content.title === "string" &&
      typeof drop.createdAt !== "undefined"
  );

  if (!isRenderable) {
    console.warn("[ContentCard] Non-renderable props detected", { drop });
    return null; // or a skeleton component if preferisci
  }

  const [isBookmarked, setIsBookmarked] = useState<boolean>(Boolean(drop.wasBookmarked));

  // Stable query keys for invalidation
  const dailyDropQueryKey = useMemo(
    () => ["/api/users", userId, "daily-drops"] as const,
    [userId]
  );

  // --- Mutations (safe-guarded)
  const viewMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !contentId) {
        console.warn("[ContentCard:view] Missing userId or contentId", { userId, contentId });
        return;
      }
      return apiRequest("POST", `/api/users/${userId}/daily-drops/${contentId}/view`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyDropQueryKey as unknown as any });
    },
    onError: (err) => {
      console.error("[ContentCard:view] mutation error", err);
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !contentId) {
        console.warn("[ContentCard:bookmark] Missing userId or contentId", { userId, contentId });
        throw new Error("Missing user or content id");
      }
      return apiRequest("POST", `/api/users/${userId}/daily-drops/${contentId}/bookmark`);
    },
    onSuccess: () => {
      setIsBookmarked((prev) => !prev);
      queryClient.invalidateQueries({ queryKey: dailyDropQueryKey as unknown as any });
      toast({
        title: isBookmarked ? "Bookmark removed" : "Bookmarked",
        description: isBookmarked ? "Content removed from bookmarks" : "Content saved to bookmarks",
      });
    },
    onError: (err) => {
      console.error("[ContentCard:bookmark] mutation error", err);
      toast({
        title: "Bookmark failed",
        description: "We couldn't update your bookmark. Please try again.",
        variant: "destructive",
      });
    },
  });

  // --- Handlers (defensive)
  const handleCardClick = () => {
    try {
      if (!drop.wasViewed) {
        viewMutation.mutate();
      }
      const url = content?.url;
      if (!url) {
        console.warn("[ContentCard] No URL to open", { content });
        toast({
          title: "No link available",
          description: "This item does not have a valid URL.",
        });
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("[ContentCard] handleCardClick error", err);
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      bookmarkMutation.mutate();
    } catch (err) {
      console.error("[ContentCard] handleBookmark error", err);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const shareUrl = content?.url ?? "";
      const shareTitle = content?.title ?? "DropDaily";
      const shareText = content?.description || "Check out this content from DropDaily";

      if (!shareUrl) {
        toast({
          title: "No link available",
          description: "This item does not have a valid URL.",
        });
        return;
      }

      if (navigator.share) {
        navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } else {
        navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied",
          description: "Content link copied to clipboard",
        });
      }
    } catch (err) {
      console.error("[ContentCard] handleShare error", err);
      toast({
        title: "Share failed",
        description: "We couldn't share this item. Please try again.",
        variant: "destructive",
      });
    }
  };

  // --- Helpers (defensive)
  const getSourceIcon = () => {
    try {
      switch (content?.source) {
        case "youtube":
          return <Play className="h-5 w-5 text-red-500" />;
        case "podcast":
          // If you don't have font-awesome loaded, consider replacing this with a Lucide icon
          return <i className="fas fa-podcast text-purple-500 text-lg" />;
        default:
          return <FileText className="h-5 w-5 text-gray-500" />;
      }
    } catch (err) {
      console.error("[ContentCard] getSourceIcon error", err);
      return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSourceLabel = () => {
    try {
      const metadata = (content?.metadata || {}) as any;

      if (content?.source === "youtube" && metadata?.channel) {
        return metadata.channel;
      }

      if (metadata?.feedName) {
        return metadata.feedName;
      }

      if (content?.url) {
        try {
          const urlObj = new URL(content.url);
          const domain = urlObj.hostname.replace("www.", "");

          const domainMap: Record<string, string> = {
            "techcrunch.com": "TechCrunch",
            "theverge.com": "The Verge",
            "wired.com": "Wired",
            "arstechnica.com": "Ars Technica",
            "engadget.com": "Engadget",
            "fastcompany.com": "Fast Company",
            "venturebeat.com": "VentureBeat",
            "hackernews.com": "Hacker News",
            "zdnet.com": "ZDNet",
            "cnet.com": "CNET",
            "gizmodo.com": "Gizmodo",
            "mashable.com": "Mashable",
            "recode.net": "Recode",
            "medium.com": "Medium",
            "substack.com": "Substack",
          };

          return domainMap[domain] || domain.split(".")[0] || "Web";
        } catch {
          return "Web Article";
        }
      }

      if (content?.source) {
        return content.source.charAt(0).toUpperCase() + content.source.slice(1);
      }
    } catch (err) {
      console.error("[ContentCard] getSourceLabel error", err);
    }
    return "Content";
  };

  const formatDuration = (minutes?: number | null) => {
    if (!minutes && minutes !== 0) return null;
    if (Number.isNaN(minutes)) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const createdAtLabel = useMemo(() => {
    try {
      return new Date(drop.createdAt).toLocaleDateString();
    } catch {
      return "";
    }
  }, [drop.createdAt]);

  const durationLabel = formatDuration(content?.duration);

  return (
    <article className="content-card cursor-pointer" onClick={handleCardClick}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getSourceIcon()}
            <div>
              <p className="text-sm font-medium text-gray-900">{getSourceLabel()}</p>
              {createdAtLabel && (
                <p className="text-xs text-gray-500">{createdAtLabel}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {(content?.topics ?? []).slice(0, 2).map((topic) => (
              <Badge key={topic.id} variant="secondary" className="text-xs">
                {topic.name}
              </Badge>
            ))}
            {typeof drop.matchScore === "number" && !Number.isNaN(drop.matchScore) && (
              <div className="match-score flex items-center text-sm text-gray-600">
                <i className="fas fa-robot mr-1" />
                <span>{Math.round(drop.matchScore * 100)}% match</span>
              </div>
            )}
          </div>
        </div>

        {/* Content Layout with Image on Right */}
        <div className="flex gap-6">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-2 hover:text-primary transition-colors">
              {content?.title ?? "Untitled"}
            </h2>
            {content?.description && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {content.description}
              </p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                {!!durationLabel && (
                  <span className="flex items-center">
                    <Clock className="mr-1 h-4 w-4" />
                    {durationLabel}
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
              src={
                content?.imageUrl ||
                content?.thumbnailUrl ||
                "/fallback-article.svg"
              }
              alt={content?.title ?? "Content image"}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                img.onerror = null; // prevent loop
                img.src = "/fallback-article.svg";
              }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
