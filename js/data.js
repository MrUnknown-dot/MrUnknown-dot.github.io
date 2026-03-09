import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Enhanced speaking tasks with varied content and progression
const defaultSpeakingTasks = [
  // Week 1: Self-Introduction & Basics (Days 1-7)
  {
    day: 1,
    title: "Day 1: Self Introduction",
    duration: "1-2 min",
    text: "Hello! My name is [Your Name]. I'm learning English to improve my communication skills. I live in [Your City] and I work as a [Your Job]. In my free time, I enjoy reading books and watching movies. I'm excited to start this 30-day English speaking journey!"
  },
  {
    day: 2,
    title: "Day 2: My Daily Routine",
    duration: "2 min",
    text: "Every morning, I usually wake up at around 7 AM. The first thing I do is brush my teeth and wash my face to feel fresh and ready for the day. After that, I go to the kitchen and have my breakfast. Most of the time, I eat something simple like cereal with milk, toast with eggs, or sometimes fruit and juice. Once I finish breakfast, I start my daily activities.This may include studying, working on projects, attending classes, or completing important tasks.During the afternoon, I usually take a short break to relax or have a snack. In the evening, I like to spend some time relaxing.I may watch TV, listen to music, or read a book.Sometimes I also talk with my friends or family about how their day went. At night, I prepare for the next day by organizing my things and finishing any remaining work.Finally, I go to bed at around 11 PM so I can wake up refreshed and ready for another productive day."

  },
  {
    day: 3,
    title: "Day 3: My Family",
    duration: "2 min",
    text: "Let me tell you about my family. There are five people in my family: my parents, my two siblings, and me. My father is a teacher, and my mother is a nurse. My older brother works at a bank, and my younger sister is still in school. We love spending weekends together, watching movies or having dinner. Family is very important to me."
  },
  {
    day: 4,
    title: "Day 4: My Favorite Food",
    duration: "1-2 min",
    text: "My absolute favorite food is pizza. I love how the cheese melts and the toppings create amazing flavors. My favorite toppings are mushrooms, olives, and extra cheese. I also enjoy cooking pizza at home with my family. We make the dough from scratch and add our favorite ingredients. Food brings people together, and pizza always makes me happy!"
  },
  {
    day: 5,
    title: "Day 5: My Hobbies",
    duration: "2 min",
    text: "I have several hobbies that I enjoy in my free time. Reading is my favorite - I love getting lost in a good book. I also enjoy photography and taking pictures of nature. On weekends, I often go for long walks in the park with my camera. These hobbies help me relax and express my creativity."
  },
  {
    day: 6,
    title: "Day 6: My Dream Vacation",
    duration: "2 min",
    text: "If I could go anywhere in the world, I would visit Japan. I'm fascinated by Japanese culture, food, and technology. I'd love to see the cherry blossoms in spring, visit ancient temples in Kyoto, and try authentic sushi in Tokyo. I would also like to experience a traditional tea ceremony and stay in a ryokan, a traditional Japanese inn."
  },
  {
    day: 7,
    title: "Day 7: Weekend Plans",
    duration: "1-2 min",
    text: "This weekend, I plan to meet my friends on Saturday. We're going to try that new restaurant downtown. On Sunday, I'll probably stay home and relax. I might watch a movie or read my book. Sometimes the best weekends are the ones where you don't have any big plans!"
  },

  // Week 2: Opinions & Descriptions (Days 8-14)
  {
    day: 8,
    title: "Day 8: My Favorite Movie",
    duration: "2-3 min",
    text: "My favorite movie is 'The Pursuit of Happyness.' It's an inspiring true story about a man who overcomes homelessness while raising his young son. Will Smith's performance is amazing. The movie teaches us about never giving up, even when life gets difficult. I've watched it many times, and it still makes me emotional. It reminds me that hard work and determination can change your life."
  },
  {
    day: 9,
    title: "Day 9: Technology in Our Lives",
    duration: "2-3 min",
    text: "Technology has changed how we live and communicate. Smartphones help us stay connected with friends and family anywhere in the world. We can work from home, learn new skills online, and access information instantly. However, too much screen time can be unhealthy. I try to balance my technology use by spending time outdoors and having face-to-face conversations with people."
  },
  {
    day: 10,
    title: "Day 10: My Ideal Home",
    duration: "2 min",
    text: "My ideal home would be a cozy house near the beach. I'd love to wake up to the sound of waves every morning. The house would have large windows to let in natural light, a big kitchen for cooking, and a garden where I could grow vegetables. There would be a comfortable reading nook by the window, perfect for rainy afternoons with a cup of tea and a good book."
  },
  {
    day: 11,
    title: "Day 11: A Memorable Childhood Memory",
    duration: "2-3 min",
    text: "One of my fondest childhood memories is learning to ride a bicycle. I remember my dad running behind me, holding the seat to keep me balanced. After many tries and a few falls, I finally rode on my own! The feeling of freedom and accomplishment was incredible. That experience taught me that falling is part of learning, and persistence pays off."
  },
  {
    day: 12,
    title: "Day 12: The Importance of Exercise",
    duration: "2 min",
    text: "Regular exercise is essential for good health. It keeps our bodies strong and our minds sharp. I try to exercise at least three times a week. Sometimes I go for a run in the park, other times I do yoga at home. Exercise helps me reduce stress and sleep better at night. Even a 20-minute walk each day can make a big difference in how you feel."
  },
  {
    day: 13,
    title: "Day 13: My Favorite Season",
    duration: "1-2 min",
    text: "Autumn is my favorite season. I love watching the leaves change color from green to beautiful shades of red, orange, and yellow. The weather is perfect - not too hot and not too cold. I enjoy wearing cozy sweaters and drinking hot apple cider. There's something magical about crisp autumn mornings and the sound of leaves crunching under my feet."
  },
  {
    day: 14,
    title: "Day 14: If I Could Meet Anyone",
    duration: "2 min",
    text: "If I could meet anyone in history, I would choose Albert Einstein. His genius changed how we understand the universe. I'd love to ask him about his thought process when developing the theory of relativity. Beyond his intelligence, he was also a kind person who cared about peace and humanity. I imagine our conversation would be fascinating and full of wisdom."
  },

  // Week 3: Storytelling & Experiences (Days 15-21)
  {
    day: 15,
    title: "Day 15: A Funny Story",
    duration: "2-3 min",
    text: "Last month, I had a funny experience at a coffee shop. I ordered a cappuccino, but when the barista asked for my name, I was distracted and said 'Table for one please!' We both laughed at my mistake. When she asked again, I was so embarrassed that I accidentally gave her my friend's name instead of mine. She wrote 'Table for one' on my cup anyway. Now I always make sure to listen carefully when ordering coffee!"
  },
  {
    day: 16,
    title: "Day 16: My Best Friend",
    duration: "2 min",
    text: "My best friend is someone I've known since elementary school. We've been through so much together - good times and bad. What I appreciate most about them is their honesty and sense of humor. They always know how to make me laugh when I'm feeling down. A true friend is someone who accepts you for who you are and supports your dreams. I'm grateful to have such a wonderful person in my life."
  },
  {
    day: 17,
    title: "Day 17: A Challenge I Overcame",
    duration: "2-3 min",
    text: "Learning English has been one of my biggest challenges. When I started, I was afraid to speak because I worried about making mistakes. But I realized that making mistakes is part of learning. I began practicing every day, watching English movies, and speaking with friends. Gradually, my confidence grew. Now I can express myself much better. This experience taught me that facing your fears is the only way to overcome them."
  },
  {
    day: 18,
    title: "Day 18: My Favorite Place in the City",
    duration: "2 min",
    text: "My favorite place in the city is the public library. It's a peaceful escape from the busy streets outside. I love walking through the aisles, looking at all the books. The smell of old books and the quiet atmosphere help me relax. There's a cozy corner with comfortable chairs where I can read for hours. The library feels like a sanctuary where I can learn, dream, and explore new worlds through books."
  },
  {
    day: 19,
    title: "Day 19: The Importance of Learning Languages",
    duration: "2-3 min",
    text: "Learning a new language opens doors to new cultures and perspectives. When you speak someone's language, you can connect with them on a deeper level. You can read their literature, understand their jokes, and appreciate their art. Language learning also improves brain function and memory. It's challenging but incredibly rewarding. Every new word you learn is a step toward understanding the world better."
  },
  {
    day: 20,
    title: "Day 20: My Perfect Day",
    duration: "2 min",
    text: "My perfect day would start with a beautiful sunrise and a cup of coffee on the balcony. Then I'd spend the morning doing something creative, like writing or painting. Lunch would be with friends at a nice restaurant. In the afternoon, I'd go for a walk in nature, maybe in a forest or by the sea. Evening would be cozy at home with family, watching a movie and sharing stories. A perfect day isn't about big events, but about simple joys shared with loved ones."
  },
  {
    day: 21,
    title: "Day 21: A Valuable Life Lesson",
    duration: "2-3 min",
    text: "One valuable lesson I've learned is that happiness comes from within. For a long time, I thought achieving certain goals would make me happy - getting a promotion, buying things, impressing others. But after achieving some of these goals, I realized the happiness was temporary. True happiness comes from appreciating what you have, being grateful, and living according to your values. It's about the journey, not the destination."
  },

  // Week 4: Opinions & Future Plans (Days 22-30)
  {
    day: 22,
    title: "Day 22: Social Media: Good or Bad?",
    duration: "2-3 min",
    text: "Social media has both positive and negative aspects. On the positive side, it helps us stay connected with friends and family, especially those far away. We can share important moments and support each other. However, it can also be addictive and make people feel anxious or inadequate when comparing themselves to others. I think the key is using it mindfully - being aware of how it makes you feel and taking breaks when needed."
  },
  {
    day: 23,
    title: "Day 23: My Future Goals",
    duration: "2 min",
    text: "In the next five years, I have several goals. Professionally, I want to advance in my career and take on more responsibility. Personally, I want to become fluent in English and maybe learn another language. I also want to travel to at least three new countries and experience different cultures. Most importantly, I want to continue growing as a person - being kinder, more patient, and more understanding."
  },
  {
    day: 24,
    title: "Day 24: The Value of Money",
    duration: "2 min",
    text: "Money is important, but it's not everything. It can buy comfort and security, but not happiness or love. I've learned that experiences bring more joy than possessions. Traveling, learning new skills, and spending time with loved ones create memories that last forever. While it's wise to save money, it's also important to use it for things that truly enrich your life. Balance is key."
  },
  {
    day: 25,
    title: "Day 25: A Person I Admire",
    duration: "2-3 min",
    text: "I admire my grandmother. She grew up in difficult times but always remained positive and kind. She worked hard to raise her children and helped raise her grandchildren too. Even now, she greets everyone with a warm smile. She taught me that kindness costs nothing but means everything. Her strength, wisdom, and generosity inspire me to be a better person. She proves that you don't need to be famous to make a difference in people's lives."
  },
  {
    day: 26,
    title: "Day 26: Climate Change and Our Responsibility",
    duration: "2-3 min",
    text: "Climate change is one of the biggest challenges of our time. Rising temperatures, extreme weather, and melting ice caps affect everyone. But we can all do our part to help. Simple actions like reducing waste, recycling, using less plastic, and saving energy make a difference. Choosing to walk or bike instead of driving helps too. If we all make small changes, together we can protect our planet for future generations."
  },
  {
    day: 27,
    title: "Day 27: The Power of Habits",
    duration: "2 min",
    text: "Habits shape who we are. Small actions repeated daily become part of our character. If you want to change your life, start with small habits. Read ten pages a day, and you'll finish many books in a year. Walk for twenty minutes daily, and you'll be healthier. Practice English for fifteen minutes each day, and you'll see improvement. Good habits compound over time, leading to remarkable results."
  },
  {
    day: 28,
    title: "Day 28: What Makes a Good Leader",
    duration: "2-3 min",
    text: "A good leader inspires rather than demands. They lead by example and treat everyone with respect. They listen more than they speak and value different opinions. Good leaders take responsibility when things go wrong and give credit to others when things go right. They help people grow and reach their potential. Most importantly, they have integrity - they do what's right, even when no one is watching."
  },
  {
    day: 29,
    title: "Day 29: My Advice to Younger Generation",
    duration: "2-3 min",
    text: "If I could give advice to young people, I'd tell them: don't be afraid to make mistakes. Mistakes are how we learn and grow. Follow your curiosity, not someone else's expectations. Spend time with people who encourage and support you. Read books, ask questions, and never stop learning. Be kind to yourself and others. And remember, everyone is figuring things out at their own pace. Your journey is unique, and that's beautiful."
  },
  {
    day: 30,
    title: "Day 30: My 30-Day English Journey",
    duration: "3-4 min",
    text: "Today marks the end of my 30-day English speaking journey. Looking back, I'm proud of my progress. When I started, I felt nervous about speaking English. Now, I feel more confident expressing my thoughts. I've learned new vocabulary, improved my pronunciation, and gained fluency. But this isn't the end - it's just the beginning. Language learning is a lifelong journey. I plan to continue practicing every day, perhaps by reading English books, watching movies without subtitles, and having conversations with native speakers. To anyone reading this: keep going! Every word you learn, every sentence you speak brings you closer to your goal. Congratulations on completing this journey with me. Now, let's continue learning and growing together!"
  }
];

