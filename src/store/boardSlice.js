import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  board: null,
  columns: [],
  tasks: [],
  members: [],
  role: "member",
  loading: true,
  error: null,
  presence: [],
};

const boardSlice = createSlice({
  name: "board",
  initialState,
  reducers: {
    setBoardData(state, action) {
      const { board, columns, tasks, members, role } = action.payload;
      state.board = board;
      state.columns = columns;
      state.tasks = tasks;
      state.members = members;
      state.role = role;
      state.loading = false;
      state.error = null;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
      state.loading = false;
    },
    updateBoardDetails(state, action) {
      if (state.board) {
        state.board = { ...state.board, ...action.payload };
      }
    },
    upsertTaskState(state, action) {
      const task = action.payload;
      const idx = state.tasks.findIndex((t) => t.id === task.id);
      if (idx === -1) {
        state.tasks.push(task);
      } else {
        state.tasks[idx] = { ...state.tasks[idx], ...task };
      }
    },
    removeTaskState(state, action) {
      const id = action.payload;
      state.tasks = state.tasks.filter((t) => t.id !== id);
    },
    upsertColumnState(state, action) {
      const column = action.payload;
      const idx = state.columns.findIndex((c) => c.id === column.id);
      if (idx === -1) {
        state.columns.push(column);
      } else {
        state.columns[idx] = { ...state.columns[idx], ...column };
      }
    },
    removeColumnState(state, action) {
      const id = action.payload;
      state.columns = state.columns.filter((c) => c.id !== id);
      state.tasks = state.tasks.filter((t) => t.column_id !== id);
    },
    addMemberState(state, action) {
      const m = action.payload;
      if (!state.members.some((x) => x.id === m.id)) {
        state.members.push(m);
      }
    },
    removeMemberState(state, action) {
      const userId = action.payload;
      state.members = state.members.filter((x) => x.id !== userId);
    },
    setPresenceState(state, action) {
      state.presence = action.payload || [];
    },
    addPresenceState(state, action) {
      const user = action.payload;
      if (!state.presence.some((u) => u.id === user.id)) {
        state.presence.push(user);
      }
    },
    removePresenceState(state, action) {
      const userId = action.payload;
      state.presence = state.presence.filter((u) => u.id !== userId);
    },
    clearBoardState() {
      return initialState;
    },
  },
});

export const {
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
} = boardSlice.actions;

export default boardSlice.reducer;
