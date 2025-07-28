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

  // Group topics into categories
  const professionalTopics = topics.filter(t => 
    ["AI/ML", "Product", "Design", "Engineering", "Business", "Marketing"].includes(t.name)
  );
  
  const specializationTopics = topics.filter(t => 
    ["Mobile Dev", "DevOps", "Security", "Data Science", "Startups", "Leadership"].includes(t.name)
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
        {/* Professional Development Topics */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Professional Development</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {professionalTopics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => toggleTopic(topic.id)}
                className={`topic-card ${
                  selectedTopics.includes(topic.id) ? 'selected' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={getTopicColor(topic.name)}>
                    {getTopicIcon(topic.name)}
                  </span>
                  <span className="font-medium text-gray-900">{topic.name}</span>
                </div>
                {selectedTopics.includes(topic.id) && (
                  <i className="fas fa-check text-primary absolute top-2 right-2 text-sm"></i>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Specializations */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Industries & Specializations</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {specializationTopics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => toggleTopic(topic.id)}
                className={`topic-card ${
                  selectedTopics.includes(topic.id) ? 'selected' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={getTopicColor(topic.name)}>
                    {getTopicIcon(topic.name)}
                  </span>
                  <span className="font-medium text-gray-900">{topic.name}</span>
                </div>
                {selectedTopics.includes(topic.id) && (
                  <i className="fas fa-check text-primary absolute top-2 right-2 text-sm"></i>
                )}
              </button>
            ))}
          </div>
        </div>

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
