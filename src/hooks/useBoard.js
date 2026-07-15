import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { boardApi, taskApi, columnApi } from "../lib/api";
import { connectSocket } from "../lib/socket";
import {
  setBoardData,
  setLoading,
  setError,
  updateBoardDetails,
  upsertTaskState,
  removeTaskState,
  upsertColumnState,
  removeColumnState,
  addMemberState,
  removeMemberState,
  setPresenceState,
  addPresenceState,
  removePresenceState,
  clearBoardState,
} from "../store/boardSlice";

/**
 * Loads a board and keeps it in sync via Socket.IO using Redux store.
 * Returns board state plus mutation helpers that update optimistically and persist to the API.
 */
export const useBoard = (boardId) => {
  const dispatch = useDispatch();

  const board = useSelector((state) => state.board.board);
  const columns = useSelector((state) => state.board.columns);
  const tasks = useSelector((state) => state.board.tasks);
  const members = useSelector((state) => state.board.members);
  const role = useSelector((state) => state.board.role);
  const loading = useSelector((state) => state.board.loading);
  const error = useSelector((state) => state.board.error);
  const presence = useSelector((state) => state.board.presence);

  const upsertTask = useCallback((task) => {
    dispatch(upsertTaskState(task));
  }, [dispatch]);

  const removeTaskLocal = useCallback((id) => {
    dispatch(removeTaskState(id));
  }, [dispatch]);

  // Initial load
  useEffect(() => {
    let alive = true;
    dispatch(setLoading(true));
    dispatch(setError(null));
    boardApi
      .get(boardId)
      .then((data) => {
        if (!alive) return;
        dispatch(setBoardData(data));
      })
      .catch((err) => {
        if (alive) dispatch(setError(err.message));
      });
    return () => {
      alive = false;
      dispatch(clearBoardState());
    };
  }, [boardId, dispatch]);

  // Real-time sync
  useEffect(() => {
    const socket = connectSocket();
    socket.emit("board:join", boardId);

    const onCreated = (t) => dispatch(upsertTaskState(t));
    const onUpdated = (t) => dispatch(upsertTaskState(t));
    const onMoved = (t) => dispatch(upsertTaskState(t));
    const onDeleted = ({ id }) => dispatch(removeTaskState(id));
    const onColCreated = (c) => dispatch(upsertColumnState(c));
    const onColUpdated = (c) => dispatch(upsertColumnState(c));
    const onColDeleted = ({ id }) => dispatch(removeColumnState(id));
    const onBoardUpdated = (b) => dispatch(updateBoardDetails(b));
    const onMemberAdded = (m) => dispatch(addMemberState(m));
    const onMemberRemoved = ({ userId }) => dispatch(removeMemberState(userId));
    const onPresenceSync = ({ users }) => dispatch(setPresenceState(users));
    const onPresenceJoin = ({ user }) => dispatch(addPresenceState(user));
    const onPresenceLeave = ({ user }) => dispatch(removePresenceState(user.id));

    socket.on("task:created", onCreated);
    socket.on("task:updated", onUpdated);
    socket.on("task:moved", onMoved);
    socket.on("task:deleted", onDeleted);
    socket.on("column:created", onColCreated);
    socket.on("column:updated", onColUpdated);
    socket.on("column:deleted", onColDeleted);
    socket.on("board:updated", onBoardUpdated);
    socket.on("member:added", onMemberAdded);
    socket.on("member:removed", onMemberRemoved);
    socket.on("presence:sync", onPresenceSync);
    socket.on("presence:join", onPresenceJoin);
    socket.on("presence:leave", onPresenceLeave);

    return () => {
      socket.emit("board:leave", boardId);
      socket.off("task:created", onCreated);
      socket.off("task:updated", onUpdated);
      socket.off("task:moved", onMoved);
      socket.off("task:deleted", onDeleted);
      socket.off("column:created", onColCreated);
      socket.off("column:updated", onColUpdated);
      socket.off("column:deleted", onColDeleted);
      socket.off("board:updated", onBoardUpdated);
      socket.off("member:added", onMemberAdded);
      socket.off("member:removed", onMemberRemoved);
      socket.off("presence:sync", onPresenceSync);
      socket.off("presence:join", onPresenceJoin);
      socket.off("presence:leave", onPresenceLeave);
    };
  }, [boardId, dispatch]);

  /* ----------------------------- mutations ----------------------------- */

  const createTask = useCallback(
    async (data) => {
      try {
        const task = await taskApi.create(boardId, data);
        dispatch(upsertTaskState(task));
        return task;
      } catch (err) {
        toast.error(err.message);
        throw err;
      }
    },
    [boardId, dispatch]
  );

  const updateTask = useCallback(
    async (taskId, data) => {
      const prev = tasks.find((t) => t.id === taskId);
      dispatch(upsertTaskState({ ...prev, ...data })); // optimistic
      try {
        const task = await taskApi.update(boardId, taskId, data);
        dispatch(upsertTaskState(task));
        return task;
      } catch (err) {
        if (prev) dispatch(upsertTaskState(prev));
        toast.error(err.message);
        throw err;
      }
    },
    [boardId, tasks, dispatch]
  );

  const deleteTask = useCallback(
    async (taskId) => {
      const prev = tasks.find((t) => t.id === taskId);
      dispatch(removeTaskState(taskId)); // optimistic
      try {
        await taskApi.remove(boardId, taskId);
        toast.success("Task deleted");
      } catch (err) {
        if (prev) dispatch(upsertTaskState(prev));
        toast.error(err.message);
      }
    },
    [boardId, tasks, dispatch]
  );

  const moveTask = useCallback(
    async (taskId, columnId, position) => {
      const prev = tasks.find((t) => t.id === taskId);
      if (!prev) return;
      dispatch(upsertTaskState({ ...prev, column_id: columnId, position }));
      try {
        await taskApi.move(boardId, taskId, { column_id: columnId, position });
      } catch (err) {
        dispatch(upsertTaskState(prev));
        toast.error(err.message);
      }
    },
    [boardId, tasks, dispatch]
  );

  const addColumn = useCallback(
    async (title) => {
      try {
        const col = await columnApi.create(boardId, { title });
        dispatch(upsertColumnState(col));
      } catch (err) {
        toast.error(err.message);
      }
    },
    [boardId, dispatch]
  );

  const renameColumn = useCallback(
    async (columnId, title) => {
      const prev = columns.find((c) => c.id === columnId);
      dispatch(upsertColumnState({ ...prev, title }));
      try {
        await columnApi.update(boardId, columnId, { title });
      } catch (err) {
        if (prev) dispatch(upsertColumnState(prev));
        toast.error(err.message);
      }
    },
    [boardId, columns, dispatch]
  );

  const deleteColumn = useCallback(
    async (columnId) => {
      dispatch(removeColumnState(columnId));
      try {
        await columnApi.remove(boardId, columnId);
      } catch (err) {
        toast.error(err.message);
      }
    },
    [boardId, dispatch]
  );

  return {
    board,
    columns,
    tasks,
    members,
    role,
    loading,
    error,
    presence,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    upsertTask,
    addColumn,
    renameColumn,
    deleteColumn,
  };
};
