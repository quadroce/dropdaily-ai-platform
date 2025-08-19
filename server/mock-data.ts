// Mock data per demo quando il database non è disponibile
import { DeploymentLogger } from './logger.js';

export const mockUser = {
  id: 'demo-user-123',
  email: 'demo@dropdaily.com',
  name: 'Demo User',
  created_at: new Date('2025-01-01'),
  preferences: ['Technology', 'AI', 'Startup']
};

export const mockDrop = {
  id: 'demo-drop-1',
  user_id: mockUser.id,
  title: 'AI Breakthrough: New Language Model Achieves Human-Level Performance',
  description: 'Researchers have developed a revolutionary AI system that demonstrates unprecedented capabilities in natural language understanding and generation.',
  url: 'https://example.com/ai-breakthrough',
  source: 'TechNews',
  topic: 'Technology',
  created_at: new Date(),
  similarity_score: 0.95,
  clicks: 0
};

export const mockTopics = [
  'Technology', 'AI & Machine Learning', 'Startup', 'Business', 
  'Science', 'Health', 'Finance', 'Education', 'Environment'
];

export function setupMockRoutes(app: any) {
  DeploymentLogger.info('Setting up mock API routes for demo mode');
  
  // Mock authentication
  app.post('/api/auth/login', (req: any, res: any) => {
    DeploymentLogger.info('Mock login request');
    res.json({ 
      user: mockUser,
      message: 'Demo login successful - database not available' 
    });
  });
  
  app.post('/api/auth/register', (req: any, res: any) => {
    DeploymentLogger.info('Mock register request');
    res.json({ 
      user: mockUser,
      message: 'Demo registration - database not available' 
    });
  });
  
  // Mock daily drops
  app.get('/api/users/:userId/daily-drops', (req: any, res: any) => {
    DeploymentLogger.info('Mock daily drops request');
    res.json([mockDrop]);
  });
  
  // Mock preferences
  app.get('/api/users/:userId/preferences', (req: any, res: any) => {
    DeploymentLogger.info('Mock preferences request');
    res.json({ topics: mockUser.preferences });
  });
  
  app.put('/api/users/:userId/preferences', (req: any, res: any) => {
    DeploymentLogger.info('Mock preferences update');
    res.json({ success: true, message: 'Demo mode - preferences not saved' });
  });
  
  // Mock topics
  app.get('/api/topics', (req: any, res: any) => {
    DeploymentLogger.info('Mock topics request');
    res.json(mockTopics.map(name => ({ id: name.toLowerCase(), name })));
  });
  
  DeploymentLogger.startup('Mock routes setup', true);
}