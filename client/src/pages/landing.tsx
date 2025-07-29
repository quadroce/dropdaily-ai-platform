import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Target, Clock, Brain, TrendingUp, Users } from "lucide-react";
import { Link } from "wouter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DD</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">DropDaily</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-gray-600 dark:text-gray-300">
                  Accedi
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Inizia Gratis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Zap className="w-4 h-4 mr-2" />
            Alimentato da AI
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            La tua dose quotidiana di
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> contenuti tech</span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            DropDaily usa l'intelligenza artificiale per selezionare e consegnarti ogni giorno 1-3 contenuti perfettamente
            allineati ai tuoi interessi professionali. Niente spam, solo quello che conta davvero.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/auth/register">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-3 text-lg">
                <Brain className="w-5 h-5 mr-2" />
                Inizia Subito - Gratis
              </Button>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400">Configurazione in 2 minuti</p>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">333+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Articoli Classificati</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">25</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Fonti Premium</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">1-3</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Contenuti Giornalieri</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
            Come funziona DropDaily
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-center mb-12 max-w-2xl mx-auto">
            Un processo semplice e potente per trasformare il sovraccarico informativo in apprendimento mirato
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-gray-900 dark:text-white">Personalizzazione AI</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                  Scegli i tuoi topic di interesse da oltre 50 categorie tech. L'AI impara le tue preferenze
                  e affina le raccomandazioni nel tempo.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-gray-900 dark:text-white">Curation Intelligente</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                  Analizziamo centinaia di articoli da fonti premium come TechCrunch, The Verge, Wired 
                  per trovare solo i contenuti più rilevanti.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-pink-500 to-red-500 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-gray-900 dark:text-white">Consegna Quotidiana</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                  Ricevi la tua dose quotidiana direttamente nella dashboard. Massimo 3 contenuti
                  per non sovraccaricarti di informazioni.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Topics Preview */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Oltre 50 Topic Tecnologici
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
            Dai fondamenti dell'AI alle ultime tendenze startup, copriamo tutto l'ecosistema tech
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {[
              "AI/ML", "Product Management", "Startups", "React", "DevOps", 
              "UX/UI Design", "Venture Capital", "Data Science", "TypeScript",
              "Blockchain", "Remote Work", "Cloud Infrastructure", "Fintech"
            ].map((topic) => (
              <Badge key={topic} variant="secondary" className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {topic}
              </Badge>
            ))}
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ...e molti altri topic per ogni professionale tech
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Pronto a rivoluzionare il tuo apprendimento?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Unisciti ai professionali tech che hanno già scelto DropDaily per rimanere aggiornati
            senza perdere tempo prezioso.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/auth/register">
              <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg">
                <TrendingUp className="w-5 h-5 mr-2" />
                Inizia Oggi - Gratis
              </Button>
            </Link>
            <div className="flex items-center text-blue-100 text-sm">
              <Users className="w-4 h-4 mr-2" />
              Setup in 2 minuti • Nessuna carta richiesta
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">DD</span>
              </div>
              <span className="text-white font-semibold">DropDaily</span>
            </div>
            
            <div className="text-sm text-center md:text-right">
              <p>&copy; 2025 DropDaily. Fatto con ❤️ per i professionali tech.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}