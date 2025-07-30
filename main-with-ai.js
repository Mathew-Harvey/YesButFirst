// main-with-ai.js - Main process with AI integration
const { app, BrowserWindow, globalShortcut, screen, ipcMain } = require('electron');

// Disable GPU acceleration to prevent crashes (must be before app.whenReady)
if (app && typeof app.disableHardwareAcceleration === 'function') {
  app.disableHardwareAcceleration();
}

const path = require('path');
const { AIService, ClaudeService, GeminiService } = require('./ai-service');
const aiConfig = require('./ai-config');
const DatabaseService = require('./database');
const QuestionGenerator = require('./question-generator');
const ConversationTracker = require('./conversation-tracker');

// Initialize AI service, database, question generator, and conversation tracker
let ai;
let db;
let questionGenerator;
let conversationTracker;
let childAge = process.env.CHILD_AGE || null; // Load child age from environment (fallback)
const apiKey = aiConfig.apiKeys[aiConfig.provider];
const config = aiConfig.models[aiConfig.provider];

switch (aiConfig.provider) {
  case 'openai':
    ai = new AIService(apiKey, config);
    break;
  case 'claude':
    ai = new ClaudeService(apiKey, config);
    break;
  case 'gemini':
    ai = new GeminiService(apiKey, config);
    break;
  default:
    throw new Error(`Unsupported provider: ${aiConfig.provider}`);
}

let mainWindow;
let isUnlocked = false;
let currentConversation = {
  question: null,
  answer: null,
  stage: 'question'
};

function createWindow() {
  // Get primary display
  const primaryDisplay = screen.getPrimaryDisplay();
  
  // Create main window
  mainWindow = new BrowserWindow({
    x: primaryDisplay.bounds.x,
    y: primaryDisplay.bounds.y,
    width: primaryDisplay.bounds.width,
    height: primaryDisplay.bounds.height,
    fullscreen: true,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: false
    }
  });

  // Load the chat interface
  mainWindow.loadFile('chat.html');
  
  // Prevent window from being closed
  mainWindow.on('close', (e) => {
    if (!isUnlocked) {
      e.preventDefault();
    }
  });

  // Block right-click context menu
  mainWindow.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });
}

