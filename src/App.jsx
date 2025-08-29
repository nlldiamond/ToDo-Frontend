import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { Pencil, Sun, Moon } from "lucide-react";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
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
  renameList,
  renameTask,
  backendStatus,
  darkMode,
}) {
  const [newTask, setNewTask] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(list.name);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    })
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
      className={`p-6 rounded-2xl shadow-2xl border w-[23rem] 
        ${darkMode
          ? "bg-gradient-to-br from-[#1f2937] to-[#111827] border-gray-700 hover:border-indigo-500"
          : "bg-white border-gray-300 hover:border-indigo-500"
        }`}
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
            className={`text-2xl font-bold border-b focus:outline-none ${
              darkMode
                ? "text-white bg-transparent border-indigo-400"
                : "text-black bg-transparent border-gray-500"
            }`}
          />
        ) : (
          <div className="flex items-center gap-2">
            <h2 className={`${darkMode ? "text-white" : "text-black"} text-2xl font-bold`}>
              {list.name}
            </h2>
            <button
              onClick={() => setIsEditing(true)}
              className={`${darkMode ? "text-gray-400 hover:text-indigo-400" : "text-gray-600 hover:text-indigo-500"}`}
            >
              <Pencil size={18} />
            </button>
          </div>
        )}
        <button
          onClick={() => deleteList(list._id)}
          className={`${darkMode ? "text-red-400 hover:text-red-600" : "text-red-600 hover:text-red-800"} text-sm font-medium`}
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
          className={`flex-1 px-3 py-2 rounded-md 
                      ${darkMode ? "bg-[#0e141b] border border-gray-600 text-white placeholder-gray-400" 
                                : "bg-white border border-gray-300 text-black placeholder-gray-500"} 
                      focus:outline-none focus:ring-2 ${darkMode ? "focus:ring-indigo-500" : "focus:ring-indigo-400"}`}
          disabled={backendStatus !== "online"}        />
        <button
          className={`px-4 py-2 rounded-md font-semibold 
                      ${darkMode ? "bg-indigo-500 hover:bg-indigo-600 text-white" 
                                : "bg-indigo-400 hover:bg-indigo-500 text-white"}`}
          disabled={backendStatus !== "online"}        >
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
                  darkMode={darkMode}
                  onToggle={() =>
                    backendStatus === "online" && toggleTask(list._id, task._id)
                  }
                  onDelete={() => deleteTask(list._id, task._id)}
                  onRename={(newText) =>
                    backendStatus === "online" && renameTask(list._id, task._id, newText)
                  }
                  disabled={backendStatus !== "online"}                />
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
  const [backendStatus, setBackendStatus] = useState("starting"); 

  const listSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    })
  );

  // Check backend status
  useEffect(() => {
    let isMounted = true;
    let triedOnce = false;

    const fetchData = async () => {
      try {
        await axios.get(`${API}/api/todos`);
        if (isMounted) {
          setBackendStatus("online");
        }

        const res = await axios.get(`${API}/api/todos`);
        const normalized = res.data.map((list) => ({
          ...list,
          tasks: [...(list.tasks || [])].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
          ),
        }));
        if (isMounted) setLists(normalized);
      } catch (err) {
        if (!triedOnce) {

          if (isMounted) setBackendStatus("starting");
        } else {

          if (isMounted) setBackendStatus("offline");
        }
        console.error("❌ Error fetching data:", err.message);
      } finally {
        triedOnce = true;
      }
    };

    setBackendStatus("starting");
    fetchData();

    const interval = setInterval(fetchData, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [API]);

  const renameTask = async (listId, taskId, newText) => {
    try {
      const res = await axios.put(
        `${API}/api/todos/${listId}/tasks/${taskId}/rename`,
        { text: newText }
      );

      setLists((prev) =>
        prev.map((list) =>
          list._id === listId
            ? {
                ...list,
                tasks: list.tasks.map((task) =>
                  task._id === taskId ? res.data : task
                ),
              }
            : list
        )
      );
    } catch (err) {
      console.error("❌ Rename task error:", err?.message);
    }
  };

  const createList = async (name) => {
    if (!name.trim() || backendStatus !== "online") return;
    try {
      const res = await axios.post(`${API}/api/todos`, { name });
      setLists((prev) => [...prev, res.data]);
      setNewList("");
    } catch (err) {
      console.error("❌ Error creating list:", err.message);
    }
  };

  const renameList = async (listId, newName) => {
    if (!backendOnline) return;
    try {
      const res = await axios.put(`${API}/api/todos/${listId}`, {
        name: newName,
      });
      setLists((prev) =>
        prev.map((l) => (l._id === listId ? { ...l, name: res.data.name } : l))
      );
    } catch (err) {
      console.error("❌ Error renaming list:", err?.message);
    }
  };

  const addTask = async (listId, text) => {
    if (backendStatus !== "online") return;
    try {
      const res = await axios.post(`${API}/api/todos/${listId}/tasks`, {
        text,
      });
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
    if (!backendOnline) return;
    try {
      const res = await axios.put(
        `${API}/api/todos/${listId}/tasks/${taskId}/toggle`,
        {},
        {
          headers: { "Content-Type": "application/json" },
        }
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
    if (!backendOnline) return;
    try {
      await axios.delete(`${API}/api/todos/${listId}/tasks/${taskId}`);
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
    if (!backendOnline) return;
    try {
      await axios.delete(`${API}/api/todos/${listId}`);
      setLists((prev) => prev.filter((l) => l._id !== listId));
    } catch (e) {
      console.error("❌ Error deleting list:", e?.message);
    }
  };

  const onTasksReordered = async (listId, newTasks) => {
    setLists((prev) =>
      prev.map((l) => (l._id === listId ? { ...l, tasks: newTasks } : l))
    );

    if (!backendOnline) return;
    try {
      await axios.put(`${API}/api/todos/${listId}/reorder`, {
        taskIds: newTasks.map((t) => t._id),
      });
    } catch (e) {
      console.error("❌ Error persisting task order:", e?.message);
    }
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

      {/* Backend status banner */}
      {backendStatus !== "online" && (
        <div
          className={`text-white text-center py-2 rounded mb-4 ${
            backendStatus === "starting"
              ? "bg-yellow-600 animate-pulse"
              : "bg-red-600"
          }`}
        >
          {backendStatus === "starting"
            ? "⏳ Backend is starting..."
            : "⚠️ Backend is not running!"}
        </div>
      )}

      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1
          className={`text-3xl font-bold text-center sm:text-left mb-4 sm:mb-0 ${
            darkMode ? "text-white" : "text-black"
          }`}
        >
          My Task Dashboard
        </h1>

        {/* Dark mode toggle */}
        <div
          onClick={() => setDarkMode(!darkMode)}
          className={`w-14 h-7 rounded-full p-1 cursor-pointer flex items-center transition-colors duration-300
                      ${darkMode ? "bg-gray-700" : "bg-yellow-300"} mx-auto sm:mx-0`}
        >
          <motion.div
            layout
            initial={false}
            animate={{ x: darkMode ? 28 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="w-5 h-5 bg-indigo-500 rounded-full shadow flex items-center justify-center text-white"
          >
            {darkMode ? <Moon size={12} /> : <Sun size={12} />}
          </motion.div>
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
          disabled={backendStatus !== "online"}          className={`flex-1 px-3 py-2 rounded-md border focus:outline-none focus:ring-2
            ${
              darkMode
                ? "bg-[#0e141b] border-gray-600 text-white placeholder-gray-400 focus:ring-green-500"
                : "bg-white border-gray-300 text-black placeholder-gray-500 focus:ring-green-500"
            }`}
        />
        <button
          type="submit"
          disabled={backendStatus !== "online"}          className={`px-4 py-2 rounded-md font-semibold
            ${
              darkMode
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-green-400 text-black hover:bg-green-500"
            }`}
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
                    renameList={renameList}
                    renameTask={renameTask}
                    backendStatus={backendStatus}
                    darkMode={darkMode}
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
