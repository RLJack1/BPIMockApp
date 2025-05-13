@echo off
cd "%~dp0GitHub\BPIMockApp"
start cmd /k "nodemon server.js"  // Start Nodemon
timeout 5 >nul  // Wait for 2 seconds to allow the server to start
start http://localhost:3000  // Open the browser