// Enhanced listening tasks with more variety
const defaultListeningTasks = [
  {
    day: 1,
    title: "Day 1: Greetings and Introductions",
    duration: "2 min",
    videoId: "M7lc1UVf-VE",
    vocab: ["hello", "introduce", "meet", "pleasure", "conversation"]
  },
  {
    day: 2,
    title: "Day 2: Daily Routines",
    duration: "2 min",
    videoId: "ysz5S6PUM-U",
    vocab: ["morning", "routine", "usually", "breakfast", "schedule"]
  },
  {
    day: 3,
    title: "Day 3: Ordering Food",
    duration: "2 min",
    videoId: "jNQXAC9IVRw",
    vocab: ["menu", "order", "recommend", "delicious", "check"]
  },
  {
    day: 4,
    title: "Day 4: Asking for Directions",
    duration: "2 min",
    videoId: "ScMzIvxBSi4",
    vocab: ["direction", "street", "corner", "straight", "traffic"]
  },
  {
    day: 5,
    title: "Day 5: Making Phone Calls",
    duration: "2 min",
    videoId: "dQw4w9WgXcQ",
    vocab: ["call", "message", "available", "callback", "contact"]
  },
  {
    day: 6,
    title: "Day 6: Shopping Conversations",
    duration: "2 min",
    videoId: "M7lc1UVf-VE",
    vocab: ["price", "discount", "receipt", "return", "customer"]
  },
  {
    day: 7,
    title: "Day 7: Talking About Weather",
    duration: "2 min",
    videoId: "ysz5S6PUM-U",
    vocab: ["weather", "temperature", "forecast", "rain", "sunny"]
  },
  {
    day: 8,
    title: "Day 8: At the Hotel",
    duration: "2 min",
    videoId: "jNQXAC9IVRw",
    vocab: ["reservation", "check-in", "room", "service", "amenities"]
  },
  {
    day: 9,
    title: "Day 9: Job Interviews",
    duration: "3 min",
    videoId: "ScMzIvxBSi4",
    vocab: ["experience", "skills", "position", "company", "career"]
  },
  {
    day: 10,
    title: "Day 10: Making Friends",
    duration: "2 min",
    videoId: "dQw4w9WgXcQ",
    vocab: ["friend", "hobby", "interest", "together", "social"]
  },
  {
    day: 11,
    title: "Day 11: At the Doctor",
    duration: "2 min",
    videoId: "M7lc1UVf-VE",
    vocab: ["symptoms", "appointment", "medicine", "health", "doctor"]
  },
  {
    day: 12,
    title: "Day 12: Travel Plans",
    duration: "2 min",
    videoId: "ysz5S6PUM-U",
    vocab: ["trip", "destination", "booking", "flight", "vacation"]
  },
  {
    day: 13,
    title: "Day 13: Talking About Hobbies",
    duration: "2 min",
    videoId: "jNQXAC9IVRw",
    vocab: ["hobby", "enjoy", "creative", "relaxing", "passion"]
  },
  {
    day: 14,
    title: "Day 14: At the Restaurant",
    duration: "2 min",
    videoId: "ScMzIvxBSi4",
    vocab: ["appetizer", "main course", "dessert", "waiter", "menu"]
  },
  {
    day: 15,
    title: "Day 15: Making Appointments",
    duration: "2 min",
    videoId: "dQw4w9WgXcQ",
    vocab: ["appointment", "schedule", "available", "confirm", "cancel"]
  },
  {
    day: 16,
    title: "Day 16: Discussing Movies",
    duration: "2 min",
    videoId: "M7lc1UVf-VE",
    vocab: ["movie", "actor", "plot", "scene", "recommend"]
  },
  {
    day: 17,
    title: "Day 17: Talking About Sports",
    duration: "2 min",
    videoId: "ysz5S6PUM-U",
    vocab: ["sport", "team", "game", "player", "competition"]
  },
  {
    day: 18,
    title: "Day 18: At the Bank",
    duration: "2 min",
    videoId: "jNQXAC9IVRw",
    vocab: ["account", "deposit", "withdraw", "balance", "transfer"]
  },
  {
    day: 19,
    title: "Day 19: Discussing News",
    duration: "2 min",
    videoId: "ScMzIvxBSi4",
    vocab: ["news", "current events", "headlines", "report", "update"]
  },
  {
    day: 20,
    title: "Day 20: Talking About Music",
    duration: "2 min",
    videoId: "dQw4w9WgXcQ",
    vocab: ["music", "song", "artist", "concert", "genre"]
  },
  {
    day: 21,
    title: "Day 21: At the Airport",
    duration: "2 min",
    videoId: "M7lc1UVf-VE",
    vocab: ["flight", "gate", "boarding", "delay", "luggage"]
  },
  {
    day: 22,
    title: "Day 22: Discussing Education",
    duration: "2 min",
    videoId: "ysz5S6PUM-U",
    vocab: ["education", "learning", "course", "teacher", "student"]
  },
  {
    day: 23,
    title: "Day 23: Talking About Technology",
    duration: "2 min",
    videoId: "jNQXAC9IVRw",
    vocab: ["technology", "device", "app", "internet", "digital"]
  },
  {
    day: 24,
    title: "Day 24: At the Gym",
    duration: "2 min",
    videoId: "ScMzIvxBSi4",
    vocab: ["exercise", "workout", "fitness", "trainer", "healthy"]
  },
  {
    day: 25,
    title: "Day 25: Discussing Books",
    duration: "2 min",
    videoId: "dQw4w9WgXcQ",
    vocab: ["book", "author", "chapter", "story", "reading"]
  },
  {
    day: 26,
    title: "Day 26: Making Complaints",
    duration: "2 min",
    videoId: "M7lc1UVf-VE",
    vocab: ["complaint", "issue", "problem", "solution", "apology"]
  },
  {
    day: 27,
    title: "Day 27: Giving Compliments",
    duration: "2 min",
    videoId: "ysz5S6PUM-U",
    vocab: ["compliment", "praise", "appreciate", "wonderful", "excellent"]
  },
  {
    day: 28,
    title: "Day 28: Discussing Future Plans",
    duration: "2 min",
    videoId: "jNQXAC9IVRw",
    vocab: ["future", "plan", "goal", "dream", "ambition"]
  },
  {
    day: 29,
    title: "Day 29: Talking About Culture",
    duration: "2 min",
    videoId: "ScMzIvxBSi4",
    vocab: ["culture", "tradition", "custom", "festival", "heritage"]
  },
  {
    day: 30,
    title: "Day 30: Review and Reflection",
    duration: "3 min",
    videoId: "dQw4w9WgXcQ",
    vocab: ["progress", "improvement", "journey", "achievement", "continue"]
  }
];

