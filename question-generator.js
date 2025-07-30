// question-generator.js - Dynamic example question generator based on child profile
const QuestionStrategies = require('./curiosity-question-strategies');

class QuestionGenerator {
  constructor() {
    this.questionStrategies = QuestionStrategies;
  }

  /**
   * Generate personalized example questions based on child's profile
   * @param {Object} childProfile - Age, gender, interests from parent settings
   * @param {number} count - Number of questions to generate (default 3)
   * @returns {Array} Array of personalized questions
   */
  generateExampleQuestions(childProfile, count = 3) {
    const { age, interests } = childProfile;
    const ageGroup = this.getAgeGroup(age);
    const selectedInterests = interests || [];
    
    const questions = [];
    
    // Generate interest-based questions
    if (selectedInterests.length > 0) {
      questions.push(...this.generateInterestBasedQuestions(ageGroup, selectedInterests, count));
    }
    
    // Fill remaining slots with general age-appropriate questions
    while (questions.length < count) {
      questions.push(...this.generateGeneralQuestions(ageGroup, 1));
    }
    
    // Shuffle and return requested count
    return this.shuffleArray(questions).slice(0, count);
  }

  /**
   * Generate follow-up questions during conversation
   * @param {string} originalQuestion - The question the child asked
   * @param {string} aiResponse - The AI's response
   * @param {Object} childProfile - Child's profile information
   * @returns {string} Appropriate follow-up question
   */
  generateFollowUpQuestion(originalQuestion, aiResponse, childProfile) {
    const { age, interests } = childProfile;
    const ageGroup = this.getAgeGroup(age);
    
    // Categorize the original question
    const questionCategory = this.categorizeQuestion(originalQuestion);
    
    // Get age-appropriate follow-up from our strategies
    const followUpTemplates = this.questionStrategies.questionFrameworks[questionCategory];
    
    if (followUpTemplates && followUpTemplates[ageGroup]) {
      // Select a random appropriate follow-up
      const templates = followUpTemplates[ageGroup];
      return this.selectRandomItem(templates);
    }
    
    // Fallback to general Socratic technique
    return this.generateSocraticFollowUp(ageGroup, originalQuestion);
  }

  /**
   * Generate questions based on child's interests
   */
  generateInterestBasedQuestions(ageGroup, interests, maxCount) {
    const questions = [];
    const interestTemplates = this.questionStrategies.interestBasedTemplates;
    
    // Map interests to question categories
    const interestMapping = {
      'Animals': 'animals', 'Dogs': 'animals', 'Cats': 'animals', 'Birds': 'animals',
      'Technology': 'technology', 'Programming': 'technology', 'Robotics': 'technology',
      'Soccer': 'sports', 'Basketball': 'sports', 'Swimming': 'sports',
      'Art': 'art', 'Drawing': 'art', 'Painting': 'art', 'Photography': 'art',
      'Music': 'music', 'Singing': 'music', 'Dancing': 'music',
      'History': 'history', 'Ancient Civilizations': 'history'
    };
    
    for (const interest of interests.slice(0, maxCount)) {
      const category = interestMapping[interest];
      if (category && interestTemplates[category] && interestTemplates[category][ageGroup]) {
        // Create specific question for this interest
        const template = interestTemplates[category][ageGroup];
        const specificQuestion = this.personalizeQuestion(template, interest);
        questions.push(specificQuestion);
      }
    }
    
    return questions;
  }

  /**
   * Generate general age-appropriate questions
   */
  generateGeneralQuestions(ageGroup, count) {
    const generalQuestions = {
      young: [
        "Why do you think shadows change size during the day?",
        "What would happen if gravity was half as strong?",
        "How do you think animals choose where to build their homes?",
        "What makes some foods taste sweet and others salty?",
        "Why do some things float in water and others sink?"
      ],
      middle: [
        "How does your brain decide what to remember and what to forget?",
        "What would society be like if everyone could read minds?",
        "How do different cultures solve the same problems differently?",
        "What makes some inventions change the world while others don't?",
        "How does the language you speak affect how you think?"
      ],
      teen: [
        "How do you think artificial intelligence will change human relationships?",
        "What ethical responsibilities do we have to future generations?",
        "How do social media algorithms influence democratic societies?",
        "What role should science play in making policy decisions?",
        "How might space exploration change humanity's perspective on Earth?"
      ]
    };
    
    const questions = generalQuestions[ageGroup] || generalQuestions.teen;
    return this.shuffleArray(questions).slice(0, count);
  }

