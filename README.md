AI Triage Assistant for Rural Health Centres
CT BuildFest 2.0 | Official Problem Statement: CTBF-AI-02 | Theme: AI & Intelligent Systems

An explainable, rural-first healthcare support prototype designed to help healthcare workers prioritize patients, identify potential warning signs, and coordinate referrals. The system combines structured patient intake, rule-based triage, a live priority queue, an emergency SOS/referral workflow, multilingual health information, and offline-capable records.
Safety notice: This is a hackathon prototype, not a medical device or a clinically validated decision-support system. It does not diagnose, prescribe, or replace qualified healthcare professionals. Clinical rules and thresholds must be reviewed by qualified professionals before any real-world use.

Table of Contents
- Problem
- Our Solution
- Key Features
- How It Works
- Spotlight Feature
- Proposed Technology Stack
- Architecture
- Hackathon Demo
- Getting Started
- Project Status
- Safety, Privacy, and Limitations
- Roadmap
- Team
- Disclaimer
Problem
Rural health centres may need to assess several patients with limited staff, resources, and internet connectivity. Important warning signs can be difficult to manage consistently, and finding a suitable facility or preparing a referral can add extra steps.

The project explores how a digital workflow can support structured patient intake, transparent prioritization, and emergency referral coordination in resource-constrained settings.
Our Solution
The AI Triage Assistant collects relevant patient information—such as symptoms, vital signs, and medical history—and runs it through a rule-based triage engine. The prototype assigns a preliminary priority level and explains which configured findings triggered the result.

A dashboard presents cases in a priority queue. For cases flagged as potentially emergent, healthcare workers can open an SOS/referral workflow. A separate multilingual chatbot provides basic health information, while locally stored records are designed to remain available when internet connectivity is interrupted.

The system supports healthcare workers; it does not independently make final clinical decisions.
Key Features
- Structured patient intake: Capture symptoms, symptom duration, temperature, blood pressure, oxygen saturation (SpO₂), pulse, and relevant medical history.
- Three-level triage: Preliminary Emergency, Urgent, and Routine classifications.
- Explainable results: Show the configured symptoms, measurements, or warning rules that triggered a priority.
- Red-flag checks: Highlight potentially concerning findings and combinations based on rules reviewed by qualified healthcare professionals.
- Live priority queue: Organize cases by assigned priority so staff can identify cases needing attention.
- SOS and referral workflow: Present available hospital details, contact options, directions, and a structured referral summary.
- Multilingual health-information chatbot: Planned support for Hindi and English, with Punjabi as a possible additional language, using an LLM API and curated information.
- Offline-capable records: Keep core registration, triage, and records accessible locally, with synchronization when connectivity returns.
- Repeatable demo cases: Use synthetic patient scenarios to demonstrate predictable workflows without exposing real patient data.
- Optional voice-assisted input: An enhancement to make data entry easier where feasible.
How It Works
1. Register the patient and enter relevant symptoms, vital signs, and history.
2. Run triage rules to check configured thresholds and red-flag combinations.
3. Review the result and the explanation for the preliminary priority.
4. View the priority queue to see how the case is ordered.
5. Escalate when appropriate using the SOS/referral workflow and available hospital information.
6. Access health information through the constrained multilingual chatbot.
7. Continue offline where supported and synchronize local records when connectivity returns.
Priority Levels
Level	Intended workflow
Emergency	Highlight the case and prompt immediate professional escalation for configured warning signs.
Urgent	Flag for prompt assessment by a qualified healthcare professional.
Routine	Place in the normal queue only when no configured urgent/emergency criteria are detected, subject to human review.


A Routine result is not proof that a patient is safe. Missing data, uncertainty, or worsening symptoms require reassessment and professional review.
Spotlight Feature
Explainable Triage + Emergency SOS
The main differentiator is the connection between why a case was flagged and what the healthcare worker can do next.

For a synthetic demo case containing severe breathing difficulty and a concerning oxygen reading, the system should show the triggering findings, assign a preliminary emergency priority according to its configured rules, move the case to the top of the queue, and provide the SOS/referral options.

Hospital lookup, calls, notifications, or ambulance dispatch depend on the integrations actually implemented. A demo directory or simulated SOS must be labelled clearly as simulated.
Proposed Technology Stack
The stack below is a proposal and may change as implementation progresses.
Component	Proposed technology
Frontend	React
Backend API	Python + FastAPI
Triage logic	Python rule-based engine
Chatbot	LLM API with constrained responses and curated health information
Local database	SQLite
Offline support	Local storage/database and synchronization logic
Hospital information	Maps/places API or curated demo directory
Version control	Git + GitHub


