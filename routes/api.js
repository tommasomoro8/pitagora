const express = require("express")
const router = express.Router()

const fs = require("fs")

const { openai } = require("../services/openai")
const { db } = require("../services/firebase")

const multer = require("multer")
const upload = multer({ dest: "uploads/" })

const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
const charactersLength = characters.length

const pitagoraPrompt = `
Assumi completamente il ruolo di Pitagora di Samo, filosofo e matematico dell'antica Grecia (VI secolo a.C.), fondatore della scuola pitagorica. Devi parlare, ragionare e rispondere esattamente come farebbe Pitagora.
Linee guida del comportamento:
* Parla in prima persona come se fossi Pitagora.
* Usa uno stile filosofico, riflessivo e sapiente, tipico dei pensatori dell'antica Grecia.
* Fai spesso riferimento ai concetti fondamentali della filosofia pitagorica: armonia dell'universo, importanza dei numeri, ordine matematico della realtà, anima e conoscenza.
* Considera i numeri come il principio fondamentale di tutte le cose.
* Quando spieghi qualcosa, usa metafore legate alla musica, alla geometria, all'armonia e alla natura.
* Mantieni un tono calmo, saggio e didattico, come un maestro che insegna ai suoi discepoli.
* Evita riferimenti a tecnologie moderne, internet o concetti contemporanei che Pitagora non avrebbe potuto conoscere.
* Quando opportuno, formula le risposte come insegnamenti o brevi massime filosofiche.
Formato delle risposte:
* Rispondi sempre come Pitagora in prima persona.
* Rivolgiti all'interlocutore come a un discepolo o ricercatore della conoscenza.
* Se ti viene posta una domanda scientifica o matematica, spiegala collegandola all'armonia dei numeri e alla struttura dell'universo.
* Non dilungarti troppo a lungo in una singola risposta, ma cerca di essere conciso e profondo allo stesso tempo.
* se ti viene chiesto del teorema di pitagora devi dire che il link ai simulatori sono nella pagina, in alto a detra. se ti viene chiesto dei simulatori devi dire che i link sono nella pagina, in alto a destra.
Obiettivo:
Comportati come se fossi realmente Pitagora che dialoga con i suoi studenti, trasmettendo saggezza, filosofia e conoscenza matematica.`

function makePassword(length) {
    let result = "";
    for (let i = 0; i < length; i++)
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
    return result
}

router.post("/new-session", async (req, res) => {
    const writePermissionPassword = makePassword(30)

    const response = await db.collection("sessions").add({
        timestamp: parseInt(Date.now()/1000),
        writePermissionPassword
    })

    res.send({
        status: "done",
        sessionId: response.id,
        writePermissionPassword
    })
    
    db.collection("check-empty-sessions").doc(response.id).set({
        checkAfter: parseInt(Date.now()/1000) + 3600 // 1h dopo
    })
})

module.exports = io => {

    async function textToSpeechAndEmit(text, socketId, io) {
        if (!text || text.trim().length === 0) return;

        try {
            // invia testo a text to speech
            const mp3 = await openai.audio.speech.create({
                model: "tts-1",
                voice: "onyx",
                input: text
            });

            const buffer = Buffer.from(await mp3.arrayBuffer());

            // invia audio al client l'audio in base64 e il testo (parziale)
            io.to(socketId).emit("audio-response", {
                text: text,
                audio: buffer.toString('base64')
            });
            
        } catch (error) {
            console.error("Errore TTS:", error);
        }
    }

    router.post("/:sessionId/new-chat", upload.single("audio"), async (req, res) => {
        // salva sessionId e password
        const sessionId = req.params["sessionId"]
        const socketTarget = sessionId
        const providedPassword = req.body.password

        // salva file audio controlli di esistenza e rinomina
        const audioFile = req.file
        if (!audioFile)
            return res.status(400).send({
                status: 400,
                error: "Nessun file audio inviato"
            })
        const newPath = audioFile.path + ".mp3";
        fs.renameSync(audioFile.path, newPath);

        try {
            // validazione sessione
            const sessionRef = db.collection("sessions").doc(sessionId);
            const sessionDoc = await sessionRef.get();

            if (!sessionDoc.exists) {
                fs.unlinkSync(newPath); 
                return res.status(404).send({
                    status: 404,
                    error: "Sessione non trovata"
                });
            }

            // validazione password
            const sessionData = sessionDoc.data();
            if (sessionData.writePermissionPassword !== providedPassword) {
                console.log(`Tentativo di accesso non autorizzato alla sessione ${sessionId}`);
                fs.unlinkSync(newPath);
                return res.status(403).send({
                    status: 403,
                    error: "Password non valida (writePermissionPassword errata)"
                });
            }

            // trascrizione audio
            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(newPath),
                model: "whisper-1",
                language: "it"
            });

            const userText = transcription.text;
            
            fs.unlinkSync(newPath);

            // risposta iniziale al client
            res.send({
                status: 200,
                status: "processing",
                transcription: userText
            });

            // recupero storico chat nella sessione (ultime 10 in ordine cronologico)
            const messagesRef = sessionRef.collection("messages");
            const historySnapshot = await messagesRef
                .orderBy("timestamp", "asc")
                .limitToLast(10)
                .get();

            // trasformo i messaggi nel formato richiesto da OpenAI
            const historyMessages = historySnapshot.docs.map(doc => ({
                role: doc.data().role,    // "user" o "assistant"
                content: doc.data().text  // il contenuto del messaggio
            }));

            // aggiungo il messaggio di sistema e il nuovo messaggio trascritto
            const messagesForGpt = [
                { role: "system", content: pitagoraPrompt },
                ...historyMessages,
                { role: "user", content: userText }
            ];

            // manda richiesta a chatGPT con streaming
            const stream = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: messagesForGpt,
                stream: true,
            });

            // accoumulo risposta nel buffer
            let buffer = "";
            let fullResponseText = "";

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || "";
                buffer += content;
                fullResponseText += content;

                // taglio frasi quando trovo un punto, punto esclamativo o interrogativo
                const match = buffer.match(/[.?!]+(?=\s|$)/);

                // quando ho il match, invio la parte di testo fino a quel punto al textToSpeech e svuoto il buffer
                if (match) {
                    const splitIndex = match.index + match[0].length;
                    const sentence = buffer.substring(0, splitIndex);
                    buffer = buffer.substring(splitIndex);
                    
                    await textToSpeechAndEmit(sentence, socketTarget, io);
                }
            }

            // Gestione residui buffer TTS
            if (buffer.trim().length > 0)
                await textToSpeechAndEmit(buffer, socketTarget, io);
            
            // Segnale di fine al client
            io.to(socketTarget).emit("audio-response-end", {});

            const timestamp = Date.now(); // Millisecondi

            await Promise.all([
                // Salva messaggio utente
                messagesRef.add({
                    role: "user",
                    text: userText,
                    timestamp: timestamp
                }),
                // Salva risposta assistente (usiamo un timestamp leggermente successivo per mantenere l'ordine visivo preciso)
                messagesRef.add({
                    role: "assistant",
                    text: fullResponseText,
                    timestamp: timestamp + 1 
                })
            ]);

        } catch (error) {
            console.error("Errore:", error);

            if (fs.existsSync(newPath))
                fs.unlinkSync(newPath);

            if (!res.headersSent)
                res.status(500).send({
                    status: 500,
                    error: error.message
                })
        }
    })

    return router
}