  /**
   * Categorize a question to determine appropriate follow-up type
   */
  categorizeQuestion(question) {
    const lowerQuestion = question.toLowerCase();
    
    const categories = {
      science: ['how does', 'why does', 'what makes', 'how do', 'why do', 'what causes'],
      nature: ['animal', 'plant', 'tree', 'bird', 'fish', 'weather', 'climate', 'environment'],
      social: ['people', 'friend', 'family', 'society', 'culture', 'country', 'government'],
      arts: ['music', 'art', 'paint', 'draw', 'sing', 'dance', 'movie', 'book', 'story']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
        return category;
      }
    }
    
    return 'science'; // Default fallback
  }

  /**
   * Generate Socratic follow-up question
   */
  generateSocraticFollowUp(ageGroup, originalQuestion) {
    const socraticTechniques = this.questionStrategies.socraticTechniques;
    
    // Randomly select a Socratic technique
    const techniques = Object.keys(socraticTechniques);
    const selectedTechnique = this.selectRandomItem(techniques);
    
    return socraticTechniques[selectedTechnique][ageGroup];
  }

  /**
   * Personalize a question template with specific interest
   */
  personalizeQuestion(template, interest) {
    // Simple substitution for now - could be more sophisticated
    return template.replace(/this (animal|technology|sport|art|music)/gi, interest.toLowerCase());
  }

  /**
   * Determine age group from age number
   */
  getAgeGroup(age) {
    if (!age) return 'teen'; // Default
    
    const ageNum = parseInt(age);
    if (ageNum >= 5 && ageNum <= 8) return 'young';
    if (ageNum >= 9 && ageNum <= 12) return 'middle';
    if (ageNum >= 13 && ageNum <= 17) return 'teen';
    
    return 'teen'; // Default for edge cases
  }

  /**
   * Utility functions
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  selectRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Generate questions for specific scenarios
   */
  generateScenarioQuestions(scenario, childProfile) {
    const { age } = childProfile;
    const ageGroup = this.getAgeGroup(age);
    
    const scenarioQuestions = {
      mealtime: {
        young: "What do you think this food had to go through to get to our table?",
        middle: "How do different cultures prepare similar ingredients?",
        teen: "What economic and environmental factors influence our food choices?"
      },
      outdoors: {
        young: "What do you notice that's different from yesterday?",
        middle: "How do you think this ecosystem balances itself?", 
        teen: "What human impact do you observe in this environment?"
      },
      creative_time: {
        young: "What story is your creation telling?",
        middle: "How did your approach change as you worked?",
        teen: "How does your creative process reflect your thinking style?"
      },
      current_events: {
        young: "How do you think this affects people's daily lives?",
        middle: "What different perspectives might people have on this?",
        teen: "What historical patterns do you see reflected in this situation?"
      }
    };
    
    return scenarioQuestions[scenario] ? scenarioQuestions[scenario][ageGroup] : null;
  }

  /**
   * Adaptive questioning based on response complexity
   */
  getNextQuestionLevel(childResponse, currentAgeGroup) {
    const responseLength = childResponse.split(' ').length;
    const hasComplexWords = /\b(because|however|therefore|although|considering)\b/i.test(childResponse);
    const hasQuestions = childResponse.includes('?');
    
    // Assess complexity
    let complexity = 'simple';
    if (responseLength > 10 && (hasComplexWords || hasQuestions)) {
      complexity = 'complex';
    } else if (responseLength > 5 || hasComplexWords) {
      complexity = 'developing';
    }
    
    const responseStrategies = this.questionStrategies.responseComplexity;
    return responseStrategies[complexity];
  }
}

module.exports = QuestionGenerator;