const extraSpeakingTasks = [
  "Introduce yourself in 60 seconds, including your name, where you're from, and one interesting fact about yourself.",
  "Describe your morning routine in detail, from waking up to starting your work or studies.",
  "Talk about your favorite movie and explain why you love it, including the plot, characters, and emotions it evokes.",
  "Explain one important goal you have for this month and describe the steps you'll take to achieve it.",
  "Describe your ideal weekend - what would you do, who would you spend it with, and why?",
  "Tell a story about a time you helped someone or someone helped you.",
  "Describe your favorite food and explain how to prepare it, step by step.",
  "Talk about a place you've visited that left a strong impression on you.",
  "Discuss a skill you'd like to learn and why it interests you.",
  "Share your opinion about the importance of friendship in our lives.",
  "Describe a typical festival or celebration in your culture.",
  "Talk about a book that changed your perspective on something.",
  "Explain how you deal with stress and difficult situations.",
  "Describe your favorite season and what you love about it.",
  "Share your thoughts about the role of technology in education.",
  "Discuss the importance of work-life balance in today's world.",
  "Describe a memorable travel experience you've had.",
  "Talk about someone who has influenced your life positively.",
  "Explain your favorite way to relax after a busy day.",
  "Share your views on environmental conservation and what we can do to help."
];

