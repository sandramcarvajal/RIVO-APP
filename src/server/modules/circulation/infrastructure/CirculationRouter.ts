import { Router } from "express";
import { CheckCirculationUseCase } from "../application/CheckCirculationUseCase";

const circulationRouter = Router();
const checkCirculationUseCase = new CheckCirculationUseCase();

circulationRouter.post("/check", async (req, res) => {
  try {
    const { plate, date } = req.body;
    if (!plate || !date) {
      return res.status(400).json({ error: "Parámetros faltantes: plate y date son obligatorios." });
    }

    const result = await checkCirculationUseCase.execute({ plate, date });
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

circulationRouter.get("/check", async (req, res) => {
  try {
    const { plate, date } = req.query;
    if (!plate || !date) {
      return res.status(400).json({ error: "Parámetros faltantes: plate y date son obligatorios." });
    }

    const result = await checkCirculationUseCase.execute({ 
      plate: plate as string, 
      date: date as string 
    });
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export { circulationRouter };
