AI Triage Assistant for Rural Health Centres
CT BuildFest 2.0 · CTBF-AI-02 · AI & Intelligent Systems

An explainable healthcare support prototype designed to help rural health workers prioritise patients, identify potential emergencies, and coordinate referrals.
The Problem
Rural health centres may face limited staff, resources, and internet connectivity. Assessing multiple patients and recognising urgent cases quickly can be challenging.
Our Solution
The system collects patient symptoms, vital signs, and relevant medical history, then uses a rule-based triage engine to assign a preliminary priority and explain the findings behind it. A priority dashboard helps staff review cases, while an SOS/referral workflow and multilingual health-information chatbot provide additional support.
Key Features
- Three-level triage: Emergency, Urgent, and Routine.
- Explainable results: Shows which configured findings triggered a priority.
- Red-flag alerts: Highlights potentially concerning symptoms or vital signs.
- Priority queue: Organises cases by urgency.
- Emergency SOS & referral: Provides hospital details and a patient referral summary.
- Multilingual chatbot: Provides basic health information in Hindi and English, with Punjabi as a possible addition.
- Offline-capable records: Designed to keep core patient records accessible when connectivity is unavailable.
Spotlight Feature
Explainable Triage + Emergency SOS connects a priority decision to a clear next step: show why a case was flagged, place it appropriately in the queue, and help the healthcare worker open an emergency referral workflow.
Proposed Tech Stack
- Frontend: React
- Backend: Python + FastAPI
- Triage engine: Python rule-based logic
- Chatbot: LLM API with curated health information
- Database: SQLite
- Version control: Git & GitHub
How It Works
1. Register a patient and enter symptoms, vital signs, and history.
2. Run the triage rules and display the priority with an explanation.
3. Show the patient in the priority queue.
4. Use the SOS/referral workflow for cases flagged for emergency escalation.
5. Access basic health information through the chatbot.
Project Status
Hackathon prototype in development. Features and integrations will be updated as they are implemented.
Safety Notice
This prototype is not clinically validated and does not replace medical professionals. It is not intended to diagnose or prescribe. Clinical rules require qualified medical review before real-world use. Use synthetic patient data for demonstrations, and clearly label simulated hospital information or SOS actions.
