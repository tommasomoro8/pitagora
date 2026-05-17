import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
//import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- VARIABILI PER GESTIRE LE INTERRUZIONI ---
let currentRequestId = 0;           // Contatore per ignorare le vecchie chiamate API
let pendingUserMessageDiv = null;   // Memorizza l'intero blocco "Trascrizione..." per poterlo cancellare
let currentAudioSource = null;      // Memorizza l'audio in riproduzione per poterlo stoppare


// ==========================================
// 1. CONFIGURAZIONE THREE.JS
// ==========================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

// const cubeTextureLoader = new THREE.CubeTextureLoader();
// const environmentMap = cubeTextureLoader
//     .setPath('public/cubemap/')
//     .load([
//         'posx.jpg', 'negx.jpg',
//         'posy.jpg', 'negy.jpg',
//         'posz.jpg', 'negz.jpg'
//     ]);

// scene.background = environmentMap;
// scene.environment = environmentMap;

const textureLoader = new THREE.TextureLoader();

// Carica la tua singola immagine
const bgTexture = textureLoader.load('public/sfondo.jpg');

// Applica l'immagine allo sfondo della scena
scene.background = bgTexture;

// ---> NOVITÀ: Prendi le dimensioni reali del contenitore
const containerWidth = container.clientWidth;
const containerHeight = container.clientHeight;

