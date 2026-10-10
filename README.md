
# 🏙️ CivicTech - Smart Streets & Infrastructure Map

A web-based CivicTech platform designed for real-time infrastructure tracking, citizen reporting, and proactive urban management. Built for hackathons to solve urban coordination challenges like repeated road excavation ("dig-once" concept).

## 🚀 Key Features

* **Interactive Mapping (Leaflet.js)**: Visualizes ongoing, completed, and future civic projects across different departments (Public Works, Electricity, Sanitation, Gas, Telecom).
* **Geotagged "Snap Issue" Reporting**: Capture photos of civic issues (potholes, open drains, broken barricades) directly via mobile camera. Automatically logs precise GPS coordinates and uploads images securely to **Supabase Storage**.
* **Supabase Backend Integration**: Real-time logging of citizen reports (`reports` and `escalations` tables) with automated density-based escalation triggers.
* **Timeline Filtering**: Easily toggle between **Past** (completed/verified), **Present** (active works with traffic impact zones), and **Future** (upcoming projects to prevent digging conflicts).
* **Multilingual Support**: Fully localized interface supporting English, Hindi (हिंदी), Tamil (தமிழ்), and Telugu (తెలుగు).
* **Dig-Once Conflict Alerts**: Highlights overlapping utility works to prevent repetitive road damage and save municipal restoration costs.
* **Contractor Rankings & Activity History**: Track contractor performance metrics, on-time completion rates, and view a personal history of submitted reports.

## 🛠️ Tech Stack

* **Frontend**: HTML5, Tailwind CSS (via Play CDN), Vanilla JavaScript, Leaflet.js
* **Backend & Database**: Supabase (PostgreSQL, Row Level Security, Storage Buckets)
* **Hosting**: Netlify / GitHub Pages

# DEMO VIDEO LINK
https://github.com/user-attachments/assets/9426411b-db72-43e8-88b1-254adf388b7d
