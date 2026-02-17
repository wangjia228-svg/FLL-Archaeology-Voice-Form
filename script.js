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

// Form type selection
const formTypeQuestion = {
    text: "Which form would you like to fill out? Say shovel test for a shovel test form, or say unit level for a unit level record form.",
    field: "formType"
};

// Common questions (asked for all forms)
const commonQuestions = [
    {
        text: "What is the project name?",
        field: "project"
    },
    {
        text: "What is today's date?",
        field: "date"
    },
    {
        text: "Who is recording? Say your name or initials.",
        field: "recorders"
    },
    {
        text: "What is the site number or S T number?",
        field: "stNumber"
    },
    {
        text: "What is the location? Include meters and direction from the S T number.",
        field: "location"
    }
];

// Shovel Test specific questions
const shovelTestQuestions = [
    {
        text: "Describe the surrounding vegetation.",
        field: "surroundingVegetation"
    },
    {
        text: "For Stratum 1, what is the depth range? Say from blank to blank centimeters.",
        field: "stratum1Depth"
    },
    {
        text: "What materials were recovered in Stratum 1?",
        field: "stratum1Materials"
    },
    {
        text: "What is the Munsell color for Stratum 1?",
        field: "stratum1Munsell"
    },
    {
        text: "For Stratum 2, what is the depth range?",
        field: "stratum2Depth"
    },
    {
        text: "What materials were recovered in Stratum 2?",
        field: "stratum2Materials"
    },
    {
        text: "What is the Munsell color for Stratum 2?",
        field: "stratum2Munsell"
    },
    {
        text: "Any additional notes?",
        field: "notes"
    }
];

// Unit Level Record specific questions
const unitLevelQuestions = [
    {
        text: "What is the site name?",
        field: "siteName"
    },
    {
        text: "What is the unit designation?",
        field: "unitDesignation"
    },
    {
        text: "What is the unit size?",
        field: "unitSize"
    },
    {
        text: "What are the grid coordinates? North and East.",
        field: "gridCoordinates"
    },
    {
        text: "What is the unit datum location and elevation?",
        field: "datumLocation"
    },
    {
        text: "What is the excavation level?",
        field: "level"
    },
    {
        text: "What is the depth?",
        field: "depth"
    },
    {
        text: "Describe the context of the unit location.",
        field: "context"
    },
    {
        text: "What is the stratum designation?",
        field: "stratumDesignation"
    },
    {
        text: "Describe the sediment. Include texture and color.",
        field: "sedimentDescription"
    },
    {
        text: "Describe any artifacts plotted. Include F S number and description.",
        field: "artifactsPlotted"
    },
    {
        text: "Describe the artifact type, count, and density.",
        field: "artifactDescription"
    },
    {
        text: "Any additional notes?",
        field: "notes"
    }
];

