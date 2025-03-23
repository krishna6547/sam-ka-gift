// ✅ Store & Check Token in Session Storage
function getToken() {
    const token = sessionStorage.getItem('token');
    if (!token) {
        console.warn("⚠ No token found. Redirecting to login...");
        window.location.href = '/';
    }
    return token;
}

// ✅ Check Authentication on Page Load
function checkAuth() {
    if (!sessionStorage.getItem('token')) {
        alert("You're not authenticated! Redirecting to login...");
        window.location.href = '/';
    }
}

// 🔹 Run authentication check if on the chat page
if (window.location.pathname === '/chat' || window.location.pathname === '/chat.html') {
    checkAuth();
}

// ✅ Handle Login & Store Token
async function checkPassword() {
    const password = document.getElementById('passwordInput').value;

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });

    const data = await response.json();

    if (data.success) {
        console.log("✅ Login Successful. Storing token...");
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('username', data.username); // Store username
        window.location.href = '/chat';
    } else {
        document.getElementById('message').innerText = 'Incorrect password!';
    }
}

// ✅ Send Messages with Token Authentication
async function sendMessage() {
    const text = document.getElementById('messageInput').value.trim();
    if (!text) return;

    const token = getToken();
    const username = sessionStorage.getItem('username') || "Unknown";

    // Send message to server
    try {
        const response = await fetch('/send-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text, username, timestamp: new Date().toISOString() })
        });

        if (response.status === 401) {
            alert("⚠ Session expired. Please log in again.");
            sessionStorage.clear();
            window.location.href = '/';
            return;
        }

        if (response.ok) {
            document.getElementById('messageInput').value = "";
            await loadMessages(); // Reload messages after sending
        } else {
            console.error("Failed to send message:", await response.text());
        }
    } catch (error) {
        console.error("Error sending message:", error);
    }
}

// Format time for display in messages
function formatTime(timestamp) {
    try {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        console.error("Error formatting time:", e);
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

// Format date for header separators
function formatDate(timestamp) {
    try {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
            return "Today";
        } else if (date.toDateString() === yesterday.toDateString()) {
            return "Yesterday";
        } else {
            return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
    } catch (e) {
        console.error("Error formatting date:", e);
        return "Today";
    }
}

// ✅ Load Chat Messages Securely
async function loadMessages() {
    const token = getToken();
    const currentUsername = sessionStorage.getItem('username') || "Unknown";

    try {
        const response = await fetch('/messages', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            alert("⚠ Session expired. Please log in again.");
            sessionStorage.clear();
            window.location.href = '/';
            return;
        }

        if (!response.ok) {
            console.error("Failed to load messages:", await response.text());
            return;
        }

        const messages = await response.json();
        
        // Add timestamps if they don't exist
        const processedMessages = messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp || new Date().toISOString()
        }));

        // Sort messages by timestamp
        processedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const chatBox = document.getElementById('chatBox');
        chatBox.innerHTML = '';
        
        let currentDate = null;
        let currentGroup = null;
        let lastUsername = null;
        let lastTimestamp = null;
        
        processedMessages.forEach((msg) => {
            try {
                const msgDate = new Date(msg.timestamp).toDateString();
                const msgTime = new Date(msg.timestamp).getTime();
                
                // Add date separator when date changes
                if (currentDate !== msgDate) {
                    currentDate = msgDate;
                    const dateDiv = document.createElement('div');
                    dateDiv.className = 'date-separator';
                    dateDiv.innerHTML = `<span>${formatDate(msg.timestamp)}</span>`;
                    chatBox.appendChild(dateDiv);
                    
                    // Reset grouping when date changes
                    lastUsername = null;
                    lastTimestamp = null;
                    currentGroup = null;
                }
                
                // Determine if we should group with previous message
                const shouldGroup = 
                    lastUsername === msg.username && 
                    lastTimestamp && 
                    (msgTime - lastTimestamp) < 5 * 60 * 1000; // 5 minutes
                
                if (!shouldGroup) {
                    // Create a new message group
                    currentGroup = document.createElement('div');
                    currentGroup.className = `message-container ${msg.username === currentUsername ? 'self' : 'other'}`;
                    
                    // Add username above the message
                    const usernameEl = document.createElement('div');
                    usernameEl.className = 'username';
                    usernameEl.textContent = msg.username;
                    currentGroup.appendChild(usernameEl);
                    
                    chatBox.appendChild(currentGroup);
                }
                
                // Add the message to the current group
                const messageEl = document.createElement('div');
                messageEl.className = `message ${msg.username === currentUsername ? 'self' : 'other'}`;
                messageEl.innerHTML = `
                    <div class="message-content">${msg.text}</div>
                    <div class="timestamp">${formatTime(msg.timestamp)}</div>
                `;
                currentGroup.appendChild(messageEl);
                
                // Update tracking variables
                lastUsername = msg.username;
                lastTimestamp = msgTime;
            } catch (error) {
                console.error("Error processing message:", error, msg);
            }
        });
        
        // Scroll to bottom
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (error) {
        console.error("Error loading messages:", error);
    }
}

// 🔹 Load messages when the chat page loads
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path === '/chat' || path === '/chat.html' || path.endsWith('/chat')) {
        loadMessages();
        // Refresh messages every 1 seconds
        setInterval(loadMessages,  1000);
    }
});

// 🔹 Submit message on Enter key
document.addEventListener('DOMContentLoaded', function() {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keydown', function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                sendMessage();
            }
        });
    }
    
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) {
        passwordInput.addEventListener('keydown', function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                checkPassword();
            }
        });
    }
});

// 🔹 Prevent Unnecessary Token Removal (Only on Tab Close)
window.addEventListener("beforeunload", function () {
    sessionStorage.clear(); // 🔥 Clears token only when tab is actually closed
});