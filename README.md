# DataVault React Frontend

This is a modern, professional, glassmorphic React frontend application built using **Vite** and **React 18** for uploading and organizing files in the DataVault project.

It has been optimized with fluid layouts, responsive styling, and custom breakpoints to support execution on:
*   🖥️ Desktop / Laptop browsers
*   📱 Mobile screens (iOS/Android mobile viewport layouts)

## Prerequisites
To run this application locally, you must have **Node.js** (v16.0.0 or higher) and **npm** installed on your system.

## Setup Instructions

1.  **Navigate to the project folder**:
    ```bash
    cd datavault-react-fe
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the development server**:
    ```bash
    npm run dev
    ```

    The application will start, and the console will output the local URL (usually `http://localhost:3000`).

4.  **Open in browser**:
    Access the URL to interact with the interface. Make sure the backend Spring Boot application is running on port `8081`!

## Project Structure
The frontend application layout is clean, modular, and split into components:
*   `src/components/UploadForm.jsx`: Controls input fields, states, file drops, and validations.
*   `src/components/ResultCard.jsx`: Renders upload feedbacks (success paths or connection errors).
*   `src/App.jsx`: Manages global UI views.
*   `src/App.css` & `src/index.css`: Declares color schemes and typography designs.
