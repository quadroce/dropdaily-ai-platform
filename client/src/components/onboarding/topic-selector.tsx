import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Topic } from "@shared/schema";
import { 
  Brain, 
  Package, 
  Palette, 
  Code, 
  TrendingUp, 
  Megaphone,
  Smartphone,
  Cloud,
  Shield,
  BarChart3,
  Rocket,
  Users
} from "lucide-react";

interface TopicSelectorProps {
  topics: Topic[];
  selectedTopics: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onContinue: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

const topicIcons: Record<string, React.ComponentType<any>> = {
  "AI/ML": Brain,
  "Product": Package,
  "Design": Palette,
  "Engineering": Code,
  "Business": TrendingUp,
  "Marketing": Megaphone,
  "Mobile Dev": Smartphone,
  "DevOps": Cloud,
  "Security": Shield,
  "Data Science": BarChart3,
  "Startups": Rocket,
  "Leadership": Users,
};

export function TopicSelector({
  topics,
  selectedTopics,
  onSelectionChange,
  onContinue,
  onBack,
  isLoading = false
}: TopicSelectorProps) {
  const toggleTopic = (topicId: string) => {
    if (selectedTopics.includes(topicId)) {
      onSelectionChange(selectedTopics.filter(id => id !== topicId));
    } else {
      onSelectionChange([...selectedTopics, topicId]);
    }
  };

  const getTopicIcon = (topicName: string) => {
    const IconComponent = topicIcons[topicName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <Brain className="h-5 w-5" />;
  };

  const getTopicColor = (topicName: string) => {
    const colors: Record<string, string> = {
      "AI/ML": "text-blue-500",
      "Product": "text-green-500",
      "Design": "text-purple-500",
      "Engineering": "text-orange-500",
      "Business": "text-red-500",
      "Marketing": "text-pink-500",
      "Mobile Dev": "text-cyan-500",
      "DevOps": "text-indigo-500",
      "Security": "text-emerald-500",
      "Data Science": "text-violet-500",
      "Startups": "text-yellow-500",
      "Leadership": "text-slate-500",
    };
    return colors[topicName] || "text-gray-500";
  };

  // Organize topics by categories based on their names
  const productDesignTopics = topics.filter(t => 
    t.name.includes('Product') || t.name.includes('UX/UI') || t.name.includes('Design') || 
    t.name.includes('User Research') || t.name.includes('Prototyping') || t.name.includes('Interaction')
  );

  const startupsBusinessTopics = topics.filter(t => 
    t.name.includes('Startup') || t.name.includes('Business') || t.name.includes('Entrepreneur') || 
    t.name.includes('Venture') || t.name.includes('Lean') || t.name.includes('Growth') || t.name.includes('Founder')
  );

  const aiMlTopics = topics.filter(t => 
    t.name.includes('AI') || t.name.includes('ML') || t.name.includes('Machine Learning') || 
    t.name.includes('Data Science') || t.name.includes('Prompt') || t.name.includes('NLP') || 
    t.name.includes('Generative') || t.name.includes('Computer Vision') || t.name.includes('LLM') || t.name.includes('Transformer')
  );

  const engineeringTopics = topics.filter(t => 
    t.name.includes('Engineering') || t.name.includes('DevOps') || t.name.includes('Cloud') || 
    t.name.includes('SRE') || t.name.includes('CI/CD') || t.name.includes('Kubernetes') || 
    t.name.includes('Backend') || t.name.includes('Frontend') || t.name.includes('API')
  );

  const webDevTopics = topics.filter(t => 
    t.name.includes('Web') || t.name.includes('Mobile') || t.name.includes('React') || 
    t.name.includes('TypeScript') || t.name.includes('JavaScript') || t.name.includes('Next.js') || 
    t.name.includes('Flutter') || t.name.includes('iOS') || t.name.includes('Android')
  );

  const techInnovationTopics = topics.filter(t => 
    t.name.includes('Emerging') || t.name.includes('Quantum') || t.name.includes('Edge') || 
    t.name.includes('AR/VR') || t.name.includes('Robotics') || t.name.includes('Wearables')
  );

  const productivityTopics = topics.filter(t => 
    t.name.includes('Productivity') || t.name.includes('Remote') || t.name.includes('Team') || 
    t.name.includes('Knowledge') || t.name.includes('Time') || t.name.includes('Digital Minimalism')
  );

  const careerTopics = topics.filter(t => 
    t.name.includes('Career') || t.name.includes('Interview') || t.name.includes('Hiring') || 
    t.name.includes('Freelancing') || t.name.includes('Portfolio') || t.name.includes('Speaking')
  );

  const cultureFinanceTopics = topics.filter(t => 
    t.name.includes('Tech News') || t.name.includes('Internet') || t.name.includes('Meme') || 
    t.name.includes('Ethical') || t.name.includes('Digital Wellness') || t.name.includes('Fintech') || 
    t.name.includes('Crypto') || t.name.includes('Finance') || t.name.includes('Investing') || t.name.includes('Market')
  );

  // Legacy topics for backwards compatibility
  const legacyTopics = topics.filter(t => 
    ["AI/ML", "Product", "Design", "Engineering", "Business", "Marketing", "Mobile Dev", "DevOps", "Security", "Data Science", "Startups", "Leadership"].includes(t.name)
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Brain className="mx-auto h-12 w-12 text-primary mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Tell us what interests you</h3>
        <p className="text-gray-600">
          Select topics you'd like to see in your daily content drops. Our AI will personalize your feed based on these preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Product & Design */}
        {productDesignTopics.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">🎨 Product & Design</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {productDesignTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`topic-card ${selectedTopics.includes(topic.id) ? 'selected' : ''}`}
                >
                  <span className="font-medium text-gray-900 text-sm">{topic.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Startups & Business */}
        {startupsBusinessTopics.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">🚀 Startups & Business</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {startupsBusinessTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`topic-card ${selectedTopics.includes(topic.id) ? 'selected' : ''}`}
                >
                  <span className="font-medium text-gray-900 text-sm">{topic.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI/ML/Data */}
        {aiMlTopics.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">🤖 AI / ML / Data</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {aiMlTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`topic-card ${selectedTopics.includes(topic.id) ? 'selected' : ''}`}
                >
                  <span className="font-medium text-gray-900 text-sm">{topic.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Engineering & DevOps */}
        {engineeringTopics.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">🛠️ Engineering & DevOps</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {engineeringTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`topic-card ${selectedTopics.includes(topic.id) ? 'selected' : ''}`}
                >
                  <span className="font-medium text-gray-900 text-sm">{topic.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Web & App Development */}
        {webDevTopics.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">💻 Web & App Development</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {webDevTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`topic-card ${selectedTopics.includes(topic.id) ? 'selected' : ''}`}
                >
                  <span className="font-medium text-gray-900 text-sm">{topic.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Technology & Innovation */}
        {techInnovationTopics.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">🧩 Technology & Innovation</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {techInnovationTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`topic-card ${selectedTopics.includes(topic.id) ? 'selected' : ''}`}
                >
                  <span className="font-medium text-gray-900 text-sm">{topic.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Productivity & Work */}
        {productivityTopics.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">📈 Productivity & Work</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {productivityTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`topic-card ${selectedTopics.includes(topic.id) ? 'selected' : ''}`}
                >
                  <span className="font-medium text-gray-900 text-sm">{topic.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Career & Growth */}
        {careerTopics.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">🧠 Career & Growth</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {careerTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`topic-card ${selectedTopics.includes(topic.id) ? 'selected' : ''}`}
                >
                  <span className="font-medium text-gray-900 text-sm">{topic.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Culture & Finance */}
        {cultureFinanceTopics.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">💬 Culture & Finance</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {cultureFinanceTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`topic-card ${selectedTopics.includes(topic.id) ? 'selected' : ''}`}
                >
                  <span className="font-medium text-gray-900 text-sm">{topic.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Legacy Basic Topics */}
        {legacyTopics.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Professional Development</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {legacyTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`topic-card ${selectedTopics.includes(topic.id) ? 'selected' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={getTopicColor(topic.name)}>
                      {getTopicIcon(topic.name)}
                    </span>
                    <span className="font-medium text-gray-900">{topic.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Smart Recommendations Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Brain className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-800">Smart Recommendations</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Our AI learns from your interactions and will automatically discover related topics you might enjoy. 
                  You can always adjust these preferences later.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between pt-6">
          <Button 
            variant="outline" 
            onClick={onBack}
            disabled={isLoading}
          >
            Back
          </Button>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              {selectedTopics.length} topic{selectedTopics.length !== 1 ? 's' : ''} selected
            </div>
            <Button 
              onClick={onContinue}
              disabled={selectedTopics.length === 0 || isLoading}
              className="min-w-[140px]"
            >
              {isLoading ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
