const videoElement = document.querySelector(".input_video");
const canvasElement = document.querySelector(".output_canvas");
const canvasCtx = canvasElement.getContext("2d");

const gestureName = document.getElementById("gestureName");
const sentence = document.getElementById("sentence");

// UI Button Components
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const backspaceBtn = document.getElementById("backspaceBtn");
const spaceBtn = document.getElementById("spaceBtn");
const upperBtn = document.getElementById("upperBtn");
const lowerBtn = document.getElementById("lowerBtn");
const speakBtn = document.getElementById("speakBtn");

let sentenceText = "";
let lastGesture = "";
let lastGestureTime = 0;

// Load initial value from local storage if available
if (localStorage.getItem("gestureSentence")) {
    sentenceText = localStorage.getItem("gestureSentence");
    sentence.value = sentenceText;
}

function saveSentence() {
    localStorage.setItem("gestureSentence", sentence.value);
}

function autoScrollTextarea() {
    sentence.scrollTop = sentence.scrollHeight;
}

// Unified Speech Engine
function speak(text) {
    if (!text.trim()) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    speech.rate = 0.95;
    speech.pitch = 1;
    speech.volume = 1;
    window.speechSynthesis.speak(speech);
}

// Core Word Handler
function updateGesture(word) {
    const now = Date.now();
    
    // De-bounce gestures inside a 2-second timeout window
    if (word === lastGesture && (now - lastGestureTime) < 2000) {
        return;
    }

    lastGesture = word;
    lastGestureTime = now;
    gestureName.innerHTML = word;

    sentenceText += word + " ";
    sentence.value = sentenceText;
    
    saveSentence();
    autoScrollTextarea();
    speak(word);
}

// --- Gesture Calculation Logic ---
function detectGesture(landmarks) {
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];
    const middleTip = landmarks[12];
    const middlePIP = landmarks[10];
    const ringTip = landmarks[16];
    const ringPIP = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPIP = landmarks[18];

    // Standard state vectors (relative checking against joints)
    const thumbOpen = thumbTip.x < thumbIP.x; 
    const indexOpen = indexTip.y < indexPIP.y;
    const middleOpen = middleTip.y < middlePIP.y;
    const ringOpen = ringTip.y < ringPIP.y;
    const pinkyOpen = pinkyTip.y < pinkyPIP.y;

    let detected = "";

    // ✋ HELLO
    if (thumbOpen && indexOpen && middleOpen && ringOpen && pinkyOpen) {
        detected = "HELLO";
    }
    // ✊ STOP
    else if (!thumbOpen && !indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
        detected = "STOP";
    }
    // ✌️ PEACE
    else if (indexOpen && middleOpen && !ringOpen && !pinkyOpen) {
        detected = "PEACE";
    }
    // ☝️ ONE
    else if (indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
        detected = "ONE";
    }
    // 👍 YES
    else if (thumbOpen && !indexOpen && !middleOpen && !ringOpen && !pinkyOpen && thumbTip.y < indexPIP.y) {
        detected = "YES";
    }
    // 👎 NO
    else if (thumbOpen && !indexOpen && !middleOpen && !ringOpen && !pinkyOpen && thumbTip.y > indexPIP.y) {
        detected = "NO";
    }
    // 🤟 I LOVE YOU
    else if (thumbOpen && indexOpen && !middleOpen && !ringOpen && pinkyOpen) {
        detected = "I LOVE YOU";
    }
    // 👌 OK
    else if (
        Math.abs(thumbTip.x - indexTip.x) < 0.05 &&
        Math.abs(thumbTip.y - indexTip.y) < 0.05 &&
        middleOpen && ringOpen && pinkyOpen
    ) {
        detected = "OK";
    }

    if (detected !== "") {
        updateGesture(detected);
    }
}

// --- MediaPipe Pipeline Pipeline Callbacks ---
function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 4 });
            drawLandmarks(canvasCtx, landmarks, { color: "#FF0000", lineWidth: 2 });
            detectGesture(landmarks);
        }
    } else {
        gestureName.innerHTML = "No Hand Detected";
    }
    canvasCtx.restore();
}

// MediaPipe Initialization
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});
hands.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
});
camera.start();

// --- Action Listeners ---
clearBtn.addEventListener("click", () => {
    sentenceText = "";
    sentence.value = "";
    gestureName.innerHTML = "Waiting...";
    saveSentence();
});

copyBtn.addEventListener("click", () => {
    if (!sentence.value) return;
    navigator.clipboard.writeText(sentence.value);
    alert("Copied sentence to clipboard!");
});

downloadBtn.addEventListener("click", () => {
    if (!sentence.value) return;
    const blob = new Blob([sentence.value], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "gesture_text.txt";
    link.click();
});

backspaceBtn.addEventListener("click", () => {
    let words = sentence.value.trim().split(" ");
    words.pop();
    sentenceText = words.join(" ");
    if (sentenceText.length > 0) sentenceText += " ";
    sentence.value = sentenceText;
    saveSentence();
});

spaceBtn.addEventListener("click", () => {
    sentenceText += " ";
    sentence.value = sentenceText;
    saveSentence();
});

upperBtn.addEventListener("click", () => {
    sentenceText = sentence.value.toUpperCase();
    sentence.value = sentenceText;
    saveSentence();
});

lowerBtn.addEventListener("click", () => {
    sentenceText = sentence.value.toLowerCase();
    sentence.value = sentenceText;
    saveSentence();
});

speakBtn.addEventListener("click", () => {
    speak(sentence.value);
});
