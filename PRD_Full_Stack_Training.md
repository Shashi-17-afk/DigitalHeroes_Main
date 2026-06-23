SAMPLE · Selection Process Only · digitalheroes.co.in 

**Digital Heroes  ·  PRD —** 

II **SAMPLE DOCUMENT — Issued for Selection Process Only** II 

**==> picture [490 x 40] intentionally omitted <==**

|**Issued By**|Digital Heroes · digitalheroes.co.in|
|---|---|
|**Document Type**|Product Requirements Document (PRD)|
|**Purpose**|Trainee Selection Process — Sample Assignment|
|**Version**|1.0 · March 2026|
|**Audience**|Full-Stack Development Trainees / Applicants|



**Document Summary:** This PRD outlines the complete product specification by combining performance tracking, monthly prize draws, and charitable giving. It has been prepared by Digital Heroes as a sample assignment document for evaluating full-stack development trainees during the selection process. It serves as the single source of truth for design, development, and evaluation. 

## **01 PROJECT OVERVIEW** 

The platform is a subscription-driven web application combining golf performance tracking, charity fundraising, and a monthly draw-based reward engine. It is designed to feel **emotionally engaging and modern** — deliberately avoiding the aesthetics of a traditional golf website. 

## **Users will:** 

Subscribe to the platform (monthly or yearly) 

- Enter their latest golf scores in Stableford format 

- Participate in monthly draw-based prize pools 

- Support a charity of their choice with a portion of their subscription 

**02 CORE OBJECTIVES** 

|**Subscription Engine**|Build a robust subscription and payment system|
|---|---|
|**Score Experience**|Simple, engaging score-entry flow|
|**Custom Draw Engine**|Algorithm-powered or random monthly draws|
|**Charity Integration**|Seamless charity contribution logic|
|**Admin Control**|Comprehensive admin dashboard and tools|
|**Outstanding UI/UX**|Design that stands out in the golf industry|



Product Requirements Document  · 

Page 1 

SAMPLE · Selection Process Only · digitalheroes.co.in 

**Digital Heroes  ·  PRD —** 

## **03 USER ROLES** 

## I **Public Visitor** 

- View platform concept 

- Explore listed charities 

- Understand draw mechanics 

- Initiate subscription 

## I **Registered Subscriber** 

- Manage profile & settings 

- Enter / edit golf scores 

- Select charity recipient 

- View participation & winnings 

- Upload winner proof 

## I **Administrator** 

- Manage users & subscriptions 

- Configure & run draws 

- Manage charity listings 

- Verify winners & payouts 

- Access reports & analytics 

## **04 SUBSCRIPTION & PAYMENT SYSTEM** 

**Plans** Monthly plan and Yearly plan (discounted rate) **Gateway** Stripe (or equivalent PCI-compliant provider) **Access Control** Non-subscribers receive restricted access to platform features **Lifecycle** Handles renewal, cancellation, and lapsed-subscription states **Validation** Real-time subscription status check on every authenticated request 

## **05 SCORE MANAGEMENT SYSTEM** 

## **Input Requirements** 

Users must enter their **last 5 golf scores** 

- Score range: **1 – 45** (Stableford format) 

Each score must include a **date** 

## **Functional Behaviour** 

Only the latest 5 scores are retained at any time 

- A new score **replaces the oldest** stored score automatically 

Scores are displayed in **reverse chronological order** (most recent first) 

## **06 DRAW & REWARD SYSTEM** 

## **Draw Types** 

- 5-Number Match 

- 4-Number Match 

- 3-Number Match 

## **Draw Logic Options** 

**Random generation** — standard lottery-style draw 

**Algorithmic** — weighted by most/least frequent user scores 

## **Operational Requirements** 

Monthly cadence — draws executed once per month 

- Admin controls publishing of draw results 

- Simulation / pre-analysis mode before official publish 

- Jackpot rollover to next month if no 5-match winner 

Product Requirements Document  · 

Page 2 

SAMPLE · Selection Process Only · digitalheroes.co.in 

**Digital Heroes  ·  PRD —** 

## **07 PRIZE POOL LOGIC** 

A fixed portion of each subscription contributes to the prize pool. Distribution is pre-defined and enforced automatically. 

|**Match Type**|**Pool Share**|**Rollover?**|
|---|---|---|
|5-Number Match|40%|Yes (Jackpot)|
|4-Number Match|35%|No|
|3-Number Match|25%|No|



Auto-calculation of each pool tier based on active subscriber count 

- Prizes split equally among multiple winners in the same tier 

- 5-Match jackpot carries forward if unclaimed 

## **08 CHARITY SYSTEM** 

## **Contribution Model** 

Users select a charity at signup 

- Minimum contribution: **10%** of subscription fee 

- Users may voluntarily increase their charity percentage 

- Independent donation option (not tied to gameplay) 