// Usa le dimensioni del contenitore per la Camera
const camera = new THREE.PerspectiveCamera(45, containerWidth / containerHeight, 0.1, 100);
camera.position.set(0, 1.5, 2.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
// Usa le dimensioni del contenitore per il Renderer
renderer.setSize(containerWidth, containerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

camera.lookAt(0, 1.4, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(2, 2, 2);
scene.add(directionalLight);

/* ... resto del tuo codice (Variabili, Sessione, Audio) ... */

// ==========================================
// MODIFICA ANCHE IL RESIZE LISTENER
// ==========================================
window.addEventListener('resize', () => {
    // Ricalcola in base al contenitore, non alla finestra intera
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
});

// ==========================================
// 2. VARIABILI MODELLO E ANIMAZIONI
// ==========================================
let pitagoraModel;
let partsWithMouth = []; 
const possibleMorphNames = ['jawOpen', 'mouthOpen', 'mouth_open', 'v_aa', 'v_ah', 'MouthOpen', 'jaw_drop'];

// ---> NUOVE VARIABILI PER GLI OCCHI
let partsWithEyes = [];
const possibleEyeMorphNames = ['eyeBlink_L', 'eyeBlink_R', 'blink', 'Blink', 'eyesClosed', 'eyes_closed', 'Blink_Left', 'Blink_Right'];
let targetBlinkValue = 0; // 0 = aperti, 1 = chiusi

let mixer;
let activeAction;      // L'animazione attualmente in esecuzione
let idleAction;        // L'animazione di riposo
let gestureActions = []; // Array per contenere tutti i gesti disponibili

const clock = new THREE.Clock();
const loader = new GLTFLoader();

loader.load('public/pitagora.glb', (gltf) => {
    pitagoraModel = gltf.scene;
    pitagoraModel.position.y = 0.0;
    pitagoraModel.position.z = 0.8;

    scene.add(pitagoraModel);
    
    console.log("--- INIZIALIZZAZIONE MODELLO ---");

    if (gltf.animations) {
        gltf.animations.forEach((clip) => {
            clip.tracks = clip.tracks.filter(track => !track.name.includes('morphTargetInfluences'));
        });
    }

    if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(pitagoraModel);
        
        // Assegniamo la prima animazione (indice 0) come IDLE
        idleAction = mixer.clipAction(gltf.animations[0]);
        
        // Salviamo tutte le altre animazioni come GESTI (se esistono)
        for (let i = 1; i < gltf.animations.length; i++) {
            gestureActions.push(mixer.clipAction(gltf.animations[i]));
        }

        // Avviamo l'animazione di riposo di default
        activeAction = idleAction;
        activeAction.play();
    }

    pitagoraModel.traverse((node) => {
        if (node.isMesh && node.morphTargetDictionary) {
            // Cerchiamo la bocca (il tuo codice esistente)
            let foundMorphName = possibleMorphNames.find(name => node.morphTargetDictionary[name] !== undefined);
            if (foundMorphName) {
                partsWithMouth.push(node);
            }
            
            // ---> CERCHIAMO GLI OCCHI
            let foundEyeMorph = possibleEyeMorphNames.find(name => node.morphTargetDictionary[name] !== undefined);
            if (foundEyeMorph) {
                partsWithEyes.push(node);
            }
        }
    });

    // ---> AVVIAMO IL BATTITO DELLE CIGLIA CASUALE
    function startRandomBlinking() {
        targetBlinkValue = 1; // Chiude gli occhi
        
        setTimeout(() => {
            targetBlinkValue = 0; // Li riapre dopo 150 millisecondi (battito rapido)
        }, 150);

        // Programma il prossimo battito tra i 2 e i 6 secondi
        setTimeout(startRandomBlinking, Math.random() * 4000 + 2000);
    }
    
    // Fai partire il ciclo dopo 2 secondi
    setTimeout(startRandomBlinking, 2000);
});

// Funzione magica per passare fluidamente da un'animazione all'altra
function fadeToAction(nextAction, duration) {
    if (!nextAction || activeAction === nextAction) return;
    
    const previousAction = activeAction;
    activeAction = nextAction;

    // Sfuma via l'animazione precedente
    if (previousAction) {
        previousAction.fadeOut(duration);
    }

    // Prepara e sfuma in entrata la nuova animazione
    activeAction
        .reset()
        .setEffectiveTimeScale(1)
        .setEffectiveWeight(1)
        .fadeIn(duration)
        .play();
}

window.addEventListener('resize', () => {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
});

// ==========================================
// 3. RETE: SESSIONE, SOCKET.IO E REGISTRAZIONE
// ==========================================
let audioContext;
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// Variabili di Sessione e Rete
let sessionId = null;
let writePermissionPassword = null;
let socket = null;

const statusText = document.getElementById('status-text');

// Genera la sessione e connette Socket.io all'avvio
async function initSession() {
    try {
        const response = await fetch('/new-session', { method: 'POST' });
        const data = await response.json();
        
        if (data.status === "done") {
            sessionId = data.sessionId;
            writePermissionPassword = data.writePermissionPassword;
            console.log("✅ Sessione creata:", sessionId);

            // Inizializza Socket.io
            socket = io(); 
            
            socket.on('connect', () => {
                console.log("✅ Connesso a Socket.io. ID:", socket.id);
                // Diciamo al server di inserirci nella stanza dedicata alla sessione
                socket.emit('join-session', sessionId); 
            });

            // Ascoltiamo l'evento dal server
            socket.on('audio-response', async (payload) => {
                console.log("📥 Ricevuto audio dal server!");
                
                // ---> MODIFICA QUI: Niente più testo, solo lo stato <---
                statusText.innerHTML = "🔊 Pitagora sta parlando..."; 

                if (payload.text) {
                    appendBotMessage(payload.text); // Questo va nella chat laterale!
                }
                
                // Decodifica e riproduce l'audio base64
                await playServerAudio(payload.audio);
            });

            // Ora che la sessione è pronta, abilitiamo il microfono
            initAudio();
        }
    } catch (err) {
        console.error("❌ Errore nella creazione della sessione:", err);
        statusText.innerHTML = "Errore di connessione al server.";
    }
}

async function initAudio() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunks.push(event.data);
        };

        // QUANDO LA REGISTRAZIONE FINISCE -> INVIA AL SERVER
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            audioChunks = []; 
            
            // Salviamo l'ID associato ESATTAMENTE a questo invio vocale
            const myRequestId = currentRequestId;
            
            statusText.innerHTML = "⏳ Pitagora sta pensando...";
            const myBubble = addPendingUserMessage();
            
            const formData = new FormData();
            formData.append("audio", audioBlob, "recording.webm");
            formData.append("password", writePermissionPassword); 

            try {
                const response = await fetch(`/${sessionId}/new-chat`, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();

                // ---> CONTROLLO INTERRUZIONE <---
                // Se l'ID è cambiato, significa che l'utente ha ri-premuto spazio!
                // Quindi IGNORIAMO questa risposta, il blocco UI è già stato cancellato.
                if (myRequestId !== currentRequestId) return; 

                // Se arriviamo qui, la richiesta è valida
                pendingUserMessageDiv = null; // Resettiamo la variabile globale
                myBubble.style.opacity = "1"; 
                
                if (data && data.transcription) {
                    typeTextIntoBubble(myBubble, data.transcription);
                } else {
                    typeTextIntoBubble(myBubble, "Audio inviato");
                }

            } catch (err) {
                // Anche in caso di errore, controlliamo se avevamo interrotto
                if (myRequestId !== currentRequestId) return; 
                
                pendingUserMessageDiv = null;
                console.error("Errore invio audio al server:", err);
                statusText.innerHTML = "Errore durante l'invio della voce.";
                myBubble.style.opacity = "1";
                myBubble.textContent = "❌ Errore di invio";
                myBubble.classList.remove('typing');
            }
        };
        
        statusText.innerHTML = "Tieni premuta la <strong>BARRA SPAZIATRICE</strong> per parlare";
        
    } catch (err) {
        console.error('Errore accesso microfono:', err);
    }
}

