// conversation-tracker.js - Track conversation patterns and child's learning over time
class ConversationTracker {
  constructor(database) {
    this.db = database;
  }

  /**
   * Track a conversation exchange for learning purposes
   * @param {Object} conversationData - The conversation details
   */
  trackConversation(conversationData) {
    const {
      childAge,
      question,
      aiResponse, 
      childFollowUp,
      responseComplexity,
      topicsDiscussed,
      engagementLevel
    } = conversationData;

    // For future implementation - store conversation patterns
    // This data can be used to:
    // 1. Identify topics the child is most curious about
    // 2. Track complexity progression over time
    // 3. Adjust difficulty levels automatically
    // 4. Generate better personalized questions

    console.log('Conversation tracked:', {
      age: childAge,
      topics: topicsDiscussed,
      complexity: responseComplexity,
      engagement: engagementLevel
    });
  }

  /**
   * Analyze question patterns to identify emerging interests
   * @param {string} question - The child's question
   * @returns {Array} Detected topic categories
   */
  analyzeQuestionTopics(question) {
    const topicPatterns = {
      science: /\b(how|why|what makes|explain|work|function|happen|cause)\b.*\b(gravity|atom|molecule|energy|force|speed|heat|light|sound|electricity|magnet|chemical|reaction|physics|biology|chemistry)\b/i,
      nature: /\b(animal|plant|tree|flower|bird|fish|insect|weather|rain|snow|sun|moon|earth|planet|ocean|river|mountain|forest|desert|ecosystem|environment)\b/i,
      technology: /\b(computer|internet|robot|artificial intelligence|AI|programming|app|software|hardware|smartphone|tablet|virtual reality|drone|electric|digital|tech)\b/i,
      space: /\b(space|planet|star|galaxy|universe|astronaut|rocket|satellite|mars|moon|sun|solar system|black hole|meteor|comet|alien)\b/i,
      history: /\b(ancient|civilization|empire|war|kingdom|pharaoh|knight|castle|revolution|discovery|explorer|invention|prehistoric|dinosaur|fossil)\b/i,
      art: /\b(paint|draw|music|sing|dance|sculpture|artist|color|creative|design|beauty|expression|instrument|melody|rhythm|composition)\b/i,
      social: /\b(friend|family|people|culture|society|country|language|tradition|celebration|community|relationship|emotion|feeling|behavior)\b/i,
      philosophy: /\b(why do we|what is the meaning|purpose|existence|consciousness|reality|truth|belief|moral|ethical|right|wrong|freedom|justice)\b/i
    };

    const detectedTopics = [];
    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(question)) {
        detectedTopics.push(topic);
      }
    }

    return detectedTopics.length > 0 ? detectedTopics : ['general'];
  }

  /**
   * Assess engagement level based on response characteristics
   * @param {string} response - Child's response
   * @returns {string} Engagement level: low, medium, high
   */
  assessEngagementLevel(response) {
    const responseLength = response.split(' ').length;
    const hasQuestions = response.includes('?');
    const hasEmotionalWords = /\b(wow|amazing|cool|interesting|surprised|excited|curious|wonder|love|hate|scared|happy|sad)\b/i.test(response);
    const hasElaborativeWords = /\b(because|since|also|and|but|however|actually|really|very|so|then|next|first|finally)\b/i.test(response);

    let score = 0;
    
    // Length scoring
    if (responseLength > 15) score += 3;
    else if (responseLength > 8) score += 2;
    else if (responseLength > 3) score += 1;

    // Engagement indicators
    if (hasQuestions) score += 2;
    if (hasEmotionalWords) score += 2;
    if (hasElaborativeWords) score += 1;

    if (score >= 6) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * Determine optimal next question complexity
   * @param {Object} childProfile - Age, interests, etc.
   * @param {string} lastResponse - Child's last response
   * @param {Array} conversationHistory - Recent conversation history
   * @returns {Object} Recommended complexity and approach
   */
  recommendNextComplexity(childProfile, lastResponse, conversationHistory = []) {
    const { age } = childProfile;
    const ageGroup = age <= 9 ? 'young' : age <= 13 ? 'middle' : 'teen';
    
    const currentEngagement = this.assessEngagementLevel(lastResponse);
    const responseComplexity = this.analyzeResponseComplexity(lastResponse);
    
    // Base complexity on age
    let targetComplexity = ageGroup;
    
    // Adjust based on engagement and performance
    if (currentEngagement === 'high' && responseComplexity === 'complex') {
      // Child is engaged and thinking deeply - can handle more complexity
      if (ageGroup === 'young') targetComplexity = 'middle';
      else if (ageGroup === 'middle') targetComplexity = 'teen';
    } else if (currentEngagement === 'low' || responseComplexity === 'simple') {
      // Child may be struggling or disengaged - simplify
      if (ageGroup === 'teen') targetComplexity = 'middle';
      else if (ageGroup === 'middle') targetComplexity = 'young';
    }

    return {
      complexity: targetComplexity,
      approach: this.getApproachForComplexity(targetComplexity),
      reasoning: `Based on ${currentEngagement} engagement and ${responseComplexity} response complexity`
    };
  }

  /**
   * Analyze complexity of child's response
   * @param {string} response - Child's response
   * @returns {string} simple, developing, or complex
   */
  analyzeResponseComplexity(response) {
    const responseLength = response.split(' ').length;
    const hasComplexStructure = /\b(because|however|therefore|although|considering|meanwhile|furthermore|consequently|nevertheless)\b/i.test(response);
    const hasMultipleClauses = response.split(/[.!?]/).length > 2;
    const hasComparisons = /\b(like|similar|different|compared to|whereas|while|instead)\b/i.test(response);
    const hasAbstractThinking = /\b(concept|idea|theory|principle|relationship|pattern|system|process|implication|perspective)\b/i.test(response);

    let score = 0;
    
    if (responseLength > 20) score += 2;
    else if (responseLength > 10) score += 1;
    
    if (hasComplexStructure) score += 3;
    if (hasMultipleClauses) score += 2;
    if (hasComparisons) score += 2;
    if (hasAbstractThinking) score += 3;

    if (score >= 6) return 'complex';
    if (score >= 3) return 'developing';
    return 'simple';
  }

  /**
   * Get appropriate questioning approach for complexity level
   * @param {string} complexity - Target complexity level
   * @returns {Object} Approach guidelines
   */
  getApproachForComplexity(complexity) {
    const approaches = {
      young: {
        questionType: 'Wonder-based and experiential',
        examples: ['What would happen if...', 'How do you think it feels to...', 'Where else have you seen...'],
        style: 'Simple, concrete, imaginative'
      },
      middle: {
        questionType: 'Process and connection-focused',
        examples: ['How do you think this connects to...', 'What patterns do you notice...', 'Why might this work differently if...'],
        style: 'Investigative, comparative, logical'
      },
      teen: {
        questionType: 'Abstract and analytical',
        examples: ['What implications does this have...', 'How might someone challenge this...', 'What assumptions are we making...'],
        style: 'Critical thinking, multiple perspectives, complexity'
      }
    };

    return approaches[complexity] || approaches.young;
  }

  /**
   * Generate adaptive follow-up question
   * @param {Object} context - Current conversation context
   * @returns {string} Appropriate follow-up question
   */
  generateAdaptiveFollowUp(context) {
    const { childProfile, lastQuestion, lastAnswer, childResponse } = context;
    
    const recommendation = this.recommendNextComplexity(
      childProfile, 
      childResponse, 
      context.conversationHistory
    );

    const approach = recommendation.approach;
    const questionTemplate = approach.examples[Math.floor(Math.random() * approach.examples.length)];
    
    // This would integrate with the question generator to create specific follow-ups
    return questionTemplate;
  }
}

module.exports = ConversationTracker;