const extraListeningTasks = [
  {
    title: "Small Talk at Work",
    videoId: "M7lc1UVf-VE",
    vocab: ["colleague", "schedule", "deadline", "meeting", "project", "teamwork", "collaboration"]
  },
  {
    title: "Ordering at a Cafe",
    videoId: "ysz5S6PUM-U",
    vocab: ["menu", "recommend", "payment", "takeaway", "receipt", "espresso", "beverage"]
  },
  {
    title: "Travel Conversation",
    videoId: "dQw4w9WgXcQ",
    vocab: ["boarding", "departure", "destination", "passport", "luggage", "itinerary", "reservation"]
  },
  {
    title: "Job Interview Questions",
    videoId: "jNQXAC9IVRw",
    vocab: ["experience", "qualifications", "strengths", "teamwork", "career", "achievement", "challenge"]
  },
  {
    title: "Making Friends Abroad",
    videoId: "ysz5S6PUM-U",
    vocab: ["culture", "customs", "introduce", "conversation", "friendship", "abroad", "international"]
  },
  {
    title: "Shopping for Clothes",
    videoId: "M7lc1UVf-VE",
    vocab: ["size", "fitting", "color", "style", "discount", "receipt", "exchange"]
  },
  {
    title: "At the Pharmacy",
    videoId: "jNQXAC9IVRw",
    vocab: ["medicine", "prescription", "dosage", "symptoms", "pharmacist", "treatment", "advice"]
  }
];