// Handle AI message processing
ipcMain.handle('process-message', async (event, data) => {
  const { message, stage, conversation } = data;
  
  console.log('🔍 PROCESSING MESSAGE:', { message, stage, conversationLength: conversation.length });
  console.log('🔍 CURRENT CONVERSATION STATE:', currentConversation);
  
  try {
    if (stage === 'question') {
      // Answer the child's question
      console.log('Processing question:', message);
      
      // Determine if this is the first response 
      // First response = no conversation history at all
      const isFirstResponse = conversation.length === 0;
      
      // Get child's interests for context
      let childInterests = [];
      if (db) {
        try {
          childInterests = db.getSelectedInterests();
        } catch (error) {
          console.error('Error getting child interests:', error);
        }
      }
      
      console.log('Making AI call with:', {
        question: message,
        childAge,
        isFirstResponse,
        conversationLength: conversation.length,
        interests: childInterests.length,
        historyLength: conversation.length
      });

      const response = await ai.answerQuestion(
        message, 
        childAge, 
        isFirstResponse, 
        conversation.length,
        childInterests,
        conversation // Pass history
      );
      
      // Check if it was a nonsensical question
      if (response.isNonsense) {
        // Don't change stage for nonsense questions
        return {
          message: response.answer,
          stage: 'question',
          usage: response.usage
        };
      }
      
      currentConversation.question = message;
      currentConversation.answer = response.answer;
      
      // Log usage for monitoring
      console.log('Token usage:', response.usage);
      console.log('Response type:', isFirstResponse ? 'First (punchy)' : 'Continued');
      
      return {
        message: response.answer,
        stage: 'understanding',
        usage: response.usage
      };
      
    } else if (stage === 'understanding') {
      // Check if this looks like a new question rather than showing understanding
      // Be EXTREMELY conservative - only treat as new question if it clearly is one AND the child explicitly signals it's a new topic
      const lowerMessage = message.toLowerCase().trim();
      const hasQuestionMark = message.includes('?');
      const startsWithQuestionWord = (lowerMessage.startsWith('what ') ||
                                     lowerMessage.startsWith('how ') ||
                                     lowerMessage.startsWith('why ') ||
                                     lowerMessage.startsWith('when ') ||
                                     lowerMessage.startsWith('where ') ||
                                     lowerMessage.startsWith('who '));
      
      // Only treat as new question if it has a question mark AND starts with a question word
      // This prevents answers like "do humans move really fast" from being treated as new questions
      const isNewQuestion = hasQuestionMark && startsWithQuestionWord;
      
      if (isNewQuestion) {
        // They're asking a new question - treat as fresh question (not follow-up)
        console.log('NEW QUESTION DETECTED while in understanding stage:', message);
        
        // RESET conversation state for new question
        currentConversation = {};
        
        // Get child's interests for context
        let childInterests = [];
        if (db) {
          try {
            childInterests = db.getSelectedInterests();
          } catch (error) {
            console.error('Error getting child interests:', error);
          }
        }
        
        console.log('Making AI call with:', {
          question: message,
          childAge,
          isFirstResponse: true,
          conversationLength: conversation.length,
          interests: childInterests.length,
          historyLength: conversation.length
        });

        const response = await ai.answerQuestion(
          message, 
          childAge, 
          true,
          0,
          childInterests,
          conversation // Pass history
        );
        
        // Check if it was a nonsensical question
        if (response.isNonsense) {
          // Don't change stage for nonsense questions
          return {
            message: response.answer,
            stage: 'question',
            usage: response.usage
          };
        }
        
        currentConversation.question = message;
        currentConversation.answer = response.answer;
        
        console.log('Token usage:', response.usage);
        console.log('Response type: New Question (punchy)');
        
        return {
          message: response.answer,
          stage: 'understanding',
          usage: response.usage
        };
        
      } else {
        // Evaluate their understanding of the previous answer
        console.log('Evaluating understanding:', message);
        console.log('Current conversation context:', {
          originalQuestion: currentConversation.question,
          aiResponse: currentConversation.answer ? currentConversation.answer.substring(0, 100) + '...' : 'None'
        });
        
        // Get child profile for complexity scaling
        let childProfile = { age: childAge, interests: [] };
        if (db) {
          try {
            const profile = db.getChildProfile();
            const interests = db.getSelectedInterests();
            childProfile = {
              age: profile.age || childAge,
              interests: interests
            };
          } catch (error) {
            console.error('Error getting child profile for evaluation:', error);
          }
        }
        
        // Use question generator to assess response complexity and get next level
        let nextLevel = null;
        if (questionGenerator) {
          nextLevel = questionGenerator.getNextQuestionLevel(message, questionGenerator.getAgeGroup(childProfile.age));
        }
        
        // Extract the follow-up question from the AI's response
        const aiResponse = currentConversation.answer || '';
        const followUpQuestion = extractFollowUpQuestion(aiResponse);
        
        console.log('Extracted follow-up question:', followUpQuestion);
        
        // 🐛 BUG FIX: Add comprehensive error handling and debugging
        let evaluation;
        try {
          console.log('🔍 EVALUATION INPUT:', {
            followUpQuestion,
            originalQuestion: currentConversation.question,
            aiAnswer: currentConversation.answer?.substring(0, 50) + '...',
            childResponse: message
          });
          
          console.log('Making AI call with:', {
            question: followUpQuestion || currentConversation.question,
            childAge,
            isFirstResponse: false,
            conversationLength: conversation.length,
            interests: childInterests.length,
            historyLength: conversation.length
          });

          evaluation = await ai.evaluateUnderstanding(
            followUpQuestion || currentConversation.question, // Use the follow-up question if found
            currentConversation.answer,
            message,
            conversation // Send full conversation history for context
          );
          
          console.log('✅ EVALUATION RESULT:', evaluation);
        } catch (error) {
          console.error('💥 EVALUATION ERROR:', error);
          console.error('Error details:', error.message, error.stack);
          
          // Fallback: be generous and assume understanding on error
          evaluation = {
            understood: true,
            feedback: "Nice!",
            suggestion: ""
          };
          
          // Reset conversation state to prevent further errors
          currentConversation = {
            question: null,
            answer: null,
            stage: 'question'
          };
        }
        
        if (evaluation.understood) {
          // 🎉 CHILD UNDERSTOOD - UNLOCK IMMEDIATELY
          console.log('🎉 Child understood! Unlocking computer NOW!');
          
          // Send unlock event to renderer
          event.reply('unlock-computer');
          
          // Simple, immediate unlock message based on age
          const ageGroup = ai.getAgeGroup(childAge);
          let unlockMessage;
          
          if (ageGroup === 'young') {
            unlockMessage = "Great job! 🎉 Computer unlocked!";
          } else if (ageGroup === 'middle') {
            unlockMessage = "Nice thinking! 🎉 Computer unlocked!";
          } else {
            unlockMessage = "Well done! 🎉 Access granted!";
          }
          
          // 🔄 RESET conversation state for next question
          currentConversation = {
            question: null,
            answer: null,
            stage: 'question'
          };
          
          return {
            message: unlockMessage,
            stage: 'complete',
            unlock: true // Signal to UI that computer should unlock
          };
        } else {
          // ❌ CHILD NEEDS MORE HELP
          console.log('❌ Child needs more help, retrying...');
          
          // Provide appropriate hint based on complexity assessment
          let suggestion = evaluation.suggestion || "Try again?";
          if (nextLevel) {
            suggestion = nextLevel.nextQuestion || suggestion;
          }
          
          return {
            message: evaluation.feedback + " " + suggestion,
            stage: 'understanding',
            retry: true
          };
        }
      }
    }
  } catch (error) {
    console.error('💥 CRITICAL AI ERROR:', error);
    console.error('Error stack:', error.stack);
    console.error('Failed input:', { message, stage, conversation });
    
    // RESET state
    currentConversation = {
      question: null,
      answer: null,
      stage: 'question'
    };
    
    return {
      message: "Sorry, I'm having trouble connecting right now. Try asking in a different way or check your internet! 📡",
      stage: 'question',
      error: true
    };
  }
});

