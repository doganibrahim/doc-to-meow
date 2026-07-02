# 🐾 Doc to Meow: The AI-Powered Pet Health & Habit Tracker

Hey there! Welcome to the **Doc to Meow** repository!

If you're a cat parent, you know the drill: you go to the vet, they hand you a complicated report filled with medical jargon, and you're left wondering, *"Okay, but what do I actually need to do?!?!?!!"* That's exactly why I'm building this app. I wanted to create a space where you can just upload that confusing vet report and let a custom multi-agent AI architecture translate it into a simple, warm, and actionable care plan—smartly organizing everything into essential one-off **to-dos** and consistent daily **habits**.

I'm a huge believer in the power of compound growth—small, consistent daily actions are what truly keep our fluffy friends healthy and happy in the long run.

## The Tech Stack

* **Frontend:** React + TypeScript (Warm, cozy UI with big rounded buttons and 2D cat illustrations)
* **Backend:** Node.js
* **AI Orchestration (Backend):** Custom Multi-Agent Pipeline (utilizing In-Context Learning / Few-Shot Prompting for hallucination-free data extraction)
* **Development:** Kiro
* **Styling:** Tailwind CSS

---

## My 12-Day Sprint Plan

### Day 1: Laying the Foundation & Catching the Vibe - DONE!!!
* Set up the React (Vite) and Node.js repositories.
* Configure Tailwind CSS with the exact color palette.
* Get Kiro ready for the workflow. Today is all about setting up the environment and establishing the visual vibe of the app.

### Day 2: Authentication & Welcoming the Cats - DONE!!!
* Build the user registration and login flow.
* Create the "Add Pet" interface. I want this to be super cute—users will enter their cat's name, age, weight, and pick a little avatar.
* Design the main "My Cats" dashboard.

### Day 3: The Report Upload Center - DONE!!!
* Build the UI for the "Add New Vet Report" section on the pet's detail page.
* Implement the drag-and-drop file upload component (supporting PDFs and images).
* Set up the backend endpoints to securely receive and temporarily store these files.

### Day 4: Unleashing the First Agent (Vision & Data) - DONE!!!
* Build **Agent 1: The Data Extractor**. Its only job is to look at the messy PDFs or photos of vet reports and flawlessly extract the raw text without making any assumptions.

### Day 5: The Medical Translator Agent - DONE!!!
* Build **Agent 2: The Medical Translator**.
* I'll use In-Context Learning (providing pre-processed vet reports as a guide) to prompt engineer this agent to take the raw, scary medical jargon from Agent 1 and translate it into warm, reassuring, and easy-to-understand language.

### Day 6: The Habit Architect Agent
* Build **Agent 3: The Habit Architect**. This is where the magic happens!
* This agent will analyze the translated report and break it down into an actionable JSON format. It will separate tasks into **To-Dos** (e.g., "Buy renal cat food") and **Habits** (e.g., "Give 5ml of syrup every morning").

### Day 7: The Vibe Controller & Backend Integration
* Build **Agent 4: The Vibe & Format Controller**. This agent ensures the final output matches our app's friendly tone and guarantees the JSON is perfectly structured.
* Connect the entire custom multi-agent pipeline to the Node.js backend so the frontend can request the processed data seamlessly.

### Day 8: The "Aha!" Moment - Results UI
* Build the screen where the user finally sees the AI's output.
* They'll read the friendly summary and see a list of recommended habits and to-dos.
* Add checkboxes so users can select which habits they want to commit to and hit the big "Start Tracking" button.

### Day 9: Building the Tracker Engine
* Set up the database schema for tracking daily completions and streaks.
* Create the backend logic to generate daily tasks based on the accepted habits.
* Build the interactive Dashboard UI where users can check off their daily cat care tasks.

### Day 10: Micro-interactions & Dopamine Hits
* A habit tracker needs to feel rewarding! Today is all about adding micro-interactions.
* I'll add confetti effects, satisfying checkbox animations, and maybe a little happy cat SVG that pops up when a daily streak is maintained.

### Day 11: The Loop & Edge Cases
* What happens when the user uploads a *new* report 3 months later? Today I'll write the logic to merge new AI recommendations with existing habits without breaking the user's streaks.
* End-to-end testing of the entire flow. Squashing bugs like a cat chasing a laser pointer.

### Day 12: Deployment & Polishing
* Final UI polish—making sure those thick fonts and rounded borders look perfect on mobile.
* Deploy the frontend to Vercel/Netlify and the backend to Render/Railway.
* Share the live link with the world (or maybe just with you) for the first real user tests.

---

## Future Roadmap: Beyond a Simple Tracker

While the initial 12-day sprint focuses on delivering a robust, functional pipeline, the long-term vision for **Doc to Meow** is to evolve from a static tracker into a dynamic, living ecosystem for pet health.

* **Agent-Based Modeling (ABM) for Pets:** Instead of treating cats as static database rows, I plan to model each pet as an autonomous agent within the app. The AI-extracted vet reports will set the agent's "initial state," and the user's daily tracker inputs (e.g., feeding times, medicine given) will act as environmental variables. The app will simulate the cat's health trajectory, providing proactive, dynamic feedback rather than just reactive notifications.
* **The Ratchet Effect & Algorithmic Compound Growth:** I want to replace the standard "streak" system with an algorithmic approach to habit building. By implementing the "Ratchet Effect," the system will acknowledge that small, consistent daily actions compound over time, building a resilient "health score" for the cat that doesn't just crash to zero if you miss a single day, but rather reflects the cumulative reality of long-term care.
* **Expanded In-Context Memory:** Creating a vector database to store edge-case vet reports that pass manual review. This will dynamically feed the most relevant examples into the LLM's context window, allowing the system to handle incredibly rare or complex medical reports with pinpoint accuracy without ever needing to fine-tune a massive model.

---

*“A healthy cat is a happy cat, and it all starts with small, daily habits.”*

---

## License

This project is licensed under the MIT License - see the [LICENSE](file:///c:/dev/doc-to-meow/LICENSE) file for details. Honestly, feel free to copy the whole thing, tweak it, and slap it onto your portfolio. I won't tell anyone. Just make sure to feed your cat! 🐾