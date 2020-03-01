import { UserController } from "./controller/UserController";
import express, { Request, Response } from "express";
import { MusicFileController } from "./controller/MusicFileController";
import { VocaDBImportController } from "./controller/VocaDBImportController";
import { transliterate } from "./utils/transliterate";
import { LyricsProvidersController } from "./controller/LyricsProvidersController";
import { DownloadController } from "./controller/DownloadController";

export default (app: express.Express) => {
  const userRouter = express.Router();
  const userController = new UserController();

  userRouter.get("/users", userController.all);
  userRouter.get("/users/:id", userController.one);
  userRouter.post("/users", userController.save);
  userRouter.delete("/users/:id", userController.remove);
  app.use("/", userRouter);

  const musicFileController = new MusicFileController();
  app.use("/files", musicFileController.router);

  const vocaDBImportController = new VocaDBImportController();
  app.use("/vocadb", vocaDBImportController.router);

  const lyricsProvidersController = new LyricsProvidersController();
  app.use("/lyrics", lyricsProvidersController.router);

  const downloadController = new DownloadController();
  app.use("/download", downloadController.router);

  app.get("/transliterate/:text", (req: Request, res: Response) => {
    res.send(transliterate(req.params.text));
  });
};
