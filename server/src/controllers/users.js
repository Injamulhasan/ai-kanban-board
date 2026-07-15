import prisma from "../db/prisma.js";

export const search = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        id: { not: req.user.id },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true
      },
      orderBy: { name: 'asc' },
      take: 20
    });

    // Match original database structure property name casing for frontend
    const formatted = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar_url: u.avatarUrl
    }));

    res.json({ users: formatted });
  } catch (err) {
    next(err);
  }
};

export const getNotifications = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const activities = await prisma.activity.findMany({
      where: {
        board: {
          members: {
            some: { userId: req.user.id }
          }
        }
      },
      include: {
        board: {
          select: { title: true }
        },
        user: {
          select: { name: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    const formatted = activities.map(a => ({
      id: a.id,
      board_id: a.boardId,
      user_id: a.userId,
      action: a.action,
      message: a.message,
      meta: a.meta,
      created_at: a.createdAt,
      board_title: a.board.title,
      user_name: a.user?.name || null,
      user_avatar: a.user?.avatarUrl || null
    }));

    res.json({ activities: formatted });
  } catch (err) {
    next(err);
  }
};