app.whenReady().then(async () => {
  // Initialize database and question generator
  try {
    db = new DatabaseService();
    await db.initializeDatabase(); // Wait for async initialization
    console.log('✓ Database initialized');
    
    questionGenerator = new QuestionGenerator();
    console.log('✓ Question generator initialized');
    
    conversationTracker = new ConversationTracker(db);
    console.log('✓ Conversation tracker initialized');
    
    // Load child profile from database
    const profile = db.getChildProfile();
    if (profile && profile.age) {
      childAge = profile.age;
      console.log(`Child age loaded from database: ${childAge}`);
    }
  } catch (error) {
    console.error('✗ Database initialization failed:', error);
  }

  createWindow();

  // Emergency exit shortcut
  const emergencyShortcut = process.platform === 'win32' ? 'Ctrl+Shift+Q' : 'CommandOrControl+Shift+Q';
  const success = globalShortcut.register(emergencyShortcut, () => {
    console.log('Emergency exit triggered');
    isUnlocked = true;
    app.quit();
  });
  
  if (success) {
    console.log(`✓ Emergency exit shortcut registered: ${emergencyShortcut}`);
  } else {
    console.error(`✗ Failed to register emergency exit shortcut: ${emergencyShortcut}`);
  }

  // Block common shortcuts (but not the emergency exit)
  const shortcuts = ['Alt+F4', 'Alt+Tab', 'CommandOrControl+W'];
  shortcuts.forEach(shortcut => {
    try {
      const success = globalShortcut.register(shortcut, () => {
        console.log(`Blocked: ${shortcut}`);
      });
      if (success) {
        console.log(`✓ Blocked shortcut: ${shortcut}`);
      } else {
        console.error(`✗ Failed to block shortcut: ${shortcut}`);
      }
    } catch (error) {
      console.error(`Failed to register ${shortcut}:`, error);
    }
  });

  // Log AI service status
  console.log('YesButFirst started with AI provider:', aiConfig.provider);
  console.log('Testing AI connection...');
  console.log('Emergency exit: Press Ctrl+Shift+Q to exit');
  
  ai.testConnection().then(result => {
    if (result.success) {
      console.log('✓ AI connection successful');
    } else {
      console.error('✗ AI connection failed:', result.error);
    }
  });
});

// Parent Settings IPC Handlers
ipcMain.handle('verify-parent-pin', async (event, pin) => {
  try {
    return db ? db.verifyPin(pin) : false;
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return false;
  }
});

ipcMain.handle('get-child-profile', async (event) => {
  try {
    return db ? db.getChildProfile() : { age: null, gender: null };
  } catch (error) {
    console.error('Error getting child profile:', error);
    return { age: null, gender: null };
  }
});

ipcMain.handle('update-child-profile', async (event, profile) => {
  try {
    if (db) {
      const result = db.updateChildProfile(profile.age, profile.gender);
      // Update childAge for AI interactions
      childAge = profile.age;
      console.log('Child profile updated:', profile);
      return result;
    }
    return false;
  } catch (error) {
    console.error('Error updating child profile:', error);
    return false;
  }
});