## **Charity Directory Features** 

Charity listing page with search and filter 

Individual charity profiles: description, images, upcoming events (e.g. golf days) 

- Featured / spotlight charity section on homepage 

**09 WINNER VERIFICATION SYSTEM** 

|**Eligibility**|Verification process applies to winners only|
|---|---|
|**Proof Upload**|Screenshot of scores from the golf platform|
|**Admin Review**|Approve or Reject submission|
|**Payment States**|Pending→Paid|



**10 USER DASHBOARD** 

Must include all of the following: 

|Must|include all of the following:|
|---|---|
||Subscription status (active / inactive / renewal date)|
||Score entry and edit interface|
||Selected charity and contribution percentage|
||Participation summary (draws entered, upcoming draws)|



Product Requirements Document  · 

Page 3 

SAMPLE · Selection Process Only · digitalheroes.co.in 

**Digital Heroes  ·  PRD —** 

Winnings overview: total won and current payment status 

~~NOTE: Only one score entry is permitted per date. Duplicate scores for the same date are not allowed.~~ An existing score entry for a date may only be edited or deleted. 

## **11 ADMIN DASHBOARD** 

## **User Management** 

View and edit user profiles 

- Edit golf scores 

- Manage subscriptions 

## **Draw Management** 

Configure draw logic (random vs. algorithm) 

- Run simulations 

Publish results 

## **Charity Management** 

Add, edit, delete charities 

Manage content and media 

## **Winners Management** 

View full winners list 

- Verify submissions 

- Mark payouts as completed 

## **Reports & Analytics** 

Total users 

- Total prize pool 

- Charity contribution totals 

- Draw statistics 

## **12 UI / UX REQUIREMENTS** 

The platform must **not** resemble a traditional golf website. Design must be emotion-driven — leading with charitable impact, not sport. 

|The platform must**not**resemble a tradi<br>charitable impact, not sport.|tional golf website. Design must be emotion-driven — leading with|
|---|---|
|**Feel**|Clean, modern, motion-enhanced interface|
|**Avoid**|Golf clichés (fairways, plaid, club imagery as primary design language)|
|**Homepage**|Clearly communicates: what the user does, how they win, charity impact,<br>and CTA|
|**Animations**|Subtle transitions and micro-interactions throughout|
|**CTA**|Subscribe button / flow must be prominent and persuasive|



## **13 TECHNICAL & ADDITIONAL REQUIREMENTS** 

**Mobile-first** , fully responsive design 

**Fast performance** — optimised assets, minimal blocking resources 

- **Secure authentication** — JWT or session-based, HTTPS enforced 

- **Email notifications** — system updates, draw results, winner alerts 

Product Requirements Document  · 

Page 4 

SAMPLE · Selection Process Only · digitalheroes.co.in 

**Digital Heroes  ·  PRD —** 

## **14 SCALABILITY CONSIDERATIONS** 

Architecture must support **multi-country** expansion 

- Extensible to teams / corporate accounts 

- Campaign module ready for future activation 

Codebase structured to support a mobile app version 

## **15 MANDATORY DELIVERABLES** 

|**Live Website**|Fully deployed, publicly accessible URL|
|---|---|
|**User Panel**|Test credentials; signup / login / score entry / dashboard all functional|
|**Admin Panel**|Admin credentials; user management, draw system, charities, winner<br>verification|
|**Database**|Backend connected (e.g. Supabase) with proper schema|
|**Source Code**|Clean, structured, well-commented codebase|



## **Deployment Constraints** 

Deploy to a **new Vercel account** (not personal/existing) 

- Use a **new Supabase project** (not personal/existing) 

- Environment variables must be properly configured 

## **16 EVALUATION CRITERIA** 

|**Requirements Interpretation**|How accurately the team translates requirements into features|
|---|---|
|**System Design**|Quality of architecture decisions and data modelling|
|**UI/UX Creativity**|Originality, polish, and emotional engagement of the interface|
|**Data Handling**|Accuracy of score logic, draw engine, and prize calculations|
|**Scalability Thinking**|Extensibility of the codebase and data structures|
|**Problem-Solving**|How ambiguous requirements are identified and resolved|



## **Testing Checklist** 

||User signup & login|
|---|---|
||Subscription flow (monthly and yearly)|
||Score entry — 5-score rolling logic|
||Draw system logic and simulation|
||Charity selection and contribution calculation|
||Winner verification flow and payout tracking|



Product Requirements Document  · 

Page 5 

SAMPLE · Selection Process Only · digitalheroes.co.in 

**Digital Heroes  ·  PRD —** 

||User Dashboard — all modules functional|
|---|---|
||Admin Panel — full control and usability|
||Data accuracy across all modules|
||Responsive design on mobile and desktop|
||Error handling and edge cases|



Product Requirements Document  · 

Page 6 

