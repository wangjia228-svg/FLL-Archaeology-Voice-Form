// Check browser compatibility
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSynthesis = window.speechSynthesis;

if (!SpeechRecognition) {
    alert('Sorry, your browser does not support speech recognition. Please use Chrome or Safari.');
}

// Initialize speech recognition
const recognition = new SpeechRecognition();
recognition.continuous = false;
recognition.interimResults = false;
recognition.lang = 'en-US';
recognition.maxAlternatives = 1;

// Questions for the archaeology form
const questions = [
    {
        text: "What is the site name or ID?",
        field: "siteName"
    },
    {
        text: "What type of artifact did you find?",
        field: "artifactType"
    },
    {
        text: "What is the material composition?",
        field: "material"
    },
    {
        text: "At what depth in centimeters was it found?",
        field: "depth"
    },
    {
        text: "What are the GPS coordinates?",
        field: "coordinates"
    },
    {
        text: "How would you assess the condition? For example, excellent, good, fair, or poor.",
        field: "condition"
    },
    {
        text: "Were there any associated finds nearby?",
        field: "associatedFinds"
    },
    {
        text: "Do you have any additional notes or observations?",
        field: "notes"
    }
];

// State management
let currentQuestionIndex = 0;
let isRunning = false;
let formData = {};

// DOM elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const saveBtn = document.getElementById('saveBtn');
const statusDiv = document.getElementById('status');
const progressDiv = document.getElementById('progress');
const currentQuestionDiv = document.getElementById('currentQuestion');
const savedFormsDiv = document.getElementById('savedForms');

// Text-to-speech function
function speak(text) {
    return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.6;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onend = () => {
            resolve();
        };
        
        speechSynthesis.speak(utterance);
    });
}

// Update UI
function updateUI() {
    progressDiv.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
    
    if (currentQuestionIndex < questions.length) {
        currentQuestionDiv.textContent = questions[currentQuestionIndex].text;
    } else {
        currentQuestionDiv.textContent = "All questions answered! Review your form and save it.";
        statusDiv.textContent = "Form complete";
        saveBtn.disabled = false;
    }
}

// Fill form field with visual feedback
function fillField(fieldId, value) {
    const field = document.getElementById(fieldId);
    field.value = value;
    field.classList.add('filled');
    formData[fieldId] = value;
}

// Ask current question
async function askQuestion() {
    if (currentQuestionIndex >= questions.length) {
        isRunning = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        await speak("All questions have been answered. Saving your form now.");
        updateUI();
        
        // Auto-save the form
        setTimeout(() => {
            autoSaveForm();
        }, 1000);
        return;
    }
    
    const question = questions[currentQuestionIndex];
    updateUI();
    statusDiv.textContent = "Speaking question...";
    
    // Speak the question
    await speak(question.text);
    
    // Start listening for answer
    statusDiv.textContent = "Listening for your answer...";
    currentQuestionDiv.classList.add('listening');
    
    try {
        recognition.start();
    } catch (e) {
        // Recognition already running, that's fine
        console.log('Recognition already active');
    }
}

// Handle speech recognition result
recognition.onresult = (event) => {
    const answer = event.results[event.results.length - 1][0].transcript;
    const question = questions[currentQuestionIndex];
    
    currentQuestionDiv.classList.remove('listening');
    statusDiv.textContent = `Recorded: "${answer}"`;
    
    // Fill the form field
    fillField(question.field, answer);
    
    // Move to next question
    currentQuestionIndex++;
    
    // Wait a moment before asking next question
    setTimeout(() => {
        if (isRunning) {
            askQuestion();
        }
    }, 1500);
};

recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    currentQuestionDiv.classList.remove('listening');
    
    if (event.error === 'no-speech') {
        statusDiv.textContent = "No speech detected. Click Start to try again.";
    } else {
        statusDiv.textContent = `Error: ${event.error}. Please try again.`;
    }
    
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
};

recognition.onend = () => {
    // If we're still running and haven't finished all questions, restart recognition
    if (isRunning && currentQuestionIndex < questions.length) {
        setTimeout(() => {
            try {
                recognition.start();
            } catch (e) {
                // Recognition already started, ignore error
            }
        }, 100);
    }
};