Model/API strategy: Do not rely on an LLM alone to make triage decisions. Use deterministic, explainable rules for the core triage workflow; use an LLM API primarily for natural-language and multilingual health-information interactions. The prototype does not require training a medical model from scratch.
Architecture
Patient / Healthcare Worker
            |
            v
     Patient Intake UI
            |
            v
       Backend API
            |
            v
   Rule-Based Triage Engine
   - Configured thresholds
   - Red-flag rules
   - Explanation of triggers
            |
            v
 Priority Queue + Patient Record
            |
      +-----+-------------------+
      |                         |
      v                         v
SOS / Referral Workflow   Local Record Storage
      |                         |
      v                         v
Hospital Details          Sync when online
      |
      +------------------------------+

Multilingual Health Chatbot
            |
            v
       LLM API + curated
       health information
This is a conceptual architecture; it should be updated to match the code that is actually implemented.
Hackathon Demo
Use synthetic cases to demonstrate the core workflow:
1. Routine case: Show the preliminary classification and its explanation.
2. Urgent case: Show the warning findings and priority queue placement.
3. Emergency case: Show the alert, reason for escalation, queue reordering, and SOS/referral flow.
4. Accessibility case: Ask the chatbot a basic health-information question in a supported language.
5. Offline case: Demonstrate that core local records remain available without internet, if offline support has been implemented.
Use repeatable test cases so the same inputs produce consistent triage results.
Getting Started
Implementation status: The final framework, environment setup, API keys, and commands should be added once the repository code is in place. The steps below are a planning placeholder, not verified installation instructions.

Prerequisites
- Python (version to be specified by the project)
- Node.js and npm (if using the proposed React frontend)
- Git
- An LLM API key for chatbot functionality, if an external provider is selected
Planned setup
1. Clone the repository:git clone <YOUR_REPOSITORY_URL>
   cd <YOUR_REPOSITORY_FOLDER>
2. Follow the frontend and backend setup instructions added by the team.
3. Configure API keys using environment variables in a local .env file.
4. Never commit API keys, credentials, or real patient information.
5. Run the application using the commands documented for the implemented version.
Replace this section with tested, exact commands before presenting the repository as runnable.
Project Status
Stage: Hackathon project / prototype in development.

Planned implementation order:
- [ ] Patient registration and structured vital-sign entry
- [ ] Rule-based triage engine and explanation
- [ ] Emergency / Urgent / Routine queue
- [ ] Red-flag alerts
- [ ] Local record storage
- [ ] SOS/referral workflow
- [ ] Multilingual chatbot
- [ ] Offline synchronization
- [ ] Optional voice-assisted input
- [ ] Synthetic test cases and demo walkthrough
- [ ] Tests, documentation, and privacy review
Update the checklist as features are implemented and tested. Do not describe planned features as completed functionality.
Safety, Privacy, and Limitations
- This prototype is not clinically validated and is not intended for unsupervised clinical use.
- Clinical rules, thresholds, and escalation criteria require qualified medical review.
- The system must not delay emergency care while waiting for an AI response or an API connection.
- The chatbot must not diagnose, prescribe, or override emergency escalation rules.
- Incomplete or uncertain information should be surfaced for human assessment rather than automatically classified as low risk.
- Use synthetic data for hackathon demonstrations.
- Minimize personal data collection and protect stored records and API credentials.
- Clearly label simulated hospital information and SOS actions.
- External services may be unavailable offline; the app should communicate those limitations clearly.
Roadmap
- [ ] Build and test the core triage workflow
- [ ] Add explainable priority queue and red-flag indicators
- [ ] Implement SOS/referral prototype
- [ ] Add constrained multilingual chatbot
- [ ] Implement and test offline record synchronization
- [ ] Add voice-assisted entry if time permits
- [ ] Test against repeatable synthetic cases
- [ ] Improve accessibility, error handling, and documentation
Team
Add team members and their roles here.
Team member	Role
TBD	TBD
TBD	TBD
TBD	TBD
TBD	TBD
TBD	TBD
TBD	TBD


Disclaimer
This repository describes a hackathon prototype for healthcare workflow support. It is not a substitute for medical advice, diagnosis, treatment, or emergency services. Any real-world deployment would require clinical validation, privacy and security review, appropriate integrations, and compliance with applicable regulations.
