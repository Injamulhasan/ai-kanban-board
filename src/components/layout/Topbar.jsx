import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Plus, Search, Command, Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLayout } from "./AppLayout";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";
import { userApi } from "../../lib/api";
import { connectSocket } from "../../lib/socket";
import { relativeTime } from "../../lib/utils";

const Topbar = ({ title, subtitle, actions, onCreateBoard }) => {
  const { user, logout } = useAuth();
  const { openCommand } = useLayout() || {};
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [lastReadTime, setLastReadTime] = useState(() => {
    return localStorage.getItem(`notifications_last_read_${user?.id}`) || new Date(0).toISOString();
  });
  const popoverRef = useRef(null);

  // Load initial notifications
  useEffect(() => {
    if (!user) return;
    userApi
      .getNotifications(20)
      .then((data) => {
        setNotifications(data);
        const unreads = data.filter(
          (n) => new Date(n.created_at) > new Date(lastReadTime) && n.user_id !== user.id
        ).length;
        setUnreadCount(unreads);
      })
      .catch((err) => console.error("Error loading notifications:", err));
  }, [user, lastReadTime]);

  // WebSocket Live Updates
  useEffect(() => {
    if (!user) return;
    const socket = connectSocket();

    const onNewActivity = (activity) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === activity.id)) return prev;
        const newList = [activity, ...prev].slice(0, 20);

        if (activity.user_id !== user.id) {
          setUnreadCount((c) => c + 1);
        }
        return newList;
      });
    };

    socket.on("activity:new", onNewActivity);
    return () => {
      socket.off("activity:new", onNewActivity);
    };
  }, [user]);

  // Click outside handlers
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopoverOpen(false);
      }
      if (ref.current && !ref.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleTogglePopover = () => {
    setPopoverOpen((o) => !o);
    if (!popoverOpen) {
      const now = new Date().toISOString();
      localStorage.setItem(`notifications_last_read_${user?.id}`, now);
      setLastReadTime(now);
      setUnreadCount(0);
    }
  };

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    const now = new Date().toISOString();
    localStorage.setItem(`notifications_last_read_${user?.id}`, now);
    setLastReadTime(now);
    setUnreadCount(0);
  };

  return (
    <header className="glass sticky top-0 z-20 flex h-[72px] items-center gap-4 border-b px-6">
      <div className="min-w-0 shrink">
        {title && <h1 className="truncate font-display text-lg font-bold leading-tight tracking-tight text-ink">{title}</h1>}
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        {/* Search → command menu */}
        <button
          onClick={openCommand}
          className="hidden h-10 w-56 items-center gap-2.5 rounded-full border border-line bg-surface px-4 text-sm text-faint shadow-[var(--shadow-card)] transition-all duration-200 hover:border-brand-300 hover:text-muted hover:shadow-[var(--shadow-soft)] md:flex lg:w-64"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Search tasks, boards…</span>
          <kbd className="flex items-center gap-0.5 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>

        {actions}

        <div className="relative" ref={popoverRef}>
          <button
            onClick={handleTogglePopover}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-px hover:text-ink hover:shadow-[var(--shadow-soft)]"
            title="Notifications"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-priority-urgent text-[10px] font-bold text-white ring-2 ring-background animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {popoverOpen && (
            <div className="card animate-in absolute right-0 mt-2 w-80 rounded-2xl p-1.5 shadow-[var(--shadow-lift)] z-30">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-semibold text-ink">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto py-1">
                {notifications.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-faint">No notifications yet.</p>
                ) : (
                  <ul className="space-y-0.5">
                    {notifications.map((n) => {
                      const isUnread = new Date(n.created_at) > new Date(lastReadTime) && n.user_id !== user?.id;
                      return (
                        <li
                          key={n.id}
                          className={`flex gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2 ${
                            isUnread ? "bg-brand-50/20" : ""
                          }`}
                        >
                          <Avatar name={n.user_name} id={n.user_id} src={n.user_avatar} size="sm" />
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-xs text-ink font-medium leading-normal break-words">
                              {n.message}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-faint">
                              <span className="truncate max-w-[100px] font-medium text-brand-600">
                                {n.board_title}
                              </span>
                              <span>•</span>
                              <span>{relativeTime(n.created_at)}</span>
                            </div>
                          </div>
                          {isUnread && (
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <Button size="md" onClick={onCreateBoard} className="hidden sm:inline-flex">
          <Plus className="h-4 w-4" /> New board
        </Button>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-2.5 shadow-[var(--shadow-card)] transition-all duration-200 hover:border-brand-300 hover:shadow-[var(--shadow-soft)]"
          >
            <Avatar name={user?.name} id={user?.id} src={user?.avatar_url} size="sm" />
            <span className="hidden max-w-[7rem] truncate text-sm font-medium text-ink lg:block">
              {user?.name?.split(" ")[0]}
            </span>
            <ChevronDown className="h-4 w-4 text-faint" />
          </button>

          {menuOpen && (
            <div className="card animate-in absolute right-0 mt-2 w-56 rounded-2xl p-1.5 shadow-[var(--shadow-lift)]">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                <p className="truncate text-xs text-faint">{user?.email}</p>
              </div>
              <div className="my-1 border-t" />
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-priority-urgent transition-colors hover:bg-surface-2"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
