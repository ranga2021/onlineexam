# Online Examination System

## Description
A web-based online examination system where admins upload questions using DOCX files and users can take exams without login.

## Features
- Admin exam creation
- DOCX question upload
- Automatic evaluation
- Timer-based quiz
- Result with score

Admin username- admin
Admin password- admin123

## Tech Stack
- Node.js
- Express
- MySQL
- Mammoth.js
- HTML / JavaScript

## Installation
1. Install Node.js
2. Install MySQL
3. Create database using provided SQL
4. Configure backend/db.js
5. Run `npm install`
6. Run `npm start`

## API Endpoints
- POST /api/exams
- GET /api/exams
- POST /api/questions/upload/:examId
- POST /api/attempts/submit

## Author
GroovyMark
