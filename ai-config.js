require('dotenv').config();
// ai-config.js - AI Configuration for YesButFirst
module.exports = {
    // Choose your LLM provider
    provider: process.env.AI_PROVIDER || 'openai', // 'openai', 'claude', 'gemini'
    
    // API Keys (store these securely in production!)
    // For development, you can use environment variables
    apiKeys: {
      openai: process.env.OPENAI_API_KEY || 'your-openai-api-key-here',
      claude: process.env.CLAUDE_API_KEY || 'your-claude-api-key-here',
      gemini: process.env.GEMINI_API_KEY || 'your-gemini-api-key-here'
    },
    
    // Model configuration
    models: {
      openai: {
        model: 'gpt-3.5-turbo', // or 'gpt-4' for better quality but higher cost
        maxTokens: 500,
        temperature: 0.7
      },
      claude: {
        model: 'claude-3-haiku-20240307', // cheapest Claude model
        maxTokens: 500,
        temperature: 0.7
      },
      gemini: {
        model: 'gemini-1.5-flash',
        maxTokens: 500,
        temperature: 0.7
      }
    },
    
    // App behavior settings
    behavior: {
      maxRetries: 3, // How many times can they retry if they don't understand
      requireUnderstanding: true, // Must show understanding to unlock
      allowSkipAfter: 3, // Allow skip after N failed attempts
      sessionTimeout: 300, // 5 minutes in seconds
      
      // Age ranges for content adaptation
      ageGroups: {
        young: { min: 6, max: 9 },
        middle: { min: 10, max: 13 },
        teen: { min: 14, max: 17 }
      }
    },
    
    // Cost controls
    costControls: {
      maxDailyCost: 10.00, // Maximum daily spend in USD
      maxConversationLength: 10, // Max back-and-forth messages
      warningThreshold: 0.80 // Warn when 80% of daily budget used
    },
    
    // Example questions to suggest if child can't think of one
    exampleQuestions: {
      young: [
        "Why is the sky blue?",
        "How do airplanes fly?",
        "What makes rainbows?",
        "Why do we dream?",
        "How do magnets work?"
      ],
      middle: [
        "How does the internet work?",
        "What causes earthquakes?",
        "Why do we have seasons?",
        "How do vaccines work?",
        "What is DNA?"
      ],
      teen: [
        "What is quantum computing?",
        "How does cryptocurrency work?",
        "What causes climate change?",
        "How does AI learn?",
        "What is dark matter?"
      ]
    },
    
    // Safety filters
    safety: {
      blockTopics: [
        'violence',
        'explicit content',
        'dangerous activities',
        'personal information'
      ],
      redirectMessage: "That's an interesting question, but let's explore something else! How about asking about science, nature, technology, or history?"
    }
  };