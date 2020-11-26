var admin = require("../firebase");
var db = admin.firestore();

function Race() {}

Race.prototype = {
  create: async function (race_uid, user_uid) {
    const setActiveRaces = db.collection("races").doc("active_races");
    const setRaceDetails = db.collection("races").doc(race_uid);
    try {
      const randomParagraph = Math.floor(Math.random() * 4);
      const getParagraph = db
        .collection("paragraphs")
        .doc(randomParagraph.toString());
      const paragraphData = await getParagraph.get();
      const paragraph = paragraphData.data();

      const raceData = await setActiveRaces.get();
      activeRaces = raceData.data().race_uid;
      let allRaces = [];
      if (!activeRaces) {
        allRaces = [race_uid];
      } else {
        allRaces = [...activeRaces, race_uid];
      }

      const result = await setActiveRaces.set({ allRaces }, { merge: true });

      const result_2 = await setRaceDetails.set(
        { race_uid, players: [user_uid] },
        { merge: true }
      );

      return paragraph;
    } catch (e) {
      return "error";
    }
  },

  newParagraph: async function () {
    try {
      const randomParagraph = Math.floor(Math.random() * 4);
      const getParagraph = db
        .collection("paragraphs")
        .doc(randomParagraph.toString());
      const paragraphData = await getParagraph.get();
      const paragraph = paragraphData.data();

      return paragraph;
    } catch (e) {
      return "error";
    }
  },
};

module.exports = Race;