// Avvia tutto il processo di rete e audio
initSession();

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.repeat) {
        
        // 1. SCATTANO LE INTERRUZIONI!
        stopBotAudio();
        stopBotTyping();
        
        // 2. SE C'ERA UNA TRASCRIZIONE IN ATTESA, CANCELLALA DAL DOM
        if (pendingUserMessageDiv) {
            pendingUserMessageDiv.remove();
            pendingUserMessageDiv = null;
        }

        // 3. INCREMENTA L'ID PER RENDERE OBSOLETE LE VECCHIE RICHIESTE AL SERVER
        currentRequestId++;

        // 4. AVVIA LA REGISTRAZIONE
        if (mediaRecorder && mediaRecorder.state === 'inactive') {
            isRecording = true;
            mediaRecorder.start();
            statusText.innerHTML = "🔴 Registrazione... (Parla, poi rilascia)";
            statusText.classList.add('recording');
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            isRecording = false;
            mediaRecorder.stop();
            statusText.classList.remove('recording');
        }
    }
});
// ==========================================
// 4. RIPRODUZIONE AUDIO DAL SERVER CON CODA
// ==========================================
let analyser;
let dataArray;
let isPlaying = false; // Flag per il lip-sync (animazione)

// --- NUOVE VARIABILI PER LA CODA ---
let audioQueue = [];           // Qui salveremo i buffer audio in attesa
let isProcessingQueue = false; // Ci dice se stiamo già suonando un audio

async function playServerAudio(base64Audio) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    // Convertiamo il base64 ricevuto dal server in un ArrayBuffer
    const binaryString = window.atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    try {
        const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
        
        // Invece di suonarlo subito, lo mettiamo in coda
        audioQueue.push(audioBuffer);
        
        // Se non stiamo già processando la coda, avviala!
        if (!isProcessingQueue) {
            processAudioQueue();
        }
    } catch (err) {
        console.error("Errore decodifica audio base64:", err);
    }
}

// --- NUOVA FUNZIONE PER GESTIRE LA CODA ---
function processAudioQueue() {
    // Se la coda è vuota, abbiamo finito di parlare
    if (audioQueue.length === 0) {
        isProcessingQueue = false;
        isPlaying = false; 
        
        // ---> TORNA ALL'ANIMAZIONE IDLE IN 0.5 SECONDI <---
        fadeToAction(idleAction, 0.5);
        
        // Chiudiamo gradualmente la bocca
        partsWithMouth.forEach(mesh => {
            const dict = mesh.morphTargetDictionary;
            if (dict['jawOpen'] !== undefined) mesh.morphTargetInfluences[dict['jawOpen']] = 0;
            if (dict['mouthPucker'] !== undefined) mesh.morphTargetInfluences[dict['mouthPucker']] = 0;
            if (dict['mouthSmileLeft'] !== undefined) mesh.morphTargetInfluences[dict['mouthSmileLeft']] = 0;
            if (dict['mouthSmileRight'] !== undefined) mesh.morphTargetInfluences[dict['mouthSmileRight']] = 0;
        });
        
        statusText.innerHTML = "Tieni premuta la <strong>BARRA SPAZIATRICE</strong> per parlare";
        return;
    }

    // ---> SE NON STAVA GIA' PARLANDO, AVVIA UN GESTO CASUALE <---
    if (!isPlaying && gestureActions.length > 0) {
        // Pesca un'animazione a caso tra quelle di gesticolazione
        const randomGesture = gestureActions[Math.floor(Math.random() * gestureActions.length)];
        fadeToAction(randomGesture, 0.5); // Sfuma in mezzo secondo
    }

    isProcessingQueue = true;
    isPlaying = true; 
    
    const nextBuffer = audioQueue.shift();
    playAudioBufferAndSync(nextBuffer);
}

