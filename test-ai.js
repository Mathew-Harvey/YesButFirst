// test-ai.js - Test AI integration before running full app
require('dotenv').config();
const { AIService, ClaudeService, GeminiService } = require('./ai-service');
const aiConfig = require('./ai-config');

console.log('=== Testing YesButFirst AI Integration ===\n');

async function test() {
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
  
  console.log(`Provider: ${aiConfig.provider}`);
  console.log(`Model: ${aiConfig.models[aiConfig.provider].model}`);
  console.log('Testing connection...\n');
  
  try {
    // Test 1: Basic connection
    console.log('Test 1: Basic connection');
    const connectionTest = await ai.testConnection();
    if (connectionTest.success) {
      console.log('✅ Connection successful!\n');
    } else {
      throw new Error(connectionTest.error);
    }
    
    // Test 2: Answer a question
    console.log('Test 2: Answering a child\'s question');
    const question = "Why is the sky blue?";
    console.log(`Question: "${question}"`);
    const answer = await ai.answerQuestion(question, 10); // 10-year-old
    console.log(`\nAnswer: ${answer.answer}`);
    console.log(`Tokens used: ${answer.usage.tokens}`);
    console.log(`Cost: $${answer.usage.estimatedCost.toFixed(4)}`);
    
    // Test 3: Evaluate understanding
    console.log('\n\nTest 3: Evaluating understanding');
    const childResponse = "Because the blue light bounces around in the air more than other colors";
    console.log(`Child's response: "${childResponse}"`);
    
    const evaluation = await ai.evaluateUnderstanding(
      question,
      answer.answer,
      childResponse
    );
    
    console.log(`\nEvaluation:`);
    console.log(`Understood: ${evaluation.understood ? '✅ Yes' : '❌ No'}`);
    console.log(`Feedback: ${evaluation.feedback}`);
    if (evaluation.suggestion) {
      console.log(`Suggestion: ${evaluation.suggestion}`);
    }
    
    // Show usage stats
    console.log('\n\n=== Usage Statistics ===');
    const stats = ai.getUsageStats();
    console.log(`Total tokens: ${stats.totalTokens}`);
    console.log(`Total conversations: ${stats.conversations}`);
    console.log(`Estimated total cost: $${stats.estimatedCost.toFixed(4)}`);
    console.log(`Average cost per conversation: $${stats.costPerConversation.toFixed(4)}`);
    
    console.log('\n✅ All tests passed! AI integration is working correctly.');
    console.log('\nYou can now run the full app with: npm run start-ai');
    
  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('401')) {
      console.error('\n🔑 API Key Issue:');
      console.error('- Make sure your API key is correct in .env file');
      console.error('- Check that your API key has credits/is active');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n🌐 Network Issue:');
      console.error('- Check your internet connection');
      console.error('- Check if you\'re behind a firewall');
    }
    
    console.error('\nTroubleshooting:');
    console.error('1. Run: node setup-ai.js');
    console.error('2. Verify your API key is correct');
    console.error('3. Check your API provider dashboard for any issues');
  }
}

test().then(() => process.exit(0)).catch(() => process.exit(1));