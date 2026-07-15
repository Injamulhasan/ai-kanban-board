import * as taskService from "../services/tasks.js";
import * as boardService from "../services/boards.js";
import eventEmitter from "../services/eventEmitter.js";

export const create = async (req, res, next) => {
  try {
    const task = await taskService.createColumn(req.params.boardId, req.body);

    eventEmitter.emit("emit:socket", {
      room: `board:${req.params.boardId}`,
      event: "column:created",
      data: task
    });

    const activity = await boardService.logActivity(
      req.params.boardId, req.user.id, "column.created",
      `${req.user.name} added column "${req.body.title}"`
    );
    
    eventEmitter.emit("emit:socket", {
      room: `board:${req.params.boardId}`,
      event: "activity:new",
      data: activity
    });

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

    eventEmitter.emit("emit:socket", {
      room: `board:${req.params.boardId}`,
      event: "column:updated",
      data: column
    });

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

    eventEmitter.emit("emit:socket", {
      room: `board:${req.params.boardId}`,
      event: "column:deleted",
      data: { id: req.params.columnId }
    });

    const activity = await boardService.logActivity(
      req.params.boardId, req.user.id, "column.deleted",
      `${req.user.name} removed a column`
    );
    
    eventEmitter.emit("emit:socket", {
      room: `board:${req.params.boardId}`,
      event: "activity:new",
      data: activity
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};
