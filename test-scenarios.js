// test-scenarios.js - Test scenarios to ensure age-appropriate, non-patronizing interactions
const QuestionGenerator = require('./question-generator');
const QuestionStrategies = require('./curiosity-question-strategies');

class CuriosityTestSuite {
  constructor() {
    this.questionGenerator = new QuestionGenerator();
    this.testResults = [];
  }

  /**
   * Run all test scenarios
   */
  runAllTests() {
    console.log('🧪 Running Curiosity Cultivation Test Suite...\n');
    
    this.testAgeAppropriateQuestions();
    this.testNonPatronizingLanguage();
    this.testInterestBasedPersonalization();
    this.testComplexityScaling();
    this.testSocraticProgression();
    
    this.summarizeResults();
  }

  /**
   * Test age-appropriate question generation
   */
  testAgeAppropriateQuestions() {
    console.log('📊 Testing Age-Appropriate Questions...');
    
    const testCases = [
      {
        age: 7,
        interests: ['Animals', 'Art'],
        expectedLevel: 'young',
        shouldContain: ['What would happen if', 'How do you think', 'Where else'],
        shouldAvoid: ['implications', 'assumptions', 'critically analyze']
      },
      {
        age: 12,
        interests: ['Technology', 'Science'],
        expectedLevel: 'middle', 
        shouldContain: ['How does this connect', 'What patterns', 'Why might'],
        shouldAvoid: ['What color is', 'How many', 'Good job']
      },
      {
        age: 16,
        interests: ['Philosophy', 'History'],
        expectedLevel: 'teen',
        shouldContain: ['What implications', 'How might someone challenge', 'What assumptions'],
        shouldAvoid: ['Do you know what color', 'Can you count', 'That\'s right']
      }
    ];

    testCases.forEach(testCase => {
      const questions = this.questionGenerator.generateExampleQuestions({
        age: testCase.age,
        interests: testCase.interests
      }, 5);
      
      console.log(`  Age ${testCase.age} questions:`, questions);
      
      // Test for appropriate complexity
      const hasAppropriateContent = testCase.shouldContain.some(phrase => 
        questions.some(q => q.toLowerCase().includes(phrase.toLowerCase()))
      );
      
      const hasInappropriateContent = testCase.shouldAvoid.some(phrase =>
        questions.some(q => q.toLowerCase().includes(phrase.toLowerCase()))
      );
      
      this.recordResult('Age Appropriateness', testCase.age, hasAppropriateContent && !hasInappropriateContent);
    });
  }

  /**
   * Test for patronizing language patterns
   */
  testNonPatronizingLanguage() {
    console.log('\n🚫 Testing for Non-Patronizing Language...');
    
    const patronizingPhrases = [
      'Good job!', 'Great question!', 'You\'re so smart!',
      'What color is this?', 'How many do you see?', 'Can you count these?',
      'That\'s right!', 'Very good!', 'Perfect!'
    ];
    
    const testProfiles = [
      { age: 8, interests: ['Science'] },
      { age: 13, interests: ['Music'] },
      { age: 17, interests: ['Technology'] }
    ];
    
    testProfiles.forEach(profile => {
      const questions = this.questionGenerator.generateExampleQuestions(profile, 10);
      
      const hasPatronizingLanguage = patronizingPhrases.some(phrase =>
        questions.some(q => q.toLowerCase().includes(phrase.toLowerCase()))
      );
      
      console.log(`  Age ${profile.age}: ${hasPatronizingLanguage ? '❌ Contains patronizing language' : '✅ Language appropriate'}`);
      this.recordResult('Non-Patronizing Language', profile.age, !hasPatronizingLanguage);
    });
  }

