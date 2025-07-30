// ai-service.js - LLM integration for YesButFirst
const axios = require('axios');

class AIService {
  constructor(apiKey, config = {}) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    this.model = config.model || 'gpt-3.5-turbo';
    this.maxTokens = config.maxTokens || 500;
    this.temperature = config.temperature || 0.7;
    
    // Track usage for cost monitoring
    this.usage = {
      totalTokens: 0,
      conversations: 0,
      estimatedCost: 0
    };
  }

  // System prompt that defines the AI's behavior
  getSystemPrompt(lengthInstruction = "Keep answers concise (2-3 paragraphs max)", ageGroup = 'teen', childInterests = []) {
    const ageProfiles = {
      young: { // 5-8 years
        voice: "Be playful, enthusiastic, and use simple words",
        style: "Short sentences, emojis, fun tone 🌟",
        engagement: "Use 'wow!', 'cool!', make it feel like an adventure",
        examples: "Talk about animals, colors, simple science, favorite things",
        questions: "What do you think happens when...? / Can you imagine if...?"
      },
      middle: { // 9-12 years  
        voice: "Be an engaging storyteller and knowledge explorer",
        style: "Moderate complexity, use analogies and real examples",
        engagement: "Share 'Did you know?' facts, connect to their world",
        examples: "Space, inventions, nature mysteries, how things work",
        questions: "How do you think this connects to...? / What would happen if we changed...?"
      },
      teen: { // 13-17 years
        voice: "Be a thoughtful peer having an intelligent discussion", 
        style: "Sophisticated language, respect their maturity",
        engagement: "Real-world connections, thought experiments",
        examples: "Technology, society, future possibilities, complex systems",
        questions: "What implications does this have for...? / How might this challenge...?"
      }
    };

    const profile = ageProfiles[ageGroup] || ageProfiles.teen;
    
    // Generate interest context
    const interestContext = childInterests.length > 0 
      ? `Child's interests: ${childInterests.slice(0, 3).join(', ')}. Connect to these when relevant. `
      : '';

    return `You are an engaging conversationalist helping a ${ageGroup} child (age ${ageGroup === 'young' ? '5-8' : ageGroup === 'middle' ? '9-12' : '13-17'}) learn through curiosity.

${interestContext}

YOUR PERSONALITY:
- ${profile.voice}
- ${profile.style}
- ${profile.engagement}

CONVERSATION GOALS:
1. Answer their question in an age-appropriate, engaging way
2. Spark curiosity with interesting connections or facts
3. End with ONE clear follow-up question that:
   - Relates directly to what you just explained
   - Has a reasonably clear answer (not too abstract)
   - Encourages them to think and respond
   - Shows you're building on the conversation

EXAMPLES OF GOOD FOLLOW-UP QUESTIONS:
- Young: "What do you think would happen if animals could build spaceships too?"
- Middle: "How do you think this technology could help us explore even further?"
- Teen: "What challenges do you think we'd face trying to travel between stars?"

CRITICAL RULES:
- ${lengthInstruction}
- Be enthusiastic and positive
- Use age-appropriate vocabulary
- Make learning feel like discovery, not a lesson
- Your follow-up question should flow naturally from your explanation

Remember: The child will answer your follow-up question next, so make it engaging and connected to what you just discussed!`;
  }

  getQuestionGuidelines(ageGroup) {
    const guidelines = {
      young: `- "What would happen if..." type questions
- Connect to their experiences: "Where else have you seen..."
- Imagination-based: "What do you think it would be like if..."
- Simple cause-effect: "Why do you think..."`,
      
      middle: `- "How do you think this connects to..." 
- Process questions: "What would happen if we changed..."
- Comparison questions: "How is this similar to..."
- "What patterns do you notice..."`,
      
      teen: `- "What implications does this have for..."
- "How might this challenge the idea that..."
- "What assumptions are we making about..."
- "How might someone disagree with this..."`
    };
    
    return guidelines[ageGroup] || guidelines.teen;
  }

  // Evaluate if the child understood the answer
  async evaluateUnderstanding(question, answer, childResponse, fullConversationHistory = []) {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI evaluation timeout')), 10000); // 10 second timeout
    });

    try {
      // Extract the actual follow-up question from the AI's response for better context
      const extractedQuestion = this.extractFollowUpQuestionFromResponse(answer);
      
      // Build conversation context from history
      let conversationContext = '';
      if (fullConversationHistory.length > 0) {
        conversationContext = '\n\nFULL CONVERSATION HISTORY:\n' + 
          fullConversationHistory.map((turn, i) => 
            `${i + 1}. Child: "${turn.user}"\n   AI: "${turn.ai}"`
          ).join('\n') + '\n';
      }
      
      const prompt = `EVALUATION CONTEXT:\nOriginal question: "${question}"\nYour full response: "${answer}"\nYour follow-up question was: "${extractedQuestion || 'Could not extract question'}"\nChild's response: "${childResponse}"${conversationContext}\n\nTASK: Evaluate if the child engaged meaningfully with your follow-up question.\n\nIMPORTANT: The child's response should be evaluated as an answer to YOUR FOLLOW-UP QUESTION, not as a new question.\n\nEXAMPLE: If you asked "What would you ask plants?" and child responds "do humans move really fast", that's a PERFECT answer (they're saying they'd ask plants about how humans move fast).\n\nALWAYS be generous - if it's even remotely related, say yes.`;

      const apiCall = axios.post(this.apiUrl, {
        model: this.model,
        messages: [
          { role: 'system', content: 'ALWAYS say understood:true unless complete gibberish. ANY attempt = success! Keep feedback to 1-2 words. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Lower temperature for consistent evaluation
        max_tokens: 150
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 8000 // 8 second axios timeout
      });

      const response = await Promise.race([apiCall, timeoutPromise]);
      const result = response.data.choices[0].message.content;
      
      // Safer JSON parsing
      try {
        return JSON.parse(result);
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        throw parseError;
      }
    } catch (error) {
      console.error('Error evaluating understanding:', error);
      // Default to allowing unlock on any error (timeout, network, parsing, etc.)
      return {
        understood: true,
        feedback: "Good effort! You can unlock your computer now.",
        suggestion: null
      };
    }
  }

  // Helper to determine age group (updated for new ranges)
  getAgeGroup(childAge) {
    if (!childAge) return 'teen'; // Default
    
    const age = parseInt(childAge);
    if (age >= 5 && age <= 8) return 'young';
    if (age >= 9 && age <= 12) return 'middle';
    if (age >= 13 && age <= 17) return 'teen';
    
    // Handle edge cases
    if (age < 5) return 'young';
    if (age > 17) return 'teen';
    
    return 'teen'; // Final fallback
  }
  
  // Helper to extract follow-up question from AI response
  extractFollowUpQuestionFromResponse(response) {
    if (!response) return null;
    
    // Look for question at the end of response
    const questionMatch = response.match(/([^.!]*\?)\s*$/);
    if (questionMatch) return questionMatch[1].trim();
    
    // Look for any question in the response
    const allQuestions = response.match(/[^.!?]*\?/g);
    if (allQuestions && allQuestions.length > 0) {
      return allQuestions[allQuestions.length - 1].trim();
    }
    
    return null;
  }

  // Check if a question is nonsensical
  isNonsensicalQuestion(question) {
    if (!question || question.trim().length < 3) return true; // Shorter length

    const nonsensePatterns = [
      /^[^a-zA-Z]*$/,           // No letters
      /^(.)\1{3,}$/,            // Repeated characters
      /^[a-z]{5,}$/i,           // Shorter random letters (was 15)
      /^[\d\s]+$/,              // Numbers and spaces
      /^[!@#$%^&*()]+$/,        // Special chars
      /^(asdf|qwer|zxcv|poiuy|lkjh|test|random|blah|foo)/i, // More patterns
      /^(aaa|bbb|ccc|ddd|eee|fff|ggg|hhh|iii|jjj|kkk|lll|mmm|nnn|ooo|ppp|qqq|rrr|sss|ttt|uuu|vvv|www|xxx|yyy|zzz)/i, // Letter repetitions
      /^test$/i,
      /^(hi|hello|hey|yo|sup)$/i, // Greetings
      /^let me in$/i, // Specific from bug
      /^this is broken$/i // Specific from bug
    ];

    return nonsensePatterns.some(pattern => pattern.test(question.trim()));
  }

  // Answer a child's question
  async answerQuestion(question, childAge = null, isFirstResponse = true, conversationLength = 0, childInterests = [], fullConversationHistory = []) {
    try {
      // Check for nonsensical questions first
      if (this.isNonsensicalQuestion(question)) {
        return {
          answer: "Please ask a real question to unlock your computer! 🤔 Try something like: How do airplanes fly? Why is the sky blue? How do computers work?",
          usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
          isNonsense: true
        };
      }
      
      const ageContext = childAge ? `The child is ${childAge} years old. ` : '';
      
      // Determine response length settings
      const ageGroup = this.getAgeGroup(childAge);
      const aiConfig = require('./ai-config');
      const responseType = isFirstResponse ? 'first' : 'continued';
      const lengthSettings = aiConfig.behavior.responseLength[responseType][ageGroup];
      
      // Build conversation context
      let conversationContext = '';
      if (fullConversationHistory.length > 0) {
        conversationContext = 'FULL CONVERSATION HISTORY:\n' + 
          fullConversationHistory.map((turn, i) => 
            `${i + 1}. Child: "${turn.user}"\n   AI: "${turn.ai}"`
          ).join('\n') + '\n\n';
      }

      const messages = [
        { role: 'system', content: this.getSystemPrompt(lengthSettings.instruction, ageGroup, childInterests) },
        { role: 'user', content: `${conversationContext}${ageContext}Question: ${question}` }
      ];

      // Implement retry logic
      const maxRetries = 3;
      let lastError;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await axios.post(this.apiUrl, {
            model: this.model,
            messages: messages,
            temperature: this.temperature,
            max_tokens: lengthSettings.maxTokens
          }, {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          });

          const answer = response.data.choices[0].message.content.trim();

          return {
            answer,
            usage: {
              totalTokens: response.data.usage.total_tokens,
              promptTokens: response.data.usage.prompt_tokens,
              completionTokens: response.data.usage.completion_tokens,
              estimatedCost: this.calculateCost(response.data.usage)
            }
          };
        } catch (error) {
          lastError = error;
          console.error(`AI request failed (attempt ${attempt}/${maxRetries}):`, error.message);
          if (attempt === maxRetries) throw lastError;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }
      }
    } catch (error) {
      console.error('Error getting answer:', error);
      throw new Error('Failed to get answer from AI');
    }
  }

  // Calculate cost based on token usage
  calculateCost(usage) {
    // For Gemini, we might not have detailed token breakdown
    if (usage.total_tokens && usage.prompt_tokens && usage.completion_tokens) {
      // OpenAI-style detailed usage
      const inputCost = (usage.prompt_tokens / 1000) * 0.0005;
      const outputCost = (usage.completion_tokens / 1000) * 0.0015;
      return inputCost + outputCost;
    } else if (usage.total_tokens) {
      // Simplified calculation for providers without detailed breakdown
      // Gemini is very cheap, approximately $0.00002 per 1K tokens
      return (usage.total_tokens / 1000) * 0.00002;
    } else {
      return 0; // Fallback
    }
  }

  // Update usage statistics
  updateUsage(usage) {
    if (usage.total_tokens) {
      this.usage.totalTokens += usage.total_tokens;
    }
    this.usage.conversations += 1;
    this.usage.estimatedCost += this.calculateCost(usage);
  }

  // Get usage statistics
  getUsageStats() {
    return {
      ...this.usage,
      averageTokensPerConversation: this.usage.totalTokens / this.usage.conversations || 0,
      costPerConversation: this.usage.estimatedCost / this.usage.conversations || 0
    };
  }

  // Test the connection
  async testConnection() {
    try {
      const response = await this.answerQuestion("What is 2+2?");
      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// For other LLM providers (Claude, Gemini), extend this class:
class ClaudeService extends AIService {
  constructor(apiKey, config = {}) {
    super(apiKey, config);
    this.apiUrl = 'https://api.anthropic.com/v1/messages';
    this.model = config.model || 'claude-3-haiku-20240307';
  }
  
  // Override methods as needed for Claude's API format
}

class GeminiService extends AIService {
  constructor(apiKey, config = {}) {
    super(apiKey, config);
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';
    this.model = config.model || 'gemini-1.5-flash';
  }

  // Override the answerQuestion method for Gemini's API format
  async answerQuestion(question, childAge = null, isFirstResponse = true, conversationLength = 0) {
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const ageContext = childAge ? `The child is ${childAge} years old. ` : '';
        
        // Determine response length settings
        const ageGroup = this.getAgeGroup(childAge);
        const aiConfig = require('./ai-config');
        const responseType = isFirstResponse ? 'first' : 'continued';
        const lengthSettings = aiConfig.behavior.responseLength[responseType][ageGroup];
        
        const response = await axios.post(`${this.apiUrl}?key=${this.apiKey}`, {
          contents: [{
            parts: [{
              text: `${this.getSystemPrompt(lengthSettings.instruction, ageGroup)}\n\n${ageContext}Question: ${question}`
            }]
          }],
          generationConfig: {
            temperature: this.temperature,
            maxOutputTokens: lengthSettings.maxTokens
          }
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        });

        const answer = response.data.candidates[0].content.parts[0].text;
        
        // Gemini doesn't provide detailed usage stats like OpenAI
        const estimatedTokens = Math.ceil((question.length + answer.length) / 4);
        
        const usage = { total_tokens: estimatedTokens };
        this.updateUsage(usage);
        
        return {
          answer,
          usage: {
            tokens: estimatedTokens,
            estimatedCost: this.calculateCost(usage)
          }
        };
      } catch (error) {
        lastError = error;
        console.error(`Gemini API attempt ${attempt} failed:`, error.message);
        
        // If it's a 503 error, wait before retrying
        if (error.response && error.response.status === 503) {
          if (attempt < maxRetries) {
            console.log(`Waiting ${attempt * 2} seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            continue;
          }
        }
        
        // For other errors, don't retry
        if (attempt === maxRetries) {
          console.error('All retry attempts failed for Gemini API');
          throw new Error('Failed to get answer from AI');
        }
      }
    }
    
    // If all retries failed, provide a fallback response
    console.error('Gemini API is unavailable, using fallback response');
    const fallbackAnswer = this.getFallbackAnswer(question);
    const estimatedTokens = Math.ceil((question.length + fallbackAnswer.length) / 4);
    
    const usage = { total_tokens: estimatedTokens };
    this.updateUsage(usage);
    
    return {
      answer: fallbackAnswer,
      usage: {
        tokens: estimatedTokens,
        estimatedCost: this.calculateCost(usage)
      }
    };
  }

  // Fallback responses when AI is unavailable
  getFallbackAnswer(question) {
    const fallbackResponses = {
      'what is 2+2': "That's a great math question! 2+2 equals 4. Think of it like having 2 apples and getting 2 more apples - now you have 4 apples total!",
      'why is the sky blue': "Great question! The sky is blue because of something called scattering. Sunlight has all the colors of the rainbow, but blue light bounces around in the air more than other colors, making the sky look blue!",
      'how do airplanes fly': "Airplanes fly because of lift! The wings are shaped so that air moves faster over the top than the bottom, creating lift that pushes the plane up into the sky.",
      'what makes rainbows': "Rainbows happen when sunlight hits raindrops! The light bends and splits into all the colors of the rainbow - red, orange, yellow, green, blue, indigo, and violet!",
      'why do we dream': "Scientists think we dream to help our brains process what we learned during the day. It's like our brain is organizing and practicing while we sleep!",
      'how do magnets work': "Magnets work because of invisible forces! They have a north and south pole, and opposite poles attract while same poles repel. It's like magic, but it's science!"
    };
    
    const questionLower = question.toLowerCase();
    for (const [key, response] of Object.entries(fallbackResponses)) {
      if (questionLower.includes(key)) {
        return response + "\n\nWhat do you think about this explanation?";
      }
    }
    
    return "That's a really interesting question! I'm having trouble connecting to my knowledge right now, but I'd love to help you learn about this. Can you try asking a different question about science, nature, or how things work?";
  }

  // Override evaluateUnderstanding for Gemini
  async evaluateUnderstanding(question, answer, childResponse) {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const prompt = `Based on this educational exchange, determine if the child demonstrated understanding.

Original Question: "${question}"
AI Answer Summary: "${answer}"
Child's Response: "${childResponse}"

Evaluate if the child's response shows they understood the main concept. Be generous and focus on the core understanding, not perfect recall.

Respond with a JSON object:
{
  "understood": true/false,
  "feedback": "Brief encouraging message",
  "suggestion": "Optional: what to clarify if not understood"
}`;

        const response = await axios.post(`${this.apiUrl}?key=${this.apiKey}`, {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 150
          }
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        });

        const result = response.data.candidates[0].content.parts[0].text;
        // Clean up markdown formatting if present
        const cleanResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanResult);
      } catch (error) {
        console.error(`Gemini evaluation attempt ${attempt} failed:`, error.message);
        
        // If it's a 503 error, wait before retrying
        if (error.response && error.response.status === 503) {
          if (attempt < maxRetries) {
            console.log(`Waiting ${attempt * 2} seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            continue;
          }
        }
        
        // For other errors or after all retries, fall back to default
        if (attempt === maxRetries) {
          console.error('All retry attempts failed for Gemini evaluation');
        }
      }
    }
    
    // Default to allowing unlock on error
    return {
      understood: true,
      feedback: "Great job! You can unlock your computer now.",
      suggestion: null
    };
  }

  // Fallback evaluation when AI is unavailable
  getFallbackEvaluation(childResponse) {
    const responseLower = childResponse.toLowerCase();
    
    // Simple keyword-based evaluation
    const positiveKeywords = ['because', 'light', 'air', 'bounces', 'scatters', 'blue', 'sun', 'color', 'rainbow', 'water', 'drops', 'fly', 'wings', 'lift', 'airplane', 'magnet', 'north', 'south', 'attract', 'repel', 'dream', 'sleep', 'brain', 'learn'];
    
    const hasPositiveKeywords = positiveKeywords.some(keyword => responseLower.includes(keyword));
    
    if (hasPositiveKeywords || responseLower.length > 10) {
      return {
        understood: true,
        feedback: "That's a great explanation! You really understood the concept.",
        suggestion: null
      };
    } else {
      return {
        understood: false,
        feedback: "I can see you're thinking about this! Can you try explaining it in your own words?",
        suggestion: "Try to explain what you learned in a different way."
      };
    }
  }
}

module.exports = { AIService, ClaudeService, GeminiService };