// Dynamic questions array that will be built based on form type
let questions = [];

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
        utterance.rate = 1.2;
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
    if (questions.length === 0) {
        // Still asking for form type
        progressDiv.textContent = "Selecting form type...";
        currentQuestionDiv.textContent = formTypeQuestion.text;
    } else if (currentQuestionIndex < questions.length) {
        progressDiv.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
        currentQuestionDiv.textContent = questions[currentQuestionIndex].text;
    } else {
        currentQuestionDiv.textContent = "All questions answered! Review your form and save it.";
        statusDiv.textContent = "Form complete";
        saveBtn.disabled = false;
        progressDiv.textContent = `Completed ${questions.length} questions`;
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
    // First question is always the form type
    if (currentQuestionIndex === 0 && questions.length === 0) {
        updateUI();
        statusDiv.textContent = "Speaking question...";
        
        await speak(formTypeQuestion.text);
        
        // Wait a moment after speaking before listening
        await new Promise(resolve => setTimeout(resolve, 500));
        
        statusDiv.textContent = "Listening for your answer...";
        currentQuestionDiv.classList.add('listening');
        
        try {
            recognition.start();
        } catch (e) {
            console.log('Recognition already active');
        }
        return;
    }
    
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
    
    // Wait a moment after speaking before listening
    await new Promise(resolve => setTimeout(resolve, 500));
    
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
    
    currentQuestionDiv.classList.remove('listening');
    statusDiv.textContent = `Recorded: "${answer}"`;
    
    // Special handling for form type selection
    if (currentQuestionIndex === 0 && questions.length === 0) {
        const answerLower = answer.toLowerCase();
        
        if (answerLower.includes('shovel') || answerLower.includes('test')) {
            formData.formType = 'Shovel Test';
            questions = [...commonQuestions, ...shovelTestQuestions];
            speak("Starting shovel test form.");
        } else if (answerLower.includes('unit') || answerLower.includes('level') || answerLower.includes('record')) {
            formData.formType = 'Unit Level Record';
            questions = [...commonQuestions, ...unitLevelQuestions];
            speak("Starting unit level record form.");
        } else {
            // Couldn't understand, ask again
            statusDiv.textContent = "I didn't understand. Please say shovel test or unit level.";
            setTimeout(() => {
                if (isRunning) {
                    askQuestion();
                }
            }, 2000);
            return;
        }
        
        currentQuestionIndex = 0; // Reset to start with first actual question
        
        setTimeout(() => {
            if (isRunning) {
                askQuestion();
            }
        }, 2000);
        return;
    }
    
    // Normal question handling
    const question = questions[currentQuestionIndex];
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
        await speak("Starting archaeology field form. I will ask you eight questions. Please answer each question clearly.");
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
        questions = []; // Reset questions array
        
        // Clear all form fields
        document.querySelectorAll('#archaeologyForm input, #archaeologyForm textarea').forEach(field => {
            field.value = '';
            field.classList.remove('filled');
        });
        
        startBtn.disabled = false;
        stopBtn.disabled = true;
        saveBtn.disabled = true;
        
        statusDiv.textContent = "Form reset";
        progressDiv.textContent = "Selecting form type...";
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
        
        let formHTML = `
            <h3>Form #${savedForms.length - index} - ${form.timestamp}</h3>
            <p><strong>Form Type:</strong> ${form.data.formType || 'N/A'}</p>
            <p><strong>Project:</strong> ${form.data.project || 'N/A'}</p>
            <p><strong>Date:</strong> ${form.data.date || 'N/A'}</p>
            <p><strong>Recorders:</strong> ${form.data.recorders || 'N/A'}</p>
            <p><strong>Location:</strong> ${form.data.location || 'N/A'}</p>
        `;
        
        // Add form-specific fields
        if (form.data.formType === 'Shovel Test') {
            formHTML += `
                <p><strong>Surrounding Vegetation:</strong> ${form.data.surroundingVegetation || 'N/A'}</p>
                <p><strong>Stratum I:</strong> ${form.data.stratum1Depth || 'N/A'} - ${form.data.stratum1Materials || 'N/A'}</p>
                <p><strong>Stratum II:</strong> ${form.data.stratum2Depth || 'N/A'} - ${form.data.stratum2Materials || 'N/A'}</p>
            `;
        } else if (form.data.formType === 'Unit Level Record') {
            formHTML += `
                <p><strong>Site Name:</strong> ${form.data.siteName || 'N/A'}</p>
                <p><strong>Unit:</strong> ${form.data.unitDesignation || 'N/A'} (${form.data.unitSize || 'N/A'})</p>
                <p><strong>Depth:</strong> ${form.data.depth || 'N/A'}</p>
                <p><strong>Sediment:</strong> ${form.data.sedimentDescription || 'N/A'}</p>
                <p><strong>Artifacts:</strong> ${form.data.artifactDescription || 'N/A'}</p>
            `;
        }
        
        if (form.data.notes) {
            formHTML += `<p><strong>Notes:</strong> ${form.data.notes}</p>`;
        }
        
        formDiv.innerHTML = formHTML;
        savedFormsDiv.appendChild(formDiv);
    });
}

// Initialize
updateUI();
displaySavedForms();

// Update initial progress text
progressDiv.textContent = "Selecting form type...";

// Speak welcome message when page loads
window.addEventListener('load', () => {
    setTimeout(() => {
        speak("Welcome to the Archaeology Field Form. Press Start Voice Form when you are ready to begin.");
    }, 1000);
});
