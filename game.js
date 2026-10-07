const socket = io('https://sasa-multiplayer-backend.onrender.com', {
    transports: ['websocket', 'polling']
});

// --- LOBBY LOGIC ---
const lobbyContainer = document.getElementById('lobbyContainer');
const mainGameContainer = document.getElementById('mainGameContainer');
const playerNameInput = document.getElementById('playerNameInput');
const roundsInput = document.getElementById('roundsInput');
const showCreateBtn = document.getElementById('showCreateBtn');
const showJoinBtn = document.getElementById('showJoinBtn');
const joinRoomDetails = document.getElementById('joinRoomDetails');
const roomIdInput = document.getElementById('roomIdInput');
const joinSubmitBtn = document.getElementById('joinSubmitBtn');
const joinError = document.getElementById('joinError');
const displayRoomId = document.getElementById('displayRoomId');

let myPlayerName = '';
let currentRoomId = '';

showJoinBtn.addEventListener('click', () => joinRoomDetails.style.display = 'block');

showCreateBtn.addEventListener('click', () => {
    myPlayerName = playerNameInput.value.trim();
    const rounds = parseInt(roundsInput.value); // Get selected rounds
    if (!myPlayerName) return alert("Please enter your name first!");

    // Send name AND rounds to server
    socket.emit('createRoom', { playerName: myPlayerName, rounds: rounds }, (response) => {
        if (response.success) enterGame(response.roomId);
    });
});

joinSubmitBtn.addEventListener('click', () => {
    myPlayerName = playerNameInput.value.trim();
    const roomToJoin = roomIdInput.value.trim().toUpperCase();
    if (!myPlayerName) return alert("Please enter your name!");
    if (roomToJoin.length !== 4) return alert("Room ID must be 4 letters.");

    socket.emit('joinRoom', { playerName: myPlayerName, roomId: roomToJoin }, (response) => {
        if (response.success) enterGame(response.roomId);
        else { joinError.textContent = response.message; joinError.style.display = 'block'; }
    });
});

function enterGame(roomId) {
    currentRoomId = roomId;
    lobbyContainer.style.display = 'none';
    mainGameContainer.style.display = 'flex'; 
    displayRoomId.textContent = roomId;
}


// --- SOUND EFFECTS ---
const soundStart = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'); 
const soundSuccess = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'); 
const soundTick = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'); 
// Set all sound volumes to 30%
soundStart.volume = 0.3;
soundSuccess.volume = 0.3;
soundTick.volume = 0.3;


// --- GAME LOOP & SCOREBOARD LOGIC ---
const startGameBtn = document.getElementById('startGameBtn');
const wordChoicesDiv = document.getElementById('wordChoices');
const currentWordDisplay = document.getElementById('currentWordDisplay');
const timerDisplay = document.getElementById('timerDisplay');
const scoreboardDiv = document.getElementById('scoreboard'); 
let amIDrawing = false; 

// Listen for score updates from the server
socket.on('updateScores', (players) => {
    scoreboardDiv.innerHTML = ''; // Clear old scores
    
    // Sort players by highest score, then create a badge for each one
    players.sort((a, b) => b.score - a.score).forEach(p => {
        const badge = document.createElement('div');
        badge.style.padding = '5px 12px';
        badge.style.background = '#e9ecef';
        badge.style.borderRadius = '20px';
        badge.style.fontSize = '0.9rem';
        badge.style.fontWeight = 'bold';
        badge.style.color = '#333';
        badge.textContent = `👤 ${p.name}: ${p.score} pts`;
        scoreboardDiv.appendChild(badge);
    });
});

// Anyone can click Start Game to kick off the loop
startGameBtn.addEventListener('click', () => socket.emit('startGame'));

socket.on('gameStarted', () => {
    startGameBtn.style.display = 'none'; // Hide the start button while playing
});

// --- NEW: MODAL LOGIC ---
const gameOverModal = document.getElementById('gameOverModal');
const winnerDisplay = document.getElementById('winnerDisplay');
const finalScoresList = document.getElementById('finalScoresList');
const closeModalBtn = document.getElementById('closeModalBtn');

closeModalBtn.addEventListener('click', () => {
    gameOverModal.style.display = 'none'; // Hide modal when clicked
});

// Update the gameOver event to receive the sorted scores
socket.on('gameOver', (sortedPlayers) => {
    startGameBtn.style.display = 'inline-block'; // Bring back start button
    amIDrawing = false;
    currentWordDisplay.style.display = 'none';

    // Figure out the winner (the first person in the sorted list)
    const winner = sortedPlayers[0];
    
    // Fill the Modal with text
    winnerDisplay.textContent = `Winner: ${winner.name} with ${winner.score} pts!`;
    
    finalScoresList.innerHTML = '';
    sortedPlayers.forEach((p, index) => {
        const li = document.createElement('li');
        li.textContent = `#${index + 1} - ${p.name}: ${p.score} pts`;
        
        // Highlight the winner in gold
        if (index === 0) {
            li.style.fontWeight = 'bold';
            li.style.color = '#ff9800'; 
        }
        finalScoresList.appendChild(li);
    });

    // Show the Popup!
    gameOverModal.style.display = 'flex';
    
    // Play the success sound
    soundSuccess.currentTime = 0;
    soundSuccess.play().catch(e => console.log("Sound blocked by browser"));
});

