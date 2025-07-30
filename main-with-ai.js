// main-with-ai.js - Main process with AI integration
const { app, BrowserWindow, globalShortcut, screen, ipcMain } = require('electron');
const path = require('path');
const { AIService, ClaudeService, GeminiService } = require('./ai-service');
const aiConfig = require('./ai-config');

// Initialize AI service based on provider
let ai;
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

// Disable GPU acceleration to prevent crashes
app.disableHardwareAcceleration();

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
  
  try {
    if (stage === 'question') {
      // Answer the child's question
      console.log('Processing question:', message);
      const response = await ai.answerQuestion(message);
      
      currentConversation.question = message;
      currentConversation.answer = response.answer;
      
      // Log usage for monitoring
      console.log('Token usage:', response.usage);
      
      return {
        message: response.answer,
        stage: 'understanding',
        usage: response.usage
      };
      
    } else if (stage === 'understanding') {
      // Evaluate their understanding
      console.log('Evaluating understanding:', message);
      const evaluation = await ai.evaluateUnderstanding(
        currentConversation.question,
        currentConversation.answer,
        message
      );
      
      if (evaluation.understood) {
        return {
          message: evaluation.feedback + " Great job! You can unlock your computer now.",
          stage: 'complete'
        };
      } else {
        return {
          message: evaluation.feedback + " " + (evaluation.suggestion || "Can you try explaining it differently?"),
          stage: 'understanding',
          retry: true
        };
      }
    }
  } catch (error) {
    console.error('AI Error:', error);
    
    // Fallback behavior - allow unlock after error
    return {
      message: "I'm having trouble connecting right now, but good effort! You can unlock your computer.",
      stage: 'complete',
      error: true
    };
  }
});

app.whenReady().then(() => {
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