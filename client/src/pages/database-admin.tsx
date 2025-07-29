import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Database, Trash2, AlertTriangle, Activity, HardDrive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface StorageStats {
  totalArticles: number;
  sizeByAge: {
    last7Days: number;
    last30Days: number;
    last90Days: number;
    older: number;
  };
  tableSize: string;
  recommendedAction: string;
}

interface CleanupResult {
  deletedCount: number;
  retainedCount: number;
  errors: string[];
}

export default function DatabaseAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  // Query per statistiche storage
  const { data: storageStats, isLoading: statsLoading } = useQuery<StorageStats>({
    queryKey: ['/api/admin/content/storage-stats'],
    refetchInterval: 30000, // Refresh ogni 30 secondi
  });

  // Mutation per cleanup manuale
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/content/cleanup', { 
        method: 'POST' 
      });
      if (!response.ok) throw new Error('Cleanup failed');
      return response.json();
    },
    onSuccess: (data: CleanupResult) => {
      toast({
        title: "Cleanup Completato!",
        description: `${data.deletedCount} articoli eliminati con successo`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content/storage-stats'] });
      setIsCleaningUp(false);
    },
    onError: (error) => {
      toast({
        title: "Errore nel Cleanup",
        description: `Cleanup fallito: ${error.message}`,
        variant: "destructive",
      });
      setIsCleaningUp(false);
    },
  });

  // Mutation per cleanup schedulato
  const scheduleCleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/content/schedule-cleanup', { 
        method: 'POST' 
      });
      if (!response.ok) throw new Error('Scheduled cleanup failed');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cleanup Schedulato",
        description: "Il cleanup automatico è stato eseguito con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content/storage-stats'] });
    },
    onError: (error) => {
      toast({
        title: "Errore nel Cleanup Schedulato",
        description: `Cleanup schedulato fallito: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleManualCleanup = () => {
    setIsCleaningUp(true);
    cleanupMutation.mutate();
  };

  const handleScheduledCleanup = () => {
    scheduleCleanupMutation.mutate();
  };

  const getRecommendationLevel = (recommendation: string) => {
    if (recommendation.includes("urgente")) return "destructive";
    if (recommendation.includes("raccomandato")) return "default";
    return "secondary";
  };

  const getStorageProgressValue = (stats: StorageStats) => {
    const total = stats.totalArticles;
    if (total > 50000) return 100;
    if (total > 20000) return 75;
    if (total > 10000) return 50;
    return 25;
  };

  const getStorageProgressColor = (stats: StorageStats) => {
    const total = stats.totalArticles;
    if (total > 50000) return "bg-red-500";
    if (total > 20000) return "bg-yellow-500";
    if (total > 10000) return "bg-blue-500";
    return "bg-green-500";
  };

  if (statsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Database className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Database Management</h1>
        </div>
        <div className="text-center">Caricamento statistiche...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Database className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Database Management</h1>
      </div>

      {storageStats && (
        <>
          {/* Storage Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Articoli Totali</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{storageStats.totalArticles.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">articoli nel database</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dimensione Tabella</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{storageStats.tableSize}</div>
                <p className="text-xs text-muted-foreground">spazio utilizzato</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Raccomandazione</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Badge variant={getRecommendationLevel(storageStats.recommendedAction)}>
                  {storageStats.recommendedAction}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Storage Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Utilizzo Storage</CardTitle>
              <CardDescription>
                Monitoraggio crescita database e raccomandazioni cleanup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Stato Storage</span>
                  <span>{storageStats.totalArticles.toLocaleString()} / 50.000+ articoli</span>
                </div>
                <Progress 
                  value={getStorageProgressValue(storageStats)} 
                  className="h-2"
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="font-medium">Ultimi 7 giorni</div>
                  <div className="text-2xl font-bold text-green-600">
                    {storageStats.sizeByAge.last7Days.toLocaleString()}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium">Ultimi 30 giorni</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {storageStats.sizeByAge.last30Days.toLocaleString()}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium">Ultimi 90 giorni</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {storageStats.sizeByAge.last90Days.toLocaleString()}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium">Più vecchi</div>
                  <div className="text-2xl font-bold text-red-600">
                    {storageStats.sizeByAge.older.toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cleanup Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Operazioni di Cleanup</CardTitle>
              <CardDescription>
                Gestisci lo spazio del database eliminando contenuti vecchi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {storageStats.recommendedAction.includes("urgente") && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Attenzione:</strong> Il database ha raggiunto dimensioni critiche. 
                    Si raccomanda un cleanup immediato per mantenere le performance ottimali.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Cleanup Manuale</h4>
                  <p className="text-sm text-muted-foreground">
                    Elimina immediatamente i contenuti più vecchi di 90 giorni
                  </p>
                  <Button 
                    onClick={handleManualCleanup}
                    disabled={isCleaningUp || cleanupMutation.isPending}
                    variant={storageStats.recommendedAction.includes("urgente") ? "destructive" : "default"}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isCleaningUp || cleanupMutation.isPending ? "Pulizia in corso..." : "Avvia Cleanup"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Cleanup Intelligente</h4>
                  <p className="text-sm text-muted-foreground">
                    Esegue cleanup solo se necessario, basato su soglie automatiche
                  </p>
                  <Button 
                    onClick={handleScheduledCleanup}
                    disabled={scheduleCleanupMutation.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    {scheduleCleanupMutation.isPending ? "Esecuzione..." : "Cleanup Intelligente"}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Nota:</strong> Il cleanup rimuove articoli più vecchi di 90 giorni mantenendo:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Contenuti salvati nei bookmark degli utenti</li>
                  <li>Articoli con alto engagement</li>
                  <li>Contenuti classificati come importanti</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}