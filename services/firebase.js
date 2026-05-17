const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage, getDownloadURL } = require('firebase-admin/storage');

const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

initializeApp({
    credential: cert(credentials),
    storageBucket: "server-ue5.appspot.com"
})

const db = getFirestore()
const bucket = getStorage().bucket()

async function checkEmptySessions() {
    const snapshot = await db.collection("check-empty-sessions").where("checkAfter", "<=", parseInt(Date.now()/1000)).get()

    if (snapshot.empty)
        return
      
    snapshot.forEach(async doc => {
        const collectionList = await db.collection("sessions").doc(doc.id).listCollections()

        if (collectionList.length === 0)
            db.collection("sessions").doc(doc.id).delete()

        db.collection("check-empty-sessions").doc(doc.id).delete()
    })
}
checkEmptySessions()
setInterval(checkEmptySessions, 1800000)

module.exports = { db, bucket, getDownloadURL }