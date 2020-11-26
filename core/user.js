var admin = require("../firebase");
var db = admin.firestore();

function User() {}

User.prototype = {
  update: async function (body, uid) {
    const setUser = db.collection("users").doc(uid);
    const all_users = db.collection("users").doc("all_users");
    const user_names = await all_users.get();

    if (user_names.data().display_names.includes(body.display_name)) {
      return "error-exist";
    } else {
      try {
        await all_users.set({
          display_names: [
            ...user_names.data().display_names,
            body.display_name,
          ],
        });
      } catch (e) {
        return "error";
      }

      try {
        const result = await setUser.set({ ...body }, { merge: true });
        return result;
      } catch (e) {
        return "error";
      }
    }
  },

  login: async function (body, newUser) {
    const setUser = db.collection("users").doc(body.uid);
    let user = {};
    if (newUser) {
      user = {
        full_name: body.name,
        uid: body.uid,
        email: body.email,
        picture: body.picture,
        statistics: { races: 0, average_wpm: 0, fastest_wpm: 0, wins: 0 },
      };
      try {
        await setUser.set(
          {
            ...user,
          },
          { merge: true }
        );
        return user;
      } catch (error) {
        console.log(error);
      }
    } else {
      const usersRef = db.collection("users").doc(body.uid);
      const user = await usersRef.get();
      return user.data();
    }
  },

  updateRaceData: async function (details) {
    const setUser = db.collection("users").doc(details.uid);
    let userDetails = await setUser.get();
    userDetails = userDetails.data();

    let fastest_wpm = details.wpm;
    if (userDetails && userDetails.statistics.fastest_wpm > fastest_wpm) {
      fastest_wpm = userDetails.statistics.fastest_wpm;
    }

    let wins = userDetails.statistics.wins;
    if (details.rank === 1) {
      wins += 1;
    }
    let updated_statistics = {
      races: userDetails.statistics.races + 1,
      average_wpm:
        (userDetails.statistics.races * userDetails.statistics.average_wpm +
          details.wpm) /
        (userDetails.statistics.races + 1),
      fastest_wpm,
      wins,
    };

    try {
      await setUser.set(
        {
          statistics: { ...updated_statistics },
        },
        { merge: true }
      );
      return updated_statistics;
    } catch (error) {
      return "error";
    }
  },
};

module.exports = User;