// Start button handler
startBtn.addEventListener('click', async () => {
    isRunning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    saveBtn.disabled = true;
    
    if (currentQuestionIndex === 0) {
        await speak("Starting hands-free archaeology field form.");
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    askQuestion();
});

// Stop button handler
stopBtn.addEventListener('click', () => {
    isRunning = false;
    recognition.stop();
    speechSynthesis.cancel();
    startBtn.disabled = false;
    stopBtn.disabled = true;
    statusDiv.textContent = "Stopped";
    currentQuestionDiv.classList.remove('listening');
});

// Reset button handler
resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset the form? All entered data will be cleared.')) {
        isRunning = false;
        recognition.stop();
        speechSynthesis.cancel();
        currentQuestionIndex = 0;
        formData = {};
        
        // Clear all form fields
        document.querySelectorAll('#archaeologyForm input, #archaeologyForm textarea').forEach(field => {
            field.value = '';
            field.classList.remove('filled');
        });
        
        startBtn.disabled = false;
        stopBtn.disabled = true;
        saveBtn.disabled = true;
        
        statusDiv.textContent = "Form reset";
        progressDiv.textContent = "Question 0 of 8";
        currentQuestionDiv.textContent = "Press 'Start Voice Form' to begin";
        currentQuestionDiv.classList.remove('listening');
    }
});

// Save button handler
saveBtn.addEventListener('click', () => {
    manualSaveForm();
});

// Auto-save function (called when form completes)
function autoSaveForm() {
    const timestamp = new Date().toLocaleString();
    const savedForm = {
        timestamp: timestamp,
        data: { ...formData }
    };
    
    // Save to localStorage
    let savedForms = JSON.parse(localStorage.getItem('archaeologyForms') || '[]');
    savedForms.push(savedForm);
    localStorage.setItem('archaeologyForms', JSON.stringify(savedForms));
    
    // Display saved form
    displaySavedForms();
    
    // Show success message
    speak("Form saved successfully! You can start a new form whenever you're ready.");
    statusDiv.textContent = "Form saved successfully!";
    
    // Reset for next entry after a delay
    setTimeout(() => {
        if (confirm('Form saved! Would you like to start a new form?')) {
            resetBtn.click();
        }
    }, 2000);
}

// Manual save function (if user clicks Save button)
function manualSaveForm() {
    const timestamp = new Date().toLocaleString();
    const savedForm = {
        timestamp: timestamp,
        data: { ...formData }
    };
    
    // Save to localStorage
    let savedForms = JSON.parse(localStorage.getItem('archaeologyForms') || '[]');
    savedForms.push(savedForm);
    localStorage.setItem('archaeologyForms', JSON.stringify(savedForms));
    
    // Display saved form
    displaySavedForms();
    
    // Show success message
    speak("Form saved successfully!");
    alert('Form saved successfully!\n\nYou can view all saved forms below.');
    
    // Reset for next entry
    setTimeout(() => {
        resetBtn.click();
    }, 2000);
}

// Display saved forms
function displaySavedForms() {
    const savedForms = JSON.parse(localStorage.getItem('archaeologyForms') || '[]');
    
    if (savedForms.length === 0) {
        savedFormsDiv.innerHTML = '<p style="color: #999; text-align: center;">No saved forms yet.</p>';
        return;
    }
    
    savedFormsDiv.innerHTML = '<h3 style="margin-bottom: 15px;">Saved Forms:</h3>';
    
    savedForms.reverse().forEach((form, index) => {
        const formDiv = document.createElement('div');
        formDiv.className = 'saved-form-item';
        formDiv.innerHTML = `
            <h3>Form #${savedForms.length - index} - ${form.timestamp}</h3>
            <p><strong>Site Name/ID:</strong> ${form.data.siteName || 'N/A'}</p>
            <p><strong>Artifact Type:</strong> ${form.data.artifactType || 'N/A'}</p>
            <p><strong>Material:</strong> ${form.data.material || 'N/A'}</p>
            <p><strong>Depth:</strong> ${form.data.depth || 'N/A'} cm</p>
            <p><strong>GPS Coordinates:</strong> ${form.data.coordinates || 'N/A'}</p>
            <p><strong>Condition:</strong> ${form.data.condition || 'N/A'}</p>
            <p><strong>Associated Finds:</strong> ${form.data.associatedFinds || 'N/A'}</p>
            <p><strong>Notes:</strong> ${form.data.notes || 'N/A'}</p>
        `;
        savedFormsDiv.appendChild(formDiv);
    });
}

// Initialize
updateUI();
displaySavedForms();