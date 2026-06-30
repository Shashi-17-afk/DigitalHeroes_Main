Digital Heroes

Digital Heroes is a subscription-based golf rewards platform that combines golf performance, charitable giving, and monthly prize draws into a single ecosystem.

Users can subscribe, submit golf scores, support charities, participate in draws, and manage their activity through a personalized dashboard. Administrators can manage users, charities, draws, winners, and platform operations through a dedicated admin panel.

---

Live Demo

Live URL: "https://digital-heroes-main.vercel.app/"

---

Features

User Features

- User Authentication
- Subscription Management
- Golf Score Tracking
- Monthly Draw Participation
- Charity Selection
- Dashboard Management
- In-App Notifications
- Responsive Design

Admin Features

- Admin Dashboard
- User Management
- Charity Management
- Draw Management
- Winner Management
- Verification Workflow
- Platform Monitoring

---

Tech Stack

Frontend

- Next.js 15
- React
- TypeScript
- CSS

Backend

- Next.js API Routes
- Server-Side Functions

Database & Authentication

- Supabase
- PostgreSQL
- Supabase Auth

Payments

- Razorpay

Email Notifications

- Resend

Deployment

- Vercel

---

System Architecture

User
 ↓
Next.js Frontend
 ↓
API Routes
 ↓
Supabase Database

External Services:
- Razorpay
- Resend
- Supabase Auth

---

Core Modules

Authentication

- User Signup
- User Login
- Protected Routes
- Role-Based Access Control

Subscription System

- Razorpay Checkout
- Payment Verification
- Subscription Tracking
- Webhook Support

Score Management

- Add Scores
- Edit Scores
- Delete Scores
- Latest 5 Scores Retained
- Reverse Chronological Order

Charity System

- Charity Directory
- Charity Profiles
- Charity Selection
- Contribution Preferences

Draw System

- Monthly Draws
- Draw Publishing
- Winner Selection
- Draw History

Notifications

- In-App Notifications
- Email Notification Framework

---

Environment Variables

Admin login is pre written in env file
contact me for admin login for evaluation process

Create a ".env.local" file:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

RAZORPAY_PLAN_MONTHLY=
RAZORPAY_PLAN_YEARLY=

RESEND_API_KEY=
EMAIL_FROM=

NEXT_PUBLIC_APP_URL=

Installation

Clone the repository:

git clone <repository-url>
cd digital-heroes

Install dependencies:

npm install

Run development server:

npm run dev

Application runs at:

http://localhost:3000

---

Build

Create production build:

npm run build

Start production server:

npm start

---

Deployment

The application is configured for deployment on Vercel.

Deployment Steps

1. Push code to GitHub
2. Import repository into Vercel
3. Configure environment variables
4. Deploy

Health Check

/api/health

Expected Response:

{
  "status": "ok"
}

---

Project Highlights

- Full-Stack Application
- Authentication & Authorization
- Payment Integration
- Database-Driven Architecture
- Admin Management System
- Charity Engagement Workflow
- Draw & Rewards System
- Production Deployment Ready

---

Author

Shashi

Built as part of the Digital Heroes Technical Assessment.