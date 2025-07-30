// curiosity-question-strategies.js - Age-specific follow-up question strategies
// Based on research from child development experts and Socratic method principles

const QuestionStrategies = {
  // Age-specific question types that spark curiosity without patronizing
  ageGroups: {
    young: { // 6-9 years
      name: "Explorer",
      cognitive: "Concrete thinking, love 'why' questions",
      approach: "Wonder-based, tangible connections",
      avoidPatronizing: "Don't ask obvious yes/no questions or test basic facts"
    },
    middle: { // 10-13 years  
      name: "Investigator",
      cognitive: "Beginning abstract thought, enjoy 'how' questions", 
      approach: "Process-focused, connections between ideas",
      avoidPatronizing: "Don't oversimplify or treat them like little kids"
    },
    teen: { // 14-17 years
      name: "Philosopher", 
      cognitive: "Abstract reasoning, appreciate 'what if' questions",
      approach: "Hypothetical scenarios, respecting their intelligence", 
      avoidPatronizing: "Never talk down to them or ask childish questions"
    }
  },

  // Question frameworks by topic with age-appropriate variations
  questionFrameworks: {
    science: {
      young: [
        "What do you think would happen if we tried this differently?",
        "Where else have you seen something like this?", 
        "What does this remind you of?",
        "How do you think this works?",
        "What would you want to try next?"
      ],
      middle: [
        "What patterns do you notice here?",
        "How might this connect to something else you know?",
        "What would happen if we changed one thing?",
        "Why do you think this works this way?",
        "How could we test your idea?"
      ],
      teen: [
        "What assumptions are we making here?",
        "How might this principle apply to other situations?", 
        "What are the implications of this discovery?",
        "How does this challenge what we thought we knew?",
        "What ethical questions does this raise?"
      ]
    },

    nature: {
      young: [
        "What do you wonder about this?",
        "How do you think animals/plants feel about this?",
        "What would it be like to be this creature?",
        "What job does this have in nature?",
        "What story could this tell us?"
      ],
      middle: [
        "What survival strategies do you notice?",
        "How do different parts of this system work together?",
        "What would happen if this wasn't here?",
        "How has this adapted to its environment?",
        "What relationships do you see between living things?"
      ],
      teen: [
        "What evolutionary pressures shaped this?",
        "How do human actions impact this ecosystem?",
        "What philosophical questions does this raise about life?",
        "How might climate change affect this in the future?",
        "What can this teach us about sustainability?"
      ]
    },

    social: {
      young: [
        "How do you think that person felt?",
        "What would you do in that situation?", 
        "Why do you think people act this way?",
        "How could we help in this situation?",
        "What would make this fair for everyone?"
      ],
      middle: [
        "What different perspectives might people have?",
        "What factors might influence someone's decision?",
        "How do cultural differences affect this situation?",
        "What would you need to know to make a good choice?",
        "How might this look different in another time or place?"
      ],
      teen: [
        "What systemic factors contribute to this issue?",
        "How do power dynamics play a role here?",
        "What historical context helps us understand this?",
        "How might different philosophical approaches view this?",
        "What are the long-term consequences of different choices?"
      ]
    },

    arts: {
      young: [
        "What feelings does this give you?",
        "What story do you see in this?",
        "What would happen if you changed this part?",
        "How does this make you want to move/sing/draw?",
        "What would you add to make it even more interesting?"
      ],
      middle: [
        "What techniques did the artist use to create this effect?",
        "How does this reflect the time period it was made?",
        "What emotions is the artist trying to convey?",
        "How might different people interpret this differently?",
        "What influences do you see from other artists or cultures?"
      ],
      teen: [
        "How does this challenge conventional artistic boundaries?",
        "What social or political commentary might this contain?",
        "How does the medium affect the message?",
        "What philosophical questions does this artwork raise?",
        "How might this influence future artistic movements?"
      ]
    }
  },

  // Socratic techniques adapted for children
  socraticTechniques: {
    clarification: {
      young: "Can you tell me more about that?",
      middle: "What do you mean when you say...?", 
      teen: "How does this relate to what we discussed earlier?"
    },
    assumptions: {
      young: "What makes you think that?",
      middle: "What if someone disagreed with that idea?",
      teen: "What assumptions are we making here?"
    },
    evidence: {
      young: "How do you know that?",
      middle: "What evidence supports that thinking?",
      teen: "What might someone who disagrees point to?"
    },
    perspective: {
      young: "How might someone else see this?",
      middle: "What would this look like from another viewpoint?", 
      teen: "How might your perspective be shaped by your experiences?"
    },
    implications: {
      young: "What do you think might happen next?",
      middle: "If that's true, what else would have to be true?",
      teen: "What are the broader implications of this thinking?"
    }
  },

  // How to avoid patronizing language
  avoidPatronizing: {
    never: [
      "Good job!", "Great question!", "You're so smart!",
      "What color is this?", "How many do you see?", "Can you count these?",
      "That's right!", "Very good!", "Perfect!"
    ],
    instead: [
      "That's interesting thinking...", "I'm curious about your reasoning...",
      "That perspective makes me wonder...", "How did you come to that conclusion?",
      "That's a complex idea...", "I hadn't thought of it that way..."
    ],
    principles: [
      "Respect their intelligence at every age",
      "Follow their lead, don't test them", 
      "Ask genuine questions you don't know the answer to",
      "Build on their thinking rather than evaluating it",
      "Use informative statements instead of quiz questions"
    ]
  },

  // Interest-based question generation templates
  interestBasedTemplates: {
    animals: {
      young: "If you could ask this animal one question, what would it be?",
      middle: "How do you think this animal's life compares to yours?",
      teen: "What ethical responsibilities do humans have toward this species?"
    },
    technology: {
      young: "What would happen if this technology didn't exist?",
      middle: "How has this technology changed the way people live?", 
      teen: "What unintended consequences might this technology have?"
    },
    sports: {
      young: "What's the most exciting thing about this sport?",
      middle: "How do you think strategy affects the outcome?",
      teen: "How does this sport reflect broader cultural values?"
    },
    art: {
      young: "What would you create if you could make anything?",
      middle: "How do artists communicate ideas through their work?",
      teen: "How does art influence social change?"
    },
    music: {
      young: "How does this music make your body want to move?",
      middle: "What emotions is this composer trying to create?",
      teen: "How does music reflect the society that creates it?"
    },
    history: {
      young: "What would it be like to live in that time?",
      middle: "How did people's daily lives differ from ours?",
      teen: "What lessons from this period apply to today's challenges?"
    }
  },

  // Dynamic question selection based on child's response complexity
  responseComplexity: {
    simple: {
      // Child gives short, concrete answers
      nextQuestion: "Can you tell me more about what you're thinking?",
      technique: "Open up the conversation gently"
    },
    developing: {
      // Child shows emerging understanding
      nextQuestion: "What connections do you see between this and...?",
      technique: "Help them make connections"
    },
    complex: {
      // Child demonstrates sophisticated thinking
      nextQuestion: "How might others challenge that perspective?",
      technique: "Introduce complexity and nuance"
    }
  }
};

module.exports = QuestionStrategies;