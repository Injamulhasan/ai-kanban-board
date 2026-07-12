import * as taskService from "../services/tasks.js";
import * as boardService from "../services/boards.js";
import { getIO } from "../socket.js";

export const list = async (req, res, next) => {
  try {
    const tasks = await taskService.listTasks(req.params.boardId);
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const task = await taskService.createTask(req.params.boardId, req.user.id, req.body);

    getIO().to(`board:${req.params.boardId}`).emit("task:created", task);

    const activity = await boardService.logActivity(
      req.params.boardId, req.user.id, "task.created",
      `${req.user.name} created "${task.title}"`
    );
    getIO().to(`board:${req.params.boardId}`).emit("activity:new", activity);

    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const task = await taskService.updateTask(
      req.params.boardId, req.params.taskId, req.body
    );

    getIO().to(`board:${req.params.boardId}`).emit("task:updated", task);

    const activity = await boardService.logActivity(
      req.params.boardId, req.user.id, "task.updated",
      `${req.user.name} updated "${task.title}"`
    );
    getIO().to(`board:${req.params.boardId}`).emit("activity:new", activity);

    res.json({ task });
  } catch (err) {
    next(err);
  }
};

export const move = async (req, res, next) => {
  try {
    const task = await taskService.moveTask(
      req.params.boardId, req.params.taskId, req.body
    );

    getIO().to(`board:${req.params.boardId}`).emit("task:moved", task);

    res.json({ task });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const result = await taskService.deleteTask(
      req.params.boardId, req.params.taskId
    );

    getIO().to(`board:${req.params.boardId}`).emit("task:deleted", { id: req.params.taskId });

    const activity = await boardService.logActivity(
      req.params.boardId, req.user.id, "task.deleted",
      `${req.user.name} deleted a task`
    );
    getIO().to(`board:${req.params.boardId}`).emit("activity:new", activity);

    res.json(result);
  } catch (err) {
    next(err);
  }
};
