import { Router } from "express";
import uploadRoutes from "./upload";
import analyzeRoutes from "./analyze";
import storyboardRoutes from "./storyboards";
import generateRoutes from "./generate";
import videoRoutes from "./video";

const router = Router();

router.use("/upload", uploadRoutes);
router.use("/analyze", analyzeRoutes);
router.use("/storyboards", storyboardRoutes);
router.use("/generate", generateRoutes);
router.use("/video", videoRoutes);

export default router;
