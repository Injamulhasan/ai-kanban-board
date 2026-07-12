import * as aiService from "../services/ai.js";

export const generateTasks = async (req, res, next) => {
  try {
    const result = await aiService.generateTasks(req.params.boardId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const breakdown = async (req, res, next) => {
  try {
    const subtasks = await aiService.breakdown(req.params.boardId, req.body);
    res.json({ subtasks });
  } catch (err) {
    next(err);
  }
};

export const summary = async (req, res, next) => {
  try {
    const result = await aiService.summary(req.params.boardId);
    res.json({ summary: result });
  } catch (err) {
    next(err);
  }
};
