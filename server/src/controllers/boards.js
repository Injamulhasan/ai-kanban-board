import * as boardService from "../services/boards.js";
import eventEmitter from "../services/eventEmitter.js";

export const list = async (req, res, next) => {
  try {
    const boards = await boardService.listBoards(req.user.id);
    res.json({ boards });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const board = await boardService.createBoard(req.user.id, req.body);
    res.status(201).json({ board });
  } catch (err) {
    next(err);
  }
};

export const get = async (req, res, next) => {
  try {
    const data = await boardService.getBoard(req.params.id, req.user.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const board = await boardService.updateBoard(req.params.id, req.body);

    // Broadcast to all connected board members
    eventEmitter.emit("emit:socket", {
      room: `board:${req.params.id}`,
      event: "board:updated",
      data: board
    });

    const activity = await boardService.logActivity(
      req.params.id, req.user.id, "board.updated",
      `${req.user.name} updated the board`
    );
    
    eventEmitter.emit("emit:socket", {
      room: `board:${req.params.id}`,
      event: "activity:new",
      data: activity
    });

    res.json({ board });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const result = await boardService.deleteBoard(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const activities = await boardService.getActivities(req.params.id, limit);
    res.json({ activities });
  } catch (err) {
    next(err);
  }
};

export const addMember = async (req, res, next) => {
  try {
    const member = await boardService.addMember(
      req.params.id, req.body.email, req.body.role
    );

    const activity = await boardService.logActivity(
      req.params.id, req.user.id, "member.added",
      `${req.user.name} added ${member.name} to the board`
    );
    eventEmitter.emit("emit:socket", {
      room: `board:${req.params.id}`,
      event: "activity:new",
      data: activity
    });
    
    eventEmitter.emit("emit:socket", {
      room: `board:${req.params.id}`,
      event: "member:added",
      data: member
    });

    res.status(201).json({ member });
  } catch (err) {
    next(err);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    const result = await boardService.removeMember(req.params.id, req.params.userId);

    const activity = await boardService.logActivity(
      req.params.id, req.user.id, "member.removed",
      `${req.user.name} removed a member from the board`
    );
    eventEmitter.emit("emit:socket", {
      room: `board:${req.params.id}`,
      event: "activity:new",
      data: activity
    });
    
    eventEmitter.emit("emit:socket", {
      room: `board:${req.params.id}`,
      event: "member:removed",
      data: { userId: req.params.userId }
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};
