import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { Pencil } from "lucide-react";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable, 
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import SortableTask from "./SortableTask";
import "./App.css";

/** Draggable wrapper for each LIST card */
function SortableListWrapper({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

/** Single List container (handles TASK drag & drop inside it) */
function ListContainer({
  list,
  addTask,
  toggleTask,
  deleteTask,
  deleteList,
  onTasksReordered,
  renameList, // 👈 NEW PROP
}) {
  const [newTask, setNewTask] = useState("");
  const [isEditing, setIsEditing] = useState(false); // 👈 FIX
  const [editedName, setEditedName] = useState(list.name); // 👈 FIX

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    await addTask(list._id, newTask);
    setNewTask("");
  };

  const handleTaskDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = list.tasks.findIndex((t) => t._id === active.id);
    const newIndex = list.tasks.findIndex((t) => t._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(list.tasks, oldIndex, newIndex);

    onTasksReordered(list._id, reordered);

    try {
      await axios.put(`${API}/api/todos/${list._id}/reorder`, {
        taskIds: reordered.map((t) => t._id),
      });
    } catch (e) {
      console.error("Failed to persist order:", e?.message);
    }
  };

  const handleRename = async () => {
    if (!editedName.trim() || editedName === list.name) {
      setIsEditing(false);
      return;
    }
    await renameList(list._id, editedName);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.18 }}
      className="bg-gradient-to-br from-[#1f2937] to-[#111827]
                 p-6 rounded-2xl shadow-2xl border border-gray-700
                 w-full max-w-sm hover:border-indigo-500"
    >
      {/* List Header */}
      <div className="flex justify-between items-center mb-4">
        {isEditing ? (
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            autoFocus
            className="text-2xl font-bold text-white bg-transparent border-b border-indigo-400 focus:outline-none"
          />
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white">{list.name}</h2>
            <button
              onClick={() => setIsEditing(true)}
              className="text-gray-400 hover:text-indigo-400"
            >
              <Pencil size={18} />
            </button>
          </div>
        )}
        <button
          onClick={() => deleteList(list._id)}
          className="text-red-400 hover:text-red-600 text-sm font-medium"
        >
          Delete List
        </button>
      </div>

      {/* Add Task */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTask}
          placeholder="Add a task..."
          onChange={(e) => setNewTask(e.target.value)}
          className="flex-1 px-3 py-2 rounded-md bg-[#0e141b] border border-gray-600 text-white placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md font-semibold">
          Add
        </button>
      </form>

      {/* Task list with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleTaskDragEnd}
      >
        <SortableContext
          items={list.tasks.map((t) => t._id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3">
            {list.tasks.length ? (
              list.tasks.map((task) => (
                <SortableTask
                  key={task._id}
                  task={task}
                  onToggle={() => toggleTask(list._id, task._id)}
                  onDelete={() => deleteTask(list._id, task._id)}
                />
              ))
            ) : (
              <p className="text-gray-400 text-sm italic">
                No tasks yet. Add one above ⬆️
              </p>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </motion.div>
  );
}

const API = import.meta.env.VITE_API_BASE_URL;

/** App (handles LIST drag & drop) */
export default function App() {
  const [lists, setLists] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const [newList, setNewList] = useState("");

  const listSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/todos`);
        const normalized = res.data.map((list) => ({
          ...list,
          tasks: [...(list.tasks || [])].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
          ),
        }));
        setLists(normalized);
      } catch (err) {
        console.error("❌ Error fetching lists:", err.message);
      }
    })();
  }, []);

  const createList = async (name) => {
    if (!name.trim()) return;
    try {
      const res = await axios.post(`${API}/api/todos`, { name });
      setLists((prev) => [...prev, res.data]);
      setNewList("");
    } catch (err) {
      console.error("❌ Error creating list:", err.message);
    }
  };

  const renameList = async (listId, newName) => {
    try {
      const res = await axios.put(`${API}/api/todos/${listId}`, {
        name: newName,
      });
      setLists((prev) =>
        prev.map((l) => (l._id === listId ? { ...l, name: res.data.name } : l))
      );
    } catch (err) {
      console.error("❌ Error renaming list:", err.message);
    }
  };

  const addTask = async (listId, text) => {
    try {
      const res = await axios.post(
        `${API}/api/todos/${listId}/tasks`,
        { text }
      );
      setLists((prev) =>
        prev.map((l) =>
          l._id === listId ? { ...l, tasks: [...l.tasks, res.data] } : l
        )
      );
    } catch (e) {
      console.error("❌ Error adding task:", e?.message);
    }
  };

  const toggleTask = async (listId, taskId) => {
    try {
      const res = await axios.put(
        `${API}/api/todos/${listId}/tasks/${taskId}`
      );
      setLists((prev) =>
        prev.map((l) =>
          l._id === listId
            ? {
                ...l,
                tasks: l.tasks.map((t) => (t._id === taskId ? res.data : t)),
              }
            : l
        )
      );
    } catch (e) {
      console.error("❌ Error toggling task:", e?.message);
    }
  };

  const deleteTask = async (listId, taskId) => {
    try {
      await axios.delete(
        `${API}/api/todos/${listId}/tasks/${taskId}`
      );
      setLists((prev) =>
        prev.map((l) =>
          l._id === listId
            ? { ...l, tasks: l.tasks.filter((t) => t._id !== taskId) }
            : l
        )
      );
    } catch (e) {
      console.error("❌ Error deleting task:", e?.message);
    }
  };

  const deleteList = async (listId) => {
    try {
      await axios.delete(`${API}/api/todos/${listId}`);
      setLists((prev) => prev.filter((l) => l._id !== listId));
    } catch (e) {
      console.error("❌ Error deleting list:", e?.message);
    }
  };

  const onTasksReordered = (listId, newTasks) => {
    setLists((prev) =>
      prev.map((l) => (l._id === listId ? { ...l, tasks: newTasks } : l))
    );
  };

  const handleListDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLists((prev) => {
      const oldIndex = prev.findIndex((l) => l._id === active.id);
      const newIndex = prev.findIndex((l) => l._id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  return (
    <div
      className={`min-h-screen w-screen p-6 transition-colors duration-300 ${
        darkMode ? "bg-[#161f2b]" : "bg-gray-100"
      }`}
    >
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6 flex items-center relative">
        <h1
          className={`text-3xl font-bold mx-auto ${
            darkMode ? "text-white" : "text-black"
          }`}
        >
          My Task Dashboard
        </h1>

        {/* Dark mode toggle */}
        <div
          onClick={() => setDarkMode(!darkMode)}
          className="w-14 h-7 bg-gray-700 rounded-full p-1 cursor-pointer flex items-center absolute right-0"
        >
          <motion.div
            layout
            className="w-5 h-5 bg-indigo-500 rounded-full shadow"
            style={{ x: darkMode ? 28 : 0 }}
          />
        </div>
      </div>

      {/* Create List */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createList(newList);
        }}
        className="max-w-5xl mx-auto mb-8 flex gap-2"
      >
        <input
          type="text"
          placeholder="New list name..."
          value={newList}
          onChange={(e) => setNewList(e.target.value)}
          className="flex-1 px-3 py-2 rounded-md bg-[#0e141b] border border-gray-600 text-white placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          type="submit"
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 font-semibold"
        >
          Create List
        </button>
      </form>

      {/* Lists */}
      <DndContext
        sensors={listSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleListDragEnd}
      >
        <SortableContext
          items={lists.map((l) => l._id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-wrap gap-5 justify-center">
            {lists.length ? (
              lists.map((list) => (
                <SortableListWrapper key={list._id} id={list._id}>
                  <ListContainer
                    list={list}
                    addTask={addTask}
                    toggleTask={toggleTask}
                    deleteTask={deleteTask}
                    deleteList={deleteList}
                    onTasksReordered={onTasksReordered}
                    renameList={renameList} // 👈 pass down
                  />
                </SortableListWrapper>
              ))
            ) : (
              <p className="text-gray-400 text-lg">
                No lists yet. Create one above 👆
              </p>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
