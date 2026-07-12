import * as taskService from "../services/tasks.js";
import * as boardService from "../services/boards.js";
import { getIO } from "../socket.js";

export const create = async (req, res, next) => {
  try {
    const task = await taskService.createColumn(req.params.boardId, req.body);

    getIO().to(`board:${req.params.boardId}`).emit("column:created", task);

    const activity = await boardService.logActivity(
      req.params.boardId, req.user.id, "column.created",
      `${req.user.name} added column "${req.body.title}"`
    );
    getIO().to(`board:${req.params.boardId}`).emit("activity:new", activity);

    res.status(201).json({ column: task });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const column = await taskService.updateColumn(
      req.params.boardId, req.params.columnId, req.body
    );

    getIO().to(`board:${req.params.boardId}`).emit("column:updated", column);

    res.json({ column });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const result = await taskService.deleteColumn(
      req.params.boardId, req.params.columnId
    );

    getIO().to(`board:${req.params.boardId}`).emit("column:deleted", { id: req.params.columnId });

    const activity = await boardService.logActivity(
      req.params.boardId, req.user.id, "column.deleted",
      `${req.user.name} removed a column`
    );
    getIO().to(`board:${req.params.boardId}`).emit("activity:new", activity);

    res.json(result);
  } catch (err) {
    next(err);
  }
};