// Server says it's someone else's turn
socket.on('newTurn', (data) => {
    wordChoicesDiv.style.display = 'none';
    currentWordDisplay.style.display = 'none';
    
    // If the ID doesn't match ours, we are NOT drawing
    if (socket.id !== data.drawerId) {
        amIDrawing = false;
    }
});

// Server says it's YOUR turn
socket.on('yourTurn', (choices) => {
    amIDrawing = true; 
    wordChoicesDiv.style.display = 'flex'; 
    wordChoicesDiv.innerHTML = ''; 
    
    choices.forEach(word => {
        const btn = document.createElement('button');
        btn.textContent = word;
        btn.className = 'btn-primary';
        btn.style.background = '#28a745'; 
        btn.style.margin = '0 5px';
        btn.style.border = 'none';
        btn.style.padding = '8px 15px';
        btn.style.cursor = 'pointer';
        btn.style.borderRadius = '4px';
        btn.style.color = 'white';
        
        btn.addEventListener('click', () => {
            socket.emit('wordSelected', word); 
            wordChoicesDiv.style.display = 'none';
            currentWordDisplay.style.display = 'block';
            currentWordDisplay.textContent = `You are drawing: ${word}`;
        });
        wordChoicesDiv.appendChild(btn);
    });
});

// Update the Timer UI every second AND play tick sound
socket.on('timerUpdate', (timeLeft) => {
    timerDisplay.textContent = timeLeft;
    
    // Play the ticking sound for the last 10 seconds
    if (timeLeft <= 10 && timeLeft > 0) {
        soundTick.currentTime = 0; // Rewind the sound to the start
        soundTick.play().catch(e => console.log("Sound blocked by browser"));
    }
});


// --- DRAWING LOGIC ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const clearBtn = document.getElementById('clearBtn');

let drawing = false;
let current = { color: '#0b3d91', size: 5 };

colorPicker.addEventListener('change', (e) => current.color = e.target.value);
brushSize.addEventListener('change', (e) => current.size = e.target.value);

canvas.addEventListener('mousedown', onPointerDown);
canvas.addEventListener('mouseup', onPointerUp);
canvas.addEventListener('mouseout', onPointerUp);
canvas.addEventListener('mousemove', onPointerMove);

canvas.addEventListener('touchstart', (e) => { e.preventDefault(); onPointerDown(e); }, { passive: false });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); onPointerUp(e); }, { passive: false });
canvas.addEventListener('touchcancel', (e) => { e.preventDefault(); onPointerUp(e); }, { passive: false });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); onPointerMove(e); }, { passive: false });

function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;   
    const scaleY = canvas.height / rect.height; 
    let clientX = e.clientX;
    let clientY = e.clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
}

function onPointerDown(e) {
    if (!amIDrawing) return; 
    drawing = true;
    const pos = getPointerPos(e);
    current.x = pos.x;
    current.y = pos.y;
}

function onPointerUp(e) {
    if (!drawing || !amIDrawing) return;
    drawing = false;
    const pos = getPointerPos(e);
    drawLine(current.x, current.y, pos.x, pos.y, current.color, current.size, true);
}

function onPointerMove(e) {
    if (!drawing || !amIDrawing) return;
    const pos = getPointerPos(e);
    drawLine(current.x, current.y, pos.x, pos.y, current.color, current.size, true);
    current.x = pos.x;
    current.y = pos.y;
}

function drawLine(x0, y0, x1, y1, color, size, emit) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.closePath();
    if (!emit) return;
    socket.emit('drawing', { x0, y0, x1, y1, color, size });
}

socket.on('drawing', (data) => drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.size, false));
clearBtn.addEventListener('click', () => { if (amIDrawing) socket.emit('clearCanvas'); });
socket.on('clearCanvas', () => ctx.clearRect(0, 0, canvas.width, canvas.height));


// --- CHAT LOGIC ---
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const messages = document.getElementById('messages');

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (chatInput.value) {
        if (amIDrawing) {
            alert("No cheating! You cannot type in chat while you are the drawer.");
        } else {
            socket.emit('chatMessage', chatInput.value);
        }
        chatInput.value = '';
    }
});

socket.on('chatMessage', (msg) => {
    const item = document.createElement('li');
    item.innerHTML = msg; 
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
});

// Update Game Status to play Start and Success sounds
socket.on('gameStatus', (msg) => {
    const item = document.createElement('li');
    item.textContent = msg;
    item.style.fontWeight = 'bold';
    item.style.color = '#d9534f'; 
    item.style.background = '#fcf8e3'; 
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;

    // Trigger Sounds based on the broadcasted message text
    if (msg.includes("Word selected!")) {
        soundStart.play().catch(e => console.log("Sound blocked by browser"));
    }
    
    if (msg.includes("guessed the word!")) {
        soundSuccess.currentTime = 0;
        soundSuccess.play().catch(e => console.log("Sound blocked by browser"));
    }
});
