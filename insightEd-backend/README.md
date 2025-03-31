# 📌 InsightEd - AI-Powered YouTube Video Summarizer

🚀 **InsightEd** is a powerful AI-driven tool that extracts key insights from YouTube videos by generating **summaries** and **MCQ test series**. Built with a **microservices architecture**, it ensures speed, scalability, and real-time updates using **WebSockets**.

## 🔥 Features

- 🎯 **Summarizes YouTube Videos** - Get concise and insightful summaries.
- 🤖 **AI-Powered MCQs** - Generate quiz questions for learning reinforcement.
- 📡 **Real-time Updates** - Stay informed with WebSocket notifications.
- ☁️ **Cloud Storage** - Summaries are stored securely on Firebase.
- 💡 **Scalable & Fast** - Optimized with microservices and async processing.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **AI Processing**: Google Gemini API, OpenAI API
- **Storage**: Firebase Cloud Storage
- **WebSockets**: Socket.io
- **Microservices**: Docker (optional for deployment)

---

## 🎬 How It Works

1️⃣ **User Inputs YouTube Link**  
2️⃣ **Backend Downloads & Extracts Audio**  
3️⃣ **AI Transcribes & Summarizes**  
4️⃣ **MCQ Generator Creates Quiz**  
5️⃣ **Data is Stored on Firebase**  
6️⃣ **User Receives Summary & MCQs**  

![Workflow Diagram](#) *(Insert architecture diagram here)*

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository

```sh
git clone https://github.com/anand-mukul/insighted-backend.git
cd InsightEd
```

### 2️⃣ Install Dependencies

```sh
npm install
```

### 3️⃣ Configure Environment Variables

Create a `.env` file in the root directory and add:

```ini
PORT=5000

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key

# Firebase
FIREBASE_BUCKET=your-project-id.appspot.com
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your_project_id",...}
```

### 4️⃣ Start the Server

```sh
npx nodemon server.js
```

---

## 📡 API Usage

### 🔹 **POST /api/v1/summarize**

Extracts and summarizes a YouTube video.

#### **Request Body**

```json
{
  "youtubeUrl": "https://www.youtube.com/watch?v=your_video_id"
  "isPremium": false
}
```

#### **Response**

```json
{
  "summary": "This is the summarized text...",
  "fileUrl": "https://firebasestorage.googleapis.com/..."
}
```

### 🔹 **WebSocket Events**

| Event   | Description |
|---------|------------|
| `status` | Real-time updates on processing steps |

---

## 🖼️ Screenshots *(Add actual images)*

1️⃣ **User Inputs YouTube Link**  
![Step 1](#)

2️⃣ **Summary & MCQs Generated**  
![Step 2](#)

3️⃣ **Firebase Storage View**  
![Step 3](#)

---

## 🏗️ Deployment

### Deploy on **Vercel / Railway / Render**

1️⃣ Add environment variables in the hosting platform.

2️⃣ Deploy the backend.

3️⃣ Update the frontend to match the API URL.

---

## 🏆 Why InsightEd?

✅ **Perfect for Students & Educators** - Converts long videos into easy notes.  
✅ **Time-Saving** - Get summaries instantly.  
✅ **Hackathon-Ready** - Built for scalability and real-time use.  
✅ **Future-Ready** - Can integrate with LMS platforms.  

---

## 📬 Contact & Contribution

💡 Got an idea? Found a bug? Feel free to open an issue or contribute!  
👨‍💻 Maintainer: [Mukul Anand](https://github.com/anand-mukul)  
✉️ Email: <mukulanand.dev@gmail.com>  

🚀 **Let’s revolutionize learning together!**
