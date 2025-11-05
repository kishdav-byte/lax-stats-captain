# LAX Stats Captain 🥍

Welcome to LAX Stats Captain, the ultimate AI-powered tool for managing your lacrosse team. This application allows coaches, players, and parents to keep score, track detailed player stats in real-time, manage rosters, schedule games, and even get AI-generated game summaries.

## ✨ Features

- **Real-Time Game Tracking:** Log goals, assists, shots, ground balls, and more as they happen.
- **Team & Roster Management:** Easily create teams and manage player rosters. Use the AI import feature to build your roster from a website in seconds!
- **AI-Powered Summaries:** After each game, generate a professional-quality game summary with a "Player of the Game" highlight using the Gemini API.
- **Player & Parent Dashboards:** Dedicated views for players to track their progress and for parents to follow their player and team.
- **AI Training Drills:** Improve skills with camera-based training modules for face-offs and shooting, providing instant feedback on reaction time and accuracy.
- **Role-Based Access Control:** Full user management system with roles for Admins, Coaches, Players, and Parents.

## 🚀 Getting Started Locally

To run this project on your own computer, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/kishdav-byte/lax-stats-captain.git
    cd lax-stats-captain
    ```

2.  **Install dependencies:**
    This project has a few development dependencies for running a local server and checking code quality.
    ```bash
    npm install
    ```

3.  **Run the development server:**
    This will start a local web server and open the application in your browser.
    ```bash
    npm start
    ```

4.  **Set up your API Key:**
    The first time you open the app, you will be prompted to enter your Google Gemini API key to enable the AI features.

## 💻 Tech Stack

- **Frontend:** React, TypeScript
- **Styling:** Tailwind CSS (via CDN)
- **AI:** Google Gemini API (`@google/genai`)
- **Development:** No bundler needed! Uses modern browser features like ES Modules and Import Maps.

## ☁️ Deployment Guide (Netlify)

This application is a "static site" and can be deployed for free on services like [Netlify](https://www.netlify.com/).

1.  **Push to GitHub:** Make sure all your code is pushed to your `lax-stats-captain` repository on GitHub.

2.  **Sign up for Netlify:** Create a free account on Netlify.

3.  **Create a New Site:**
    - From your Netlify dashboard, click **"Add new site"** -> **"Import an existing project"**.
    - Connect to **GitHub** and authorize Netlify to access your repositories.
    - Select your `lax-stats-captain` repository.

4.  **Configure Build Settings:**
    This is the most important step. Because our app doesn't need a "build" step, the settings are very simple:
    - **Build command:** Leave this field **BLANK**.
    - **Publish directory:** Set this to `.` (a single period, meaning the root of your project).

5.  **Deploy!**
    - Click **"Deploy site"**. Netlify will take all the files from your GitHub repository and host them.
    - In a minute or two, your site will be live on a public URL! You can customize this URL in the Netlify site settings.