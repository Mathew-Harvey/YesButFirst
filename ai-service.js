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
  getSystemPrompt() {
    return `You are an enthusiastic, friendly AI tutor for YesButFirst, an app that encourages curiosity in children and teens before they use their computer.

Your role:
1. Answer the child's question in an engaging, age-appropriate way
2. Use simple language but don't talk down to them
3. Make learning fun and interesting
4. After answering, ask ONE follow-up question to check their understanding
5. Be encouraging and positive

Important rules:
- Keep answers concise (2-3 paragraphs max)
- Use examples and analogies kids can relate to
- If asked inappropriate questions, redirect to something educational
- End with a simple question that tests if they understood the key concept
- Never discuss anything inappropriate for children

Remember: The goal is to spark curiosity and ensure understanding, not just provide information.`;
  }

  // Evaluate if the child understood the answer
  async evaluateUnderstanding(question, answer, childResponse) {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI evaluation timeout')), 10000); // 10 second timeout
    });

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

      const apiCall = axios.post(this.apiUrl, {
        model: this.model,
        messages: [
          { role: 'system', content: 'You are an educational assessment AI. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent evaluation
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
        feedback: "Great job! You can unlock your computer now.",
        suggestion: null
      };
    }
  }

  // Answer a child's question
  async answerQuestion(question, childAge = null) {
    try {
      const ageContext = childAge ? `The child is ${childAge} years old. ` : '';
      
      const response = await axios.post(this.apiUrl, {
        model: this.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: `${ageContext}Question: ${question}` }
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const answer = response.data.choices[0].message.content;
      const usage = response.data.usage;
      
      // Track usage
      this.updateUsage(usage);
      
      return {
        answer,
        usage: {
          tokens: usage.total_tokens,
          estimatedCost: this.calculateCost(usage)
        }
      };
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
  async answerQuestion(question, childAge = null) {
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const ageContext = childAge ? `The child is ${childAge} years old. ` : '';
        
        const response = await axios.post(`${this.apiUrl}?key=${this.apiKey}`, {
          contents: [{
            parts: [{
              text: `${this.getSystemPrompt()}\n\n${ageContext}Question: ${question}`
            }]
          }],
          generationConfig: {
            temperature: this.temperature,
            maxOutputTokens: this.maxTokens
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