async function loadCatalogFromFirestore() {
  try {
    const ref = doc(db, "taskCatalog", "english30");
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      console.log("No catalog found in Firestore, using defaults");
      return null;
    }

    const data = snap.data();
    return {
      speaking: Array.isArray(data.speaking) && data.speaking.length ? data.speaking : defaultSpeakingTasks,
      listening: Array.isArray(data.listening) && data.listening.length ? data.listening : defaultListeningTasks,
      extraSpeaking:
        Array.isArray(data.extraSpeaking) && data.extraSpeaking.length ? data.extraSpeaking : extraSpeakingTasks,
      extraListening:
        Array.isArray(data.extraListening) && data.extraListening.length
          ? data.extraListening
          : extraListeningTasks
    };
  } catch (error) {
    console.error("Error loading catalog from Firestore:", error);
    return null;
  }
}

const CATALOG_CACHE_KEY = "Fluento_catalog_cache_v1";
const CATALOG_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let catalogPromise = null;
let memoryCatalog = null;

function normalizeCatalog(data) {
  return {
    speaking: Array.isArray(data?.speaking) && data.speaking.length ? data.speaking : defaultSpeakingTasks,
    listening: Array.isArray(data?.listening) && data.listening.length ? data.listening : defaultListeningTasks,
    extraSpeaking: Array.isArray(data?.extraSpeaking) && data.extraSpeaking.length ? data.extraSpeaking : extraSpeakingTasks,
    extraListening:
      Array.isArray(data?.extraListening) && data.extraListening.length ? data.extraListening : extraListeningTasks
  };
}

