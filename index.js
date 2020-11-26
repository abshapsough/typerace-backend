const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const User = require("./core/user");
const Race = require("./core/race");
const admin = require("./firebase");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const { v4: uuid } = require("uuid");
const path = require("path");
const cors = require("cors");

const port = process.env.PORT || 5000;
const publicPath = path.join(__dirname, "build");

const user = new User();
const race = new Race();

const privKey = "4994e908-666b-4ba7-8adf-409dc5639398";

app.use(cors());
app.use(bodyParser.json());
app.use("/", express.static(publicPath));

const verifyJwtToken = (req, res, next) => {
  const token = req.headers["authorization"];

  try {
    const decoded = jwt.verify(token, privKey);
    req.uid = decoded.uid;

    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid jwt token" });
  }
};

app.post("/login", async (req, res) => {
  const { idToken } = req.body;
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const details = await user.login(decodedToken, req.body.newUser);
    return res.send({
      ...details,
      token: jwt.sign({ uid: details.uid }, privKey),
    });
  } catch (error) {
    console.log(error);
  }
});

app.put("/update", verifyJwtToken, async (req, res) => {
  const result = await user.update(req.body, req.uid);
  if (result === "error") {
    return res.send({ error: "error when updating profile" });
  }
  if (result === "error-exist") {
    return res.send({ error: "This display name already exists" });
  }
  return res.send({ message: "successfully updated profile" });
});

app.put("/update-race-data", verifyJwtToken, async (req, res) => {
  const result = await user.updateRaceData(req.body);
  if (result === "error") {
    return res.send({ error: "Update statistics failed" });
  }
  return res.send(result);
});

app.get("/create", verifyJwtToken, async (req, res) => {
  const race_uid = uuid();

  const result = await race.create(race_uid, req.uid);
  if (result === "error") {
    return res.send({ error: "error when creating race" });
  }
  return res.send({
    message: "successfully created race",
    ...result,
    race_uid,
  });
});

app.get("/new-paragraph", async (req, res) => {
  const result = await race.newParagraph();
  if (result === "error") {
    return res.send({ error: "error when creating race" });
  }

  return res.send({
    message: "successfully created race",
    ...result,
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const verifyJwtIo = (token) => {
  try {
    const decoded = jwt.verify(token, privKey);
    return decoded.uid;
  } catch (err) {
    return { error: "Invalid jwt token" };
  }
};

io.on("connection", (socket) => {
  socket.on("join-race", async (details) => {
    race_uid = details.race_uid;
    socket.join(race_uid);
    const uid = await verifyJwtIo(details.token);
    if (details.race_admin === uid) {
      if (!uid.error) {
        io.sockets.in(details.race_uid).emit("connectToRoom", {
          race_uid: details.race_uid,
          current_users: [
            {
              uid: uid,
              display_name: details.display_name,
              image: details.image,
            },
          ],
          race_admin: uid,
          paragraph: details.paragraph,
        });
      }
    } else {
      if (!uid.error) {
        socket.to(race_uid).emit("new-user-request", {
          image: details.image,
          display_name: details.display_name,
          uid,
        });
      }
    }
  });

  socket.on("new-user-request-granted", (details) => {
    details.current_users.push({
      image: details.image,
      uid: details.uid,
      display_name: details.display_name,
    });
    io.in(details.race_uid).emit("connectToRoom", {
      current_users: details.current_users,
      race_admin: details.race_admin,
      race_uid: details.race_uid,
      paragraph: details.paragraph,
    });
  });

  socket.on("start-countdown", (race) => {
    let current_racers = [];

    race.users.forEach((racer, index) => {
      current_racers.push({
        index: index,
        wpm: 0,
        correctWords: 0,
        image: racer.image,
        display_name: racer.display_name,
        race_uid: race.race_uid,
      });
    });
    io.in(race.race_uid).emit("start-countdown-client", {
      current_racers,
      paragraph: race.paragraph,
    });
  });

  socket.on("update-wpm", (raceData) => {
    io.in(raceData.race_uid).emit("update-client-wpm", raceData);
  });

  socket.on("completed-race", (racer) => {
    io.in(racer.race_uid).emit("completed-race-client", racer.display_name);
  });

  socket.on("remove-player", (details) => {
    if (!details.race_admin) return;
    let new_users = details.current_users;

    if (new_users) {
      new_users = new_users.filter((user) => user.uid !== details.uid);
      if (new_users.length === 0) return;
    }

    let options = {
      current_users: new_users,
      paragraph: details.paragraph,
      race_uid: details.race_uid,
      race_admin: details.race_admin,
      kick: details.kick,
      uid: details.uid,
    };
    if (details.race_admin === details.uid) {
      options = "error";
    }

    io.in(details.race_uid).emit("remove-player-client", options);
  });
});

http.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
