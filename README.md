# 🏥 Care Connect: Smart Digital Queue System

## 🚨 The Problem: The 'Access Barrier'
Government hospitals are a lifeline for millions, yet access is broken. The current "physical-only" queue system forces sick, elderly, and rural patients to wait **4-6 hours** in crowded, unhygienic corridors just to see a doctor.

* **The Human Cost:** Sick patients physically deteriorating while standing in lines.
* **The Economic Cost:** Daily wage earners losing a full day's pay just to get a token.
* **The Operational Failure:** Overcrowding leads to chaotic triage and doctor burnout.

## 💡 The Solution: A 'Just-in-Time' Service Model
**Care Connect** replaces the chaotic physical waiting room with a **virtual** one. We have built a real-time, digital queuing infrastructure specifically for high-volume government OPDs.

Unlike private appointment apps (which fail in high-volume settings), our system respects the **walk-in nature** of public healthcare but digitizes the flow.

### 🌟 Key Features
* **🏠 Remote Check-In:** Patients join the queue from home via a lightweight web portal—no heavy app download required.
* **⏱️ Real-Time ETA:** Powered by **Firestore**, patients see their token number move in real-time and get an estimated wait time.
* **🏥 Staff Dashboard:** Doctors/Staff can call the next patient, skip no-shows, or mark visits as complete with a single click.
* **📉 Crowd Control:** Patients arrive only when their turn is near, reducing hospital overcrowding by up to 70%.


## ⚙️ Tech Stack & Architecture
We chose a **Serverless & Real-Time** architecture to handle the high concurrency of a hospital morning rush without crashing.

| Component | Technology | Why we chose it? |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, JS | Lightweight & accessible on low-end devices (Rural friendly). |
| **Backend** | **Node.js** | Handles custom queue logic and API requests. |
| **Database** | **Cloud Firestore** | **Crucial:** Provides sub-second latency for live token syncing across devices. |
| **Auth** | **Firebase Auth** | Secure, hassle-free sign-in for patients. |
| **Hosting** | Firebase Hosting | Fast, secure, and scalable content delivery. |

---

## 🚀 How to Run Locally

### Prerequisites
* Node.js installed
* A Firebase Project set up

### Installation
1.  **Clone the Repository**
    ```bash
    git clone [https://github.com/your-username/care-connect.git](https://github.com/your-username/care-connect.git)
    cd care-connect
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Firebase**
    * Create a `firebaseServiceKey.json` file in the root directory.
    * Add your Firebase config keys in `public/app.js` (or your config file).

4.  **Run the Server**
    ```bash
    node server.js
    ```
    * Visit `http://localhost:5000` to see the app.

---

## 🔮 Future Roadmap
* **🤖 AI-Driven Analytics:** Integrating **Gemini AI** to analyze peak-hour trends and predict staffing needs before the rush begins.
* **📍 Distance Matrix Integration:** "Time-to-Leave" alerts based on live traffic data for patients.
* **💬 SMS Fallback:** Twilio integration for patients without smartphones.

---

## 👥 Team
* **Farah Imran Cutchi**
* **Riya Shetgaonkar**  

---

*Built with ❤️ for better healthcare access.*