function readCatalogCache() {
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.ts || !parsed?.data) return null;
    if (Date.now() - parsed.ts > CATALOG_CACHE_TTL_MS) return null;

    return normalizeCatalog(parsed.data);
  } catch (error) {
    console.warn("Catalog cache read failed:", error);
    return null;
  }
}

function writeCatalogCache(catalog) {
  try {
    localStorage.setItem(
      CATALOG_CACHE_KEY,
      JSON.stringify({
        ts: Date.now(),
        data: catalog
      })
    );
  } catch (error) {
    console.warn("Catalog cache write failed:", error);
  }
}

async function getLearningCatalog() {
  if (memoryCatalog) return memoryCatalog;
  if (catalogPromise) return catalogPromise;

  const cached = readCatalogCache();
  if (cached) {
    memoryCatalog = cached;
    console.log("Loaded catalog from local cache");
    return memoryCatalog;
  }

  catalogPromise = (async () => {
    try {
      const cloud = await loadCatalogFromFirestore();
      if (cloud) {
        memoryCatalog = normalizeCatalog(cloud);
        writeCatalogCache(memoryCatalog);
        console.log("Loaded catalog from Firestore");
        return memoryCatalog;
      }
    } catch (error) {
      console.error("Error getting learning catalog:", error);
    }

    memoryCatalog = normalizeCatalog();
    console.log("Using default catalog");
    return memoryCatalog;
  })();

  try {
    return await catalogPromise;
  } finally {
    catalogPromise = null;
  }
}

export { getLearningCatalog };

