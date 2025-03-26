import { useState, useRef, useEffect } from "react";
import "./App.css";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const API_KEY = import.meta.env.VITE_API_GENERATIVE_LANGUAGE_CLIENT;

function App() {
  const [chatHistory, setChatHistory] = useState([]);
  const [question, setQuestion] = useState("");
  const [generatingAnswer, setGeneratingAnswer] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [credentials, setCredentials] = useState({ email: '', password: '', username: '' });
  const [authError, setAuthError] = useState('');
  const chatContainerRef = useRef(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const storedHistory = JSON.parse(localStorage.getItem('chatHistory'));
    if (storedHistory) {
      setChatHistory(storedHistory);
    }
  }, []);

  // Scroll to the bottom of the chat when history updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, generatingAnswer]);

  // Store token in localStorage when it changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    }
  }, [token]);

  // Handle authentication (login/register)
  const handleAuth = async (e, isLogin) => {
    e.preventDefault();
    setAuthError('');
    try {
      const url = isLogin ? 'http://localhost:5000/api/auth/login' : 'http://localhost:5000/api/auth/register';
      const data = isLogin 
        ? { email: credentials.email, password: credentials.password }
        : { username: credentials.username, email: credentials.email, password: credentials.password };
      
      console.log(`Sending ${isLogin ? 'login' : 'register'} request to ${url}`, data);
      const response = await axios.post(url, data);
      console.log('Auth response:', response.data);

      if (isLogin) {
        setToken(response.data.token);
        setUser(response.data.user);
      } else {
        setShowLogin(true);
      }
      setCredentials({ email: '', password: '', username: '' });
    } catch (error) {
      if (error.response) {
        console.error('Server responded with error:', error.response.data);
        setAuthError(error.response.data.message || 'Authentication failed');
      } else if (error.request) {
        console.error('No response received from server:', error.request);
        setAuthError('Cannot connect to the server. Please ensure it’s running on localhost:5000.');
      } else {
        console.error('Request setup error:', error.message);
        setAuthError('Failed to set up the request. Check your network or configuration.');
      }
    }
  };

  // Generate response from Gemini API
  const generateResponse = async (prompt) => {
    setGeneratingAnswer(true);
    const url = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent'; // Updated model

    const requestBody = {
      contents: [{ parts: [{ text: prompt + ' (always answer like a professional on universities, Dont Ever Generate Any Kind Of Code)' }] }]
    };

    try {
      const response = await fetch(`${url}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate response: ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.candidates[0].content.parts[0].text;
      return generatedText;
    } catch (error) {
      console.error('Chat generation error:', error);
      return "I'm sorry, I couldn't generate a response at the moment. Please try again.";
    } finally {
      setGeneratingAnswer(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim() || !token) return;

    // Add user question to chat history
    setChatHistory(prev => {
      const newHistory = [...prev, { type: 'question', content: question }];
      localStorage.setItem('chatHistory', JSON.stringify(newHistory));
      return newHistory;
    });

    const userQuestion = question;
    setQuestion('');

    // Generate and add bot response
    const botResponse = await generateResponse(userQuestion);
    setChatHistory(prev => {
      const newHistory = [...prev, { type: 'answer', content: botResponse }];
      localStorage.setItem('chatHistory', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  // Login/Register UI
  if (!token) {
    return (
      <div className="fixed inset-0 bg-gradient-to-r from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">
            {showLogin ? 'Login' : 'Register'}
          </h2>
          {authError && (
            <p className="text-red-500 mb-4">{authError}</p>
          )}
          <form onSubmit={(e) => handleAuth(e, showLogin)}>
            {!showLogin && (
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Username"
                  value={credentials.username}
                  onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  required
                />
              </div>
            )}
            <div className="mb-4">
              <input
                type="email"
                placeholder="Email"
                value={credentials.email}
                onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                required
              />
            </div>
            <div className="mb-4">
              <input
                type="password"
                placeholder="Password"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
            >
              {showLogin ? 'Login' : 'Register'}
            </button>
          </form>
          <button
            onClick={() => setShowLogin(!showLogin)}
            className="mt-4 text-blue-500 hover:underline w-full text-center"
          >
            {showLogin ? 'Need to register?' : 'Already have an account?'}
          </button>
        </div>
      </div>
    );
  }

  // Chat UI
  return (
    <div className="fixed inset-0 bg-gradient-to-r from-blue-50 to-blue-100">
      <div className="h-full max-w-4xl mx-auto flex flex-col p-3">
        <header className="text-center py-4 flex justify-between items-center">
          <a href="https://github.com/Vishesh-Pandey/chat-ai" 
             target="_blank" 
             rel="noopener noreferrer"
             className="block">
            <h1 className="text-4xl font-bold text-blue-500 hover:text-blue-600 transition-colors">
              Chat AI
            </h1>
          </a>
          <button
            onClick={() => {
              setToken('');
              localStorage.removeItem('token');
              setUser(null);
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </header>

        <div className="flex-1 overflow-y-auto mb-4 rounded-lg bg-white shadow-lg p-4 hide-scrollbar">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="bg-blue-50 rounded-xl p-8 max-w-2xl">
                <h2 className="text-2xl font-bold text-blue-600 mb-4">Welcome to Chat AI, {user?.username}! 👋</h2>
                <p className="text-gray-600 mb-4">
                  I'm here to help you with anything you'd like to know about universities. Ask me anything!
                </p>
                <p className="text-gray-500 mt-6 text-sm">
                  Type your question below and press Enter or click Send!
                </p>
              </div>
            </div>
          ) : (
            <>
              {chatHistory.map((chat, index) => (
                <div key={index} className={`mb-4 ${chat.type === 'question' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block max-w-[80%] p-3 rounded-lg overflow-auto hide-scrollbar ${
                    chat.type === 'question' 
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}>
                    <ReactMarkdown className="overflow-auto hide-scrollbar">{chat.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              <div ref={chatContainerRef} />
            </>
          )}
          {generatingAnswer && (
            <div className="text-left">
              <div className="inline-block bg-gray-100 p-3 rounded-lg animate-pulse">
                Thinking...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex gap-2">
            <textarea
              required
              className="flex-1 border border-gray-300 rounded p-3 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 resize-none"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about universities..."
              rows="2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              className={`px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors ${
                generatingAnswer ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={generatingAnswer}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;