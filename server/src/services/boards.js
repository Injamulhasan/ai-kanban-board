import prisma from "../db/prisma.js";
import AppError from "../utils/AppError.js";

const DEFAULT_COLUMNS = ["Todo", "In Progress", "Review", "Done"];

/* ---------- Board CRUD ---------- */

export async function listBoards(userId) {
  const boards = await prisma.board.findMany({
    where: {
      members: {
        some: { userId }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  const result = await Promise.all(
    boards.map(async (b) => {
      const taskCount = await prisma.task.count({ where: { boardId: b.id } });
      const memberCount = await prisma.boardMember.count({ where: { boardId: b.id } });
      return {
        id: b.id,
        title: b.title,
        description: b.description,
        color: b.color,
        owner_id: b.ownerId,
        created_at: b.createdAt,
        updated_at: b.updatedAt,
        is_owner: b.ownerId === userId,
        task_count: taskCount,
        member_count: memberCount
      };
    })
  );

  return result;
}

export async function createBoard(userId, { title, description, color }) {
  if (!title?.trim()) throw new AppError("Board title is required");

  return prisma.$transaction(async (tx) => {
    const board = await tx.board.create({
      data: {
        title: title.trim(),
        description: description || null,
        color: color || "#2f8159",
        ownerId: userId,
        members: {
          create: {
            userId,
            role: "owner"
          }
        }
      }
    });

    for (const colTitle of DEFAULT_COLUMNS) {
      await tx.column.create({
        data: {
          boardId: board.id,
          title: colTitle
        }
      });
    }

    return {
      id: board.id,
      title: board.title,
      description: board.description,
      color: board.color,
      owner_id: board.ownerId,
      created_at: board.createdAt,
      updated_at: board.updatedAt,
      is_owner: true,
      task_count: 0,
      member_count: 1
    };
  });
}

export async function getBoard(boardId, userId) {
  const board = await prisma.board.findUnique({
    where: { id: boardId }
  });
  if (!board) throw new AppError("Board not found", 404);

  const columns = await prisma.column.findMany({
    where: { boardId },
    orderBy: { createdAt: "asc" }
  });

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

  const formattedColumns = columns.map(c => ({
    id: c.id,
    board_id: c.boardId,
    title: c.title,
    task_ids: c.taskIds,
    created_at: c.createdAt
  }));

  const formattedTasks = tasks.map(t => ({
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

  const members = await prisma.boardMember.findMany({
    where: { boardId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  const formattedMembers = members.map(m => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    avatar_url: m.user.avatarUrl,
    role: m.role,
    joined_at: m.createdAt
  }));

  const myMembership = members.find(m => m.userId === userId);
  const role = myMembership?.role || "member";

  return {
    board: {
      id: board.id,
      title: board.title,
      description: board.description,
      color: board.color,
      owner_id: board.ownerId,
      created_at: board.createdAt,
      updated_at: board.updatedAt
    },
    columns: formattedColumns,
    tasks: formattedTasks,
    members: formattedMembers,
    role
  };
}

export async function updateBoard(boardId, data) {
  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) updateData.description = data.description;
  if (data.color !== undefined) updateData.color = data.color;

  if (Object.keys(updateData).length === 0) throw new AppError("Nothing to update");

  const board = await prisma.board.update({
    where: { id: boardId },
    data: updateData
  });

  return {
    id: board.id,
    title: board.title,
    description: board.description,
    color: board.color,
    owner_id: board.ownerId,
    created_at: board.createdAt,
    updated_at: board.updatedAt
  };
}

export async function deleteBoard(boardId, userId) {
  const board = await prisma.board.findUnique({
    where: { id: boardId }
  });
  if (!board) throw new AppError("Board not found", 404);
  if (board.ownerId !== userId)
    throw new AppError("Only the owner can delete this board", 403);

  await prisma.board.delete({
    where: { id: boardId }
  });

  return { success: true };
}

/* ---------- Activity ---------- */

export async function logActivity(boardId, userId, action, message, meta = {}) {
  const activity = await prisma.activity.create({
    data: {
      boardId,
      userId,
      action,
      message,
      meta
    },
    include: {
      user: {
        select: {
          name: true,
          avatarUrl: true
        }
      }
    }
  });

  return {
    id: activity.id,
    board_id: activity.boardId,
    user_id: activity.userId,
    action: activity.action,
    message: activity.message,
    meta: activity.meta,
    created_at: activity.createdAt,
    user_name: activity.user?.name || "System",
    user_avatar: activity.user?.avatarUrl || null
  };
}

export async function getActivities(boardId, limit = 30) {
  const activities = await prisma.activity.findMany({
    where: { boardId },
    include: {
      user: {
        select: {
          name: true,
          avatarUrl: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: limit
  });

  return activities.map(a => ({
    id: a.id,
    board_id: a.boardId,
    user_id: a.userId,
    action: a.action,
    message: a.message,
    meta: a.meta,
    created_at: a.createdAt,
    user_name: a.user?.name || "System",
    user_avatar: a.user?.avatarUrl || null
  }));
}

/* ---------- Members ---------- */

export async function addMember(boardId, email, role = "member") {
  if (!email?.trim()) throw new AppError("Email is required");

  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });
  if (!user) throw new AppError("User not found with that email", 404);

  const existing = await prisma.boardMember.findUnique({
    where: {
      boardId_userId: {
        boardId,
        userId: user.id
      }
    }
  });
  if (existing) throw new AppError("User is already a member", 409);

  const memberRole = role === "admin" ? "admin" : "member";

  await prisma.boardMember.create({
    data: {
      boardId,
      userId: user.id,
      role: memberRole
    }
  });

  await prisma.board.update({
    where: { id: boardId },
    data: { updatedAt: new Date() }
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar_url: user.avatarUrl,
    role: memberRole,
    joined_at: new Date().toISOString()
  };
}

export async function removeMember(boardId, userId) {
  const board = await prisma.board.findUnique({
    where: { id: boardId }
  });
  if (board?.ownerId === userId)
    throw new AppError("Cannot remove the board owner", 400);

  await prisma.boardMember.delete({
    where: {
      boardId_userId: {
        boardId,
        userId
      }
    }
  });

  return { success: true };
}
