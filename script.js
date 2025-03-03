async function checkPassword() {
  const password = document.getElementById('passwordInput').value;

  const response = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });

  const data = await response.json();
  if (data.success) {
    localStorage.setItem('token', data.token); // 🔥 Store token
    window.location.href = '/chat';
  } else {
    document.getElementById('message').innerText = 'Incorrect password!';
  }
}

async function sendMessage() {
  const text = document.getElementById('messageInput').value.trim();
  if (!text) return;

  const token = localStorage.getItem('token');
  if (!token) {
    alert("You're not authenticated!");
    window.location.href = '/';
    return;
  }

  await fetch('/send-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // 🔥 Send token
    },
    body: JSON.stringify({ text })
  });

  document.getElementById('messageInput').value = "";
  loadMessages();
}

async function loadMessages() {
  const response = await fetch('/messages');
  const messages = await response.json();

  const chatBox = document.getElementById('chatBox');
  chatBox.innerHTML = messages.map(m =>
    `<div class="message"><span class="username">${m.username}:</span> ${m.text}</div>`
  ).join("");

  chatBox.scrollTop = chatBox.scrollHeight;
}

// 🔹 Check Authentication on Chat Page
// 🔹 Redirect unauthenticated users from /chat
if (window.location.pathname === '/chat') {
  const token = localStorage.getItem('token');
  if (!token) {
    alert("You're not authenticated! Redirecting to login...");
    window.location.href = '/';
  }
}

setInterval(loadMessages, 1000);
document.getElementById('messageInput').addEventListener('keydown', function(event) {
  if (event.key === "Enter") {
    event.preventDefault(); // Prevents line break in input
    sendMessage(); // Calls sendMessage function
  }
});

// 🔹 Submit Password on Enter Key
document.getElementById('passwordInput').addEventListener('keydown', function(event) {
  if (event.key === "Enter") {
    event.preventDefault(); // Prevents unintended form submission
    checkPassword(); // Calls checkPassword function
  }
});
