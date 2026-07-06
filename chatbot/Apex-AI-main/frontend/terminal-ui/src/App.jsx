import React, { useState } from 'react';
import BrowserFrame from './components/BrowserFrame';
import TerminalLayout from './components/TerminalLayout';
import WelcomeCard from './components/WelcomeCard';
import ActivityCard from './components/ActivityCard';
import SuggestedQuestionsCard from './components/SuggestedQuestionsCard';
import SectorCommandCards from './components/SectorCommandCards';
import IntelligenceDashboard from './components/IntelligenceDashboard';
import ChatMessages from './components/ChatMessages';
import AIChatInput from './components/AIChatInput';
import { useUserContext } from './context/UserContext';

import './styles/variables.css';
import './styles/layout.css';
import './styles/effects.css';
import './styles/terminal.css';
import './styles/responsive.css';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const App = () => {
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [intelligenceData, setIntelligenceData] = useState(null);
  
  const { profile, switchProfile, availableProfiles } = useUserContext();

  const handleCommandSelect = async (sectorName, command) => {
    // Clear previous dashboard
    setIntelligenceData(null);
    
    // Add user message
    const newMessages = [...messages, { role: 'user', content: command }];
    setMessages(newMessages);
    setIsProcessing(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/chat/sector-command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        },
        body: JSON.stringify({
          query: command,
          sector: sectorName.toLowerCase(),
          conversation_id: "session-123"
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === "success") {
        setIntelligenceData(data);
        setMessages([...newMessages, { role: 'system', content: `Analysis complete. Rendering dashboard for: ${command}` }]);
      } else {
        setMessages([...newMessages, { role: 'system', content: data.message || JSON.stringify(data) }]);
      }
    } catch (error) {
      setMessages([...newMessages, { role: 'system', content: `Error: Could not reach backend API at ${API_BASE_URL}.\nDetails: ${error.message}` }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualCommand = (command) => {
    // Basic fallback for manual terminal input
    handleCommandSelect("general", command);
  };

  return (
    <BrowserFrame>
      <TerminalLayout>
        <section className="dashboard">
          <WelcomeCard />
          <div className="right-panels">
            <ActivityCard />
            <SectorCommandCards onCommandSelect={handleCommandSelect} />
            <SuggestedQuestionsCard />
          </div>
        </section>
        
        <section className="chat-area">
          <ChatMessages messages={messages} />
          
          {intelligenceData && (
            <IntelligenceDashboard responseData={intelligenceData} />
          )}

          {isProcessing ? (
            <div className="terminal-input">
              <span className="prompt">{'>'}</span>
              <span className="typing-animation" style={{ color: 'var(--text-secondary)' }}>Processing command and fetching intelligence...</span>
            </div>
          ) : (
            <AIChatInput onCommand={handleManualCommand} />
          )}
        </section>
      </TerminalLayout>
    </BrowserFrame>
  );
};

export default App;