function playAudioBufferAndSync(buffer) {
    const source = audioContext.createBufferSource();
    currentAudioSource = source; // <--- SALVIAMO LA SORGENTE ATTIVA
    source.buffer = buffer;

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    source.start(0);

    // Quando QUESTO frammento finisce
    source.onended = () => {
        // Puliamo la variabile solo se è ancora quella attuale
        if (currentAudioSource === source) currentAudioSource = null; 
        processAudioQueue(); 
    };
}
// ==========================================
// 5. ANIMATION LOOP (MIXER + FREQUENCY LIP-SYNC)
// ==========================================
function animate() {
    requestAnimationFrame(animate);
    //controls.update();

    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    if (isPlaying && analyser && partsWithMouth.length > 0) {
        analyser.getByteFrequencyData(dataArray);
        
        let bassSum = 0, midSum = 0, highSum = 0;
        for (let i = 0; i < 15; i++) bassSum += dataArray[i];      
        for (let i = 15; i < 50; i++) midSum += dataArray[i];      
        for (let i = 50; i < 100; i++) highSum += dataArray[i];    

        let bass = (bassSum / 15) / 255.0;
        let mid = (midSum / 35) / 255.0;
        let high = (highSum / 50) / 255.0;

        partsWithMouth.forEach(mesh => {
            const dict = mesh.morphTargetDictionary;
            
            if (dict['jawOpen'] !== undefined) {
                mesh.morphTargetInfluences[dict['jawOpen']] = THREE.MathUtils.lerp(
                    mesh.morphTargetInfluences[dict['jawOpen']], Math.min(bass * 0.75, 1.0), 0.3
                );
            }
            if (dict['mouthPucker'] !== undefined) {
                mesh.morphTargetInfluences[dict['mouthPucker']] = THREE.MathUtils.lerp(
                    mesh.morphTargetInfluences[dict['mouthPucker']], Math.min(mid * 0.75, 1.0), 0.3
                );
            }
            if (dict['mouthSmileLeft'] !== undefined && dict['mouthSmileRight'] !== undefined) {
                mesh.morphTargetInfluences[dict['mouthSmileLeft']] = THREE.MathUtils.lerp(
                    mesh.morphTargetInfluences[dict['mouthSmileLeft']], Math.min(high * 0.5, 0.5), 0.3
                );
                mesh.morphTargetInfluences[dict['mouthSmileRight']] = THREE.MathUtils.lerp(
                    mesh.morphTargetInfluences[dict['mouthSmileRight']], Math.min(high * 0.5, 0.5), 0.3
                );
            }
        });
    }

    renderer.render(scene, camera);
}

animate();


// ==========================================
// 6. GESTIONE INTERFACCIA CHAT (AVANZATA)
// ==========================================
const chatMessagesContainer = document.getElementById('chat-messages');

let currentBotBubble = null; // Memorizza la nuvoletta attuale di Pitagora
let typeQueue = [];          // Coda dei caratteri da digitare
let isTyping = false;        // Flag per sapere se stiamo già scrivendo

// Inserisce il messaggio dell'utente e restituisce la nuvoletta per poterla aggiornare
function addUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'user');

    const bubbleDiv = document.createElement('div');
    bubbleDiv.classList.add('bubble');
    bubbleDiv.textContent = text;
    // Opzionale: aggiungiamo un'opacità ridotta per far capire che sta caricando
    bubbleDiv.style.opacity = "0.7"; 

    messageDiv.appendChild(bubbleDiv);
    chatMessagesContainer.appendChild(messageDiv);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

    currentBotBubble = null; 
    
    // RITORNIAMO L'ELEMENTO DELLA NUVOLETTA
    return bubbleDiv; 
}

// Inserisce i frammenti di Pitagora nella STESSA nuvoletta e li anima
function appendBotMessage(text) {
    // Se non c'è una nuvoletta attiva, la creiamo
    if (!currentBotBubble) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'bot');
        
        currentBotBubble = document.createElement('div');
        currentBotBubble.classList.add('bubble');
        
        messageDiv.appendChild(currentBotBubble);
        chatMessagesContainer.appendChild(messageDiv);
    }
    
    // Aggiungiamo i nuovi caratteri alla coda di digitazione
    // (Aggiungo uno spazio iniziale se non è il primo pezzo e il testo non inizia già con uno spazio)
    if (currentBotBubble.textContent.length > 0 && !text.startsWith(' ') && !text.match(/^[.,!?]/)) {
        typeQueue.push(' ');
    }
    
    typeQueue.push(...text.split(''));
    
    // Avvia l'animazione se non è già partita
    startTyping();
}

