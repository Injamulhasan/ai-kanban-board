import prisma from "../db/prisma.js";
import AppError from "../utils/AppError.js";

export async function listTasks(boardId) {
  const tasks = await prisma.task.findMany({
    where: { boardId },
    include: {
      assignee: {
        select: {
          name: true,
          email: true,
          avatarUrl: true
        }
      }
    }
  });

  return tasks.map(t => ({
    id: t.id,
    board_id: t.boardId,
    column_id: t.columnId,
    title: t.title,
    description: t.description,
    priority: t.priority,
    due_date: t.dueDate,
    assignee_id: t.assigneeId,
    created_by: t.createdBy,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
    assignee_name: t.assignee?.name || null,
    assignee_email: t.assignee?.email || null,
    assignee_avatar: t.assignee?.avatarUrl || null
  }));
}

export async function createTask(boardId, userId, data) {
  if (!data.title?.trim()) throw new AppError("Task title is required");
  if (!data.column_id) throw new AppError("Column ID is required");

  return prisma.$transaction(async (tx) => {
    const createdTask = await tx.task.create({
      data: {
        boardId,
        columnId: data.column_id,
        title: data.title.trim(),
        description: data.description || null,
        priority: data.priority || "medium",
        dueDate: data.due_date ? new Date(data.due_date) : null,
        assigneeId: data.assignee_id || null,
        createdBy: userId
      },
      include: {
        assignee: {
          select: {
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    // Append to column's taskIds
    await tx.column.update({
      where: { id: data.column_id },
      data: {
        taskIds: {
          push: createdTask.id
        }
      }
    });

    // Touch board timestamp
    await tx.board.update({
      where: { id: boardId },
      data: { updatedAt: new Date() }
    });

    return {
      id: createdTask.id,
      board_id: createdTask.boardId,
      column_id: createdTask.columnId,
      title: createdTask.title,
      description: createdTask.description,
      priority: createdTask.priority,
      due_date: createdTask.dueDate,
      assignee_id: createdTask.assigneeId,
      created_by: createdTask.createdBy,
      created_at: createdTask.createdAt,
      updated_at: createdTask.updatedAt,
      assignee_name: createdTask.assignee?.name || null,
      assignee_email: createdTask.assignee?.email || null,
      assignee_avatar: createdTask.assignee?.avatarUrl || null
    };
  });
}

export async function updateTask(boardId, taskId, data) {
  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.due_date !== undefined) updateData.dueDate = data.due_date ? new Date(data.due_date) : null;
  if (data.assignee_id !== undefined) updateData.assigneeId = data.assignee_id || null;

  if (Object.keys(updateData).length === 0) throw new AppError("Nothing to update");

  const task = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      assignee: {
        select: {
          name: true,
          email: true,
          avatarUrl: true
        }
      }
    }
  });

  await prisma.board.update({
    where: { id: boardId },
    data: { updatedAt: new Date() }
  });

  return {
    id: task.id,
    board_id: task.boardId,
    column_id: task.columnId,
    title: task.title,
    description: task.description,
    priority: task.priority,
    due_date: task.dueDate,
    assignee_id: task.assigneeId,
    created_by: task.createdBy,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    assignee_name: task.assignee?.name || null,
    assignee_email: task.assignee?.email || null,
    assignee_avatar: task.assignee?.avatarUrl || null
  };
}

export async function moveTask(boardId, taskId, { column_id, position }) {
  if (!column_id) throw new AppError("column_id is required");
  const targetIndex = parseInt(position);
  if (isNaN(targetIndex)) throw new AppError("position (index) is required");

  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId }
    });
    if (!task) throw new AppError("Task not found", 404);

    const sourceColId = task.columnId;
    const destColId = column_id;

    if (sourceColId === destColId) {
      const col = await tx.column.findUnique({ where: { id: sourceColId } });
      let list = [...col.taskIds];
      
      list = list.filter(id => id !== taskId);
      list.splice(targetIndex, 0, taskId);

      await tx.column.update({
        where: { id: sourceColId },
        data: { taskIds: list }
      });
    } else {
      const sourceCol = await tx.column.findUnique({ where: { id: sourceColId } });
      const destCol = await tx.column.findUnique({ where: { id: destColId } });

      const sourceList = sourceCol.taskIds.filter(id => id !== taskId);
      
      let destList = [...destCol.taskIds];
      destList = destList.filter(id => id !== taskId);
      destList.splice(targetIndex, 0, taskId);

      await tx.column.update({
        where: { id: sourceColId },
        data: { taskIds: sourceList }
      });

      await tx.column.update({
        where: { id: destColId },
        data: { taskIds: destList }
      });

      await tx.task.update({
        where: { id: taskId },
        data: { columnId: destColId }
      });
    }

    await tx.board.update({
      where: { id: boardId },
      data: { updatedAt: new Date() }
    });

    const fullTask = await tx.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: {
          select: {
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    return {
      id: fullTask.id,
      board_id: fullTask.boardId,
      column_id: fullTask.columnId,
      title: fullTask.title,
      description: fullTask.description,
      priority: fullTask.priority,
      due_date: fullTask.dueDate,
      assignee_id: fullTask.assigneeId,
      created_by: fullTask.createdBy,
      created_at: fullTask.createdAt,
      updated_at: fullTask.updatedAt,
      assignee_name: fullTask.assignee?.name || null,
      assignee_email: fullTask.assignee?.email || null,
      assignee_avatar: fullTask.assignee?.avatarUrl || null
    };
  });
}

export async function deleteTask(boardId, taskId) {
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId }
    });
    if (!task) throw new AppError("Task not found", 404);

    const column = await tx.column.findUnique({
      where: { id: task.columnId }
    });
    const updatedTaskIds = column.taskIds.filter(id => id !== taskId);

    await tx.column.update({
      where: { id: task.columnId },
      data: { taskIds: updatedTaskIds }
    });

    await tx.task.delete({
      where: { id: taskId }
    });

    await tx.board.update({
      where: { id: boardId },
      data: { updatedAt: new Date() }
    });
  });

  return { success: true };
}

/* ---------- Columns ---------- */

export async function createColumn(boardId, { title }) {
  if (!title?.trim()) throw new AppError("Column title is required");

  const column = await prisma.column.create({
    data: {
      boardId,
      title: title.trim()
    }
  });

  return {
    id: column.id,
    board_id: column.boardId,
    title: column.title,
    task_ids: column.taskIds,
    created_at: column.createdAt
  };
}

export async function updateColumn(boardId, columnId, data) {
  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title.trim();

  if (Object.keys(updateData).length === 0) throw new AppError("Nothing to update");

  const column = await prisma.column.update({
    where: { id: columnId },
    data: updateData
  });

  return {
    id: column.id,
    board_id: column.boardId,
    title: column.title,
    task_ids: column.taskIds,
    created_at: column.createdAt
  };
}

export async function deleteColumn(boardId, columnId) {
  await prisma.$transaction(async (tx) => {
    await tx.task.deleteMany({
      where: { columnId, boardId }
    });

    await tx.column.delete({
      where: { id: columnId }
    });

    await tx.board.update({
      where: { id: boardId },
      data: { updatedAt: new Date() }
    });
  });

  return { success: true };
}
