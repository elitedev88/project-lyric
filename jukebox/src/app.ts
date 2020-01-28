import express, { Request, Response } from "express";
import compression from "compression"; // compresses requests
import bodyParser from "body-parser";
import flash from "express-flash";
import session from "express-session";
import passport from "passport";

import registerRoutes from "./routes";
import { SESSION_SECRET } from "./utils/secret";
import sequelize from "./models";
import SequelizeStoreConstructor from "connect-session-sequelize";

const SequelizeStore = SequelizeStoreConstructor(session.Store);


export default () => {
  const app = express();

  app.set("port", process.env.PORT || 3000);
  app.use(compression());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(
    session({
      resave: false,
      saveUninitialized: true,
      proxy: true,
      secret: SESSION_SECRET,
      store: new SequelizeStore({
        db: sequelize
      })
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(flash());

  app.get("/", async (req: Request, res: Response) => {
    res.send("Hello world!");
  });

  registerRoutes(app);

  return app;
};
