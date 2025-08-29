import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type UserLite = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

type TopicLite = { id: string | number; name: string };

type ContentLite = {
  id?: string | number;
  title?: string | null;
  url?: string | null;
  source?: string | null; // e.g. "rss" | "youtube" ...
  topics?: TopicLite[] | null;
};

type ModerationItem = {
  id?: string | number;
  content?: ContentLite | null;
  submittedBy?: UserLite | null; // <- QUI spesso è undefined/null
  status?: "pending" | "approved" | "rejected" | string;
  createdAt?: string | number | Date | null;
  flagsCount?: number | null;
  notes?: string | null;
};

interface ModerationTableProps {
  items?: ModerationItem[] | null;
  title?: string;
  onApprove?: (item: ModerationItem) => void;
  onReject?: (item: ModerationItem) => void;
}

const safeDisplayName = (u?: UserLite | null) => {
  if (!u) return "Unknown user";
  const name = [u.firstName ?? "", u.lastName ?? ""].filter(Boolean).join(" ").trim();
  return name || u.email || "Unknown user";
};

const safeDate = (d?: string | number | Date | null) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
};

export function ModerationTable({
  items,
  title = "Content Moderation",
  onApprove,
  onReject,
}: ModerationTableProps) {
  // DEBUG: logga sempre i dati in ingresso
  useEffect(() => {
    console.groupCollapsed("[ModerationTable] props");
    console.log("items:", items);
    console.groupEnd();
  }, [items]);

  // Evita crash se items è undefined/null o non è un array
  const rows = useMemo(() => {
    if (!Array.isArray(items)) return [];
    // filtra eventuali null/undefined per sicurezza
    return items.filter(Boolean) as ModerationItem[];
  }, [items]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No items to moderate.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b">
                <tr>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4">Topics</th>
                  <th className="py-2 pr-4">Submitted By</th>
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4">Flags</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-0 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  // Tutto ciò che può essere undefined è opzionale con ?.
                  const c = row?.content;
                  const topics = c?.topics ?? [];
                  const submitter = row?.submittedBy;

                  // DEBUG puntuale per righe “sospette”
                  if (!submitter || submitter?.firstName === undefined) {
                    console.warn("[ModerationTable] Missing submitter or firstName at row", {
                      index: idx,
                      row,
                    });
                  }

                  return (
                    <tr key={(row?.id as string) ?? `row-${idx}`} className="border-b">
                      <td className="py-2 pr-4 align-top">
                        <div className="font-medium">
                          {c?.title ?? "Untitled"}
                        </div>
                        {c?.url ? (
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs underline text-primary break-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {c.url}
                          </a>
                        ) : (
                          <div className="text-xs text-muted-foreground">No URL</div>
                        )}
                      </td>

                      <td className="py-2 pr-4 align-top">
                        <Badge variant="secondary">
                          {(c?.source ?? "unknown").toString()}
                        </Badge>
                      </td>

                      <td className="py-2 pr-4 align-top">
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(topics) ? topics : []).slice(0, 4).map((t) => (
                            <Badge key={t.id} variant="outline">
                              {t.name}
                            </Badge>
                          ))}
                          {Array.isArray(topics) && topics.length > 4 && (
                            <span className="text-xs text-muted-foreground">
                              +{topics.length - 4} more
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2 pr-4 align-top">
                        <div>{safeDisplayName(submitter)}</div>
                        {submitter?.email && (
                          <div className="text-xs text-muted-foreground">{submitter.email}</div>
                        )}
                      </td>

                      <td className="py-2 pr-4 align-top">
                        {safeDate(row?.createdAt)}
                      </td>

                      <td className="py-2 pr-4 align-top">
                        {typeof row?.flagsCount === "number" ? row.flagsCount : 0}
                      </td>

                      <td className="py-2 pr-4 align-top">
                        <Badge
                          variant={
                            row?.status === "approved"
                              ? "default"
                              : row?.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {(row?.status ?? "pending").toString()}
                        </Badge>
                      </td>

                      <td className="py-2 pr-0 align-top">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onApprove) onApprove(row);
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onReject) onReject(row);
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