ipcMain.handle('get-all-interests', async (event) => {
  try {
    return db ? db.getAllInterests() : [];
  } catch (error) {
    console.error('Error getting interests:', error);
    return [];
  }
});

ipcMain.handle('update-interests', async (event, interests) => {
  try {
    if (db) {
      interests.forEach(interest => {
        db.updateInterest(interest.id, interest.selected);
      });
      console.log('Interests updated');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating interests:', error);
    return false;
  }
});

ipcMain.handle('update-parent-pin', async (event, newPin) => {
  try {
    if (db) {
      const result = db.updatePin(newPin);
      console.log('PIN updated successfully');
      return result;
    }
    return false;
  } catch (error) {
    console.error('Error updating PIN:', error);
    return false;
  }
});

ipcMain.handle('get-emergency-unlock-count', async (event) => {
  try {
    return db ? db.getEmergencyUnlockCount() : 0;
  } catch (error) {
    console.error('Error getting emergency unlock count:', error);
    return 0;
  }
});

// Generate personalized example questions
ipcMain.handle('get-example-questions', async (event) => {
  try {
    if (!db || !questionGenerator) {
      return getDefaultExampleQuestions();
    }

    const profile = db.getChildProfile();
    const selectedInterests = db.getSelectedInterests();
    
    const childProfile = {
      age: profile.age,
      gender: profile.gender,
      interests: selectedInterests
    };

    const questions = questionGenerator.generateExampleQuestions(childProfile, 3);
    return questions;
  } catch (error) {
    console.error('Error generating example questions:', error);
    return getDefaultExampleQuestions();
  }
});

// Helper function for default questions
function getDefaultExampleQuestions() {
  return [
    "Why is the sky blue?",
    "How does the internet work?", 
    "What causes rainbows?"
  ];
}

// Helper function to extract follow-up question from AI response
function extractFollowUpQuestion(aiResponse) {
  if (!aiResponse || typeof aiResponse !== 'string') return null;
  
  try {
    // 🔍 Enhanced extraction logic
    // First, look for explicit question at the end
    const questionRegex = /[.!]*\s*([^.!]*\?)\s*$/;
    const match = aiResponse.match(questionRegex);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Fallback: find any question in the response
    const allQuestions = aiResponse.match(/[^.!?]*\?/g);
    if (allQuestions && allQuestions.length > 0) {
      // Return the last question found
      return allQuestions[allQuestions.length - 1].trim();
    }
    
    console.log('⚠️ No follow-up question found in AI response');
    return null;
  } catch (error) {
    console.error('💥 Error extracting follow-up question:', error);
    return null;
  }
}

ipcMain.handle('emergency-unlock', async (event) => {
  try {
    console.log('Emergency unlock triggered from parent menu');
    
    // Log the emergency unlock
    if (db) {
      db.logEmergencyUnlock();
    }
    
    isUnlocked = true;
    
    // Unregister shortcuts
    try {
      globalShortcut.unregisterAll();
      console.log('Shortcuts unregistered');
    } catch (error) {
      console.error('Error unregistering shortcuts:', error);
    }
    
    // Force destroy window
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log('Destroying window...');
      mainWindow.destroy();
    }
    
    // Log final usage stats
    try {
      const stats = ai.getUsageStats();
      console.log('Session stats:', stats);
    } catch (error) {
      console.error('Error getting stats:', error);
    }
    
    // Quit app
    console.log('Emergency quit triggered...');
    app.quit();
    
    return true;
  } catch (error) {
    console.error('Emergency unlock error:', error);
    return false;
  }
});

// Handle unlock
ipcMain.on('unlock-app', () => {
  console.log('Unlock triggered!');
  
  isUnlocked = true;
  
  // Unregister shortcuts first
  try {
    globalShortcut.unregisterAll();
    console.log('Shortcuts unregistered');
  } catch (error) {
    console.error('Error unregistering shortcuts:', error);
  }
  
  // Force destroy window to bypass close event
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log('Destroying window...');
    mainWindow.destroy();
  }
  
  // Log final usage stats after cleanup
  try {
    const stats = ai.getUsageStats();
    console.log('Session stats:', stats);
  } catch (error) {
    console.error('Error getting stats:', error);
  }
  
  // Quit app
  console.log('Quitting app...');
  app.quit();
});

// Cleanup
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  
  // Close database connection
  if (db) {
    try {
      db.close();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }
});

app.on('window-all-closed', () => {
  if (isUnlocked || process.platform === 'darwin') {
    app.quit();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}