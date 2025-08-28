import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";

export default function SortableTask({ task, onToggle, onDelete, onRename, darkMode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task._id });

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleRename = () => {
    if (editText.trim() && editText !== task.text) {
      onRename(editText.trim());
    }
    setIsEditing(false);
  };

  // Conditional classes based on darkMode
  const baseBg = darkMode ? "bg-[#0e141b]" : "bg-white";
  const baseBorder = darkMode ? "border-gray-600" : "border-gray-300";
  const textColor = darkMode ? "text-white" : "text-black";
  const inputBg = darkMode ? "bg-gray-800" : "bg-gray-100";
  const inputBorder = darkMode ? "border-gray-500" : "border-gray-300";

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center justify-between p-3 rounded-lg shadow-md border cursor-grab transition-colors
        ${isDragging ? "bg-indigo-600 border-indigo-400 text-white" : `${baseBg} ${baseBorder} ${textColor}`}`}
    >
      {/* Toggle complete */}
      <button onClick={onToggle} className="mr-3 shrink-0" title="Toggle complete">
        <span className="text-xl">{task.completed ? "✅" : "⭕"}</span>
      </button>

      {/* Task text OR edit input */}
      {isEditing ? (
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => e.key === "Enter" && handleRename()}
          className={`flex-1 px-2 py-1 rounded-md ${inputBg} ${textColor} border ${inputBorder} focus:outline-none`}
          autoFocus
        />
      ) : (
        <span
          onClick={onToggle}
          className={`flex-1 cursor-pointer ${task.completed ? "line-through text-gray-400" : ""}`}
        >
          {task.text}
        </span>
      )}

      {/* Edit button */}
      <button
        onClick={() => setIsEditing(true)}
        className={`ml-3 ${darkMode ? "text-blue-400 hover:text-blue-500" : "text-blue-600 hover:text-blue-700"}`}
        title="Edit task"
      >
        ✏️
      </button>

      {/* Delete button */}
      <button
        onClick={onDelete}
        className={`ml-3 ${darkMode ? "text-red-400 hover:text-red-500" : "text-red-600 hover:text-red-700"}`}
        title="Delete"
      >
        ✕
      </button>
    </motion.div>
  );
}
