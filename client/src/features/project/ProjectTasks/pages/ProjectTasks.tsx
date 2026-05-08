import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useParams } from "react-router-dom";

import { useBacklogItems } from '@/features/project/Backlog/hooks/useBacklogItems';
import { useBacklogMeta } from '@/features/project/Backlog/hooks/useBacklogMeta';
import { updateBacklogItem } from '@/features/project/Backlog/services/backlog.service';

import { useUserAvatarSvg } from '@/features/profile/hooks/useUserAvatarSvg';
import { UserIcon } from '@heroicons/react/24/outline';

import styles from './ProjectTasks.module.css';

export interface Task {
  id: string;
  title: string;
  date?: string;
  user?: string;
  userId?: number;
}

export interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

const STATUS_COLORS: Record<number, { color: string; textColor: string }> = {
  1: { color: '#F3F4F6', textColor: '#6B7280' },
  2: { color: '#DBEAFE', textColor: '#1D4ED8' },
  3: { color: '#FEF3C7', textColor: '#D97706' },
  4: { color: '#D1FAE5', textColor: '#065F46' },
};

function UserAvatar({ userId, className }: { userId: number; className?: string }) {
  const { avatarSvg } = useUserAvatarSvg(userId);

  if (!avatarSvg) return <UserIcon className={className} />;

  const base64 = btoa(unescape(encodeURIComponent(avatarSvg)));

  return (
    <img
      className={className}
      src={`data:image/svg+xml;base64,${base64}`}
      alt="avatar"
    />
  );
}

const TaskCard: React.FC<{
  task: Task;
}> = ({ task }) => {
  return (
    <div
      className={styles.TaskCard}
      draggable
      data-id={task.id}
      onDragStart={(e) => {
        e.dataTransfer.setData("taskId", task.id);
      }}
    >
      <label>{task.title}</label>

      <div className={styles.TaskData}>
        <label>{task.date}</label>

        <div>
          <label>{task.user ?? "No Asignado"}</label>

          {task.userId ? (
            <UserAvatar className={styles.pfp} userId={task.userId} />
          ) : (
            <UserIcon className={styles.pfp} />
          )}
        </div>
      </div>
    </div>
  );
};

const TaskColumn: React.FC<{column: Column;
  onDropTask: (taskId: string, newStatusId: number) => void;
}> = ({ column, onDropTask }) => {
  const statusId = Number(column.id);
  const colors = STATUS_COLORS[statusId];

  return (
    <div
      className={styles.ProjectList}
      data-status-id={column.id}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const taskId = e.dataTransfer.getData("taskId");
        onDropTask(taskId, statusId);
      }}
    >
      <div
        className={styles.UpperTitle}
        style={{
          backgroundColor: colors?.color,
          color: colors?.textColor,
        }}
      >
        <label>{column.title}</label>
        <label className={styles.Counter}>{column.tasks.length}</label>
      </div>

      {column.tasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
};

const ProjectTasks: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const { id } = useParams<{ id: string }>();
  const PROJECT_ID = Number(id);

  const { items, refresh } = useBacklogItems(PROJECT_ID);
  const { meta } = useBacklogMeta(PROJECT_ID);

  const columns = useMemo(() => {
    if (!items || !meta) return [];

    return meta.statuses.map(status => ({
      id: String(status.id),
      title: status.nombre,
      tasks: items
        .filter(item => item.id_estatus === status.id)
        .map(item => ({
          id: String(item.id),
          title: item.nombre,
          user: meta.users.find(u => u.id === item.id_usuario_responsable)?.nombre ?? undefined,
          userId: item.id_usuario_responsable ?? undefined,
        }))
    }));
  }, [items, meta]);

  const handleDropTask = async (taskId: string, newStatusId: number) => {
    const task = items.find(i => String(i.id) === taskId);
    if (!task) return;
  
    await updateBacklogItem(task.id, {
      ...task,
      id_estatus: newStatusId,
    });
  
    refresh();
  };

  return (
    <div className={styles.container}>
      <div className={styles.mainLists}>
        {columns.map(col => (
          <TaskColumn
          key={col.id}
          column={col}
          onDropTask={handleDropTask}
        />
        ))}
      </div>

      {children}
    </div>
  );
};

export default ProjectTasks;