// La funzione che smaltisce la coda lettera per lettera
function startTyping() {
    if (isTyping) return; // Se sta già digitando, non fare nulla (ci pensa il loop)
    
    if (typeQueue.length === 0) {
        if (currentBotBubble) currentBotBubble.classList.remove('typing');
        return;
    }
    
    isTyping = true;
    currentBotBubble.classList.add('typing'); // Mostra il cursore lampeggiante
    
    function typeNext() {
        if (typeQueue.length > 0 && currentBotBubble) {
            // Estrae la prima lettera e l'aggiunge al testo
            currentBotBubble.textContent += typeQueue.shift();
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
            
            // Velocità casuale per un effetto più naturale (tra 15ms e 40ms)
            const randomSpeed = Math.random() * 25 + 15;
            setTimeout(typeNext, randomSpeed);
        } else {
            isTyping = false;
            // Se abbiamo finito i caratteri, rimuovi il cursore lampeggiante
            if (currentBotBubble && typeQueue.length === 0) {
                currentBotBubble.classList.remove('typing');
            }
        }
    }
    
    typeNext();
}

// Crea la nuvoletta "in attesa" per l'utente
function addPendingUserMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'user');

    const bubbleDiv = document.createElement('div');
    bubbleDiv.classList.add('bubble', 'typing'); 
    bubbleDiv.textContent = "🎤 Trascrizione...";
    bubbleDiv.style.opacity = "0.7"; 

    messageDiv.appendChild(bubbleDiv);
    chatMessagesContainer.appendChild(messageDiv);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

    currentBotBubble = null; 
    
    // --> NOVITÀ: Salviamo l'intero div globalmente per poterlo distruggere se interrompi
    pendingUserMessageDiv = messageDiv; 

    return bubbleDiv; 
}

// Anima un testo completo dentro una nuvoletta esistente
function typeTextIntoBubble(bubbleElement, text) {
    bubbleElement.textContent = ""; // Svuota il "Trascrizione in corso..."
    bubbleElement.classList.add('typing'); // Assicura che ci sia il cursore
    
    let i = 0;
    function typeNext() {
        if (i < text.length) {
            bubbleElement.textContent += text.charAt(i);
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
            i++;
            // Velocità dell'animazione (tra 15 e 40ms per lettera)
            setTimeout(typeNext, Math.random() * 25 + 15);
        } else {
            // Fine battitura: rimuovi il cursore lampeggiante
            bubbleElement.classList.remove('typing');
        }
    }
    typeNext();
}

// ==========================================
// 7. FUNZIONI DI INTERRUZIONE
// ==========================================
function stopBotAudio() {
    audioQueue = []; // Svuota la coda audio
    if (currentAudioSource) {
        try { currentAudioSource.stop(); } catch (e) {} 
        currentAudioSource = null;
    }
    isProcessingQueue = false;
    isPlaying = false;
    
    // ---> AGGIUNGI QUESTA RIGA <---
    statusText.innerHTML = "Tieni premuta la <strong>BARRA SPAZIATRICE</strong> per parlare";
    
    // Chiudi la bocca al modello 3D
    partsWithMouth.forEach(mesh => {
        const dict = mesh.morphTargetDictionary;
        if (dict['jawOpen'] !== undefined) mesh.morphTargetInfluences[dict['jawOpen']] = 0;
        if (dict['mouthPucker'] !== undefined) mesh.morphTargetInfluences[dict['mouthPucker']] = 0;
        if (dict['mouthSmileLeft'] !== undefined) mesh.morphTargetInfluences[dict['mouthSmileLeft']] = 0;
        if (dict['mouthSmileRight'] !== undefined) mesh.morphTargetInfluences[dict['mouthSmileRight']] = 0;
    });
}

function stopBotTyping() {
    typeQueue = []; // Svuota i caratteri ancora da stampare
    isTyping = false;
    if (currentBotBubble) {
        currentBotBubble.classList.remove('typing'); // Rimuovi il cursore
        currentBotBubble = null; // Stacca la nuvoletta (se parlerà di nuovo ne creerà un'altra)
    }
}