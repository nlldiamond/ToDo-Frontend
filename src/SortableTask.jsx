import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";

export default function SortableTask({ task, onToggle, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
        ${isDragging ? "bg-indigo-600 border-indigo-400 text-white" : "bg-[#0e141b] border-gray-600 text-white"}`}
    >
      <button onClick={onToggle} className="mr-3 shrink-0" title="Toggle complete">
        <span className="text-xl">{task.completed ? "✅" : "⭕"}</span>
      </button>

      <span
        onClick={onToggle}
        className={`flex-1 cursor-pointer ${task.completed ? "line-through text-gray-400" : ""}`}
      >
        {task.text}
      </span>

      <button
        onClick={onDelete}
        className="ml-3 text-red-400 hover:text-red-500"
        title="Delete"
      >
        ✕
      </button>
    </motion.div>
  );
}
