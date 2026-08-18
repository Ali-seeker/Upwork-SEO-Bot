# Codebase Brain

This file provides a complete tree-like overview of the project's file structure and architecture. Each file/folder has a one-liner description explaining exactly what it does.

## Root Directory
- `.env.example`: Template for environment variables needed by the Node/Electron app.
- `.gitignore`: Specifies intentionally untracked files to ignore in Git.
- `ai_setup.md`: Setup instructions and architecture rules for AI agents in this project.
- `cookies.json`: Stores authentication cookies for browser automation tasks.
- `electron-builder.yml`: Configuration for building and packaging the Electron app.
- `eslint.config.js`: ESLint configuration for code linting rules.
- `index.html`: Entry point HTML for the Vite + React frontend.
- `package-lock.json`: Exact dependency versions lockfile for npm.
- `package.json`: Project metadata, scripts, and npm dependencies.
- `vite.main.config.ts`: Vite configuration for bundling the Electron main process.
- `vite.preload.config.ts`: Vite configuration for bundling the Electron preload script.
- `vite.renderer.config.ts`: Vite configuration for bundling the React renderer process.

## `.agents` (Custom AI Rules)
- `rules/builder.md`: Guidelines for AI agents on how to build and modify code.
- `rules/explorer.md`: Guidelines for AI agents on how to navigate and understand the codebase.

## `src` (Main Application Source Code)

### `src/main` (Electron Main Process)
- `ipcHandlers.js`: Defines Inter-Process Communication (IPC) handlers to communicate between main and renderer.
- `main.js`: Entry point for the Electron application (creates window, initializes backend services).
- `preload.js`: Bridge script to expose safe Node.js APIs to the renderer process.

### `src/renderer` (React Frontend)
- `App.jsx`: Main React component containing layout and routing setup.
- `index.css`: Global CSS styles and Tailwind imports.
- `main.jsx`: React entry point rendering the app to the DOM.
- `components/CampaignForm.jsx`: Form component for creating or editing campaigns.

- `components/Sidebar.jsx`: Main navigation sidebar component.
- `components/ui/button.jsx`: Reusable button UI component.
- `components/ui/input.jsx`: Reusable text input UI component.
- `pages/Dashboard.jsx`: Main dashboard page showing high-level system metrics.
- `pages/IndexerCampaigns.jsx`: Page to manage Indexer campaigns.
- `pages/Logs.jsx`: Page displaying system and campaign execution logs.

- `pages/ScrapeJobsCampaigns.jsx`: Page to configure and manage Upwork scraping campaigns.
- `pages/StarsCampaigns.jsx`: Page to manage Stars campaigns.
- `pages/UpworkCampaigns.jsx`: Page to manage Upwork automated campaigns.
- `pages/ViewCampaigns.jsx`: Page to manage View/Traffic generation campaigns.

### `src/services` (Backend Services & Automation)
- `campaignManager.js`: Base or general campaign manager handling campaign lifecycles.
- `databaseService.js`: Abstraction for lower-level database interactions.
- `delayManager.js`: Utility to manage artificial delays to avoid triggering rate limits.
- `gologinService.js`: Integration with GoLogin API for anti-detect browser profiles.
- `indexerCampaignManager.js`: Handles logic for running Indexer campaigns.
- `initializeGPTAccounts.js`: Script to setup default GPT credentials.

- `Starscampaignmanager.js`: Handles logic for GitHub stars generation campaigns.
- `storage.js`: Local storage/database abstraction for persisting campaigns, proxies, and logs.
- `testScript.js`: Development scripts for testing specific system components.
- `upworkCampaignManager.js`: Handles fetching, filtering, and processing Upwork jobs.
- `upworkJobService.js`: Service for interacting with Upwork job feeds or APIs.
- `vaPromptGenerator.js`: Generates GPT prompts for Virtual Assistant (VA) tasks.
- `viewBotRunner.js`: Core logic for executing viewbot tasks using Puppeteer.
- `viewCampaignManager.js`: Orchestrates viewbot campaigns.
- `appilot/`: Folder containing assets for Appilot branding.
- `media/`: Folder containing generic media assets (images, gifs).

### `src/utils`
- `jsonRepairUtil.js`: Utility to repair malformed JSON strings returned by GPT.
- `parser.js`: Generic text parsing and extraction utilities.
- `portFinder.js`: Utility to find open network ports for local servers.

## `upwork-discord-bot` (Standalone Python Subproject)
- `.env`: Environment variables for the Python bot.
- `config.py`: Configuration variables loaded from the environment.
- `headers_upwork.json` & `upwork_cookies.json`: Authentication data for Upwork API requests.
- `main.py`: Entry point for the Discord bot application.
- `requirements.txt`: Python pip dependencies listing.
- `seen_threads.json`: Tracks already processed Discord threads to prevent duplicates.
- `README_UBUNTU.md`: Documentation for deploying the bot on an Ubuntu server.
- `test_ubuntu_auth.py`: Script to test Upwork authentication explicitly on Ubuntu.

### `bot` (Discord Bot Logic)
- `discord_bot.py`: Implements Discord bot commands and event listeners.
- `job_search_keywords.py`: Defines keywords for filtering Upwork jobs.

### `db` (Database Models)
- `database.py`: SQLAlchemy database connection setup.
- `models.py`: SQLAlchemy ORM models definitions.

### `scraper` (Upwork Scraping Automation)
- `authbot.py` & `authbot2.py`: Automation scripts for handling Upwork authentication flows.
- `bhw_scraper.py`: Scraper designed for BlackHatWorld.
- `cookies.py`: Utilities for parsing and injecting browser cookies.
- `db_saver.py`: Logic to save scraped jobs securely to the database.
- `debug_login.py`: Script to debug the Upwork login automation flow.
- `fetch_job_details_standalone.py`: CLI tool to fetch a single job's details for testing.
- `graphql_payloads.py`: Defines GraphQL query payloads used by Upwork's internal backend.
- `job_details.py` & `job_details_html.py`: Extract detailed data from Upwork job pages.
- `job_fetch.py` & `job_search.py`: Fetch job listings via API requests or HTML scraping.
- `setup_ubuntu.sh`: Bash deployment script for setting up the environment on Ubuntu.
- `test_browser_setup.py`: Validates Puppeteer/Playwright browser configuration on the host machine.
- `token_manager.py`: Manages and refreshes Upwork authentication tokens.
- `upwork_scraper.py`: Main orchestrator for the Upwork Python scraping pipeline.
- `_debug/`: Contains raw HTML dumps for debugging the scraper logic (e.g., login attempts, probes).