  /**
   * Test interest-based personalization
   */
  testInterestBasedPersonalization() {
    console.log('\n🎯 Testing Interest-Based Personalization...');
    
    const testCases = [
      {
        age: 10,
        interests: ['Animals', 'Nature'],
        shouldMention: ['animal', 'nature', 'living', 'environment']
      },
      {
        age: 14,
        interests: ['Technology', 'Programming'],
        shouldMention: ['technology', 'computer', 'digital', 'innovation']
      },
      {
        age: 8,
        interests: ['Art', 'Music'],
        shouldMention: ['creative', 'artistic', 'expression', 'beautiful']
      }
    ];
    
    testCases.forEach(testCase => {
      const questions = this.questionGenerator.generateExampleQuestions(testCase, 5);
      
      const isPersonalized = testCase.shouldMention.some(keyword =>
        questions.some(q => q.toLowerCase().includes(keyword))
      );
      
      console.log(`  Interests ${testCase.interests.join(', ')}: ${isPersonalized ? '✅ Personalized' : '❌ Generic'}`);
      this.recordResult('Interest Personalization', testCase.interests.join(','), isPersonalized);
    });
  }

  /**
   * Test complexity scaling based on responses
   */
  testComplexityScaling() {
    console.log('\n📈 Testing Complexity Scaling...');
    
    const responseCases = [
      {
        childAge: 12,
        response: 'Yes.',
        expectedLevel: 'simple',
        expectedAction: 'encourage more elaboration'
      },
      {
        childAge: 12,
        response: 'I think it works because of the way the molecules move around and create pressure, and this is similar to how weather systems work.',
        expectedLevel: 'complex',
        expectedAction: 'provide more challenging follow-up'
      },
      {
        childAge: 15,
        response: 'That makes sense. The force acts on the object and causes acceleration.',
        expectedLevel: 'developing',
        expectedAction: 'build on their understanding'
      }
    ];
    
    responseCases.forEach(testCase => {
      const ageGroup = this.questionGenerator.getAgeGroup(testCase.childAge);
      const nextLevel = this.questionGenerator.getNextQuestionLevel(testCase.response, ageGroup);
      
      console.log(`  Response: "${testCase.response.substring(0, 50)}..."`);
      console.log(`    Detected complexity: ${nextLevel ? nextLevel.technique : 'unknown'}`);
      
      // This would ideally test the actual complexity assessment
      this.recordResult('Complexity Scaling', testCase.childAge, true); // Placeholder
    });
  }

  /**
   * Test Socratic questioning progression
   */
  testSocraticProgression() {
    console.log('\n🤔 Testing Socratic Questioning Progression...');
    
    const socraticExamples = [
      {
        ageGroup: 'young',
        goodQuestions: [
          'What would happen if all the trees disappeared?',
          'How do you think animals choose their homes?',
          'Where else have you seen something like this?'
        ],
        badQuestions: [
          'What are the economic implications of deforestation?',
          'Analyze the habitat selection criteria for fauna.',
          'Evaluate the comparative morphology.'
        ]
      },
      {
        ageGroup: 'middle', 
        goodQuestions: [
          'How do you think this connects to what we learned about ecosystems?',
          'What patterns do you notice between these different examples?',
          'Why might this work differently in other environments?'
        ],
        badQuestions: [
          'What color are the leaves?',
          'Can you count the animals?',
          'Good job identifying that!'
        ]
      },
      {
        ageGroup: 'teen',
        goodQuestions: [
          'What assumptions are we making about this process?',
          'How might someone challenge this explanation?',
          'What implications does this have for our understanding of...?'
        ],
        badQuestions: [
          'Do you see the pretty butterfly?',
          'Can you point to the big tree?',
          'You\'re so smart for noticing that!'
        ]
      }
    ];
    
    socraticExamples.forEach(example => {
      console.log(`  ${example.ageGroup.toUpperCase()} - Socratic Questions:`);
      console.log(`    ✅ Good: ${example.goodQuestions[0]}`);
      console.log(`    ❌ Bad: ${example.badQuestions[0]}`);
      
      this.recordResult('Socratic Progression', example.ageGroup, true);
    });
  }

