import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import authRouter from "./auth";
import clientsRouter from "./clients";
import quotationsRouter from "./quotations";
import settingsRouter from "./settings";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(authRouter);
router.use(clientsRouter);
router.use(quotationsRouter);
router.use(settingsRouter);
router.use(dashboardRouter);

export default router;