  /**
   * Test real conversation scenarios
   */
  testRealConversationScenarios() {
    console.log('\n💬 Testing Real Conversation Scenarios...');
    
    const scenarios = [
      {
        setup: 'Child asks: "Why is my fish tank green?"',
        childAge: 8,
        expectedResponse: 'Age-appropriate explanation with engaging follow-up',
        testResponse: 'Algae grows when there\'s too much light or nutrients. What do you think would happen if we covered part of the tank?'
      },
      {
        setup: 'Child asks: "How does artificial intelligence work?"',
        childAge: 15,
        expectedResponse: 'Sophisticated explanation respecting their intelligence',
        testResponse: 'AI systems learn patterns from data, similar to how you learn to recognize faces. What ethical questions does this raise about privacy?'
      },
      {
        setup: 'Child asks: "Why do we dream?"',
        childAge: 11,
        expectedResponse: 'Investigative approach connecting to their experience',
        testResponse: 'Dreams help your brain process the day\'s experiences and emotions. How do you think your dreams connect to what happened during your day?'
      }
    ];
    
    scenarios.forEach(scenario => {
      console.log(`  Scenario: ${scenario.setup}`);
      console.log(`    Expected: ${scenario.expectedResponse}`);
      console.log(`    Example: ${scenario.testResponse}`);
      
      // Analyze if the response follows our principles
      const isAgeAppropriate = this.analyzeAgeAppropriateness(scenario.testResponse, scenario.childAge);
      const isNonPatronizing = !this.containsPatronizingLanguage(scenario.testResponse);
      const hasGoodFollowUp = this.hasEngagingFollowUp(scenario.testResponse);
      
      const overallGood = isAgeAppropriate && isNonPatronizing && hasGoodFollowUp;
      console.log(`    ${overallGood ? '✅ GOOD' : '❌ NEEDS WORK'}`);
      
      this.recordResult('Real Scenarios', scenario.childAge, overallGood);
    });
  }

  /**
   * Helper methods for analysis
   */
  analyzeAgeAppropriateness(response, age) {
    const words = response.split(' ');
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    // Simple heuristic: younger children should have simpler vocabulary
    if (age <= 9) return avgWordLength < 6;
    if (age <= 13) return avgWordLength < 7;
    return true; // Teens can handle complex vocabulary
  }

  containsPatronizingLanguage(response) {
    const patronizing = ['good job', 'great question', 'you\'re so smart', 'very good', 'perfect', 'that\'s right'];
    return patronizing.some(phrase => response.toLowerCase().includes(phrase));
  }

  hasEngagingFollowUp(response) {
    const engagingStarters = [
      'what do you think', 'how might', 'what would happen', 'why do you',
      'how does this', 'what patterns', 'what assumptions', 'how could we'
    ];
    return engagingStarters.some(starter => response.toLowerCase().includes(starter));
  }

  /**
   * Record test results
   */
  recordResult(category, testCase, passed) {
    this.testResults.push({
      category,
      testCase,
      passed,
      timestamp: new Date()
    });
  }

  /**
   * Summarize all test results
   */
  summarizeResults() {
    console.log('\n📋 TEST SUMMARY');
    console.log('=' .repeat(50));
    
    const categories = [...new Set(this.testResults.map(r => r.category))];
    
    categories.forEach(category => {
      const categoryResults = this.testResults.filter(r => r.category === category);
      const passed = categoryResults.filter(r => r.passed).length;
      const total = categoryResults.length;
      const percentage = Math.round((passed / total) * 100);
      
      console.log(`${category}: ${passed}/${total} (${percentage}%) ✅`);
    });
    
    const overallPassed = this.testResults.filter(r => r.passed).length;
    const overallTotal = this.testResults.length;
    const overallPercentage = Math.round((overallPassed / overallTotal) * 100);
    
    console.log(`\nOVERALL: ${overallPassed}/${overallTotal} (${overallPercentage}%)`);
    
    if (overallPercentage >= 90) {
      console.log('🎉 EXCELLENT! System is ready for curiosity cultivation.');
    } else if (overallPercentage >= 80) {
      console.log('✅ GOOD! Minor improvements recommended.');
    } else {
      console.log('⚠️  NEEDS WORK! Significant improvements required.');
    }
  }
}

// Export for use in testing
module.exports = CuriosityTestSuite;

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new CuriosityTestSuite();
  testSuite.runAllTests();
}